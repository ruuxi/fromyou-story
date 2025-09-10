import { query } from "../_generated/server";
import { v } from "convex/values";

// Get a suggestion by its ID
export const getSuggestionById = query({
  args: {
    suggestionId: v.string(),
  },
  returns: v.union(
    v.object({
      _id: v.id("storySuggestions"),
      _creationTime: v.number(),
      userId: v.optional(v.string()),
      sessionId: v.optional(v.string()),
      suggestionId: v.string(),
      text: v.string(),
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
        pov: v.optional(v.string()),
      }),
      tags: v.optional(v.array(v.string())),
      contentNSFW: v.optional(v.boolean()),
      isSelected: v.boolean(),
      searchQuery: v.optional(v.string()),
      createdAt: v.number(),
      selectedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const suggestion = await ctx.db
      .query("storySuggestions")
      .withIndex("by_suggestion_id", (q) => q.eq("suggestionId", args.suggestionId))
      .first();
    
    if (!suggestion) return null;
    
    return {
      ...suggestion,
      createdAt: suggestion._creationTime,
    };
  },
});