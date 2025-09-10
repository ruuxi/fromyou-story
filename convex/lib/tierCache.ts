import { UserTier } from "../config/rateLimits";

// In-memory cache for subscription tiers with TTL
interface TierCacheEntry {
  tier: UserTier;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class TierCache {
  private cache = new Map<string, TierCacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  set(userId: string, tier: UserTier, ttl?: number): void {
    this.cache.set(userId, {
      tier,
      timestamp: Date.now(),
      ttl: ttl || this.DEFAULT_TTL
    });
  }

  get(userId: string): UserTier | null {
    const entry = this.cache.get(userId);
    
    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(userId);
      return null;
    }

    return entry.tier;
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries (call periodically)
  cleanup(): void {
    const now = Date.now();
    for (const [userId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(userId);
      }
    }
  }
}

export const tierCache = new TierCache();

// In Convex, timers at import time can throw. Provide an explicit cleanup
// function that callers can invoke from within handlers/actions if needed.
export function cleanupTierCache(): void {
  tierCache.cleanup();
}