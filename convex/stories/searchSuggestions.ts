"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Doc } from "../_generated/dataModel";
import { calculateCharacterSlots } from "../lib/characterSlots";
import { distributeCharacters } from "../lib/distributeCharacters";
import { getModelConfig, getModelClient, calculateUsageAndCost } from "../ai/models";
import { generateText } from "ai";
import { buildIdentifierQuery } from "../lib/authHelpers";
import { STORY_SUGGESTION_SYSTEM_PROMPT } from "../prompts/templates/systemPrompts";
import { buildSearchSuggestionPrompt } from "../prompts/storySearchSuggestions";
import { randomUUID } from "crypto";
import { authArgsValidator, requireAuth } from "../lib/authHelpers";
import { checkRateLimit } from "../lib/rateLimiter";
import { getUserTier } from "../lib/userTier";

export type StorySettings = {
  genre: string;
  storyType: "fanfiction" | "inspired" | "custom";
  playerMode: boolean;
  playerName?: string;
  characterCount: "solo" | "one-on-one" | "group";
  goonMode?: boolean;
};

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

// buildSearchPrompt moved to prompts. Use buildSearchSuggestionPrompt instead.

export const searchStorySuggestions = action({
  args: {
    ...authArgsValidator.fields,
    searchQuery: v.string(),
    preferences: v.object({
      genre: v.string(),
      storyType: v.optional(v.union(v.literal("fanfiction"), v.literal("inspired"), v.literal("custom"))),
      playerMode: v.boolean(),
      playerName: v.optional(v.string()),
      characterCount: v.union(v.literal("solo"), v.literal("one-on-one"), v.literal("group")),
    }),
    // Optional ephemeral client-side constraints
    characterGroups: v.optional(v.array(v.array(v.string()))),
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
    // Check authentication
    await requireAuth(ctx, args);
    
    // Get user tier
    const userTier = await getUserTier(ctx, args.userId);
    
    const trimmedQuery = args.searchQuery.trim();
    if (!trimmedQuery) {
      throw new Error("Search query cannot be empty");
    }
    
    // Check rate limit
    await checkRateLimit(ctx, 'searchStorySuggestions', args.userId, args.sessionId);
    
    // Get user's selected characters
    const authArgs = { userId: args.userId, sessionId: args.sessionId };
    const selectedCharacters = await ctx.runQuery(api.characters.index.list, authArgs);
    
    if (selectedCharacters.length === 0) {
      throw new Error("No characters selected. Please select characters first.");
    }
    
    // Generate 5-10 suggestions based on search
    const numSuggestions = 8;
    
    // Build helper maps for grouping/roles
    const buildId = (c: Doc<"selectedCharacters">) => `${c.fullName}|${c.source}`;
    const roleMap = new Map<string, 'main' | 'side'>();
    if (args.characterRoles) {
      for (const { id, role } of args.characterRoles) roleMap.set(id, role);
    }
    const docGroups: Array<Doc<"selectedCharacters">[]> = [];
    if (args.characterGroups) {
      const idToDoc = new Map<string, Doc<"selectedCharacters">>(
        selectedCharacters.map(c => [buildId(c), c])
      );
      for (const group of args.characterGroups) {
        const docs = group.map(id => idToDoc.get(id)).filter(Boolean) as Doc<"selectedCharacters">[];
        if (docs.length >= 2) docGroups.push(docs);
      }
    }
    // Distribute characters honoring roles and groups
    const characterAssignments = Array.from({ length: numSuggestions }, (_, i) => {
      const mainPool = selectedCharacters.filter(c => roleMap.get(buildId(c)) === 'main');
      const pool = mainPool.length > 0 ? mainPool : selectedCharacters;
      const mainChar = pool[i % pool.length];
      const mainId = buildId(mainChar);
      const group = docGroups.find(g => g.some(member => buildId(member) === mainId));
      const groupMates = group ? group.filter(m => buildId(m) !== mainId) : [];
      const sideCandidates = selectedCharacters.filter(c => roleMap.get(buildId(c)) === 'side' && buildId(c) !== mainId && !groupMates.some(g => buildId(g) === buildId(c)));
      const others = selectedCharacters.filter(c => buildId(c) !== mainId && !groupMates.some(g => buildId(g) === buildId(c)) && !sideCandidates.some(s => buildId(s) === buildId(c)));
      const sameSourceOthers = others.filter(c => c.source === mainChar.source);
      const differentSourceOthers = others.filter(c => c.source !== mainChar.source);
      const sameSourceSides = sideCandidates.filter(c => c.source === mainChar.source);
      const differentSourceSides = sideCandidates.filter(c => c.source !== mainChar.source);
      const ordered = [...groupMates, ...sameSourceSides, ...differentSourceSides, ...sameSourceOthers, ...differentSourceOthers];
      return { character: mainChar, sameSourceChars: ordered };
    });
    
    // Generate suggestions with search context
    const suggestionPromises = characterAssignments.map(async (assignment, i) => {
      // Randomly select story type for each suggestion
      const storyType = Math.random() < 0.7 ? 'fanfiction' : 'inspired';
      
      // Create settings object with random story type
      const settings: StorySettings = {
        genre: args.preferences.genre,
        storyType,
        playerMode: args.preferences.playerMode,
        playerName: args.preferences.playerName,
        characterCount: args.preferences.characterCount,
      };
      
      const charSlots = calculateCharacterSlots(settings);
      const mainId = `${assignment.character.fullName}|${assignment.character.source}`
      const group = docGroups.find(g => g.some(m => `${m.fullName}|${m.source}` === mainId));
      const additionalDocsCandidates = group
        ? group.filter(m => `${m.fullName}|${m.source}` !== mainId)
        : assignment.sameSourceChars;
      const additionalChars = additionalDocsCandidates.slice(0, Math.max(0, charSlots - 1));
      
      const prompt = buildSearchSuggestionPrompt({
        genre: settings.genre,
        storyType: settings.storyType,
        playerMode: settings.playerMode,
        playerName: settings.playerName,
        characterCount: settings.characterCount,
        mainCharacter: { fullName: assignment.character.fullName, source: assignment.character.source },
        additionalCharacters: additionalChars.map(c => ({ fullName: c.fullName, source: c.source })),
        searchQuery: trimmedQuery,
      });

      try {
        const modelConfig = getModelConfig('storySuggestionGeneration');
        const result = await generateText({
          model: getModelClient('storySuggestionGeneration'),
          system: STORY_SUGGESTION_SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.7,
          maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 2000,
        });
        
        // Calculate usage and cost, then log to database
        const usageData = calculateUsageAndCost('storySuggestionGeneration', userTier, result);
        const identifierQuery = buildIdentifierQuery(args);
        await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
          ...identifierQuery,
          ...usageData,
          useCase: 'searchStorySuggestions',
        });
        
        const allCharacters = [assignment.character, ...additionalChars];
        
        // Extract the full text response
        let fullText = '';
        
        if (typeof result === 'object' && result !== null) {
          if ('text' in result && typeof (result as any).text === 'string') {
            fullText = (result as any).text.trim();
          } else if ('content' in result && typeof (result as any).content === 'string') {
            fullText = (result as any).content.trim();
          } else if ('steps' in result && Array.isArray((result as any).steps) && (result as any).steps.length > 0) {
            const lastStep = (result as any).steps[(result as any).steps.length - 1];
            if (lastStep && 'content' in lastStep && Array.isArray(lastStep.content)) {
              const textContent = lastStep.content.find((c: any) => c.type === 'text');
              if (textContent && 'text' in textContent) {
                fullText = textContent.text.trim();
              }
            }
          }
        } else if (typeof result === 'string') {
          fullText = (result as string).trim();
        }
        
        if (!fullText) {
          console.error('Failed to extract text from result:', JSON.stringify(result));
          throw new Error('Failed to extract text from AI response');
        }
        
        // Parse tags and story from the response
        let tags: string[] = [];
        let storyHookText = fullText;
        
        // Split response by ### TAGS and ### STORY sections
        const tagsMatch = fullText.match(/###\s*TAGS\s*\n([\s\S]*?)(?=###\s*STORY|$)/i);
        const storyMatch = fullText.match(/###\s*STORY\s*\n([\s\S]*?)$/i);
        
        if (tagsMatch && storyMatch) {
          // Extract tags from the TAGS section
          const tagsSection = tagsMatch[1].trim();
          tags = tagsSection
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('-'))
            .map(line => line.substring(1).trim())
            .filter(tag => tag.length > 0)
            .slice(0, 8); // Maximum 8 tags
          
          // Extract story from the STORY section
          storyHookText = storyMatch[1].trim();
        } else {
          // Fallback: If format is not as expected, use the whole text as story
          console.warn('Could not parse TAGS/STORY sections from response, using full text as story');
        }
        
        const suggestionId = randomUUID();
        await ctx.runMutation(internal.stories.mutations.saveSuggestionInternal, {
          ...authArgs,
          suggestionId,
          text: storyHookText,
          tags: tags,
          characters: {
            main_characters: [assignment.character.fullName],
            side_characters: additionalChars.map(c => c.fullName),
          },
          metadata: {
            characters: allCharacters.map(c => c.fullName),
            sources: allCharacters.map(c => c.source),
            primarySource: assignment.character.source,
            genre: settings.genre,
            storyType: settings.storyType,
            playerMode: settings.playerMode,
            characterCount: settings.characterCount,
          },
          searchQuery: trimmedQuery,
        });
        
        return {
          id: suggestionId,
          text: storyHookText,
          tags,
          characters: {
            main_characters: [assignment.character.fullName],
            side_characters: additionalChars.map(c => c.fullName),
          },
          metadata: {
            characters: allCharacters.map(c => c.fullName),
            sources: [...new Set(allCharacters.map(c => c.source))],
            primarySource: assignment.character.source,
            genre: settings.genre,
            storyType: settings.storyType,
            playerMode: settings.playerMode,
            characterCount: settings.characterCount,
          },
        };
      } catch (error) {
        console.error(`Failed to generate search suggestion ${i}:`, error);
        throw error;
      }
    });
    
    const results = await Promise.all(suggestionPromises);
    
    return results;
  },
});