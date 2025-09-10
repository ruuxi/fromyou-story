"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { generateText } from "ai";
import { getModelClient, getModelConfig, calculateUsageAndCost } from "../ai/models";
import { internal } from "../_generated/api";

export const getTagSuggestions = action({
  args: {
    query: v.string(),
    topN: v.optional(v.number()),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const topN = args.topN ?? 10;
    
    // Build prompt for tag suggestions (favor entity-anchored + general tags)
    const prompt = `Given the user's search "${args.query}", suggest relevant story tags.

Think broadly about themes, tropes, genres, character types, settings, events, organizations, leagues, eras, locations, and story elements explicitly tied to the query when appropriate.

Return ONLY tags in this exact markdown format:

### TAG_SUGGESTIONS
- tag1
- tag2
- tag3
...

Guidelines:
- Generate exactly ${topN} tags
- All tags must be lowercase, hyphenated (e.g. "space-opera", "tragic-romance")
- Include both broad storytelling tags and highly specific, entity-anchored tags derived from the query
- If the query references an entity (e.g., nba, f1, star-wars), include 2-4 tags that explicitly reflect that entity (e.g., "nba", "nba-playoffs", "nba-rivalries", "nba-locker-room") in addition to general story tags
- Prioritize tags that would help filter story content, not technical terms or author commentary

Query: "${args.query}"`;

    try {
      // Use centralized model configuration
      const modelConfig = getModelConfig('tagSuggestions', 'anonymous');
      const result = await generateText({
        model: getModelClient('tagSuggestions', 'anonymous'),
        prompt,
        temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.7,
        maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 500,
      });

      // Parse the markdown response
      const text = (result as any).text ?? String(result ?? "");
      const suggestionsMatch = text.match(/### TAG_SUGGESTIONS\s*\n((?:- .+\n?)+)/);
      if (!suggestionsMatch) {
        console.error("Failed to parse tag suggestions from AI response:", text);
        return [];
      }

      const tagLines = suggestionsMatch[1].trim().split('\n');
      const tags = tagLines
        .map((line: string) => line.replace(/^- /, '').trim())
        .filter((tag: string) => tag.length > 0)
        .slice(0, topN);

      // Log AI usage using centralized calculator
      const usageData = calculateUsageAndCost('tagSuggestions', 'anonymous', result as any, true);
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        ...usageData,
      });

      return tags;
    } catch (error) {
      console.error("Error generating tag suggestions:", error);
      return [];
    }
  },
});