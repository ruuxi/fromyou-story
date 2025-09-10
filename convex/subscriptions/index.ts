import { query, internalQuery, internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Product configuration matching current tiers
export const STRIPE_PRODUCTS = {
  tier1: process.env.STRIPE_PRODUCT_TIER1_ID || "",
  tier2: process.env.STRIPE_PRODUCT_TIER2_ID || "",
  tier3: process.env.STRIPE_PRODUCT_TIER3_ID || "",
} as const;

// Create a query to get user info for Stripe
export const getUserInfoForStripe = query({
  args: {},
  returns: v.object({
    _id: v.string(),
    email: v.string(),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    
    if (!identity) {
      throw new Error("Not authenticated");
    }
    
    // Return user info for Stripe
    const userInfo = {
      _id: identity.subject,
      email: identity.email || "noemail@example.com",
    };
    
    return userInfo;
  },
});

// Get current subscription
export const getCurrentSubscription = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      productId: v.string(),
      status: v.string(),
      tier: v.union(v.literal("tier1"), v.literal("tier2"), v.literal("tier3")),
      currentPeriodEnd: v.number(),
    })
  ),
  handler: async (ctx): Promise<{
    productId: string;
    status: string;
    tier: "tier1" | "tier2" | "tier3";
    currentPeriodEnd: number;
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const subscription = await ctx.runQuery(internal.subscriptions.index.getStoredSubscription, {
      userId: identity.subject,
    });

    if (
      !subscription ||
      (subscription.status !== "active" && subscription.status !== "trialing")
    ) {
      return null;
    }

    let currentPeriodEnd = subscription.currentPeriodEnd;
    if (isNaN(currentPeriodEnd)) {
      currentPeriodEnd = Date.now() + 30 * 24 * 60 * 60 * 1000; // +30 days
    }

    const tierMapping: Record<string, "tier1" | "tier2" | "tier3"> = {
      [STRIPE_PRODUCTS.tier1]: "tier1",
      [STRIPE_PRODUCTS.tier2]: "tier2",
      [STRIPE_PRODUCTS.tier3]: "tier3",
      // price-ID env vars (make sure they’re also set server-side)
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER1_ID ?? ""]: "tier1",
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER2_ID ?? ""]: "tier2",
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER3_ID ?? ""]: "tier3",
    };

    const tier = tierMapping[subscription.priceId];
    if (!tier) {
      return null;
    }

    return {
      productId: subscription.priceId,
      status: subscription.status,
      tier,
      currentPeriodEnd,
    };
  },
});

// Manual sync function for debugging subscription issues
export const syncSubscriptionFromStripe = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      productId: v.string(),
      status: v.string(),
      tier: v.union(v.literal("tier1"), v.literal("tier2"), v.literal("tier3")),
      currentPeriodEnd: v.number(),
    })
  ),
  handler: async (ctx): Promise<{
    productId: string;
    status: string;
    tier: "tier1" | "tier2" | "tier3";
    currentPeriodEnd: number;
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const subscription = await ctx.runQuery(internal.subscriptions.index.getStoredSubscription, {
      userId: identity.subject,
    });

    if (!subscription) {
      return null;
    }

    const tierMapping: Record<string, "tier1" | "tier2" | "tier3"> = {
      [STRIPE_PRODUCTS.tier1]: "tier1",
      [STRIPE_PRODUCTS.tier2]: "tier2",
      [STRIPE_PRODUCTS.tier3]: "tier3",
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER1_ID ?? ""]: "tier1",
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER2_ID ?? ""]: "tier2",
      [process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER3_ID ?? ""]: "tier3",
    };

    const tier = tierMapping[subscription.priceId];
    if (!tier) {
      return null;
    }

    return {
      productId: subscription.priceId,
      status: subscription.status,
      tier,
      currentPeriodEnd: subscription.currentPeriodEnd,
    };
  },
});



// Internal database operations
export const getStoredCustomer = internalQuery({
  args: { userId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      stripeCustomerId: v.string(),
      email: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const customer = await ctx.db
      .query("stripeCustomers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    return customer ? {
      stripeCustomerId: customer.stripeCustomerId,
      email: customer.email,
    } : null;
  },
});

export const storeCustomer = internalMutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    email: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("stripeCustomers", {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      email: args.email,
    });
    return null;
  },
});

// Lookup: map Stripe customer id -> user id
export const getUserIdByCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  returns: v.union(v.null(), v.string()),
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query("stripeCustomers")
      .withIndex("by_stripe_customer", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId)
      )
      .first();

    return row ? (row as any).userId : null;
  },
});

export const getStoredSubscription = internalQuery({
  args: { userId: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      subscriptionId: v.string(),
      priceId: v.string(),
      status: v.string(),
      currentPeriodEnd: v.number(),
    })
  ),
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("stripeSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    
    if (!subscription) {
      return null;
    }
    
    // Validate and fix currentPeriodEnd if it's NaN or invalid
    const currentPeriodEnd = isNaN(subscription.currentPeriodEnd) 
      ? Date.now() + (30 * 24 * 60 * 60 * 1000) // Default to 30 days from now
      : subscription.currentPeriodEnd;
    
    return {
      subscriptionId: subscription.subscriptionId,
      priceId: subscription.priceId,
      status: subscription.status,
      currentPeriodEnd,
    };
  },
});

export const storeSubscription = internalMutation({
  args: {
    userId: v.string(),
    subscriptionId: v.string(),
    priceId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Check if subscription already exists
    const existing = await ctx.db
      .query("stripeSubscriptions")
      .withIndex("by_subscription_id", (q) => q.eq("subscriptionId", args.subscriptionId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        priceId: args.priceId,
        status: args.status,
        currentPeriodEnd: args.currentPeriodEnd,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("stripeSubscriptions", {
        ...args,
      });
    }
    return null;
  },
});