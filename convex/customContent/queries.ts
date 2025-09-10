import { v } from "convex/values";
import { query, internalQuery } from "../_generated/server";
import { buildIdentifierQuery } from "../lib/authHelpers";

export const getCustomCharacters = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("customCharacters"),
    _creationTime: v.number(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    fullName: v.string(),
    gender: v.string(),
    characterLore: v.optional(v.string()),
    isActive: v.boolean(),
    isCustomized: v.optional(v.boolean()),
    originalCharacter: v.optional(v.object({
      fullName: v.string(),
      source: v.string(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const query = buildIdentifierQuery(args);
    const characters = await ctx.db
      .query("customCharacters")
      .withIndex(args.userId ? "by_user" : "by_session", (q) =>
        args.userId ? q.eq("userId", args.userId) : q.eq("sessionId", args.sessionId!)
      )
      .order("desc")
      .collect();
    
    return characters.map(char => ({
      ...char,
      createdAt: char._creationTime,
    }));
  },
});

export const getActiveCustomCharacters = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("customCharacters"),
    _creationTime: v.number(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    fullName: v.string(),
    gender: v.string(),
    characterLore: v.optional(v.string()),
    isActive: v.boolean(),
    isCustomized: v.optional(v.boolean()),
    originalCharacter: v.optional(v.object({
      fullName: v.string(),
      source: v.string(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const query = buildIdentifierQuery(args);
    const characters = await ctx.db
      .query("customCharacters")
      .withIndex(args.userId ? "by_user_active" : "by_session_active", (q) => {
        const baseQuery = args.userId 
          ? q.eq("userId", args.userId) 
          : q.eq("sessionId", args.sessionId!);
        return baseQuery.eq("isActive", true);
      })
      .order("desc")
      .collect();
    
    return characters.map(char => ({
      ...char,
      createdAt: char._creationTime,
    }));
  },
});

export const getCustomWorldLore = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("customWorldLore"),
    _creationTime: v.number(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    title: v.string(),
    lore: v.string(),
    isActive: v.boolean(),
    isCustomized: v.optional(v.boolean()),
    originalSource: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const query = buildIdentifierQuery(args);
    const lore = await ctx.db
      .query("customWorldLore")
      .withIndex(args.userId ? "by_user" : "by_session", (q) =>
        args.userId ? q.eq("userId", args.userId) : q.eq("sessionId", args.sessionId!)
      )
      .order("desc")
      .collect();
    
    return lore.map(item => ({
      ...item,
      createdAt: item._creationTime,
    }));
  },
});

export const getCustomStorySuggestions = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.array(v.object({
    _id: v.id("customStorySuggestions"),
    _creationTime: v.number(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
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
    }),
    isActive: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const query = buildIdentifierQuery(args);
    const suggestions = await ctx.db
      .query("customStorySuggestions")
      .withIndex(args.userId ? "by_user" : "by_session", (q) =>
        args.userId ? q.eq("userId", args.userId) : q.eq("sessionId", args.sessionId!)
      )
      .order("desc")
      .collect();
    
    return suggestions.map(suggestion => ({
      ...suggestion,
      createdAt: suggestion._creationTime,
    }));
  },
});

export const getCustomContentSummaryInternal = internalQuery({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.object({
    customCharactersCount: v.number(),
    customWorldLoreCount: v.number(),
    customSuggestionsCount: v.number(),
  }),
  handler: async (ctx, args) => {
    const hasUser = !!args.userId;
    const field = hasUser ? "userId" : "sessionId";
    const id = hasUser ? args.userId! : args.sessionId!;

    const [chars, lore, sugg] = await Promise.all([
      ctx.db
        .query("customCharacters")
        .withIndex(hasUser ? "by_user" : "by_session", (q) => q.eq(field, id))
        .take(1),
      ctx.db
        .query("customWorldLore")
        .withIndex(hasUser ? "by_user" : "by_session", (q) => q.eq(field, id))
        .take(1),
      ctx.db
        .query("customStorySuggestions")
        .withIndex(hasUser ? "by_user" : "by_session", (q) => q.eq(field, id))
        .take(1),
    ]);

    return {
      customCharactersCount: chars.length,
      customWorldLoreCount: lore.length,
      customSuggestionsCount: sugg.length,
    };
  },
});