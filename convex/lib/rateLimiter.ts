import { RateLimiter, RateLimitConfig as RateLimiterConfig } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";
import { ActionCtx } from "../_generated/server";
import { RATE_LIMITS, RateLimitKey, UserTier } from "../config/rateLimits";
import { getUserTier, getRateLimitKey } from "./userTier";

// Create a rate limiter instance with all configurations
const rateLimiterConfigs: Record<string, RateLimiterConfig> = {};

// Build configurations for all combinations of actions and tiers
Object.entries(RATE_LIMITS).forEach(([action, tierConfigs]) => {
  Object.entries(tierConfigs).forEach(([tier, config]) => {
    const key = `${action}:${tier}`;
    rateLimiterConfigs[key] = {
      kind: config.capacity ? "token bucket" : "fixed window",
      rate: config.rate,
      period: config.period,
      ...(config.capacity && { capacity: config.capacity }),
      // For single-flight actions, we want strict single concurrency per key, so no sharding.
      // For all others, distribute across 10 shards to avoid contention.
      shards: (action === 'generateStory' || action === 'getFeed') ? 1 : 10,
    };
  });
});

// Create the rate limiter instance
export const rateLimiter = new RateLimiter(components.rateLimiter, rateLimiterConfigs);

/**
 * Check rate limit for a specific action
 * 
 * @param ctx - Action context
 * @param action - The action being rate limited
 * @param userId - User ID if authenticated
 * @param sessionId - Session ID for anonymous users
 * @param count - Number of tokens to consume (default: 1)
 * @returns Rate limit status
 */
export async function checkRateLimit(
  ctx: ActionCtx,
  action: RateLimitKey,
  userId?: string | null,
  sessionId?: string | null,
  count: number = 1
) {
  const tier = await getUserTier(ctx, userId);
  const key = getRateLimitKey(userId, sessionId);
  const rateLimitKey = `${action}:${tier}`;

  const status = await rateLimiter.limit(ctx, rateLimitKey, {
    key,
    count,
  });

  if (!status.ok) {
    const retryInSeconds = Math.ceil((status.retryAfter || 0) / 1000);
    const message = `Rate limit exceeded for ${action}. Please try again in ${retryInSeconds} seconds.`;
    
    throw new Error(message);
  }

  return status;
}

/**
 * Get current rate limit status without consuming tokens
 * 
 * @param ctx - Action context
 * @param action - The action to check
 * @param userId - User ID if authenticated
 * @param sessionId - Session ID for anonymous users
 * @returns Current rate limit status
 */
export async function getRateLimitStatus(
  ctx: ActionCtx,
  action: RateLimitKey,
  userId?: string | null,
  sessionId?: string | null
) {
  const tier = await getUserTier(ctx, userId);
  const key = getRateLimitKey(userId, sessionId);
  const rateLimitKey = `${action}:${tier}`;

  return await rateLimiter.limit(ctx, rateLimitKey, {
    key,
    count: 0, // Don't consume any tokens
  });
}

/**
 * Acquire single-concurrency lock for story generation. Throws if already in-flight.
 */
export async function acquireStoryGenerationLock(
  ctx: ActionCtx,
  userId?: string | null,
  sessionId?: string | null
) {
  const tier = await getUserTier(ctx, userId);
  const key = getRateLimitKey(userId, sessionId);
  const rateLimitKey = `generateStory:${tier}`;
  return await rateLimiter.limit(ctx, rateLimitKey, {
    key,
    throws: true,
    count: 1,
  });
}

/**
 * Release the story generation lock immediately, allowing the next request to proceed.
 */
export async function releaseStoryGenerationLock(
  ctx: ActionCtx,
  userId?: string | null,
  sessionId?: string | null
) {
  const tier = await getUserTier(ctx, userId);
  const key = getRateLimitKey(userId, sessionId);
  const rateLimitKey = `generateStory:${tier}`;
  await rateLimiter.reset(ctx, rateLimitKey, { key });
}

/** Acquire single-flight lock for feed generation per user/session. */
export async function acquireFeedLock(
  ctx: ActionCtx,
  userId?: string | null,
  sessionId?: string | null
) {
  const tier = await getUserTier(ctx, userId);
  const key = getRateLimitKey(userId, sessionId);
  const rateLimitKey = `getFeed:${tier}`;
  // Non-throwing to avoid ConvexError logs in the internal module when busy
  return await rateLimiter.limit(ctx, rateLimitKey, {
    key,
    throws: false,
    count: 1,
  });
}

/** Release the feed lock so subsequent requests can proceed. */
export async function releaseFeedLock(
  ctx: ActionCtx,
  userId?: string | null,
  sessionId?: string | null
) {
  const tier = await getUserTier(ctx, userId);
  const key = getRateLimitKey(userId, sessionId);
  const rateLimitKey = `getFeed:${tier}`;
  await rateLimiter.reset(ctx, rateLimitKey, { key });
}

// Export rate limit checking functions for frontend use
// We'll create specific exports for each action type that needs frontend checking

// For story suggestions
export const { 
  getRateLimit: getStorySuggestionsRateLimit, 
  getServerTime: getStorySuggestionsServerTime 
} = rateLimiter.hookAPI(
  "generateStorySuggestions:authenticated",
  {
    key: async (ctx) => {
      const user = await ctx.auth.getUserIdentity();
      return getRateLimitKey(user?.subject || null, null);
    }
  }
);

// For character search
export const { 
  getRateLimit: getCharacterSearchRateLimit, 
  getServerTime: getCharacterSearchServerTime 
} = rateLimiter.hookAPI(
  "searchCharacters:authenticated",
  {
    key: async (ctx) => {
      const user = await ctx.auth.getUserIdentity();
      return getRateLimitKey(user?.subject || null, null);
    }
  }
);

// For story generation lock visibility in the client (authenticated users)
export const {
  getRateLimit: getStoryGenerationRateLimit,
  getServerTime: getStoryGenerationServerTime,
} = rateLimiter.hookAPI(
  "generateStory:authenticated",
  {
    key: async (ctx) => {
      const user = await ctx.auth.getUserIdentity();
      return getRateLimitKey(user?.subject || null, null);
    },
  }
);

// Export the main functions for convenience
export const getRateLimit = getStorySuggestionsRateLimit;
export const getServerTime = getStorySuggestionsServerTime;