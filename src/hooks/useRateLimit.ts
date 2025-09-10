import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useAuthState } from './useAuthState';
import { useState, useEffect } from 'react';

export type RateLimitStatus = {
  ok: boolean;
  remaining: number;
  retryAfter?: number;
  retryAfterSeconds?: number;
};

/**
 * Hook to check rate limit status for a specific action
 * 
 * @param action - The action to check rate limits for
 * @returns Rate limit status and helper functions
 */
export function useRateLimit(action: string) {
  const { userId, sessionId } = useAuthState();
  const [status, setStatus] = useState<RateLimitStatus>({
    ok: true,
    remaining: -1, // -1 indicates unknown
  });

  // Choose appropriate endpoints per action
  const endpoints = (() => {
    switch (action) {
      case 'generateStory':
        return {
          getServerTime: api.lib.rateLimiter.getStoryGenerationServerTime,
          getRateLimit: api.lib.rateLimiter.getStoryGenerationRateLimit,
        } as const;
      case 'searchCharacters':
        return {
          getServerTime: api.lib.rateLimiter.getCharacterSearchServerTime,
          getRateLimit: api.lib.rateLimiter.getCharacterSearchRateLimit,
        } as const;
      default:
        return {
          getServerTime: api.lib.rateLimiter.getServerTime,
          getRateLimit: api.lib.rateLimiter.getRateLimit,
        } as const;
    }
  })();

  // Get server time and rate limit info
  const getServerTime = useMutation(endpoints.getServerTime);
  const rateLimit = useQuery(endpoints.getRateLimit, {});

  useEffect(() => {
    const checkRateLimit = async () => {
      try {
        if (!rateLimit) return;
        
        const serverTime = await getServerTime({});
        
        // Rate limiter returns { value, ts, config, shard }
        // We need to calculate remaining from capacity and current value
        const capacity = rateLimit.config.capacity || rateLimit.config.rate;
        const remaining = Math.max(0, capacity - rateLimit.value);
        const retryAfter = rateLimit.ts + rateLimit.config.period - serverTime;
        
        setStatus({
          ok: remaining > 0,
          remaining,
          retryAfter: retryAfter > 0 ? retryAfter : undefined,
          retryAfterSeconds: retryAfter > 0 ? Math.ceil(retryAfter / 1000) : undefined,
        });
      } catch (error) {
        // If rate limit check fails, assume we're over the limit
        setStatus({
          ok: false,
          remaining: 0,
        });
      }
    };

    checkRateLimit();
  }, [rateLimit, getServerTime]);

  // Helper function to format retry time
  const formatRetryTime = () => {
    if (!status.retryAfterSeconds) return null;
    
    const seconds = status.retryAfterSeconds;
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    
    const minutes = Math.ceil(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    
    const hours = Math.ceil(minutes / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  // Get user-friendly message based on status
  const getMessage = () => {
    if (status.ok) {
      if (status.remaining === -1) {
        return 'Loading rate limit status...';
      }
      return `${status.remaining} requests remaining`;
    }
    
    const retryTime = formatRetryTime();
    if (retryTime) {
      return `Rate limit exceeded. Try again in ${retryTime}`;
    }
    
    return 'Rate limit exceeded';
  };

  // Check if user is approaching limit
  const isApproachingLimit = status.remaining > 0 && status.remaining <= 5;
  
  // Get tier-specific upgrade message
  const getUpgradeMessage = () => {
    if (!userId) {
      return 'Sign in for higher rate limits';
    }
    // TODO: Add subscription tier check
    return 'Upgrade to Pro for higher rate limits';
  };

  return {
    status,
    message: getMessage(),
    isApproachingLimit,
    upgradeMessage: getUpgradeMessage(),
    formatRetryTime,
  };
}