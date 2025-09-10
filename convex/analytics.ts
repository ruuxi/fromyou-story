import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authArgsValidator, requireAuth } from "./lib/authHelpers";

// This table would need to be added to schema.ts:
// analytics: defineTable({
//   userId: v.optional(v.string()),
//   sessionId: v.optional(v.string()),
//   eventName: v.string(),
//   eventData: v.optional(v.any()),
//   isAnonymous: v.boolean(),
//   timestamp: v.number(),
// })
//   .index("by_session", ["sessionId"])
//   .index("by_user", ["userId"])
//   .index("by_event", ["eventName"])
//   .index("by_timestamp", ["timestamp"]),

export const logEvent = mutation({
  args: {
    ...authArgsValidator.fields,
    eventName: v.string(),
    eventData: v.optional(v.any()),
    timestamp: v.number(),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    // For now, just log to console since we haven't added analytics table
    console.log('Analytics Event:', {
      userId: args.userId,
      sessionId: args.sessionId,
      eventName: args.eventName,
      eventData: args.eventData,
      isAnonymous: !args.userId,
      timestamp: args.timestamp,
    });
    
    // Once analytics table is added to schema:
    // return await ctx.db.insert("analytics", {
    //   userId: args.userId,
    //   sessionId: args.sessionId,
    //   eventName: args.eventName,
    //   eventData: args.eventData,
    //   isAnonymous: !args.userId,
    //   timestamp: args.timestamp,
    // });
    
    return { success: true };
  },
});

export const getAnonymousConversionRate = query({
  args: {
    fromTimestamp: v.optional(v.number()),
    toTimestamp: v.optional(v.number()),
  },
  returns: v.object({
    totalAnonymousSessions: v.number(),
    convertedSessions: v.number(),
    conversionRate: v.number(),
  }),
  handler: async (ctx, args) => {
    // Placeholder implementation - would query analytics table
    return {
      totalAnonymousSessions: 0,
      convertedSessions: 0,
      conversionRate: 0,
    };
  },
});

export const getAnonymousUserStats = query({
  args: {
    sessionId: v.string(),
  },
  returns: v.object({
    charactersSelected: v.number(),
    storiesCreated: v.number(),
    hasPreferences: v.boolean(),
    sessionId: v.string(),
  }),
  handler: async (ctx, args) => {
    // Get stats for a specific anonymous session
    
    // Count characters selected
    const characters = await ctx.db
      .query("selectedCharacters")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    // Count stories created
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    // Get preferences
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    return {
      charactersSelected: characters.length,
      storiesCreated: stories.length,
      hasPreferences: !!preferences,
      sessionId: args.sessionId,
    };
  },
});