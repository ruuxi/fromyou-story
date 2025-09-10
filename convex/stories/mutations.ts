import { mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { authArgsValidator, buildIdentifierQuery, requireAuth, isAnonymous } from "../lib/authHelpers";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { canonicaliseTag } from "../lib/tagHelpers";
import { assertStoryOwner, assertStoryOwnerInternal } from "./_helpers";

// Batch save multiple suggestions to the database (internal - auth handled by caller)
export const batchSaveSuggestionsInternal = internalMutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    suggestions: v.array(v.object({
      suggestionId: v.string(),
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
      tags: v.optional(v.array(v.string())),
      searchQuery: v.optional(v.string()),
    }))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identifierQuery = { userId: args.userId, sessionId: args.sessionId };
    const timestamp = Date.now();
    
    // Process all suggestions and collect unique tags
    const allTags = new Set<string>();
    for (const suggestion of args.suggestions) {
      if (suggestion.tags) {
        for (const tagName of suggestion.tags) {
          allTags.add(canonicaliseTag(tagName));
        }
      }
    }
    
    // Batch create/get tag IDs
    const tagIdMap = new Map<string, Id<"tags">>();
    for (const canonicalName of allTags) {
      let existingTag = await ctx.db
        .query("tags")
        .withIndex("by_name", (q) => q.eq("name", canonicalName))
        .first();
      
      if (existingTag) {
        tagIdMap.set(canonicalName, existingTag._id);
      } else {
        const tagId = await ctx.db.insert("tags", { name: canonicalName });
        tagIdMap.set(canonicalName, tagId);
      }
    }
    
    // Batch insert all suggestions
    const insertPromises = args.suggestions.map(suggestion => 
      ctx.db.insert("storySuggestions", {
        ...identifierQuery,
        suggestionId: suggestion.suggestionId,
        text: suggestion.text,
        characters: suggestion.characters,
        metadata: suggestion.metadata,
        tags: suggestion.tags,
        contentNSFW: suggestion.metadata.genre === "goon-mode",
        isSelected: false,
        searchQuery: suggestion.searchQuery,
      })
    );
    
    await Promise.all(insertPromises);
    return null;
  },
});

// Save a generated suggestion to the database (internal - auth handled by caller)
// Internal version for use by actions (no auth - already handled by caller)
export const saveSuggestionInternal = internalMutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    suggestionId: v.string(),
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
    tags: v.optional(v.array(v.string())),
    searchQuery: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identifierQuery = { userId: args.userId, sessionId: args.sessionId };
    
    // Upsert tags and get their IDs
    const tagIds: Id<"tags">[] = [];
    if (args.tags) {
      for (const tagName of args.tags) {
        const canonicalName = canonicaliseTag(tagName);
        
        // Check if tag already exists
        let tagId: Id<"tags">;
        const existingTag = await ctx.db
          .query("tags")
          .withIndex("by_name", (q) => q.eq("name", canonicalName))
          .first();
        
        if (existingTag) {
          tagId = existingTag._id;
        } else {
          // Create new tag
          tagId = await ctx.db.insert("tags", {
            name: canonicalName,
          });
        }
        
        tagIds.push(tagId);
      }
    }
    
    await ctx.db.insert("storySuggestions", {
      ...identifierQuery,
      suggestionId: args.suggestionId,
      text: args.text,
      characters: args.characters,
      metadata: args.metadata,
      tags: args.tags,
      contentNSFW: args.metadata.genre === "goon-mode",
      isSelected: false,
      searchQuery: args.searchQuery,
    });
    
    return null;
  },
});

// Public wrapper for frontend use (does auth)
export const saveSuggestion = mutation({
  args: {
    ...authArgsValidator.fields,
    suggestionId: v.string(),
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
    tags: v.optional(v.array(v.string())),
    searchQuery: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    await requireAuth(ctx, args);
    
    // Call internal version
    await ctx.runMutation(internal.stories.mutations.saveSuggestionInternal, {
      userId: args.userId,
      sessionId: args.sessionId,
      suggestionId: args.suggestionId,
      text: args.text,
      characters: args.characters,
      metadata: args.metadata,
      tags: args.tags,
      searchQuery: args.searchQuery,
    });
    
    return null;
  },
});

// Mark a suggestion as selected when user creates a story from it (internal - auth handled by caller)
export const markSuggestionAsSelected = internalMutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    suggestionId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Find the suggestion by ID
    const suggestion = await ctx.db
      .query("storySuggestions")
      .withIndex("by_suggestion_id", (q) => q.eq("suggestionId", args.suggestionId))
      .first();
    
    if (!suggestion) {
      throw new Error("Suggestion not found");
    }
    
    // Verify ownership
    const isOwner = args.userId 
      ? suggestion.userId === args.userId 
      : suggestion.sessionId === args.sessionId;
      
    if (!isOwner) {
      throw new Error("Unauthorized to update this suggestion");
    }
    
    // Update the suggestion
    await ctx.db.patch(suggestion._id, {
      isSelected: true,
      selectedAt: Date.now(),
    });
    
    return null;
  },
});

// Update story progress (chapter/act)
export const updateStoryProgress = internalMutation({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    currentChapter: v.number(),
    currentAct: v.number(),
    storyStatus: v.union(
      v.literal("ongoing"),
      v.literal("act_complete"),
      v.literal("chapter_complete"),
      v.literal("story_complete")
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const story = await assertStoryOwner(ctx, args.storyId, args);

    await ctx.db.patch(args.storyId, {
      currentChapter: args.currentChapter,
      currentAct: args.currentAct,
      storyStatus: args.storyStatus,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Update story outline (internal - auth handled by caller)
export const updateStoryOutline = internalMutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    storyId: v.id("stories"),
    outline: v.optional(v.object({
      acts: v.array(v.object({
        title: v.optional(v.string()),
        chapters: v.array(v.object({
          title: v.optional(v.string()),
          beats: v.array(v.string())
        }))
      }))
    })),
    outlineStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("error")
    )),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const story = await assertStoryOwnerInternal(ctx, args.storyId, args.userId, args.sessionId);

    const currentVersion = story.outlineVersion || 0;
    const updateData: any = {
      updatedAt: Date.now(),
    };

    if (args.outline) {
      updateData.outline = args.outline;
      updateData.outlineVersion = currentVersion + 1;
      updateData.currentChapter = 1;
      updateData.currentAct = 1;
      updateData.storyStatus = "ongoing";
    }

    if (args.outlineStatus) {
      updateData.outlineStatus = args.outlineStatus;
    }

    await ctx.db.patch(args.storyId, updateData);

    return null;
  },
});

// Save page edit
export const savePageEdit = mutation({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    pageIndex: v.number(),
    editedContent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const story = await assertStoryOwner(ctx, args.storyId, args);

    // Get the original content
    const originalContent = story.pages[args.pageIndex]?.content;
    if (!originalContent) {
      throw new Error("Page not found");
    }

    // Update the page content
    const updatedPages = [...story.pages];
    updatedPages[args.pageIndex] = {
      ...updatedPages[args.pageIndex],
      content: args.editedContent,
    };

    // Track the edit
    const pageEdit = {
      pageIndex: args.pageIndex,
      originalContent,
      editedContent: args.editedContent,
      editedAt: Date.now(),
    };

    const existingEdits = story.pageEdits || [];
    const updatedEdits = [...existingEdits, pageEdit];

    await ctx.db.patch(args.storyId, {
      pages: updatedPages,
      pageEdits: updatedEdits,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Track outline divergence
export const trackOutlineDivergence = internalMutation({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    pageIndex: v.number(),
    originalBeat: v.string(),
    actualContent: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const story = await assertStoryOwner(ctx, args.storyId, args);

    const divergence = {
      pageIndex: args.pageIndex,
      originalBeat: args.originalBeat,
      actualContent: args.actualContent,
      timestamp: Date.now(),
    };

    const existingDivergences = story.outlineDivergence || [];
    const updatedDivergences = [...existingDivergences, divergence];

    await ctx.db.patch(args.storyId, {
      outlineDivergence: updatedDivergences,
      updatedAt: Date.now(),
    });

    return null;
  },
});

// Save story summary
export const saveStorySummary = internalMutation({
  args: {
    ...authArgsValidator.fields,
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
  },
  returns: v.id("storySummaries"),
  handler: async (ctx, args) => {
    const story = await assertStoryOwner(ctx, args.storyId, args);

    return await ctx.db.insert("storySummaries", {
      storyId: args.storyId,
      pageRange: args.pageRange,
      summary: args.summary,
    });
  },
});

// Delete a page from a story by index (public - requires ownership)
export const deleteStoryPage = mutation({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    pageIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const story = await assertStoryOwner(ctx, args.storyId, args);
    const { pageIndex } = args;
    if (pageIndex < 0 || pageIndex >= story.pages.length) {
      throw new Error("Invalid page index");
    }
    const updatedPages = story.pages.filter((_, idx) => idx !== pageIndex);
    await ctx.db.patch(args.storyId, {
      pages: updatedPages,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Delete a page and its preceding user message (if any) by page index.
// For pageIndex === 0, there is no persisted preceding user message ("Start the story" is not saved),
// so only the page is removed.
export const deleteStoryPageAndPrecedingUserMessage = mutation({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    pageIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const story = await assertStoryOwner(ctx, args.storyId, args);
    const { pageIndex } = args;
    if (pageIndex < 0 || pageIndex >= story.pages.length) {
      throw new Error("Invalid page index");
    }

    // Remove the page at pageIndex
    const updatedPages = story.pages.filter((_, idx) => idx !== pageIndex);

    // Remove the corresponding preceding user message if pageIndex > 0
    // Mapping: for page k (k>=1), preceding user message is at index k-1
    const userMessages = story.userMessages || [];
    const updatedUserMessages = pageIndex === 0
      ? userMessages
      : userMessages.filter((_, idx) => idx !== (pageIndex - 1));

    await ctx.db.patch(args.storyId, {
      pages: updatedPages,
      userMessages: updatedUserMessages,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Truncate a story's timeline at the provided page index.
// Keeps pages [0..pageIndex-1]. For userMessages, keeps [0..pageIndex-2] (since page 0 has no saved user message).
export const truncateStoryAtPageIndex = mutation({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    pageIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const story = await assertStoryOwner(ctx, args.storyId, args);
    const { pageIndex } = args;

    if (pageIndex < 0 || pageIndex > story.pages.length) {
      throw new Error("Invalid page index for truncation");
    }

    const truncatedPages = story.pages.slice(0, pageIndex);
    const userMessages = story.userMessages || [];
    // Number of user messages to keep is max(0, pageIndex - 1)
    const keepUserMessages = Math.max(0, pageIndex - 1);
    const truncatedUserMessages = userMessages.slice(0, keepUserMessages);

    await ctx.db.patch(args.storyId, {
      pages: truncatedPages,
      userMessages: truncatedUserMessages,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Delete a persisted user message by its index in the story.userMessages array
export const deleteUserMessageAtIndex = mutation({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    messageIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const story = await assertStoryOwner(ctx, args.storyId, args);
    const { messageIndex } = args;
    const userMessages = story.userMessages || [];
    if (messageIndex < 0 || messageIndex >= userMessages.length) {
      return null; // nothing to delete
    }
    const updatedMessages = userMessages.filter((_, idx) => idx !== messageIndex);
    await ctx.db.patch(args.storyId, {
      userMessages: updatedMessages,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update story title
export const updateStoryTitle = mutation({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertStoryOwner(ctx, args.storyId, args);
    await ctx.db.patch(args.storyId, {
      title: args.title,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Delete a story (and related summaries)
export const deleteStory = mutation({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await assertStoryOwner(ctx, args.storyId, args);
    // Best-effort cleanup of related summaries
    const summaries = await ctx.db
      .query("storySummaries")
      .withIndex("by_story", (q) => q.eq("storyId", args.storyId))
      .collect();
    for (const summary of summaries) {
      await ctx.db.delete(summary._id);
    }
    await ctx.db.delete(args.storyId);
    return null;
  },
});

