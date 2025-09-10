import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { UserTier } from "../config/rateLimits";
import { getCurrentSubscription } from "../subscriptions/index";
import { api } from "../_generated/api";
import { tierCache } from "./tierCache";

/**
 * Determines the user's tier based on authentication and subscription status
 * 
 * @param ctx - Convex context
 * @param userId - User ID if authenticated
 * @returns The user's tier for rate limiting
 */
export async function getUserTier(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  userId?: string | null
): Promise<UserTier> {
  // Anonymous users
  if (!userId) {
    return 'anonymous';
  }

  // Check cache first
  const cachedTier = tierCache.get(userId);
  if (cachedTier) {
    return cachedTier;
  }

  let tier: UserTier;

  // For action contexts, we can't use Stripe's getCurrentSubscription directly
  // So we use a query to check subscription status
  if ('runQuery' in ctx) {
    // This is an action context - use the subscription query
    try {
      tier = await ctx.runQuery(api.lib.subscriptionQuery.getUserSubscriptionTier, { userId });
    } catch (error) {
      console.error('Error getting subscription tier in action:', error);
      tier = 'authenticated';
    }
  } else {
    // For query and mutation contexts, access the subscription data directly
    try {
      const subscription = await (ctx as QueryCtx).db
        .query("stripeSubscriptions")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      
      if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
        // Map Stripe price IDs to our tier system
        const tierMapping: Record<string, UserTier> = {
          [process.env.STRIPE_PRODUCT_TIER1_ID || ""]: 'tier1',
          [process.env.STRIPE_PRODUCT_TIER2_ID || ""]: 'tier2',
          [process.env.STRIPE_PRODUCT_TIER3_ID || ""]: 'tier3',
        };
        
        const mappedTier = tierMapping[subscription.priceId];
        if (mappedTier) {
          tier = mappedTier;
        } else {
          tier = 'authenticated';
        }
      } else {
        tier = 'authenticated';
      }
    } catch (error) {
      console.error('Error getting subscription:', error);
      tier = 'authenticated';
    }
  }

  // Cache the tier for future requests
  tierCache.set(userId, tier);
  
  return tier;
}

/**
 * Gets a unique key for rate limiting based on user authentication
 * 
 * @param userId - User ID if authenticated
 * @param sessionId - Session ID for anonymous users
 * @returns A unique key for rate limiting
 */
export function getRateLimitKey(userId?: string | null, sessionId?: string | null): string {
  if (userId) {
    return `user:${userId}`;
  }
  if (sessionId) {
    return `session:${sessionId}`;
  }
  // Fallback for users without session (shouldn't happen in practice)
  return 'anonymous:unknown';
}