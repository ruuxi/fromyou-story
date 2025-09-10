import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

export const migrateAnonymousData = mutation({
  args: {
    userId: v.string(),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check authentication
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.userId) {
      throw new Error("Not authorized to migrate data");
    }

    const results = {
      selectedCharacters: 0,
      userPreferences: 0,
      stories: 0,
      customCharacters: 0,
      customWorldLore: 0,
      customStorySuggestions: 0,
    };

    // Migrate selected characters
    const characters = await ctx.db
      .query("selectedCharacters")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    for (const char of characters) {
      await ctx.db.patch(char._id, {
        userId: args.userId,
        sessionId: undefined,
      });
      results.selectedCharacters++;
    }

    // Migrate user preferences
    const preferences = await ctx.db
      .query("userPreferences")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .first();
    
    if (preferences) {
      // Check if user already has preferences
      const existingPrefs = await ctx.db
        .query("userPreferences")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
      
      if (existingPrefs) {
        // Merge preferences, keeping the more recent ones
        if (preferences.lastUpdated > existingPrefs.lastUpdated) {
          await ctx.db.patch(existingPrefs._id, {
            genre: preferences.genre,
            storyType: preferences.storyType,
            playerMode: preferences.playerMode,
            playerName: preferences.playerName,
            characterCount: preferences.characterCount,
            pov: preferences.pov,
            lastUpdated: preferences.lastUpdated,
          });
        }
        // Delete the session preferences
        await ctx.db.delete(preferences._id);
      } else {
        // Just update the session preferences to user preferences
        await ctx.db.patch(preferences._id, {
          userId: args.userId,
          sessionId: undefined,
        });
      }
      results.userPreferences++;
    }

    // Migrate stories
    const stories = await ctx.db
      .query("stories")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    for (const story of stories) {
      await ctx.db.patch(story._id, {
        userId: args.userId,
        sessionId: undefined,
      });
      results.stories++;
    }

    // Migrate custom characters
    const customCharacters = await ctx.db
      .query("customCharacters")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    for (const char of customCharacters) {
      await ctx.db.patch(char._id, {
        userId: args.userId,
        sessionId: undefined,
      });
      results.customCharacters++;
    }

    // Migrate custom world lore
    const customWorldLore = await ctx.db
      .query("customWorldLore")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    for (const lore of customWorldLore) {
      await ctx.db.patch(lore._id, {
        userId: args.userId,
        sessionId: undefined,
      });
      results.customWorldLore++;
    }

    // Migrate custom story suggestions
    const customStorySuggestions = await ctx.db
      .query("customStorySuggestions")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    for (const suggestion of customStorySuggestions) {
      await ctx.db.patch(suggestion._id, {
        userId: args.userId,
        sessionId: undefined,
      });
      results.customStorySuggestions++;
    }

    return results;
  },
});