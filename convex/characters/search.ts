"use node";

import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { v } from "convex/values";
import { generateText } from 'ai';
import { getModelClient, getModelConfig, calculateUsageAndCost } from "../ai/models";
import { 
  buildCharacterSearchPrompt, 
  buildSameSourceSuggestionsPrompt, 
  buildSimilarCharacterSuggestionsPrompt 
} from "../prompts";
import { authArgsValidator, requireAuth } from "../lib/authHelpers";
import { checkRateLimit } from "../lib/rateLimiter";
import { getUserTier } from "../lib/userTier";
import { parseCharacterResults } from "../lib/parseCharacterResults";

export const searchCharacters = action({
  args: {
    ...authArgsValidator.fields,
    query: v.string(),
  },
  returns: v.object({
    type: v.literal('search'),
    characters: v.array(v.object({
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    })),
  }),
  handler: async (ctx, args): Promise<{
    type: 'search';
    characters: Array<{
      fullName: string;
      gender: string;
      source: string;
    }>;
  }> => {
    // Check authentication (supports both authenticated and anonymous users)
    const identifier = await requireAuth(ctx, args);
    
    // Get user tier
    const userTier = await getUserTier(ctx, args.userId);
    
    // Check rate limit
    await checkRateLimit(ctx, 'searchCharacters', args.userId, args.sessionId);
    
    // Always generate fresh results from AI
    const searchPrompt = buildCharacterSearchPrompt(args.query);

    try {
      const modelConfig = getModelConfig('characterSearch', userTier);
      const result = await generateText({
        model: getModelClient('characterSearch', userTier),
        prompt: searchPrompt,
        temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.7,
        maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 2000,
      });

      // Parse the AI response into character list (supports single-line pipe format)
      const characters = parseCharacterResults(result.text);

      // Cache all returned characters
      if (characters.length > 0) {
        // First cache the characters (only inserts new ones)
        const newCharacters = await ctx.runMutation(internal.characters.searchHelpers.cacheCharacters, {
          characters,
        });
        
        // Then schedule lore generation only for new characters
        if (newCharacters.length > 0) {
          await ctx.runMutation(internal.characters.searchHelpers.scheduleMissingLore, {
            characters: newCharacters,
          });
        }
      }

      // Calculate usage and cost, then log to database
      const usageData = calculateUsageAndCost('characterSearch', userTier, result);
      const authArgs = { userId: args.userId, sessionId: args.sessionId };
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        ...authArgs,
        ...usageData,
      });

      return { 
        type: 'search' as const,
        characters 
      };
    } catch (error) {
      console.error('Error generating character search results:', error);
      
      // Log the error to database
      const errorData = calculateUsageAndCost('characterSearch', userTier, {}, false, error instanceof Error ? error.message : 'Unknown error');
      const authArgs = { userId: args.userId, sessionId: args.sessionId };
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        ...authArgs,
        ...errorData,
      });
      
      return { 
        type: 'search' as const,
        characters: [] 
      };
    }
  },
});



export const getCharacterSuggestions = action({
  args: {
    ...authArgsValidator.fields,
    selectedCharacter: v.object({
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    }),
    offset: v.number(),
    excludeList: v.array(v.string()),
  },
  returns: v.object({
    type: v.literal('suggestions'),
    sourceCharacters: v.array(v.object({
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    })),
    similarCharacters: v.array(v.object({
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    })),
    hasMoreSource: v.boolean(),
    hasMoreSimilar: v.boolean(),
  }),
  handler: async (ctx, args) => {

    // Check authentication (supports both authenticated and anonymous users)
    const identifier = await requireAuth(ctx, args);
    
    // Get user tier
    const userTier = await getUserTier(ctx, args.userId);
    
    // Check rate limit
    await checkRateLimit(ctx, 'getCharacterSuggestions', args.userId, args.sessionId);
    
    const { selectedCharacter, offset, excludeList } = args;
    
    // If custom character is selected, return empty suggestions
    // This prevents AI from generating characters with incorrect "Custom" source
    // Custom characters are user-created and don't have same-source peers
    if (selectedCharacter.source === "Custom") {
      return {
        type: 'suggestions' as const,
        sourceCharacters: [],
        similarCharacters: [],
        hasMoreSource: false,
        hasMoreSimilar: false
      };
    }
    
    const excludeText = (excludeList && excludeList.length > 0)
      ? ` and also excluding the following characters: ${excludeList.join(', ')}`
      : '';

    const sourcePrompt = buildSameSourceSuggestionsPrompt({
      source: selectedCharacter.source,
      selectedCharacter: selectedCharacter.fullName,
      excludeList: excludeText,
    });

    const similarPrompt = buildSimilarCharacterSuggestionsPrompt({
      characterName: selectedCharacter.fullName,
      source: selectedCharacter.source,
      excludeList: [selectedCharacter.fullName, ...excludeList].join(', '),
    });

    try {
      const modelConfig = getModelConfig('characterSuggestions', userTier);
      const [sourceResult, similarResult] = await Promise.all([
        generateText({
          model: getModelClient('characterSuggestions', userTier),
          prompt: sourcePrompt,
          temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.7,
          maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 2000,
        }),
        generateText({
          model: getModelClient('characterSuggestions', userTier),
          prompt: similarPrompt,
          temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.7,
          maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 2000,
        })
      ]);

      // Parse the AI responses into character lists (supports single-line pipe format)
      const sourceCharactersAll = parseCharacterResults(sourceResult.text);
      const similarCharactersAll = parseCharacterResults(similarResult.text);

      // Cache and schedule lore generation for all suggestion results
      const allSuggestionCharacters = [...sourceCharactersAll, ...similarCharactersAll];
      
      // First cache the characters (only inserts new ones)
      const newCharacters = await ctx.runMutation(internal.characters.searchHelpers.cacheCharacters, {
        characters: allSuggestionCharacters,
      });
      
      // Then schedule lore generation only for new characters
      if (newCharacters.length > 0) {
        await ctx.runMutation(internal.characters.searchHelpers.scheduleMissingLore, {
          characters: newCharacters,
        });
      }

      // Log usage for both calls (combine the usage)
      const combinedUsage = {
        usage: {
          inputTokens: (sourceResult.usage?.inputTokens || 0) + (similarResult.usage?.inputTokens || 0),
          outputTokens: (sourceResult.usage?.outputTokens || 0) + (similarResult.usage?.outputTokens || 0),
          totalTokens: (sourceResult.usage?.totalTokens || 0) + (similarResult.usage?.totalTokens || 0),
          reasoningTokens: (sourceResult.usage?.reasoningTokens || 0) + (similarResult.usage?.reasoningTokens || 0),
          cachedInputTokens: (sourceResult.usage?.cachedInputTokens || 0) + (similarResult.usage?.cachedInputTokens || 0),
        }
      };
      
      const usageData = calculateUsageAndCost('characterSuggestions', userTier, combinedUsage);
      const authArgs = { userId: args.userId, sessionId: args.sessionId };
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        ...authArgs,
        ...usageData,
      });

      // Apply offset for pagination
      const sourceCharacters = sourceCharactersAll.slice(offset, offset + 5);
      const similarCharacters = similarCharactersAll.slice(offset, offset + 5);

      return {
        type: 'suggestions' as const,
        sourceCharacters,
        similarCharacters,
        hasMoreSource: sourceCharactersAll.length > offset + 5,
        hasMoreSimilar: similarCharactersAll.length > offset + 5
      };
    } catch (error) {
      console.error('Error generating character suggestions:', error);
      
      // Log the error to database
      const errorData = calculateUsageAndCost('characterSuggestions', userTier, {}, false, error instanceof Error ? error.message : 'Unknown error');
      const authArgs = { userId: args.userId, sessionId: args.sessionId };
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        ...authArgs,
        ...errorData,
      });
      
      return {
        type: 'suggestions' as const,
        sourceCharacters: [],
        similarCharacters: [],
        hasMoreSource: false,
        hasMoreSimilar: false
      };
    }
  },
});