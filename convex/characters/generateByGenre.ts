"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { api, internal } from "../_generated/api";
import { CHARACTER_GENRE_TEMPLATE } from "../prompts/templates/genreCharacters";
import { parseCharacterResults, ParsedCharacter } from "../lib/parseCharacterResults";
import { GENRE_FALLBACKS, GLOBAL_FALLBACK } from "./defaults";
import { getModelClient, getModelConfig } from "../ai/models";
import { getUserTier } from "../lib/userTier";
import { authArgsValidator, requireAuth } from "../lib/authHelpers";
import { checkRateLimit } from "../lib/rateLimiter";
import { generateText } from "ai";

export const generateByGenre = action({
  args: {
    ...authArgsValidator.fields,
    genre: v.string(),
  },
  returns: v.array(
    v.object({
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    // Check authentication
    await requireAuth(ctx, args);
    
    // Check rate limit
    await checkRateLimit(ctx, 'generateByGenre', args.userId, args.sessionId);
    
    console.log(`[generateByGenre] Generating characters for genre: ${args.genre}`);
    
    let characters: ParsedCharacter[];
    
    try {
      // Get user tier for model selection
      const userTier = await getUserTier(ctx, args.userId);
      
      // Build prompt from template with randomization
      const randomSeed = Math.floor(Math.random() * 1000000);
      const varietyInstructions = [
        "Prioritize lesser-known but beloved characters from this genre.",
        "Focus on characters that are trending on social media right now.",
        "Include characters from different time periods within the genre.",
        "Consider characters from different cultural backgrounds and regions.",
        "Mix mainstream hits with cult favorites that Gen Z loves.",
        "Include characters from different sub-genres or media types.",
        "Focus on characters with strong fan communities and active fandoms."
      ];
      const randomVarietyInstruction = varietyInstructions[Math.floor(Math.random() * varietyInstructions.length)];
      
      const prompt = CHARACTER_GENRE_TEMPLATE
        .replace("{{genre}}", args.genre)
        .replace("Focus on characters that Gen Z fans of {{genre}} would immediately recognize, love, and want to read stories about.", 
                `Focus on characters that Gen Z fans of ${args.genre} would immediately recognize, love, and want to read stories about. ${randomVarietyInstruction} (Seed: ${randomSeed})`);
      
      // Get appropriate model based on user tier
      const model = getModelClient("characterSearch", userTier);
      const config = getModelConfig("characterSearch", userTier);
      
      console.log(`[generateByGenre] Using model for tier ${userTier}`);
      
      // Generate characters using AI with higher temperature for more variety
      const response = await generateText({
        model,
        messages: [{ role: "user", content: prompt }],
        maxRetries: 3,
        temperature: Math.min((config.settings.temperature ?? 0.7) + 0.2, 1.0), // Increase temperature for more variety
      });
      
      if (!response.text) {
        throw new Error("No response from AI model");
      }
      
      console.log(`[generateByGenre] AI response received, parsing...`);
      
      // Parse the AI response
      characters = parseCharacterResults(response.text);
      
      // Validate we got exactly 3 characters
      if (characters.length !== 3) {
        throw new Error(`Expected exactly 3 characters, but got ${characters.length}`);
      }
      
      console.log(`[generateByGenre] Successfully generated ${characters.length} characters via AI`);
      
    } catch (error) {
      console.warn(`[generateByGenre] AI generation failed:`, error);
      
      // Fallback to genre-specific characters, or global default
      const genreKey = args.genre.toLowerCase();
      characters = GENRE_FALLBACKS[genreKey] ?? GLOBAL_FALLBACK;
      
      console.log(`[generateByGenre] Using fallback characters for genre: ${genreKey}`);
    }
    
    // Cache characters in global database for search functionality
    try {
      const newCharacters = await ctx.runMutation(internal.characters.searchHelpers.cacheCharacters, {
        characters: characters.map(char => ({
          fullName: char.fullName,
          gender: char.gender,
          source: char.source,
        })),
      });
      
      // Schedule lore generation for new characters
      if (newCharacters.length > 0) {
        await ctx.runMutation(internal.characters.searchHelpers.scheduleMissingLore, {
          characters: newCharacters,
        });
      }
      
      console.log(`[generateByGenre] Successfully cached ${characters.length} characters, ${newCharacters.length} were new`);
      
    } catch (cacheError) {
      console.error(`[generateByGenre] Failed to cache characters:`, cacheError);
      // Don't throw here, continue with saving to selectedCharacters
    }

    // Save the characters to selectedCharacters table
    try {
      await ctx.runMutation(api.characters.index.saveSelectedCharacters, {
        userId: args.userId,
        sessionId: args.sessionId,
        characters: characters.map(char => ({
          fullName: char.fullName,
          gender: char.gender,
          source: char.source,
        })),
      });
      
      console.log(`[generateByGenre] Successfully saved ${characters.length} characters to user selection`);
      
    } catch (saveError) {
      console.error(`[generateByGenre] Failed to save characters:`, saveError);
      throw new Error("Failed to save generated characters");
    }
    
    // Return the characters for confirmation
    return characters.map(char => ({
      fullName: char.fullName,
      gender: char.gender,
      source: char.source,
    }));
  },
});