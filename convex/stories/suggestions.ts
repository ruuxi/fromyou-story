"use node";

import { v } from "convex/values";
import { action, internalMutation } from "../_generated/server";
import { internal, api } from "../_generated/api";
import { Doc, Id } from "../_generated/dataModel";
import { authArgsValidator, requireAuth } from "../lib/authHelpers";
import { getUserTier } from "../lib/userTier";
import { checkRateLimit } from "../lib/rateLimiter";
import { buildStorySuggestionGenerationPrompt, Genre } from "../prompts/storySuggestionGeneration";
import { getModelConfig, getModelClient, calculateUsageAndCost } from "../ai/models";
import { StorySettings } from "./searchSuggestions";
import { distributeCharacters } from "../lib/distributeCharacters";
import { calculateCharacterSlots } from "../lib/characterSlots";
import { storySuggestionValidator } from "../prompts/adaptors/outputValidators";
import { generateText } from "ai";
import { isArgumentsObject } from "util/types";

interface StorySuggestion {
  id: string;
  text: string;
  tags: string[];
  characters: {
    main_characters: string[];
    side_characters: string[];
  };
  metadata: {
    characters: string[];
    sources: string[];
    primarySource: string;
    genre: string;
    storyType: string;
    playerMode: boolean;
    characterCount: string;
  };
}

// Internal-only type for the persisted suggestion shape that includes suggestionId
type PersistedSuggestion = StorySuggestion & { suggestionId: string };




export const generateStorySuggestions = action({
  args: {
    ...authArgsValidator.fields,
    preferences: v.object({
      genre: v.string(),
      storyType: v.optional(v.union(v.literal("fanfiction"), v.literal("inspired"), v.literal("custom"))),
      playerMode: v.boolean(),
      playerName: v.optional(v.string()),
      characterCount: v.union(v.literal("solo"), v.literal("one-on-one"), v.literal("group")),
      goonMode: v.optional(v.boolean()),
    }),
    // Unified batch spec: generate multiple categories in a single call
    batches: v.optional(v.array(v.object({
      count: v.number(),
      forcedStoryType: v.union(v.literal('fanfiction'), v.literal('inspired'), v.literal('custom')),
      selectedTags: v.optional(v.array(v.string())),
      searchRule: v.optional(v.string()),
    }))),
    // Legacy single-batch args (still supported)
    count: v.optional(v.number()),
    selectedTags: v.optional(v.array(v.string())),
    searchRule: v.optional(v.string()),
    forcedStoryType: v.optional(v.union(v.literal('fanfiction'), v.literal('inspired'), v.literal('custom'))),
    // Optional ephemeral client-side constraints
    characterGroups: v.optional(v.array(v.array(v.string()))), // [['Naruto|Naruto','Goku|DBZ']]
    characterRoles: v.optional(
      v.array(
        v.object({ id: v.string(), role: v.union(v.literal('main'), v.literal('side')) })
      )
    ),
  },
  returns: v.array(
    v.object({
      id: v.string(),
      text: v.string(),
      tags: v.array(v.string()),
      characters: v.object({
        main_characters: v.array(v.string()),
        side_characters: v.array(v.string()),
      }),
      metadata: v.object({
        characters: v.array(v.string()),
        sources: v.array(v.string()),
        primarySource: v.string(),
        genre: v.string(),
        storyType: v.string(),
        playerMode: v.boolean(),
        characterCount: v.string(),
      }),
    }),
  ),
  handler: async (ctx, args): Promise<StorySuggestion[]> => {
    try {
      // Check authentication
      await requireAuth(ctx, args);
      
      // Get user tier
      const userTier = await getUserTier(ctx, args.userId);
      
      // Check rate limit
      await checkRateLimit(ctx, 'generateStorySuggestions', args.userId, args.sessionId);
      
      // Get user's selected characters
      const authArgs = { userId: args.userId, sessionId: args.sessionId };
      const selectedCharacters = await ctx.runQuery(api.characters.index.list, authArgs);

      // Build helper maps for grouping/roles
      const buildId = (c: Doc<"selectedCharacters">) => `${c.fullName}|${c.source}`;
      const idToDoc = new Map<string, Doc<"selectedCharacters">>(
        selectedCharacters.map(c => [buildId(c), c])
      );
      const roleMap = new Map<string, 'main' | 'side'>();
      if (args.characterRoles) {
        for (const { id, role } of args.characterRoles) roleMap.set(id, role);
      }
      // Normalize groups to docs, filter invalid ids
      const docGroups: Array<Doc<"selectedCharacters">[]> = [];
      if (args.characterGroups) {
        for (const group of args.characterGroups) {
          const docs = group.map(id => idToDoc.get(id)).filter(Boolean) as Doc<"selectedCharacters">[];
          if (docs.length >= 2) docGroups.push(docs);
        }
      }
      
      // Distribute characters across the requested number of suggestions (default 1)
      const numSuggestions = args.count || 1;
      
      // Helper function to compute character assignment for a given index
      const computeCharacterAssignment = (index: number) => {
        if (selectedCharacters.length === 0) return null;
        
        // Choose a main character: prefer ones marked as 'main'
        const mainPool = selectedCharacters.filter(c => roleMap.get(buildId(c)) === 'main');
        const pool = mainPool.length > 0 ? mainPool : selectedCharacters;
        const mainChar = pool[index % pool.length];
        // If mainChar has a group, include its group mates first
        const mainId = buildId(mainChar);
        const group = docGroups.find(g => g.some(member => buildId(member) === mainId));
        const groupMates = group ? group.filter(m => buildId(m) !== mainId) : [];
        // Build additional preference order: group mates -> side-role chars -> others (same source prioritized)
        const sideCandidates = selectedCharacters.filter(c => roleMap.get(buildId(c)) === 'side' && buildId(c) !== mainId && !groupMates.some(g => buildId(g) === buildId(c)));
        const others = selectedCharacters.filter(c => buildId(c) !== mainId && !groupMates.some(g => buildId(g) === buildId(c)) && !sideCandidates.some(s => buildId(s) === buildId(c)));
        // Prioritize same source among others
        const sameSourceOthers = others.filter(c => c.source === mainChar.source);
        const differentSourceOthers = others.filter(c => c.source !== mainChar.source);
        const sameSourceSides = sideCandidates.filter(c => c.source === mainChar.source);
        const differentSourceSides = sideCandidates.filter(c => c.source !== mainChar.source);
        const ordered = [...groupMates, ...sameSourceSides, ...differentSourceSides, ...sameSourceOthers, ...differentSourceOthers];
        return { character: mainChar, sameSourceChars: ordered };
      };

      // Helper to generate a batch of suggestions with a given forced type, count, tags, rule
      let batchOffset = 0; // Track offset for character assignment across batches
      const generateBatch = async (
        batchCount: number,
        forcedType?: 'fanfiction' | 'inspired' | 'custom',
        batchTags?: string[],
        batchRule?: string
      ): Promise<PersistedSuggestion[]> => {
        const currentBatchOffset = batchOffset;
        batchOffset += batchCount; // Update for next batch
        const suggestionPromises = Array.from({ length: batchCount }, async (_, i): Promise<PersistedSuggestion> => {
          const globalIndex = currentBatchOffset + i; // Global index across all batches
        // Build settings with controllable story type
        let effectiveType: 'fanfiction' | 'inspired' | 'custom';
          if (forcedType) {
            effectiveType = forcedType;
        } else if (args.preferences.storyType === 'custom') {
          effectiveType = 'custom';
        } else {
          // Default mix 70/30 fanfiction/inspired when not forced
          effectiveType = Math.random() < 0.85 ? 'fanfiction' : 'inspired';
        }
        const settings: StorySettings = {
          genre: args.preferences.genre,
          storyType: effectiveType,
          playerMode: args.preferences.playerMode,
          playerName: args.preferences.playerName,
          characterCount: args.preferences.characterCount,
          goonMode: args.preferences.goonMode,
        };
        
        // Generate prompt based on whether characters are selected
        let prompt: string;
        let characterAssignment: { character: Doc<"selectedCharacters">; sameSourceChars: Doc<"selectedCharacters">[] } | null = null;
        
        if (selectedCharacters.length > 0 && effectiveType !== 'custom') {
          // Compute character assignment (only for fanfiction/inspired)
          characterAssignment = computeCharacterAssignment(globalIndex);
          
          if (characterAssignment) {
            // Use the proper template system
            const charSlots = calculateCharacterSlots(settings);
            const mainIdForAdd = buildId(characterAssignment.character);
            const groupForAdd = docGroups.find(g => g.some(m => buildId(m) === mainIdForAdd));
            // Build ordered candidate list: group mates first (if any), then the rest of the ordered list
            const orderedList = characterAssignment.sameSourceChars;
            const groupMates = groupForAdd ? groupForAdd.filter(m => buildId(m) !== mainIdForAdd) : [];
            const remainingOrdered = orderedList.filter(c => !groupMates.some(g => buildId(g) === buildId(c)));
            const additionalDocsCandidates = [...groupMates, ...remainingOrdered];
            const additionalChars = additionalDocsCandidates.slice(0, Math.max(0, charSlots - 1));
            
            prompt = buildStorySuggestionGenerationPrompt({
              playerMode: settings.playerMode,
              playerName: settings.playerName,
              mainCharacter: {
                name: characterAssignment.character.fullName,
                source: characterAssignment.character.source
              },
              additionalCharacters: additionalChars.map(c => ({
                name: c.fullName,
                source: c.source
              })),
              characterSlots: charSlots,
              genre: settings.genre as Genre,
              storyType: settings.storyType,
              characterDynamics: settings.characterCount,
              selectedTags: batchTags ?? args.selectedTags,
              searchRule: batchRule ?? args.searchRule,
              goonMode: settings.goonMode,
            });
          } else {
            // No character assignment available, generate without characters
            prompt = buildStorySuggestionGenerationPrompt({
              playerMode: settings.playerMode,
              playerName: settings.playerName,
              mainCharacter: {
                name: "Generic Character",
                source: settings.genre
              },
              additionalCharacters: [],
              characterSlots: 0,
              genre: settings.genre as Genre,
              storyType: settings.storyType,
              characterDynamics: settings.characterCount,
              selectedTags: batchTags ?? args.selectedTags,
              searchRule: batchRule ?? args.searchRule,
              goonMode: settings.goonMode,
            });
          }
        } else {
          // Generate without characters - create a generic character for the template
          prompt = buildStorySuggestionGenerationPrompt({
            playerMode: settings.playerMode,
            playerName: settings.playerName,
            mainCharacter: {
              name: "Generic Character",
              source: settings.genre
            },
            additionalCharacters: [],
            characterSlots: 0,
            genre: settings.genre as Genre,
            storyType: settings.storyType,
            characterDynamics: settings.characterCount,
            selectedTags: batchTags ?? args.selectedTags,
            searchRule: batchRule ?? args.searchRule,
            goonMode: settings.goonMode,
          });
        }
        
        // Get appropriate model based on user tier
        const modelConfig = getModelConfig('storySuggestionGeneration', userTier);
        const model = getModelClient('storySuggestionGeneration', userTier);
        
        // Generate the story suggestion
        const response = await generateText({
          model,
          messages: [{ role: "user", content: prompt }],
          maxRetries: 3,
          temperature: modelConfig.settings.temperature || 0.8,
        });
        
        if (!response.text) {
          throw new Error("No response from AI model");
        }
        
        // Prepare known characters from the character assignment
        const knownCharacters = characterAssignment 
          ? (() => {
              const mainIdK = buildId(characterAssignment.character);
              const groupK = docGroups.find(g => g.some(m => buildId(m) === mainIdK));
              const orderedListK = characterAssignment.sameSourceChars;
              const groupMatesK = groupK ? groupK.filter(m => buildId(m) !== mainIdK) : [];
              const remainingOrderedK = orderedListK.filter(c => !groupMatesK.some(g => buildId(g) === buildId(c)));
              const candidatesK = [...groupMatesK, ...remainingOrderedK];
              return {
                main_characters: [characterAssignment.character.fullName],
                side_characters: candidatesK.map(c => c.fullName),
              };
            })()
          : { main_characters: [], side_characters: [] };
        
        // Parse and validate the response
        const parsedResponse = storySuggestionValidator.parse(response.text, knownCharacters);
        
        // Create unique ID for this suggestion
        const suggestionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // Track AI usage
        const usageData = calculateUsageAndCost(
          'storySuggestionGeneration',
          userTier,
          response,
          true
        );
        
        await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
          ...usageData,
          userId: args.userId,
          sessionId: args.sessionId,
        });
        
        // Save the suggestion to the database
        const metadata = {
          characters: parsedResponse.characters.main_characters.concat(
            parsedResponse.characters.side_characters
          ),
          sources: characterAssignment ? [characterAssignment.character.source] : [],
          primarySource: characterAssignment ? characterAssignment.character.source : settings.genre,
          genre: settings.genre,
          storyType: settings.storyType,
          playerMode: settings.playerMode,
          characterCount: settings.characterCount,
        };
        
        return {
          id: suggestionId,
          suggestionId,
          ...parsedResponse,
          metadata,
        };
        });
        return await Promise.all(suggestionPromises);
      };

      // If unified batches provided, generate all in parallel
      let suggestions: PersistedSuggestion[] = [];
      if (args.batches && args.batches.length > 0) {
        const results = await Promise.all(
          args.batches.map(b => generateBatch(b.count, b.forcedStoryType, b.selectedTags, b.searchRule))
        );
        suggestions = results.flat();
      } else {
        // Legacy single batch path
        suggestions = await generateBatch(numSuggestions, args.forcedStoryType, args.selectedTags, args.searchRule);
      }
      
      // Batch save all suggestions to database
      const suggestionsForDb = suggestions.map(suggestion => ({
        suggestionId: suggestion.suggestionId,
        text: suggestion.text,
        characters: suggestion.characters,
        metadata: suggestion.metadata,
        tags: suggestion.tags,
      }));
      
      await ctx.runMutation(internal.stories.mutations.batchSaveSuggestionsInternal, {
        userId: args.userId,
        sessionId: args.sessionId,
        suggestions: suggestionsForDb,
      });
      
      // Return suggestions without the extra suggestionId field
      return suggestions.map(({ suggestionId, ...rest }) => rest);
    } catch (error) {
      console.error("Error in generateStorySuggestions:", error);
      
      // Return user-friendly error messages
      if (error instanceof Error) {
        console.error("Error details:", error.message, error.stack);
        
        if (error.message.includes("rate limit")) {
          throw new Error("Too many requests. Please wait a moment before generating more suggestions.");
        }
        if (error.message.includes("No characters selected")) {
          throw error; // Pass through as-is
        }
        if (error.message.includes("authentication")) {
          throw new Error("Please sign in to generate story suggestions.");
        }
        
        // Include more detail in the error message for debugging
        throw new Error(`Failed to generate story suggestions: ${error.message}`);
      }
      
      throw new Error("Failed to generate story suggestions. Please try again.");
    }
  },
});