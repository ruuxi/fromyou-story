import { query } from "../_generated/server";
import { v } from "convex/values";
import { authArgsValidator, buildIdentifierQuery, requireAuth, getNormalizedAuthArgs } from "../lib/authHelpers";

// Get a story by ID with metadata
export const getStoryById = query({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
  },
  returns: v.union(
    v.object({
      _id: v.id("stories"),
      _creationTime: v.number(),
      userId: v.optional(v.string()),
      sessionId: v.optional(v.string()),
      suggestionId: v.string(),
      suggestion: v.object({
        text: v.string(),
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
          pov: v.optional(v.string()),
        }),
      }),
      title: v.optional(v.string()),
      pages: v.array(v.object({
        content: v.string(),
        timestamp: v.number(),
      })),
      playerName: v.optional(v.string()),
      selectedCharacters: v.array(v.string()),
      metadata: v.optional(v.object({
        primarySource: v.string(),
      })),
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
      // Progress fields
      currentChapter: v.optional(v.number()),
      currentAct: v.optional(v.number()),
      storyStatus: v.optional(v.union(
        v.literal("ongoing"),
        v.literal("act_complete"),
        v.literal("chapter_complete"),
        v.literal("story_complete")
      )),
      outline: v.optional(v.object({
        acts: v.array(v.object({
          title: v.optional(v.string()),
          chapters: v.array(v.object({
            title: v.optional(v.string()),
            beats: v.array(v.string())
          }))
        }))
      })),
      outlineVersion: v.optional(v.number()),
      outlineStatus: v.optional(v.union(
        v.literal("pending"),
        v.literal("complete"),
        v.literal("error")
      )),
      // Divergence and edits
      outlineDivergence: v.optional(v.array(v.object({
        pageIndex: v.number(),
        originalBeat: v.string(),
        actualContent: v.string(),
        timestamp: v.number()
      }))),
      pageEdits: v.optional(v.array(v.object({
        pageIndex: v.number(),
        originalContent: v.string(),
        editedContent: v.string(),
        editedAt: v.number()
      }))),
      userMessages: v.optional(v.array(v.object({
        text: v.string(),
        timestamp: v.number(),
        actionId: v.optional(v.string()),
      }))),
      // Story sharing fields
      isPublic: v.optional(v.boolean()),
      shareToken: v.optional(v.string()),
      sharedAt: v.optional(v.number()),
      shareSettings: v.optional(v.object({
        allowEntireStory: v.boolean(),
        allowSpecificPages: v.boolean(),
        sharedPages: v.optional(v.array(v.number())),
      })),
      authorName: v.optional(v.string()),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const normalized = await getNormalizedAuthArgs(ctx, args);
    const story = await ctx.db.get(args.storyId);
    if (!story) return null;
    const ownerOk = normalized.userId ? story.userId === normalized.userId : story.sessionId === normalized.sessionId;
    if (!ownerOk) return null;
    // Add metadata from suggestion for easier access
    return {
      ...story,
      createdAt: story._creationTime,
      metadata: {
        primarySource: story.suggestion.metadata.primarySource,
      }
    };
  },
});

// Get user's story history with calculated word counts
export const getStoryHistory = query({
  args: {
    ...authArgsValidator.fields,
    limit: v.optional(v.number()),
    cursor: v.optional(v.any()),
  },
  returns: v.object({
    items: v.array(v.object({
      _id: v.id("stories"),
      title: v.string(),
      characters: v.array(v.string()),
      wordCount: v.number(),
      createdAt: v.number(),
      updatedAt: v.number(),
    })),
    nextCursor: v.optional(v.any()),
  }),
  handler: async (ctx, args) => {
    const normalized = await getNormalizedAuthArgs(ctx, args);
    const identifier = normalized.userId || normalized.sessionId!;
    const isUser = !!normalized.userId;
    const limit = Math.min(Math.max(args.limit || 10, 1), 100);
    
    const indexName = isUser ? "by_user" : "by_session";
    const field = isUser ? "userId" : "sessionId";
    
    const page = await ctx.db
      .query("stories")
      .withIndex(indexName, (q) => 
        q.eq(field, identifier)
      )
      .order("desc")
      .paginate({ cursor: args.cursor, numItems: limit });

    const items = page.page.map(story => {
      // Calculate word count from all pages
      const wordCount = story.pages.reduce((total, page) => {
        return total + page.content.split(/\s+/).filter(word => word.length > 0).length;
      }, 0);
      
      // Get title from suggestion text (first line or truncated)
      const title = story.title || story.suggestion.text.split('\n')[0].substring(0, 100);
      
      // Get all unique characters
      const allCharacters = [
        ...story.suggestion.characters.main_characters,
        ...story.suggestion.characters.side_characters
      ].filter((char, index, self) => self.indexOf(char) === index);
      
      return {
        _id: story._id,
        title,
        characters: allCharacters,
        wordCount,
        createdAt: story._creationTime,
        updatedAt: story.updatedAt,
      };
    });

    return { items, nextCursor: page.continueCursor };
  },
});

// Check if user has more stories than the limit
export const hasMoreStories = query({
  args: {
    ...authArgsValidator.fields,
    currentLimit: v.number(),
    cursor: v.optional(v.any()),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const normalized = await getNormalizedAuthArgs(ctx, args);
    const identifier = normalized.userId || normalized.sessionId!;
    const isUser = !!normalized.userId;
    
    const indexName = isUser ? "by_user" : "by_session";
    const field = isUser ? "userId" : "sessionId";
    
    const page = await ctx.db
      .query("stories")
      .withIndex(indexName, (q) => 
        q.eq(field, identifier)
      )
      .order("desc")
      .paginate({ cursor: args.cursor, numItems: args.currentLimit + 1 });

    return page.page.length > args.currentLimit || !!page.continueCursor;
  },
});

// Get story summaries for a specific story
export const getStorySummaries = query({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
  },
  returns: v.array(v.object({
    _id: v.id("storySummaries"),
    _creationTime: v.number(),
    storyId: v.id("stories"),
    pageRange: v.object({
      start: v.number(),
      end: v.number()
    }),
    summary: v.object({
      plot: v.string(),
      characters: v.string(),
      keyEvents: v.array(v.string()),
      worldBuilding: v.optional(v.string())
    }),
    createdAt: v.number()
  })),
  handler: async (ctx, args) => {
    const normalized = await getNormalizedAuthArgs(ctx, args);
    const story = await ctx.db.get(args.storyId);
    if (!story) return [];
    const ownerOk = normalized.userId ? story.userId === normalized.userId : story.sessionId === normalized.sessionId;
    if (!ownerOk) return [];
    const summaries = await ctx.db
      .query("storySummaries")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .order("asc")
      .collect();
    
    return summaries.map(summary => ({
      ...summary,
      createdAt: summary._creationTime,
    }));
  },
});