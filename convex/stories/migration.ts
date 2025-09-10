import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireUser } from "../lib/authHelpers";

/**
 * Claim stories that were created under the current session but should belong to the authenticated user.
 * This fixes the issue where stories were created with sessionId for signed-in users due to auth timing.
 * Should be called once when a user signs in to recover their session-owned stories.
 */
export const claimSessionStories = mutation({
  args: {
    sessionId: v.string(),
  },
  returns: v.object({
    claimedCount: v.number(),
    claimedStoryIds: v.array(v.id("stories")),
  }),
  handler: async (ctx, args) => {
    // Require authenticated user - only signed-in users can claim stories
    const userId = await requireUser(ctx);
    
    // Find all stories owned by the provided sessionId
    const sessionStories = await ctx.db
      .query("stories")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    
    const claimedStoryIds = [];
    
    // Transfer ownership from sessionId to userId
    for (const story of sessionStories) {
      // Only claim if not already owned by a user
      if (!story.userId) {
        await ctx.db.patch(story._id, {
          userId,
          sessionId: undefined, // Clear sessionId since it's now user-owned
          updatedAt: Date.now(),
        });
        claimedStoryIds.push(story._id);
      }
    }
    
    return {
      claimedCount: claimedStoryIds.length,
      claimedStoryIds,
    };
  },
});

/**
 * Check if there are any stories that can be claimed for the current session.
 * This is useful for showing a notification to users about recovering their stories.
 */
export const checkClaimableStories = mutation({
  args: {
    sessionId: v.string(),
  },
  returns: v.object({
    hasClaimableStories: v.boolean(),
    claimableCount: v.number(),
  }),
  handler: async (ctx, args) => {
    // Require authenticated user
    const userId = await requireUser(ctx);
    
    // Find stories owned by the sessionId that aren't already user-owned
    const sessionStories = await ctx.db
      .query("stories")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .filter((q) => q.eq(q.field("userId"), undefined))
      .collect();
    
    return {
      hasClaimableStories: sessionStories.length > 0,
      claimableCount: sessionStories.length,
    };
  },
});
