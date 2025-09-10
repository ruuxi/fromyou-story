import { query, mutation, action, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { api, internal } from "../_generated/api";
import { authArgsValidator, buildIdentifierQuery, requireAuth, isAnonymous, buildIdentifierQueryNormalized } from "../lib/authHelpers";
import { assertStoryOwner, assertStoryOwnerInternal } from "./_helpers";

// Create a new story from a suggestion
export const createStory = mutation({
  args: {
    ...authArgsValidator.fields,
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
    playerName: v.optional(v.string()),
    selectedCharacters: v.array(v.string()),
  },
  returns: v.id("stories"),
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    const now = Date.now();
    
    // Get user settings for goon mode
    const authArgs = args.userId ? { userId: args.userId } : { sessionId: args.sessionId || '' };
    const userSettings = await ctx.runQuery(api.stories.settings.getCurrentSettings, authArgs);
    
    // Mark the suggestion as selected
    await ctx.runMutation(internal.stories.mutations.markSuggestionAsSelected, {
      userId: args.userId,
      sessionId: args.sessionId,
      suggestionId: args.suggestionId,
    });
    
    // Create the story
    const storyId = await ctx.db.insert("stories", {
      ...identifierQuery,
      suggestionId: args.suggestionId,
      suggestion: args.suggestion,
      playerName: args.playerName,
      selectedCharacters: args.selectedCharacters,
      pages: [], // Start with empty pages
      isActive: true,
      updatedAt: now,
      // Initialize with empty outline - will be generated before first page
      outlineStatus: "pending",
      currentChapter: 1,
      currentAct: 1,
      storyStatus: "ongoing",
    });

    // Schedule Act I outline generation in the background
    await ctx.scheduler.runAfter(0, internal.actions.storyOutline.generateAndSaveOutlineInternal as any, {
      userId: args.userId,
      sessionId: args.sessionId,
      storyId,
      storyPremise: args.suggestion.text,
      genre: args.suggestion.metadata.genre,
      storyType: args.suggestion.metadata.storyType,
      characterCount: args.suggestion.metadata.characterCount,
      playerMode: args.suggestion.metadata.playerMode,
      primarySource: args.suggestion.metadata.primarySource,
      mainCharacters: args.suggestion.characters.main_characters,
      sideCharacters: args.suggestion.characters.side_characters,
      // Derive from created story's genre
      goonMode: (args.suggestion.metadata.genre || '').toLowerCase() === 'goon-mode',
    });
    
    return storyId;
  },
});

// Get a story by ID
export const getStory = query({
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
        }),
      }),
      title: v.optional(v.string()),
      pages: v.array(v.object({
        content: v.string(),
        timestamp: v.number(),
      })),
      playerName: v.optional(v.string()),
      selectedCharacters: v.array(v.string()),
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
      // Story outline
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
    await requireAuth(ctx, args);
    
    const story = await ctx.db.get(args.storyId);
    if (!story) {
      return null;
    }
    
    // Check ownership
    const isOwner = isAnonymous(args)
      ? story.sessionId === args.sessionId
      : story.userId === args.userId;
      
    if (!isOwner) {
      return null; // Return null instead of throwing for better UX
    }
    
    return {
      ...story,
      createdAt: story._creationTime,
    };
  },
});

// Add a user message to a story
export const addUserMessage = internalMutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    storyId: v.id("stories"),
    text: v.string(),
    actionId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const story = await assertStoryOwnerInternal(ctx, args.storyId, args.userId, args.sessionId);

    const userMessages = story.userMessages ?? [];
    userMessages.push({
      text: args.text,
      timestamp: Date.now(),
      ...(args.actionId ? { actionId: args.actionId } : {}),
    });

    await ctx.db.patch(args.storyId, {
      userMessages,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Add a page to a story (internal - auth handled by caller)
export const addStoryPage = internalMutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    storyId: v.id("stories"),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const story = await assertStoryOwnerInternal(ctx, args.storyId, args.userId, args.sessionId);

    const newPage = {
      content: args.content,
      timestamp: Date.now(),
    };

    const updatedPages = [...story.pages, newPage];
    const newPageCount = updatedPages.length;

    await ctx.db.patch(args.storyId, {
      pages: updatedPages,
      updatedAt: Date.now(),
    });

    // Check if we need to generate a summary (every 15 pages)
    if (newPageCount >= 15 && newPageCount % 15 === 0) {
      // Calculate which pages to summarize (pages n-14 to n-5)
      const summaryStart = newPageCount - 14; // 1-indexed
      const summaryEnd = newPageCount - 5; // 1-indexed
      
      // Schedule summary generation in the background
      await ctx.scheduler.runAfter(0, internal.actions.storySummary.generateStorySummaryInternal as any, {
        storyId: args.storyId,
        pageStart: summaryStart,
        pageEnd: summaryEnd,
      });
    }

    // Background: trigger Act II and Act III outline generation when thresholds are met
    try {
      const hasOutline = !!story.outline;
      const actsCount = hasOutline ? story.outline!.acts.length : 0;

      const outlineToText = (outline: any) => {
        try {
          return outline.acts
            .map((act: any, ai: number) => {
              const actHeader = `ACT ${ai + 1}: ${act.title || `Act ${ai + 1}`}`;
              const chapters = act.chapters
                .map((ch: any, ci: number) => {
                  const beats = (ch.beats || []).map((b: string, bi: number) => `- Beat ${bi + 1}: ${b}`).join('\n');
                  return `Chapter ${ci + 1}: ${ch.title || `Chapter ${ci + 1}`}\n${beats}`;
                })
                .join('\n\n');
              return `${actHeader}\n${chapters}`;
            })
            .join('\n\n');
        } catch {
          return '';
        }
      };

      // Build recent pages excerpt (last 5 pages)
      const recentStart = Math.max(0, updatedPages.length - 5);
      const recentPagesText = updatedPages
        .slice(recentStart)
        .map((p, idx) => `Page ${recentStart + 1 + idx}:\n${p.content}`)
        .join('\n\n');

      const authArgs = story.userId ? { userId: story.userId } : { sessionId: story.sessionId || '' };

      // Trigger Act II after 8 pages if only Act I exists
      if (hasOutline && actsCount === 1 && newPageCount >= 8) {
        await ctx.scheduler.runAfter(0, internal.actions.storyOutline.generateAndAttachNextActInternal as any, {
          ...authArgs,
          storyId: args.storyId,
          actNumber: 2,
          previousOutlineText: outlineToText(story.outline),
          recentPagesText,
        });
      }

      // Trigger Act III after 16 pages if two acts exist
      if (hasOutline && actsCount === 2 && newPageCount >= 16) {
        await ctx.scheduler.runAfter(0, internal.actions.storyOutline.generateAndAttachNextActInternal as any, {
          ...authArgs,
          storyId: args.storyId,
          actNumber: 3,
          previousOutlineText: outlineToText(story.outline),
          recentPagesText,
        });
      }
    } catch (e) {
      console.error('Failed to schedule next act outline generation:', e);
    }

    return null;
  },
});

// Get user's stories
export const getUserStories = query({
  args: {
    ...authArgsValidator.fields,
    activeOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.any()),
  },
  returns: v.object({
    items: v.array(v.object({
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
    // Story outline
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
    })),
    nextCursor: v.optional(v.any()),
  }),
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const isUser = !!args.userId;
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    
    if (args.activeOnly) {
      const indexName = isUser ? "by_user_and_active" : "by_session_and_active";
      const field = isUser ? "userId" : "sessionId";
      const page = await ctx.db
        .query("stories")
        .withIndex(indexName, (q) => 
          q.eq(field, identifier).eq("isActive", true)
        )
        .order("desc")
        .paginate({ cursor: args.cursor, numItems: limit });
      return { 
        items: page.page.map(story => ({
          ...story,
          createdAt: story._creationTime,
        })),
        nextCursor: page.continueCursor 
      };
    } else {
      const indexName = isUser ? "by_user" : "by_session";
      const field = isUser ? "userId" : "sessionId";
      const page = await ctx.db
        .query("stories")
        .withIndex(indexName, (q) => 
          q.eq(field, identifier)
        )
        .order("desc")
        .paginate({ cursor: args.cursor, numItems: limit });
      return { 
        items: page.page.map(story => ({
          ...story,
          createdAt: story._creationTime,
        })),
        nextCursor: page.continueCursor 
      };
    }
  },
});

// Re-export sharing functions
export { 
  toggleStorySharing, 
  updateShareSettings, 
  getPublicStory, 
  getStoryShareInfo 
} from "./sharing";
