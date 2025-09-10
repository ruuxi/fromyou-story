import { v } from "convex/values";
import { internalQuery, query } from "../_generated/server";
import { authArgsValidator, requireAuth } from "../lib/authHelpers";

// Helper to get current story settings
export const getCurrentSettings = query({
  args: authArgsValidator,
  returns: v.union(
    v.null(),
    v.object({
      genre: v.optional(v.string()),
      storyType: v.optional(v.string()),
      playerMode: v.optional(v.boolean()),
      playerName: v.optional(v.string()),
      characterCount: v.optional(v.union(v.literal("solo"), v.literal("one-on-one"), v.literal("group"))),
      pov: v.optional(v.union(v.literal("first"), v.literal("second"), v.literal("third"))),
      goonMode: v.optional(v.boolean()),
      openrouterModelOverride: v.optional(v.string()),
      characters: v.array(v.object({
        fullName: v.string(),
        gender: v.string(),
        source: v.string(),
      })),
    })
  ),
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const indexName = args.userId ? "by_user" : "by_session";
    
    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .first();
    
    // Get selected characters
    const charactersIndexName = args.userId ? "by_user" : "by_session";
    const characters = await ctx.db
      .query("selectedCharacters")
      .withIndex(charactersIndexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .order("asc")
      .collect();
    
    const selectedCharacters = characters.map(({ fullName, gender, source }) => ({
      fullName,
      gender,
      source,
    }));
    
    // Return null if no preferences exist AND no characters exist
    // BUT if characters exist, always return them even without preferences
    if (!prefs && selectedCharacters.length === 0) {
      return null;
    }
    
    return {
      genre: prefs?.genre,
      storyType: prefs?.storyType,
      playerMode: prefs?.playerMode,
      playerName: prefs?.playerName,
      characterCount: prefs?.characterCount,
      pov: prefs?.pov,
      goonMode: prefs?.goonMode,
      openrouterModelOverride: prefs?.openrouterModelOverride,
      characters: selectedCharacters,
    };
  },
});

// Internal version that bypasses Convex identity and uses provided identifier directly.
// Safe to use from server-only contexts (actions/http) after performing your own authorization.
export const getCurrentSettingsInternal = internalQuery({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.union(
    v.null(),
    v.object({
      genre: v.optional(v.string()),
      storyType: v.optional(v.string()),
      playerMode: v.optional(v.boolean()),
      playerName: v.optional(v.string()),
      characterCount: v.optional(v.union(v.literal("solo"), v.literal("one-on-one"), v.literal("group"))),
      pov: v.optional(v.union(v.literal("first"), v.literal("second"), v.literal("third"))),
      goonMode: v.optional(v.boolean()),
      openrouterModelOverride: v.optional(v.string()),
      characters: v.array(v.object({
        fullName: v.string(),
        gender: v.string(),
        source: v.string(),
      })),
    })
  ),
  handler: async (ctx, args) => {
    const hasUserId = !!args.userId;
    const hasSessionId = !!args.sessionId;
    if (!hasUserId && !hasSessionId) {
      return null;
    }

    const indexName = hasUserId ? "by_user" : "by_session";
    const field = hasUserId ? "userId" : "sessionId";
    const identifier = hasUserId ? args.userId! : args.sessionId!;

    const prefs = await ctx.db
      .query("userPreferences")
      .withIndex(indexName, (q) => q.eq(field, identifier))
      .first();

    const characters = await ctx.db
      .query("selectedCharacters")
      .withIndex(indexName, (q) => q.eq(field, identifier))
      .order("asc")
      .collect();

    const selectedCharacters = characters.map(({ fullName, gender, source }) => ({
      fullName,
      gender,
      source,
    }));

    if (!prefs && selectedCharacters.length === 0) {
      return null;
    }

    return {
      genre: prefs?.genre,
      storyType: prefs?.storyType,
      playerMode: prefs?.playerMode,
      playerName: prefs?.playerName,
      characterCount: prefs?.characterCount,
      pov: prefs?.pov,
      goonMode: prefs?.goonMode,
      openrouterModelOverride: prefs?.openrouterModelOverride,
      characters: selectedCharacters,
    };
  },
});