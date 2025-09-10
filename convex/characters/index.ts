import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { authArgsValidator, buildIdentifierQueryNormalized, requireAuth, AuthArgs } from "../lib/authHelpers";

export const saveSelectedCharacters = mutation({
  args: {
    ...authArgsValidator.fields,
    characters: v.array(v.object({
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    })),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    
    // First, remove existing characters for this user/session
    const indexName = args.userId ? "by_user" : "by_session";
    const existing = await ctx.db
      .query("selectedCharacters")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .collect();
    
    for (const char of existing) {
      await ctx.db.delete(char._id);
    }
    
    // Add new characters
    for (const character of args.characters) {
      await ctx.db.insert("selectedCharacters", {
        ...identifierQuery,
        fullName: character.fullName,
        gender: character.gender,
        source: character.source,
      });
    }
    
    return { success: true };
  },
});

export const getSelectedCharacters = query({
  args: authArgsValidator,
  returns: v.array(
    v.object({
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const indexName = args.userId ? "by_user" : "by_session";
    
    const characters = await ctx.db
      .query("selectedCharacters")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .order("asc")
      .collect();
    
    return characters.map(({ fullName, gender, source }) => ({
      fullName,
      gender,
      source,
    }));
  },
});

export const clearSelectedCharacters = internalMutation({
  args: authArgsValidator,
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const indexName = args.userId ? "by_user" : "by_session";
    
    const characters = await ctx.db
      .query("selectedCharacters")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .collect();
    
    for (const char of characters) {
      await ctx.db.delete(char._id);
    }
    
    return { success: true };
  },
});

export const list = query({
  args: authArgsValidator,
  returns: v.array(
    v.object({
      _id: v.id("selectedCharacters"),
      _creationTime: v.number(),
      userId: v.optional(v.string()),
      sessionId: v.optional(v.string()),
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    }),
  ),
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const indexName = args.userId ? "by_user" : "by_session";
    
    return await ctx.db
      .query("selectedCharacters")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .order("asc")
      .collect();
  },
});