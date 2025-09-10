"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { generateText } from "ai";
import { api, internal } from "../_generated/api";
import {
  buildWorldLorePrompt,
  buildCharacterLorePrompt,
} from "../prompts";
import {
  WORLD_LORE_SYSTEM_PROMPT,
  CHARACTER_LORE_SYSTEM_PROMPT
} from "../prompts/templates/lore";
import {
  getModelClient,
  getModelConfig,
  calculateUsageAndCost,
} from "../ai/models";

export const generateLore = action({
  args: { 
    fullName: v.string(), 
    source: v.string() 
  },
  handler: async (ctx, { fullName, source }) => {
    // Generate world lore (one per unique source)
    const worldLoreExists = await ctx.runQuery(api.characters.loreHelpers.checkWorldLoreExists, { source });

    if (!worldLoreExists) {
      try {
        const worldPrompt = buildWorldLorePrompt({ source });
        const worldConfig = getModelConfig("worldLore");
        
        const worldResult = await generateText({
          model: getModelClient("worldLore"),
          system: WORLD_LORE_SYSTEM_PROMPT,
          prompt: worldPrompt,
          temperature: 'temperature' in worldConfig.settings ? worldConfig.settings.temperature : 0.7,
          maxOutputTokens: 'maxTokens' in worldConfig.settings ? worldConfig.settings.maxTokens : 1000,
        });

        await ctx.runMutation(internal.characters.loreHelpers.insertWorldLore, {
          source,
          lore: worldResult.text,
        });

        // Log AI usage for world lore generation
        // For background processing, we use 'authenticated' tier as default
        const worldUsageData = calculateUsageAndCost("worldLore", 'authenticated', worldResult);
        await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
          userId: undefined,
          sessionId: undefined,
          ...worldUsageData,
        });
        
        console.log(`Generated world lore for source: ${source}`);
      } catch (error) {
        console.error(`Failed to generate world lore for ${source}:`, error);
        
        // Log the error
        const errorData = calculateUsageAndCost("worldLore", 'authenticated', {}, false, error instanceof Error ? error.message : 'Unknown error');
        await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
          userId: undefined,
          sessionId: undefined,
          ...errorData,
        });
      }
    }

    // Generate character lore (unique per name+source combination)
    const existingCharacter = await ctx.runQuery(api.characters.loreHelpers.getCharacterForLore, {
      fullName,
      source,
    });

    if (existingCharacter && !existingCharacter.characterLore) {
      try {
        const characterPrompt = buildCharacterLorePrompt({ fullName, source });
        const characterConfig = getModelConfig("characterLore");
        
        const characterResult = await generateText({
          model: getModelClient("characterLore"),
          system: CHARACTER_LORE_SYSTEM_PROMPT,
          prompt: characterPrompt,
          temperature: 'temperature' in characterConfig.settings ? characterConfig.settings.temperature : 0.7,
          maxOutputTokens: 'maxTokens' in characterConfig.settings ? characterConfig.settings.maxTokens : 1000,
        });

        await ctx.runMutation(internal.characters.loreHelpers.updateCharacterLore, {
          characterId: existingCharacter._id,
          lore: characterResult.text,
        });

        // Log AI usage for character lore generation
        // For background processing, we use 'authenticated' tier as default
        const characterUsageData = calculateUsageAndCost("characterLore", 'authenticated', characterResult);
        await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
          userId: undefined,
          sessionId: undefined,
          ...characterUsageData,
        });
        
        console.log(`Generated character lore for: ${fullName} from ${source}`);
      } catch (error) {
        console.error(`Failed to generate character lore for ${fullName} from ${source}:`, error);
        
        // Log the error
        const errorData = calculateUsageAndCost("characterLore", 'authenticated', {}, false, error instanceof Error ? error.message : 'Unknown error');
        await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
          userId: undefined,
          sessionId: undefined,
          ...errorData,
        });
      }
    }

    return { success: true };
  },
});

 