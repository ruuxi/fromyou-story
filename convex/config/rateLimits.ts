import { MINUTE, HOUR } from "@convex-dev/rate-limiter";

// User tiers that will be used for rate limiting
export type UserTier = 'anonymous' | 'authenticated' | 'tier1' | 'tier2' | 'tier3';

// Rate limit configuration for each tier
export type RateLimitConfig = {
  rate: number;
  period: number;
  capacity?: number; // Optional for token bucket
};

// Type-safe rate limit definitions
export type RateLimitKey = 
  | 'generateStorySuggestions'
  | 'searchStorySuggestions'
  | 'searchCharacters'
  | 'getCharacterSuggestions'
  | 'generateStory'
  | 'getFeed'
  | 'storyChat'
  | 'characterChat'
  | 'createStory'
  | 'updateSettings'
  | 'generateEmbedding'
  | 'generateInterests'
  | 'generateSearchInterest'
  | 'generateByGenre'
  // Blind test endpoints
  | 'blindTestChat'
  | 'blindTestVote';
  
  // Add character chat endpoint
  // Note: Keep legacy 'storyChat' for story continuation; use 'characterChat' for /api/character/chat
  

// Centralized rate limit configuration
export const RATE_LIMITS: Record<RateLimitKey, Record<UserTier, RateLimitConfig>> = {
  // AI-Powered Actions (Token Bucket for burst capacity)
  generateStorySuggestions: {
    anonymous: { rate: 100, period: MINUTE, capacity: 50 },
    authenticated: { rate: 500, period: MINUTE, capacity: 50 },
    tier1: { rate: 100, period: HOUR, capacity: 50 },
    tier2: { rate: 500, period: HOUR, capacity: 50 },
    tier3: { rate: 2000, period: HOUR, capacity: 100 }
  },
  
  searchStorySuggestions: {
    anonymous: { rate: 50, period: HOUR, capacity: 20 },
    authenticated: { rate: 20, period: HOUR, capacity: 50 },
    tier1: { rate: 50, period: HOUR, capacity: 10 },
    tier2: { rate: 200, period: HOUR, capacity: 20 },
    tier3: { rate: 1000, period: HOUR, capacity: 50 }
  },
  
  searchCharacters: {
    anonymous: { rate: 20, period: MINUTE, capacity: 50 },
    authenticated: { rate: 60, period: MINUTE, capacity: 50 },
    tier1: { rate: 200, period: MINUTE, capacity: 30 },
    tier2: { rate: 500, period: MINUTE, capacity: 50 },
    tier3: { rate: 1000, period: MINUTE, capacity: 100 }
  },
  
  getCharacterSuggestions: {
    anonymous: { rate: 20, period: MINUTE, capacity: 50 },
    authenticated: { rate: 60, period: MINUTE, capacity: 50 },
    tier1: { rate: 200, period: MINUTE, capacity: 30 },
    tier2: { rate: 500, period: MINUTE, capacity: 50 },
    tier3: { rate: 1000, period: MINUTE, capacity: 100 }
  },
  
  generateStory: {
    // Concurrency-based: only one in-flight generation per user/session at a time.
    // Use fixed window with rate=1 and no capacity; we'll reset on completion.
    anonymous: { rate: 1, period: HOUR },
    authenticated: { rate: 1, period: HOUR },
    tier1: { rate: 1, period: HOUR },
    tier2: { rate: 1, period: HOUR },
    tier3: { rate: 1, period: HOUR }
  },
  
  // Feed fetches: guard against bursty parallel calls per user/session.
  // Use the same single-flight pattern as generateStory (reset on completion).
  getFeed: {
    anonymous: { rate: 1, period: HOUR },
    authenticated: { rate: 1, period: HOUR },
    tier1: { rate: 1, period: HOUR },
    tier2: { rate: 1, period: HOUR },
    tier3: { rate: 1, period: HOUR }
  },
  
  storyChat: {
    anonymous: { rate: 20, period: HOUR, capacity: 50 },
    authenticated: { rate: 100, period: HOUR, capacity: 20 },
    tier1: { rate: 500, period: HOUR, capacity: 50 },
    tier2: { rate: 2000, period: HOUR, capacity: 100 },
    tier3: { rate: 10000, period: HOUR, capacity: 200 }
  },
  characterChat: {
    anonymous: { rate: 100, period: HOUR, capacity: 50 },
    authenticated: { rate: 300, period: HOUR, capacity: 50 },
    tier1: { rate: 1000, period: HOUR, capacity: 100 },
    tier2: { rate: 4000, period: HOUR, capacity: 200 },
    tier3: { rate: 20000, period: HOUR, capacity: 500 },
  },
  
  // Database Operations (Fixed Window for steady rate)
  createStory: {
    anonymous: { rate: 10, period: HOUR },
    authenticated: { rate: 50, period: HOUR },
    tier1: { rate: 200, period: HOUR },
    tier2: { rate: 500, period: HOUR },
    tier3: { rate: 2000, period: HOUR }
  },
  
  updateSettings: {
    anonymous: { rate: 30, period: HOUR },
    authenticated: { rate: 100, period: HOUR },
    tier1: { rate: 500, period: HOUR },
    tier2: { rate: 1000, period: HOUR },
    tier3: { rate: 5000, period: HOUR }
  },
  
  generateEmbedding: {
    anonymous: { rate: 50, period: HOUR, capacity: 50 },
    authenticated: { rate: 200, period: HOUR, capacity: 50 },
    tier1: { rate: 1000, period: HOUR, capacity: 50 },
    tier2: { rate: 5000, period: HOUR, capacity: 100 },
    tier3: { rate: 20000, period: HOUR, capacity: 200 }
  },

  generateInterests: {
    anonymous: { rate: 10, period: HOUR, capacity: 20 },
    authenticated: { rate: 30, period: HOUR, capacity: 20 },
    tier1: { rate: 100, period: HOUR, capacity: 20 },
    tier2: { rate: 200, period: HOUR, capacity: 30 },
    tier3: { rate: 500, period: HOUR, capacity: 50 }
  },

  generateSearchInterest: {
    anonymous: { rate: 20, period: HOUR, capacity: 30 },
    authenticated: { rate: 50, period: HOUR, capacity: 30 },
    tier1: { rate: 150, period: HOUR, capacity: 30 },
    tier2: { rate: 300, period: HOUR, capacity: 50 },
    tier3: { rate: 600, period: HOUR, capacity: 100 }
  },

  generateByGenre: {
    anonymous: { rate: 5, period: HOUR, capacity: 10 },
    authenticated: { rate: 20, period: HOUR, capacity: 10 },
    tier1: { rate: 50, period: HOUR, capacity: 10 },
    tier2: { rate: 100, period: HOUR, capacity: 20 },
    tier3: { rate: 200, period: HOUR, capacity: 30 }
  }
  ,
  // Blind test chat: allow up to 2 concurrent in-flight per user/session.
  // Set high enough to support full test session: 20 questions × 2 models + 5 follow-ups each
  blindTestChat: {
    anonymous: { rate: 250, period: HOUR },
    authenticated: { rate: 250, period: HOUR },
    tier1: { rate: 300, period: HOUR },
    tier2: { rate: 400, period: HOUR },
    tier3: { rate: 500, period: HOUR },
  },
  // Blind test votes: use token bucket as a durable counter store with a very large capacity and long period.
  // We'll increment counts per (questionId, choice) key; not used for limiting requests.
  blindTestVote: {
    anonymous: { rate: 1_000_000_000, period: HOUR * 24 * 365, capacity: 1_000_000_000 },
    authenticated: { rate: 1_000_000_000, period: HOUR * 24 * 365, capacity: 1_000_000_000 },
    tier1: { rate: 1_000_000_000, period: HOUR * 24 * 365, capacity: 1_000_000_000 },
    tier2: { rate: 1_000_000_000, period: HOUR * 24 * 365, capacity: 1_000_000_000 },
    tier3: { rate: 1_000_000_000, period: HOUR * 24 * 365, capacity: 1_000_000_000 },
  }
};

// Helper function to get rate limit config for a specific action and tier
export function getRateLimitConfig(action: RateLimitKey, tier: UserTier): RateLimitConfig {
  return RATE_LIMITS[action][tier];
}