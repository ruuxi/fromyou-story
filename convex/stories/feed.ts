"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { authArgsValidator, requireAuth } from "../lib/authHelpers";
// Removed feed single-flight lock per new client gating

// Add this interface near the top of the file
interface StorySuggestion {
  id: string;
  text: string;
  tags: string[];
  characters: {
    main_characters: string[];
    side_characters: string[];
  };
  metadata: {
    characters: string[];
    sources: string[];
    primarySource: string;
    genre: string;
    storyType: string;
    playerMode: boolean;
    characterCount: string;
  };
}

// Single-request feed context (computed on server per call; never persisted)
interface FeedContext {
  userId?: string;
  sessionId?: string;
  limit: number;
  preferences: {
    genre: string;
    storyType: 'fanfiction' | 'inspired' | 'custom';
    playerMode: boolean;
    playerName?: string;
    characterCount: 'solo' | 'one-on-one' | 'group';
  };
  selectedTags: string[];
  searchRule?: string;
  characterGroups?: string[][];
  characterRoles?: Array<{ id: string; role: 'main' | 'side' }>;
  hasCustom: boolean;
  distribution: { custom: number; inspired: number; fan: number };
  timestamp: string;
}

// Helper to get default tags for a genre
function getDefaultTagsForGenre(genre: string): string[] {
  const genreDefaults: Record<string, string[]> = {
    fantasy: ["magic", "supernatural", "worldbuilding", "epic", "mythical"],
    romance: ["love", "relationship", "emotional", "passion", "chemistry"],
    "sci-fi": ["technology", "future", "space", "science", "dystopian"],
    adventure: ["action", "quest", "exploration", "danger", "discovery"],
    mystery: ["investigation", "secrets", "suspense", "clues", "thriller"],
    comedy: ["humor", "funny", "lighthearted", "banter", "amusing"],
    horror: ["scary", "supernatural", "suspense", "dark", "psychological"],
    "goon-mode": ["sensual", "tension", "desire", "adult", "intimate"],
  };
  
  return genreDefaults[genre] || ["adventure", "mystery", "romance", "comedy"];
}

function normalizeStoryType(value?: string): 'fanfiction' | 'inspired' | 'custom' {
  if (value === 'inspired' || value === 'custom' || value === 'fanfiction') return value;
  return 'fanfiction';
}

function normalizeCharacterCount(value?: string): 'solo' | 'one-on-one' | 'group' {
  if (value === 'solo' || value === 'group' || value === 'one-on-one') return value;
  return 'one-on-one';
}

export const getFeed = action({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
    // User can specify exact tags they want to see
    selectedTags: v.optional(v.array(v.string())),
    // User can specify a search rule for custom story requirements
    searchRule: v.optional(v.string()),
    // Optional ephemeral client-side constraints for character selection
    characterGroups: v.optional(v.array(v.array(v.string()))),
    characterRoles: v.optional(
      v.array(
        v.object({ id: v.string(), role: v.union(v.literal('main'), v.literal('side')) })
      )
    ),
    // Optional snapshot of preferences from client to avoid refetching
    preferences: v.optional(
      v.object({
        genre: v.string(),
        storyType: v.optional(v.union(v.literal("fanfiction"), v.literal("inspired"), v.literal("custom"))),
        playerMode: v.boolean(),
        playerName: v.optional(v.string()),
        characterCount: v.union(v.literal("solo"), v.literal("one-on-one"), v.literal("group")),
      })
    ),
  },
  returns: v.array(v.object({
    id: v.string(),
    text: v.string(),
    tags: v.array(v.string()),
    characters: v.object({
      main_characters: v.array(v.string()),
      side_characters: v.array(v.string()),
    }),
    metadata: v.object({
      characters: v.array(v.string()),
      sources: v.array(v.string()),
      primarySource: v.string(),
      genre: v.string(),
      storyType: v.string(),
      playerMode: v.boolean(),
      characterCount: v.string(),
    }),
  })),
  handler: async (ctx, args) => {
    console.log('=== getFeed ACTION STARTED ===');
    console.log('User:', args.userId);
    console.log('Session:', args.sessionId);
    console.log('Args Selected Tags:', args.selectedTags);
    console.log('Args Search Rule:', args.searchRule);
    console.log('Timestamp:', new Date().toISOString());
    
    // Normalize/verify auth (prevents identity spoofing and skips provider discovery for pure sessionId)
    await requireAuth(ctx, args);
    const authArgs = { userId: args.userId, sessionId: args.sessionId };
    const limit = args.limit ?? 12;
    
    // Prefer client-supplied preferences snapshot; otherwise fetch from DB
    const preferencesSnapshot = args.preferences;
    const preferences = preferencesSnapshot
      ? undefined
      : await ctx.runQuery(api.users.preferences.getUserPreferences, authArgs);
    
    // If user has selected specific tags, use those
    // Otherwise, get tags from their saved preferences or previous selections
    let tagsToUse: string[] = [];
    
    if (args.selectedTags && args.selectedTags.length > 0) {
      tagsToUse = args.selectedTags;
    } else {
      // If no tags specified, use default tags based on provided or stored genre
      const genre = (preferencesSnapshot?.genre) || (preferences?.genre) || "adventure";
      tagsToUse = getDefaultTagsForGenre(genre);
    }
    
    // Handle search rule - use provided one or fall back to saved preference
    const searchRuleToUse = args.searchRule || preferences?.searchRule;
    
    console.log('=== TAG RESOLUTION ===');
    console.log('Preferences Selected Tags:', preferences?.selectedTags);
    console.log('Preferences Search Rule:', preferences?.searchRule);
    console.log('Final Tags to Use:', tagsToUse);
    console.log('Final Search Rule to Use:', searchRuleToUse);
    
    // Determine if the user has any custom content (single internal query to avoid sequential runQuery calls)
    const contentSummary = await ctx.runQuery(internal.customContent.queries.getCustomContentSummaryInternal, authArgs as any);
    const hasCustom = !!contentSummary && (
      contentSummary.customCharactersCount > 0 ||
      contentSummary.customWorldLoreCount > 0 ||
      contentSummary.customSuggestionsCount > 0
    );

    // Calculate distribution
    const total = limit;
    if (!total || total <= 0) {
      return [];
    }

    let numCustom = 0;
    let numInspired = 0;
    let numFan = 0;

    if (hasCustom) {
      numCustom = Math.max(1, Math.floor(total * 0.4));
      numInspired = Math.max(0, Math.floor(total * 0.3));
      numFan = Math.max(0, total - numCustom - numInspired);
    } else {
      // Default mix 70/30 fanfiction/inspired when no custom
      numFan = Math.max(1, Math.floor(total * 0.7));
      numInspired = Math.max(0, total - numFan);
      numCustom = 0;
    }

    // Build a single feed context object for this request
    const feedContext: FeedContext = {
      userId: args.userId,
      sessionId: args.sessionId,
      limit,
      preferences: preferencesSnapshot
        ? {
            genre: preferencesSnapshot.genre || "adventure",
            storyType: normalizeStoryType(preferencesSnapshot.storyType),
            playerMode: preferencesSnapshot.playerMode || false,
            playerName: preferencesSnapshot.playerName,
            characterCount: normalizeCharacterCount(preferencesSnapshot.characterCount),
          }
        : {
            genre: preferences?.genre || "adventure",
            storyType: normalizeStoryType(preferences?.storyType),
            playerMode: preferences?.playerMode || false,
            playerName: preferences?.playerName,
            characterCount: normalizeCharacterCount(preferences?.characterCount),
          },
      selectedTags: tagsToUse,
      searchRule: searchRuleToUse,
      characterGroups: args.characterGroups,
      characterRoles: args.characterRoles,
      hasCustom,
      distribution: { custom: numCustom, inspired: numInspired, fan: numFan },
      timestamp: new Date().toISOString(),
    };

    // Helpful debug logging for context
    try { console.log('=== FEED CONTEXT ===', JSON.stringify(feedContext)); } catch {}

    // Helper to invoke generator
    const basePrefs = feedContext.preferences;

    // Run sequentially to avoid spiking Clerk provider discovery on initial page load
    const allBatches = await ctx.runAction(api.stories.suggestions.generateStorySuggestions, {
      ...authArgs,
      preferences: basePrefs,
      batches: [
        ...(numCustom > 0 ? [{ count: numCustom, forcedStoryType: 'custom' as const, selectedTags: feedContext.selectedTags, searchRule: feedContext.searchRule }] : []),
        ...(numInspired > 0 ? [{ count: numInspired, forcedStoryType: 'inspired' as const, selectedTags: feedContext.selectedTags, searchRule: feedContext.searchRule }] : []),
        ...(numFan > 0 ? [{ count: numFan, forcedStoryType: 'fanfiction' as const, selectedTags: feedContext.selectedTags, searchRule: feedContext.searchRule }] : []),
      ],
      characterGroups: feedContext.characterGroups,
      characterRoles: feedContext.characterRoles,
    });

    // Merge preserving order by interleaving for variety: custom -> inspired -> fanfiction cycle
    // Interleave by type from the unified result
    const customBatch = allBatches.filter((s) => s.metadata.storyType === 'custom');
    const inspiredBatch = allBatches.filter((s) => s.metadata.storyType === 'inspired');
    const fanBatch = allBatches.filter((s) => s.metadata.storyType === 'fanfiction');
    const merged: StorySuggestion[] = [];
    const maxLen = Math.max(customBatch.length, inspiredBatch.length, fanBatch.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < customBatch.length) merged.push(customBatch[i]);
      if (i < inspiredBatch.length) merged.push(inspiredBatch[i]);
      if (i < fanBatch.length) merged.push(fanBatch[i]);
    }

    // Trim to exact limit
    const result = merged.slice(0, total);
    return result;
  },
});