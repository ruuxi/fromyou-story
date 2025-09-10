import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { Doc } from "../_generated/dataModel";
import { authArgsValidator, buildIdentifierQuery, requireAuth, buildIdentifierQueryNormalized } from "../lib/authHelpers";

export const getUserPreferences = query({
  args: authArgsValidator,
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const indexName = args.userId ? "by_user" : "by_session";
    
    return await ctx.db
      .query("userPreferences")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .first();
  },
});

export const initializeUserPreferences = mutation({
  args: {
    ...authArgsValidator.fields,
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const indexName = args.userId ? "by_user" : "by_session";
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .first();
    
    if (!existing) {
      return await ctx.db.insert("userPreferences", {
        ...identifierQuery,
        username: args.username,
        lastUpdated: Date.now(),
        genre: "adventure",
        storyType: "fanfiction",
        playerMode: false,
        playerName: undefined,
        characterCount: "one-on-one",
        pov: "third",
        goonMode: false,
        openrouterModelOverride: undefined,
      });
    }
    
    return existing._id;
  },
});





export const getRecentSuggestions = query({
  args: authArgsValidator,
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const indexName = args.userId ? "by_user" : "by_session";
    
    return await ctx.db
      .query("recentSuggestions")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .first();
  },
});

export const createDefaultPreferences = mutation({
  args: authArgsValidator,
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const indexName = args.userId ? "by_user" : "by_session";
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    
    // Check if preferences already exist
    const existing = await ctx.db
      .query("userPreferences")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .first();
    
    if (!existing) {
      // Create with default preferences
      return await ctx.db.insert("userPreferences", {
        ...identifierQuery,
        lastUpdated: Date.now(),
        genre: "adventure",
        storyType: "fanfiction",
        playerMode: false,
        playerName: undefined,
        characterCount: "one-on-one",
        pov: "third",
        goonMode: false,
        openrouterModelOverride: undefined,
      });
    }
    
    return existing._id;
  },
});


export const updateStorySettings = mutation({
  args: {
    ...authArgsValidator.fields,
    genre: v.optional(v.string()),
    storyType: v.optional(v.union(v.literal("fanfiction"), v.literal("inspired"), v.literal("custom"))),
    playerMode: v.optional(v.boolean()),
    playerName: v.optional(v.string()),
    characterCount: v.optional(v.union(v.literal("solo"), v.literal("one-on-one"), v.literal("group"))),
    pov: v.optional(v.union(v.literal("first"), v.literal("second"), v.literal("third"))),
    goonMode: v.optional(v.boolean()),
    selectedTags: v.optional(v.array(v.string())),
    openrouterModelOverride: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const indexName = args.userId ? "by_user" : "by_session";
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    
    let prefs = await ctx.db
      .query("userPreferences")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .first();
    
    // If preferences don't exist, create them with defaults
    if (!prefs) {
      const prefsId = await ctx.db.insert("userPreferences", {
        ...identifierQuery,
        lastUpdated: Date.now(),
        genre: args.genre || "adventure",
        storyType: args.storyType || "fanfiction",
        playerMode: args.playerMode || false,
        playerName: args.playerName,
        characterCount: args.characterCount || "one-on-one",
        pov: args.pov || "third",
        goonMode: args.goonMode || false,
        selectedTags: args.selectedTags || [],
        openrouterModelOverride: args.openrouterModelOverride === null ? undefined : args.openrouterModelOverride,
      });
      return;
    }
    
    // Update existing preferences
    const updates: Partial<Doc<"userPreferences">> = { lastUpdated: Date.now() };
    if (args.genre !== undefined) updates.genre = args.genre;
    if (args.storyType !== undefined) updates.storyType = args.storyType;
    if (args.playerMode !== undefined) updates.playerMode = args.playerMode;
    if (args.playerName !== undefined) updates.playerName = args.playerName;
    if (args.characterCount !== undefined) updates.characterCount = args.characterCount;
    if (args.pov !== undefined) updates.pov = args.pov;
    if (args.goonMode !== undefined) updates.goonMode = args.goonMode;
    if (args.selectedTags !== undefined) updates.selectedTags = args.selectedTags;
    if (args.openrouterModelOverride !== undefined) {
      if (args.openrouterModelOverride === null) {
        updates.openrouterModelOverride = undefined;
      } else {
        updates.openrouterModelOverride = args.openrouterModelOverride;
      }
    }
    
    await ctx.db.patch(prefs._id, updates);
  },
});

export const updateTagPreferences = mutation({
  args: {
    ...authArgsValidator.fields,
    selectedTags: v.optional(v.array(v.string())),
    // Allow null to explicitly clear the rule
    searchRule: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const indexName = args.userId ? "by_user" : "by_session";
    const identifierQuery = buildIdentifierQuery(args);
    
    let prefs = await ctx.db
      .query("userPreferences")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .first();
    
    // If preferences don't exist, create them with defaults
    if (!prefs) {
      await ctx.db.insert("userPreferences", {
        ...identifierQuery,
        lastUpdated: Date.now(),
        genre: "adventure",
        storyType: "fanfiction",
        playerMode: false,
        playerName: undefined,
        characterCount: "one-on-one",
        pov: "third",
        goonMode: false,
        selectedTags: args.selectedTags,
        // If null is provided, explicitly do not set the field
        searchRule: args.searchRule ?? undefined,
      });
      return;
    }
    
    // Update existing preferences
    const updates: Partial<Doc<"userPreferences">> = { lastUpdated: Date.now() };
    if (args.selectedTags !== undefined) updates.selectedTags = args.selectedTags;
    // If searchRule is provided as null, unset the field. If string, set it. If omitted, do nothing.
    if (args.searchRule === null) {
      updates.searchRule = undefined;
    } else if (args.searchRule !== undefined) {
      updates.searchRule = args.searchRule;
    }
    
    await ctx.db.patch(prefs._id, updates);
  },
});