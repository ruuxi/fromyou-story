import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import { Id } from "../_generated/dataModel"

// Toggle public/private status of an import
export const togglePublicStatus = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    itemType: v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook")),
    itemId: v.string(),
    isPublic: v.boolean(),
    authorName: v.optional(v.string()), // User's display name when making public
  },
  handler: async (ctx, { userId, sessionId, itemType, itemId, isPublic, authorName }) => {
    // Get the user record for authorId
    let user = null
    if (userId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_external_id", (q) => q.eq("externalId", userId))
        .first()
    }

    const authorId = user?._id

    // Get the item and verify ownership
    let item: any = null
    if (itemType === "preset") {
      item = await ctx.db.get(itemId as Id<"importedPresets">)
      if (!item || (userId && item.userId !== userId) || (sessionId && item.sessionId !== sessionId)) {
        throw new Error("Unauthorized access to preset")
      }
    } else if (itemType === "character") {
      item = await ctx.db.get(itemId as Id<"importedCharacters">)
      if (!item || (userId && item.userId !== userId) || (sessionId && item.sessionId !== sessionId)) {
        throw new Error("Unauthorized access to character")
      }
    } else if (itemType === "lorebook") {
      item = await ctx.db.get(itemId as Id<"importedLorebooks">)
      if (!item || (userId && item.userId !== userId) || (sessionId && item.sessionId !== sessionId)) {
        throw new Error("Unauthorized access to lorebook")
      }
    }

    if (!item) {
      throw new Error("Item not found")
    }

    // Update the item with public status
    const updateData: any = {
      isPublic,
      authorId: isPublic ? authorId : undefined,
      authorName: isPublic ? (authorName || user?.name) : undefined,
      publishedAt: isPublic ? Date.now() : undefined,
    }

    // Initialize counts if making public for the first time
    if (isPublic && !item.isPublic) {
      updateData.likesCount = 0
      updateData.usesCount = 0
      updateData.version = 1
    }

    if (itemType === "preset") {
      await ctx.db.patch(itemId as Id<"importedPresets">, updateData)
    } else if (itemType === "character") {
      await ctx.db.patch(itemId as Id<"importedCharacters">, updateData)
    } else if (itemType === "lorebook") {
      updateData.versionNumber = updateData.version
      delete updateData.version
      await ctx.db.patch(itemId as Id<"importedLorebooks">, updateData)
    }

    return { success: true }
  },
})

// Like or unlike an import
export const toggleLike = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    itemType: v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook")),
    itemId: v.string(),
  },
  handler: async (ctx, { userId, sessionId, itemType, itemId }) => {
    // Check if already liked
    const existingLike = userId
      ? await ctx.db
          .query("importLikes")
          .withIndex("by_user_item", (q) => 
            q.eq("userId", userId).eq("itemType", itemType).eq("itemId", itemId)
          )
          .first()
      : sessionId
      ? await ctx.db
          .query("importLikes")
          .withIndex("by_session_item", (q) => 
            q.eq("sessionId", sessionId).eq("itemType", itemType).eq("itemId", itemId)
          )
          .first()
      : null

    // Get the item to get author info
    let item: any = null
    if (itemType === "preset") {
      item = await ctx.db.get(itemId as Id<"importedPresets">)
    } else if (itemType === "character") {
      item = await ctx.db.get(itemId as Id<"importedCharacters">)
    } else if (itemType === "lorebook") {
      item = await ctx.db.get(itemId as Id<"importedLorebooks">)
    }

    if (!item || !item.isPublic || !item.authorId) {
      throw new Error("Item not found or not public")
    }

    if (existingLike) {
      // Unlike - remove the like
      await ctx.db.delete(existingLike._id)
      
      // Update like count
      const newCount = Math.max(0, (item.likesCount || 0) - 1)
      if (itemType === "preset") {
        await ctx.db.patch(itemId as Id<"importedPresets">, { likesCount: newCount })
      } else if (itemType === "character") {
        await ctx.db.patch(itemId as Id<"importedCharacters">, { likesCount: newCount })
      } else if (itemType === "lorebook") {
        await ctx.db.patch(itemId as Id<"importedLorebooks">, { likesCount: newCount })
      }

      return { liked: false, likesCount: newCount }
    } else {
      // Like - add the like
      await ctx.db.insert("importLikes", {
        userId,
        sessionId,
        itemType,
        itemId,
        authorId: item.authorId,
        likedAt: Date.now(),
      })

      // Update like count
      const newCount = (item.likesCount || 0) + 1
      if (itemType === "preset") {
        await ctx.db.patch(itemId as Id<"importedPresets">, { likesCount: newCount })
      } else if (itemType === "character") {
        await ctx.db.patch(itemId as Id<"importedCharacters">, { likesCount: newCount })
      } else if (itemType === "lorebook") {
        await ctx.db.patch(itemId as Id<"importedLorebooks">, { likesCount: newCount })
      }

      // Create notification for the author (if not liking own item)
      if (item.authorId && userId !== item.userId) {
        const liker = userId ? await ctx.db
          .query("users")
          .withIndex("by_external_id", (q) => q.eq("externalId", userId))
          .first() : null

        const likerName = liker?.name || "Someone"
        await ctx.db.insert("importNotifications", {
          userId: item.userId,
          sessionId: item.sessionId,
          type: "item_liked",
          itemType,
          itemId,
          authorId: item.authorId,
          triggerUserId: userId,
          message: `${likerName} liked your ${itemType} "${item.name}"`,
          isRead: false,
          createdAt: Date.now(),
        })
      }

      return { liked: true, likesCount: newCount }
    }
  },
})

// Follow or unfollow an author
export const toggleFollow = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    authorId: v.id("users"),
  },
  handler: async (ctx, { userId, sessionId, authorId }) => {
    // Check if already following
    const existingFollow = userId
      ? await ctx.db
          .query("importFollows")
          .withIndex("by_follower_author", (q) => q.eq("followerId", userId).eq("authorId", authorId))
          .first()
      : sessionId
      ? await ctx.db
          .query("importFollows")
          .withIndex("by_session_author", (q) => q.eq("followerSessionId", sessionId).eq("authorId", authorId))
          .first()
      : null

    if (existingFollow) {
      // Unfollow
      await ctx.db.delete(existingFollow._id)
      return { following: false }
    } else {
      // Follow
      await ctx.db.insert("importFollows", {
        followerId: userId,
        followerSessionId: sessionId,
        authorId,
        followedAt: Date.now(),
      })

      // Create notification for the author
      const follower = userId ? await ctx.db
        .query("users")
        .withIndex("by_external_id", (q) => q.eq("externalId", userId))
        .first() : null

      const followerName = follower?.name || "Someone"
      const author = await ctx.db.get(authorId)
      if (author) {
        await ctx.db.insert("importNotifications", {
          userId: author.externalId,
          type: "new_follower",
          authorId,
          triggerUserId: userId,
          message: `${followerName} started following you`,
          isRead: false,
          createdAt: Date.now(),
        })
      }

      return { following: true }
    }
  },
})

// Record usage of an import (when someone applies it to their chat)
export const recordUsage = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    itemType: v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook")),
    itemId: v.string(),
    chatId: v.optional(v.id("characterChats")),
  },
  handler: async (ctx, { userId, sessionId, itemType, itemId, chatId }) => {
    // Get the item to verify it's public and get author info
    let item: any = null
    if (itemType === "preset") {
      item = await ctx.db.get(itemId as Id<"importedPresets">)
    } else if (itemType === "character") {
      item = await ctx.db.get(itemId as Id<"importedCharacters">)
    } else if (itemType === "lorebook") {
      item = await ctx.db.get(itemId as Id<"importedLorebooks">)
    }

    if (!item || !item.isPublic || !item.authorId) {
      throw new Error("Item not found or not public")
    }

    // Record the usage
    await ctx.db.insert("importUsage", {
      userId,
      sessionId,
      itemType,
      itemId,
      authorId: item.authorId,
      chatId,
      usedAt: Date.now(),
    })

    // Update usage count
    const newCount = (item.usesCount || 0) + 1
    if (itemType === "preset") {
      await ctx.db.patch(itemId as Id<"importedPresets">, { usesCount: newCount })
    } else if (itemType === "character") {
      await ctx.db.patch(itemId as Id<"importedCharacters">, { usesCount: newCount })
    } else if (itemType === "lorebook") {
      await ctx.db.patch(itemId as Id<"importedLorebooks">, { usesCount: newCount })
    }

    return { success: true, usesCount: newCount }
  },
})

// Get user's like status for an item
export const getUserLikeStatus = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    itemType: v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook")),
    itemId: v.string(),
  },
  handler: async (ctx, { userId, sessionId, itemType, itemId }) => {
    const like = userId
      ? await ctx.db
          .query("importLikes")
          .withIndex("by_user_item", (q) => 
            q.eq("userId", userId).eq("itemType", itemType).eq("itemId", itemId)
          )
          .first()
      : sessionId
      ? await ctx.db
          .query("importLikes")
          .withIndex("by_session_item", (q) => 
            q.eq("sessionId", sessionId).eq("itemType", itemType).eq("itemId", itemId)
          )
          .first()
      : null

    return { liked: !!like }
  },
})

// Get user's follow status for an author
export const getUserFollowStatus = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    authorId: v.id("users"),
  },
  handler: async (ctx, { userId, sessionId, authorId }) => {
    const follow = userId
      ? await ctx.db
          .query("importFollows")
          .withIndex("by_follower_author", (q) => q.eq("followerId", userId).eq("authorId", authorId))
          .first()
      : sessionId
      ? await ctx.db
          .query("importFollows")
          .withIndex("by_session_author", (q) => q.eq("followerSessionId", sessionId).eq("authorId", authorId))
          .first()
      : null

    return { following: !!follow }
  },
})

// Get notifications for a user
export const getUserNotifications = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, sessionId, limit = 20 }) => {
    if (!userId && !sessionId) {
      return []
    }

    const notifications = userId
      ? await ctx.db
          .query("importNotifications")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .order("desc")
          .take(limit)
      : await ctx.db
          .query("importNotifications")
          .withIndex("by_session", (q) => q.eq("sessionId", sessionId!))
          .order("desc")
          .take(limit)

    return notifications
  },
})

// Mark notifications as read
export const markNotificationsRead = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    notificationIds: v.optional(v.array(v.id("importNotifications"))),
  },
  handler: async (ctx, { userId, sessionId, notificationIds }) => {
    if (!userId && !sessionId) {
      throw new Error("Authentication required")
    }

    if (notificationIds && notificationIds.length > 0) {
      // Mark specific notifications as read
      for (const id of notificationIds) {
        const notification = await ctx.db.get(id)
        if (notification && 
            ((userId && notification.userId === userId) || 
             (sessionId && notification.sessionId === sessionId))) {
          await ctx.db.patch(id, { isRead: true })
        }
      }
    } else {
      // Mark all unread notifications as read
      const unreadNotifications = userId
        ? await ctx.db
            .query("importNotifications")
            .withIndex("by_user_unread", (q) => q.eq("userId", userId).eq("isRead", false))
            .collect()
        : await ctx.db
            .query("importNotifications")
            .withIndex("by_session_unread", (q) => q.eq("sessionId", sessionId!).eq("isRead", false))
            .collect()

      for (const notification of unreadNotifications) {
        await ctx.db.patch(notification._id, { isRead: true })
      }
    }

    return { success: true }
  },
})