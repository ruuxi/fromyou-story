import { v } from "convex/values";
import { query } from "../_generated/server";
import { getCurrentSubscription } from "../subscriptions/index";
import { UserTier } from "../config/rateLimits";

/**
 * Query to get user's subscription tier
 * This is used by actions since they can't directly access Stripe's getCurrentSubscription
 */
export const getUserSubscriptionTier = query({
  args: {
    userId: v.string(),
  },
  returns: v.union(
    v.literal('anonymous'),
    v.literal('authenticated'),
    v.literal('tier1'),
    v.literal('tier2'),
    v.literal('tier3')
  ),
  handler: async (ctx, args): Promise<UserTier> => {
    try {
      // Set the auth context to simulate the user for the subscription query
      const originalAuth = ctx.auth;
      
      // Get stored subscription directly from database
      const subscription = await ctx.db
        .query("stripeSubscriptions")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
      
      if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
        // Map Stripe price IDs to our tier system
        const tierMapping: Record<string, UserTier> = {
          [process.env.STRIPE_PRODUCT_TIER1_ID || ""]: 'tier1',
          [process.env.STRIPE_PRODUCT_TIER2_ID || ""]: 'tier2',
          [process.env.STRIPE_PRODUCT_TIER3_ID || ""]: 'tier3',
        };
        
        const tier = tierMapping[subscription.priceId];
        if (tier) {
          return tier;
        }
      }
    } catch (error) {
      console.error('Error getting subscription in query:', error);
    }
    
    // Default to authenticated tier for logged-in users without subscription
    return 'authenticated';
  },
});