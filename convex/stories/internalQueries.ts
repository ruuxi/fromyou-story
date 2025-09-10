import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

// Get tag by ID
export const getTagById = internalQuery({
  args: {
    id: v.id("tags"),
  },
  returns: v.union(v.object({
    _id: v.id("tags"),
    _creationTime: v.number(),
    name: v.string(),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get tag by name
export const getTagByName = internalQuery({
  args: {
    name: v.string(),
  },
  returns: v.union(v.object({
    _id: v.id("tags"),
    _creationTime: v.number(),
    name: v.string(),
  }), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

// Get all tags
export const getAllTags = internalQuery({
  args: {},
  returns: v.array(v.object({
    _id: v.id("tags"),
    _creationTime: v.number(),
    name: v.string(),
  })),
  handler: async (ctx) => {
    return await ctx.db.query("tags").collect();
  },
});

// Get character by ID
export const getCharacterById = internalQuery({
  args: {
    id: v.id("characters"),
  },
  returns: v.union(v.object({
    _id: v.id("characters"),
    _creationTime: v.number(),
    fullName: v.string(),
    fullNameLower: v.string(),
    gender: v.string(),
    source: v.string(),
    characterLore: v.optional(v.string()),
    createdAt: v.number(),
  }), v.null()),
  handler: async (ctx, args) => {
    const character = await ctx.db.get(args.id);
    if (!character) return null;
    return {
      ...character,
      createdAt: character._creationTime,
    };
  },
});

// Get suggestion by ID
export const getSuggestionById = internalQuery({
  args: {
    id: v.id("storySuggestions"),
  },
  returns: v.union(v.object({
    _id: v.id("storySuggestions"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    tags: v.array(v.string()),
  }), v.null()),
  handler: async (ctx, args) => {
    const suggestion = await ctx.db.get(args.id);
    if (!suggestion) return null;
    
    return {
      _id: suggestion._id,
      userId: suggestion.userId,
      sessionId: suggestion.sessionId,
      tags: suggestion.tags || [],
    };
  },
});

// Get user's available characters
export const getUserCharacters = internalQuery({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("selectedCharacters"),
    fullName: v.string(),
    source: v.string(),
  })),
  handler: async (ctx, args) => {
    // Get selected characters for the user
    let selectedChars;
    
    if (args.userId) {
      selectedChars = await ctx.db
        .query("selectedCharacters")
        .withIndex("by_user", q => q.eq("userId", args.userId))
        .collect();
    } else if (args.sessionId) {
      selectedChars = await ctx.db
        .query("selectedCharacters")
        .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
        .collect();
    } else {
      return [];
    }
    
    // selectedCharacters table already has the character data
    return selectedChars.map(sc => ({
      _id: sc._id,
      fullName: sc.fullName,
      source: sc.source,
    }));
  },
});

// Get suggestion by UUID
export const getSuggestionByUUID = internalQuery({
  args: {
    suggestionId: v.string(),
  },
  returns: v.union(v.object({
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
  }), v.null()),
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

// Add this new function
export const getFullSuggestionById = internalQuery({
  args: {
    id: v.id("storySuggestions"),
  },
  returns: v.union(v.object({
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
  }), v.null()),
  handler: async (ctx, args) => {
    const suggestion = await ctx.db.get(args.id);
    if (!suggestion) return null;
    return {
      ...suggestion,
      createdAt: suggestion._creationTime,
    };
  },
});
// Internal: Get story by ID without auth (callers must enforce ownership)
export const getStoryByIdInternal = internalQuery({
  args: {
    storyId: v.id("stories"),
  },
  returns: v.union(v.any(), v.null()),
  handler: async (ctx, args) => {
    const story = await ctx.db.get(args.storyId);
    if (!story) return null;
    return story;
  },
});

// Internal: Get story summaries by ID without auth (callers must enforce ownership)
export const getStorySummariesInternal = internalQuery({
  args: {
    storyId: v.id("stories"),
  },
  returns: v.array(v.object({
    _id: v.id("storySummaries"),
    _creationTime: v.number(),
    storyId: v.id("stories"),
    pageRange: v.object({
      start: v.number(),
      end: v.number()
    }),
    summary: v.object({
      plot: v.string(),
      characters: v.string(),
      keyEvents: v.array(v.string()),
      worldBuilding: v.optional(v.string())
    }),
    createdAt: v.number()
  })),
  handler: async (ctx, args) => {
    const summaries = await ctx.db
      .query("storySummaries")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .order("asc")
      .collect();
    
    return summaries.map(summary => ({
      ...summary,
      createdAt: summary._creationTime,
    }));
  },
});