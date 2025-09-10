import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";

// Generate a random share token
function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Toggle story sharing on/off
export const toggleStorySharing = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    storyId: v.id("stories"),
    isPublic: v.boolean(),
    shareSettings: v.optional(v.object({
      allowEntireStory: v.boolean(),
      allowSpecificPages: v.boolean(),
      sharedPages: v.optional(v.array(v.number())),
    })),
  },
  handler: async (ctx, args) => {
    const { storyId, isPublic, shareSettings, ...authArgs } = args;
    
    // Get the story and verify ownership
    const story = await ctx.db.get(storyId);
    if (!story) {
      throw new Error("Story not found");
    }
    
    // Check ownership
    const isOwner = (authArgs.userId && story.userId === authArgs.userId) ||
                   (authArgs.sessionId && story.sessionId === authArgs.sessionId);
    
    if (!isOwner) {
      throw new Error("Not authorized to modify this story");
    }
    
    let updateData: any = { isPublic };
    
    if (isPublic) {
      // Generate share token if making public and doesn't have one
      if (!story.shareToken) {
        updateData.shareToken = generateShareToken();
      }
      updateData.sharedAt = Date.now();
      
      // Set default share settings if none provided
      updateData.shareSettings = shareSettings || {
        allowEntireStory: true,
        allowSpecificPages: true,
      };
    } else {
      // When making private, keep the token but update status
      updateData.shareSettings = undefined;
    }
    
    await ctx.db.patch(storyId, updateData);
    
    return {
      success: true,
      shareToken: updateData.shareToken || story.shareToken,
    };
  },
});

// Update share settings for a story
export const updateShareSettings = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    storyId: v.id("stories"),
    shareSettings: v.object({
      allowEntireStory: v.boolean(),
      allowSpecificPages: v.boolean(),
      sharedPages: v.optional(v.array(v.number())),
    }),
  },
  handler: async (ctx, args) => {
    const { storyId, shareSettings, ...authArgs } = args;
    
    const story = await ctx.db.get(storyId);
    if (!story) {
      throw new Error("Story not found");
    }
    
    // Check ownership
    const isOwner = (authArgs.userId && story.userId === authArgs.userId) ||
                   (authArgs.sessionId && story.sessionId === authArgs.sessionId);
    
    if (!isOwner) {
      throw new Error("Not authorized to modify this story");
    }
    
    await ctx.db.patch(storyId, { shareSettings });
    
    return { success: true };
  },
});

// Get a public story by share token (no auth required)
export const getPublicStory = query({
  args: {
    shareToken: v.string(),
    pageNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { shareToken, pageNumber } = args;
    
    // Find story by share token
    const story = await ctx.db
      .query("stories")
      .withIndex("by_share_token", (q) => q.eq("shareToken", shareToken))
      .filter((q) => q.eq(q.field("isPublic"), true))
      .first();
    
    if (!story) {
      return null;
    }
    
    // Check if the requested access is allowed
    const settings = story.shareSettings;
    if (!settings) {
      return null;
    }
    
    let allowedPages = story.pages;
    
    // If requesting entire story
    if (!pageNumber) {
      if (!settings.allowEntireStory) {
        return null;
      }
    } else {
      // If requesting specific page
      if (!settings.allowSpecificPages) {
        return null;
      }
      
      // Check if specific page is allowed
      if (settings.sharedPages && !settings.sharedPages.includes(pageNumber - 1)) {
        return null;
      }
      
      // Filter to only the requested page
      allowedPages = story.pages.slice(pageNumber - 1, pageNumber);
    }
    
    // Return public story data (without sensitive fields)
    return {
      _id: story._id,
      suggestion: story.suggestion,
      title: story.title,
      pages: allowedPages,
      selectedCharacters: story.selectedCharacters,
      outline: story.outline,
      currentChapter: story.currentChapter,
      currentAct: story.currentAct,
      storyStatus: story.storyStatus,
      shareSettings: story.shareSettings,
      sharedAt: story.sharedAt,
      createdAt: story.createdAt,
      isPublic: true,
    };
  },
});

// Get sharing info for a story (for owners)
export const getStoryShareInfo = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    storyId: v.id("stories"),
  },
  handler: async (ctx, args) => {
    const { storyId, ...authArgs } = args;
    
    const story = await ctx.db.get(storyId);
    if (!story) {
      return null;
    }
    
    // Check ownership
    const isOwner = (authArgs.userId && story.userId === authArgs.userId) ||
                   (authArgs.sessionId && story.sessionId === authArgs.sessionId);
    
    if (!isOwner) {
      return null;
    }
    
    return {
      isPublic: story.isPublic || false,
      shareToken: story.shareToken,
      shareSettings: story.shareSettings,
      sharedAt: story.sharedAt,
    };
  },
});