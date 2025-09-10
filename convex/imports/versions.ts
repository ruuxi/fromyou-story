import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import { Id } from "../_generated/dataModel"

// Create a new version of an import (when user updates their published import)
export const createNewVersion = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    itemType: v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook")),
    currentItemId: v.string(),
    changeDescription: v.optional(v.string()),
  },
  handler: async (ctx, { userId, sessionId, itemType, currentItemId, changeDescription }) => {
    // Get the current item
    let currentItem: any = null
    if (itemType === "preset") {
      currentItem = await ctx.db.get(currentItemId as Id<"importedPresets">)
    } else if (itemType === "character") {
      currentItem = await ctx.db.get(currentItemId as Id<"importedCharacters">)
    } else if (itemType === "lorebook") {
      currentItem = await ctx.db.get(currentItemId as Id<"importedLorebooks">)
    }

    if (!currentItem) {
      throw new Error("Item not found")
    }

    // Verify ownership
    if ((userId && currentItem.userId !== userId) || (sessionId && currentItem.sessionId !== sessionId)) {
      throw new Error("Unauthorized")
    }

    if (!currentItem.isPublic) {
      throw new Error("Item must be public to create versions")
    }

    // Get current version number
    const currentVersion = currentItem.version || currentItem.versionNumber || 1
    const newVersion = currentVersion + 1

    // Create version history record
    const versionId = await ctx.db.insert("importVersions", {
      itemType,
      currentItemId,
      previousItemId: currentItemId, // This would be the ID of the previous version
      authorId: currentItem.authorId,
      versionNumber: newVersion,
      changeDescription,
      createdAt: Date.now(),
    })

    // Update the current item's version number
    if (itemType === "preset") {
      await ctx.db.patch(currentItemId as Id<"importedPresets">, { 
        version: newVersion,
        publishedAt: Date.now(), // Update published time for new version
      })
    } else if (itemType === "character") {
      await ctx.db.patch(currentItemId as Id<"importedCharacters">, { 
        version: newVersion,
        publishedAt: Date.now(),
      })
    } else if (itemType === "lorebook") {
      await ctx.db.patch(currentItemId as Id<"importedLorebooks">, { 
        versionNumber: newVersion,
        publishedAt: Date.now(),
      })
    }

    // Notify users who liked or used this item
    await notifyItemUpdateSubscribers(ctx, currentItem, newVersion, changeDescription)

    return {
      versionId,
      newVersion,
      success: true,
    }
  },
})

// Get version history for an item
export const getVersionHistory = query({
  args: {
    itemType: v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook")),
    itemId: v.string(),
  },
  handler: async (ctx, { itemType, itemId }) => {
    const versions = await ctx.db
      .query("importVersions")
      .withIndex("by_current_item", (q) => q.eq("itemType", itemType).eq("currentItemId", itemId))
      .order("desc")
      .collect()

    // Get author info for each version
    const versionsWithAuthors = await Promise.all(
      versions.map(async (version) => {
        const author = await ctx.db.get(version.authorId)
        return {
          ...version,
          authorName: author?.name,
        }
      })
    )

    return versionsWithAuthors
  },
})

// Get items by author that users are following
export const getFollowedAuthorsUpdates = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, sessionId, limit = 20 }) => {
    if (!userId && !sessionId) {
      return []
    }

    // Get authors the user is following
    const follows = userId
      ? await ctx.db
          .query("importFollows")
          .withIndex("by_follower", (q) => q.eq("followerId", userId))
          .collect()
      : await ctx.db
          .query("importFollows")
          .withIndex("by_follower_session", (q) => q.eq("followerSessionId", sessionId!))
          .collect()

    if (follows.length === 0) {
      return []
    }

    const authorIds = follows.map(f => f.authorId)
    const updates = []

    // Get recent public items from followed authors
    for (const authorId of authorIds) {
      // Get recent presets
      const recentPresets = await ctx.db
        .query("importedPresets")
        .withIndex("by_author", (q) => q.eq("authorId", authorId))
        .filter((q) => q.and(q.eq(q.field("isPublic"), true), q.eq(q.field("isActive"), true)))
        .order("desc")
        .take(5)

      for (const preset of recentPresets) {
        updates.push({
          ...preset,
          itemType: "preset",
          timeAgo: getTimeAgo(preset.publishedAt || preset.importedAt),
        })
      }

      // Get recent characters
      const recentCharacters = await ctx.db
        .query("importedCharacters")
        .withIndex("by_author", (q) => q.eq("authorId", authorId))
        .filter((q) => q.and(q.eq(q.field("isPublic"), true), q.eq(q.field("isActive"), true)))
        .order("desc")
        .take(5)

      for (const character of recentCharacters) {
        updates.push({
          ...character,
          itemType: "character",
          timeAgo: getTimeAgo(character.publishedAt || character.importedAt),
        })
      }

      // Get recent lorebooks
      const recentLorebooks = await ctx.db
        .query("importedLorebooks")
        .withIndex("by_author", (q) => q.eq("authorId", authorId))
        .filter((q) => q.and(q.eq(q.field("isPublic"), true), q.eq(q.field("isActive"), true)))
        .order("desc")
        .take(5)

      for (const lorebook of recentLorebooks) {
        updates.push({
          ...lorebook,
          itemType: "lorebook",
          timeAgo: getTimeAgo(lorebook.publishedAt || lorebook.importedAt),
        })
      }
    }

    // Sort by published date and limit
    updates.sort((a, b) => (b.publishedAt || b.importedAt) - (a.publishedAt || a.importedAt))
    
    return updates.slice(0, limit)
  },
})

// Helper function to notify subscribers about item updates
async function notifyItemUpdateSubscribers(
  ctx: any, 
  item: any, 
  newVersion: number, 
  changeDescription?: string
) {
  // Get users who liked this item
  const itemType = item.itemType || getItemTypeFromTable(item)
  const likes = await ctx.db
    .query("importLikes")
    .withIndex("by_item", (q: any) => q.eq("itemType", itemType).eq("itemId", item._id))
    .collect()

  // Get users who used this item
  const usages = await ctx.db
    .query("importUsage")
    .withIndex("by_item", (q: any) => q.eq("itemType", itemType).eq("itemId", item._id))
    .collect()

  // Combine and deduplicate users
  const notificationTargets = new Set<string>()
  
  likes.forEach((like: any) => {
    if (like.userId && like.userId !== item.userId) {
      notificationTargets.add(like.userId)
    }
  })
  
  usages.forEach((usage: any) => {
    if (usage.userId && usage.userId !== item.userId) {
      notificationTargets.add(usage.userId)
    }
  })

  // Create notifications
  for (const targetUserId of notificationTargets) {
    await ctx.db.insert("importNotifications", {
      userId: targetUserId,
      type: "new_version",
      itemType,
      itemId: item._id,
      authorId: item.authorId,
      message: `${item.authorName || "An author"} updated "${item.name}" to v${newVersion}${changeDescription ? `: ${changeDescription}` : ""}`,
      isRead: false,
      createdAt: Date.now(),
    })
  }
}

// Helper function to determine item type from the item object
function getItemTypeFromTable(item: any): "preset" | "character" | "lorebook" {
  if (item.presetType) return "preset"
  if (item.personality) return "character"
  if (item.entries) return "lorebook"
  return "preset" // Default fallback
}

// Helper function to format time ago
function getTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}