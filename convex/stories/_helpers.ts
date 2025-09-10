import { MutationCtx, QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";
import { AuthArgs, requireAuth, isAnonymous, getNormalizedAuthArgs } from "../lib/authHelpers";

/**
 * Assert that the caller owns the specified story.
 * Throws an error if the story doesn't exist or the caller doesn't own it.
 * 
 * @param ctx - Convex context (Query or Mutation)
 * @param storyId - The ID of the story to check
 * @param args - Authentication arguments containing userId or sessionId
 * @returns The story document if ownership is verified
 */
export async function assertStoryOwner(
  ctx: MutationCtx | QueryCtx,
  storyId: Id<"stories">,
  args: AuthArgs
) {
  await requireAuth(ctx, args);
  
  const story = await ctx.db.get(storyId);
  if (!story) {
    throw new Error("Story not found");
  }
  
  const normalized = await getNormalizedAuthArgs(ctx, args);
  
  // Check ownership through either userId OR sessionId
  // This handles stories created before/after sign-in and migration states
  const isOwner = (
    (normalized.userId && story.userId === normalized.userId) ||
    (normalized.sessionId && story.sessionId === normalized.sessionId) ||
    // Also check original args in case normalization stripped sessionId
    (args.sessionId && story.sessionId === args.sessionId)
  );
    
  if (!isOwner) {
    throw new Error("Forbidden: You don't have access to this story");
  }
  
  return story;
}

// Internal version that doesn't do auth (auth handled by caller)
export async function assertStoryOwnerInternal(
  ctx: MutationCtx | QueryCtx,
  storyId: Id<"stories">,
  userId?: string,
  sessionId?: string
) {
  const story = await ctx.db.get(storyId);
  if (!story) {
    throw new Error("Story not found");
  }
  
  const isOwner = userId
    ? story.userId === userId
    : story.sessionId === sessionId;
    
  if (!isOwner) {
    throw new Error("Forbidden: You don't have access to this story");
  }
  
  return story;
}