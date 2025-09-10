import { query } from "../_generated/server"
import { v } from "convex/values"
import { paginationOptsValidator } from "convex/server"

// Get public feed of imports with pagination (separate queries for each type)
export const getPublicPresets = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"), v.literal("most_liked"), v.literal("most_used"))),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, sortBy = "newest", userId, sessionId, searchQuery }) => {
    let presetsQuery

    // If search query is provided, use search index
    if (searchQuery && searchQuery.trim()) {
      presetsQuery = ctx.db
        .query("importedPresets")
        .withSearchIndex("search_name", (q) =>
          q.search("name", searchQuery.trim()).eq("isPublic", true).eq("isActive", true)
        )
    } else {
      // Use regular indexes for non-search queries
      if (sortBy === "most_liked") {
        presetsQuery = ctx.db
          .query("importedPresets")
          .withIndex("by_public_likes", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      } else if (sortBy === "most_used") {
        presetsQuery = ctx.db
          .query("importedPresets")
          .withIndex("by_public_uses", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      } else if (sortBy === "newest") {
        presetsQuery = ctx.db
          .query("importedPresets")
          .withIndex("by_public_published", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      } else {
        presetsQuery = ctx.db
          .query("importedPresets")
          .withIndex("by_public", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      }
    }

    const presets = await presetsQuery.paginate(paginationOpts)

    const processedPage = await Promise.all(
      presets.page.map(async (preset) => {
        let userLiked = false
        if (userId || sessionId) {
          const like = userId
            ? await ctx.db
                .query("importLikes")
                .withIndex("by_user_item", (q) => 
                  q.eq("userId", userId).eq("itemType", "preset").eq("itemId", preset._id)
                )
                .first()
            : await ctx.db
                .query("importLikes")
                .withIndex("by_session_item", (q) => 
                  q.eq("sessionId", sessionId!).eq("itemType", "preset").eq("itemId", preset._id)
                )
                .first()
          userLiked = !!like
        }

        return {
          ...preset,
          itemType: "preset",
          userLiked,
          timeAgo: getTimeAgo(preset.publishedAt || preset.importedAt),
        }
      })
    )

    return {
      ...presets,
      page: processedPage,
    }
  },
})

export const getPublicCharacters = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"), v.literal("most_liked"), v.literal("most_used"))),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, sortBy = "newest", userId, sessionId, searchQuery }) => {
    let charactersQuery

    // If search query is provided, use search index
    if (searchQuery && searchQuery.trim()) {
      charactersQuery = ctx.db
        .query("importedCharacters")
        .withSearchIndex("search_name", (q) =>
          q.search("name", searchQuery.trim()).eq("isPublic", true).eq("isActive", true)
        )
    } else {
      // Use regular indexes for non-search queries
      if (sortBy === "most_liked") {
        charactersQuery = ctx.db
          .query("importedCharacters")
          .withIndex("by_public_likes", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      } else if (sortBy === "most_used") {
        charactersQuery = ctx.db
          .query("importedCharacters")
          .withIndex("by_public_uses", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      } else if (sortBy === "newest") {
        charactersQuery = ctx.db
          .query("importedCharacters")
          .withIndex("by_public_published", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      } else {
        charactersQuery = ctx.db
          .query("importedCharacters")
          .withIndex("by_public", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      }
    }

    const characters = await charactersQuery.paginate(paginationOpts)

    const processedPage = await Promise.all(
      characters.page.map(async (character) => {
        let userLiked = false
        if (userId || sessionId) {
          const like = userId
            ? await ctx.db
                .query("importLikes")
                .withIndex("by_user_item", (q) => 
                  q.eq("userId", userId).eq("itemType", "character").eq("itemId", character._id)
                )
                .first()
            : await ctx.db
                .query("importLikes")
                .withIndex("by_session_item", (q) => 
                  q.eq("sessionId", sessionId!).eq("itemType", "character").eq("itemId", character._id)
                )
                .first()
          userLiked = !!like
        }

        return {
          ...character,
          itemType: "character",
          userLiked,
          timeAgo: getTimeAgo(character.publishedAt || character.importedAt),
        }
      })
    )

    return {
      ...characters,
      page: processedPage,
    }
  },
})

export const getPublicLorebooks = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sortBy: v.optional(v.union(v.literal("newest"), v.literal("oldest"), v.literal("most_liked"), v.literal("most_used"))),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, { paginationOpts, sortBy = "newest", userId, sessionId, searchQuery }) => {
    let lorebooksQuery

    // If search query is provided, use search index
    if (searchQuery && searchQuery.trim()) {
      lorebooksQuery = ctx.db
        .query("importedLorebooks")
        .withSearchIndex("search_name", (q) =>
          q.search("name", searchQuery.trim()).eq("isPublic", true).eq("isActive", true)
        )
    } else {
      // Use regular indexes for non-search queries
      if (sortBy === "most_liked") {
        lorebooksQuery = ctx.db
          .query("importedLorebooks")
          .withIndex("by_public_likes", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      } else if (sortBy === "most_used") {
        lorebooksQuery = ctx.db
          .query("importedLorebooks")
          .withIndex("by_public_uses", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      } else if (sortBy === "newest") {
        lorebooksQuery = ctx.db
          .query("importedLorebooks")
          .withIndex("by_public_published", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      } else {
        lorebooksQuery = ctx.db
          .query("importedLorebooks")
          .withIndex("by_public", (q) => q.eq("isPublic", true))
          .filter((q) => q.eq(q.field("isActive"), true))
      }
    }

    const lorebooks = await lorebooksQuery.paginate(paginationOpts)

    const processedPage = await Promise.all(
      lorebooks.page.map(async (lorebook) => {
        let userLiked = false
        if (userId || sessionId) {
          const like = userId
            ? await ctx.db
                .query("importLikes")
                .withIndex("by_user_item", (q) => 
                  q.eq("userId", userId).eq("itemType", "lorebook").eq("itemId", lorebook._id)
                )
                .first()
            : await ctx.db
                .query("importLikes")
                .withIndex("by_session_item", (q) => 
                  q.eq("sessionId", sessionId!).eq("itemType", "lorebook").eq("itemId", lorebook._id)
                )
                .first()
          userLiked = !!like
        }

        return {
          ...lorebook,
          itemType: "lorebook",
          userLiked,
          timeAgo: getTimeAgo(lorebook.publishedAt || lorebook.importedAt),
        }
      })
    )

    return {
      ...lorebooks,
      page: processedPage,
    }
  },
})

// Get imports by a specific author
export const getAuthorImports = query({
  args: {
    authorId: v.id("users"),
    paginationOpts: paginationOptsValidator,
    itemType: v.optional(v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook"), v.literal("all"))),
    userId: v.optional(v.string()), // For checking user's like status
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { authorId, paginationOpts, itemType = "all", userId, sessionId }) => {
    const results = []

    // Helper function to add common fields and check like status
    const processItem = async (item: any, type: string) => {
      let userLiked = false
      if (userId || sessionId) {
        const like = userId
          ? await ctx.db
              .query("importLikes")
              .withIndex("by_user_item", (q) => 
                q.eq("userId", userId).eq("itemType", type as any).eq("itemId", item._id)
              )
              .first()
          : await ctx.db
              .query("importLikes")
              .withIndex("by_session_item", (q) => 
                q.eq("sessionId", sessionId!).eq("itemType", type as any).eq("itemId", item._id)
              )
              .first()
        userLiked = !!like
      }

      return {
        ...item,
        itemType: type,
        userLiked,
        timeAgo: getTimeAgo(item.publishedAt || item.importedAt),
      }
    }

    // Get public items by this author
    if (itemType === "all" || itemType === "preset") {
      const presets = await ctx.db
        .query("importedPresets")
        .withIndex("by_author", (q) => q.eq("authorId", authorId))
        .filter((q) => q.and(q.eq(q.field("isPublic"), true), q.eq(q.field("isActive"), true)))
        .order("desc")
        .collect()

      for (const preset of presets) {
        const processed = await processItem(preset, "preset")
        results.push(processed)
      }
    }

    if (itemType === "all" || itemType === "character") {
      const characters = await ctx.db
        .query("importedCharacters")
        .withIndex("by_author", (q) => q.eq("authorId", authorId))
        .filter((q) => q.and(q.eq(q.field("isPublic"), true), q.eq(q.field("isActive"), true)))
        .order("desc")
        .collect()

      for (const character of characters) {
        const processed = await processItem(character, "character")
        results.push(processed)
      }
    }

    if (itemType === "all" || itemType === "lorebook") {
      const lorebooks = await ctx.db
        .query("importedLorebooks")
        .withIndex("by_author", (q) => q.eq("authorId", authorId))
        .filter((q) => q.and(q.eq(q.field("isPublic"), true), q.eq(q.field("isActive"), true)))
        .order("desc")
        .collect()

      for (const lorebook of lorebooks) {
        const processed = await processItem(lorebook, "lorebook")
        results.push(processed)
      }
    }

    // Sort by newest first
    results.sort((a, b) => (b.publishedAt || b.importedAt) - (a.publishedAt || a.importedAt))

    // Manual pagination
    const page = paginationOpts.numItems || 20
    const startIndex = 0
    const endIndex = startIndex + page

    return {
      page: results.slice(startIndex, endIndex),
      isDone: results.length < page,
      continueCursor: results.length >= page ? `${endIndex}` : undefined,
    }
  },
})

// Get trending authors (based on recent likes and follows)
export const getTrendingAuthors = query({
  args: {
    limit: v.optional(v.number()),
    days: v.optional(v.number()), // Look at activity in the last N days
  },
  handler: async (ctx, { limit = 10, days = 7 }) => {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000)

    // Get recent likes grouped by author
    const recentLikes = await ctx.db
      .query("importLikes")
      .filter((q) => q.gte(q.field("likedAt"), cutoffTime))
      .collect()

    // Get recent follows
    const recentFollows = await ctx.db
      .query("importFollows")
      .filter((q) => q.gte(q.field("followedAt"), cutoffTime))
      .collect()

    // Count activity per author
    const authorActivity: Record<string, { likes: number; follows: number; authorId: string }> = {}

    recentLikes.forEach(like => {
      const authorId = like.authorId
      if (!authorActivity[authorId]) {
        authorActivity[authorId] = { likes: 0, follows: 0, authorId }
      }
      authorActivity[authorId].likes++
    })

    recentFollows.forEach(follow => {
      const authorId = follow.authorId
      if (!authorActivity[authorId]) {
        authorActivity[authorId] = { likes: 0, follows: 0, authorId }
      }
      authorActivity[authorId].follows++
    })

    // Calculate trending score (likes + follows * 3)
    const scoredAuthors = Object.values(authorActivity)
      .map(activity => ({
        ...activity,
        score: activity.likes + (activity.follows * 3)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    // Get author details
    const authors = []
    for (const activity of scoredAuthors) {
      const author = await ctx.db.get(activity.authorId as any)
      if (author) {
        // Count total public items by this author
        const [presetCount, characterCount, lorebookCount] = await Promise.all([
          ctx.db
            .query("importedPresets")
            .withIndex("by_author", (q) => q.eq("authorId", activity.authorId as any))
            .filter((q) => q.and(q.eq(q.field("isPublic"), true), q.eq(q.field("isActive"), true)))
            .collect()
            .then(items => items.length),
          ctx.db
            .query("importedCharacters")
            .withIndex("by_author", (q) => q.eq("authorId", activity.authorId as any))
            .filter((q) => q.and(q.eq(q.field("isPublic"), true), q.eq(q.field("isActive"), true)))
            .collect()
            .then(items => items.length),
          ctx.db
            .query("importedLorebooks")
            .withIndex("by_author", (q) => q.eq("authorId", activity.authorId as any))
            .filter((q) => q.and(q.eq(q.field("isPublic"), true), q.eq(q.field("isActive"), true)))
            .collect()
            .then(items => items.length),
        ])

        authors.push({
          ...author,
          recentLikes: activity.likes,
          recentFollows: activity.follows,
          trendingScore: activity.score,
          totalItems: presetCount + characterCount + lorebookCount,
          itemCounts: {
            presets: presetCount,
            characters: characterCount,
            lorebooks: lorebookCount,
          }
        })
      }
    }

    return authors
  },
})

// Search public imports
export const searchPublicImports = query({
  args: {
    searchQuery: v.string(),
    itemType: v.optional(v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook"), v.literal("all"))),
    limit: v.optional(v.number()),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { searchQuery, itemType = "all", limit = 20, userId, sessionId }) => {
    const query = searchQuery.toLowerCase()
    const results = []

    // Helper function to check if item matches search
    const matchesSearch = (item: any) => {
      const name = (item.name || "").toLowerCase()
      const description = (item.description || "").toLowerCase()
      const authorName = (item.authorName || "").toLowerCase()
      const tags = (item.tags || []).join(" ").toLowerCase()
      
      return name.includes(query) || 
             description.includes(query) || 
             authorName.includes(query) ||
             tags.includes(query)
    }

    // Helper function to process items
    const processItem = async (item: any, type: string) => {
      let userLiked = false
      if (userId || sessionId) {
        const like = userId
          ? await ctx.db
              .query("importLikes")
              .withIndex("by_user_item", (q) => 
                q.eq("userId", userId).eq("itemType", type as any).eq("itemId", item._id)
              )
              .first()
          : await ctx.db
              .query("importLikes")
              .withIndex("by_session_item", (q) => 
                q.eq("sessionId", sessionId!).eq("itemType", type as any).eq("itemId", item._id)
              )
              .first()
        userLiked = !!like
      }

      return {
        ...item,
        itemType: type,
        userLiked,
        timeAgo: getTimeAgo(item.publishedAt || item.importedAt),
      }
    }

    // Search in each type
    if (itemType === "all" || itemType === "preset") {
      const presets = await ctx.db
        .query("importedPresets")
        .withIndex("by_public", (q) => q.eq("isPublic", true))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect()

      for (const preset of presets) {
        if (matchesSearch(preset)) {
          const processed = await processItem(preset, "preset")
          results.push(processed)
        }
      }
    }

    if (itemType === "all" || itemType === "character") {
      const characters = await ctx.db
        .query("importedCharacters")
        .withIndex("by_public", (q) => q.eq("isPublic", true))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect()

      for (const character of characters) {
        if (matchesSearch(character)) {
          const processed = await processItem(character, "character")
          results.push(processed)
        }
      }
    }

    if (itemType === "all" || itemType === "lorebook") {
      const lorebooks = await ctx.db
        .query("importedLorebooks")
        .withIndex("by_public", (q) => q.eq("isPublic", true))
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect()

      for (const lorebook of lorebooks) {
        if (matchesSearch(lorebook)) {
          const processed = await processItem(lorebook, "lorebook")
          results.push(processed)
        }
      }
    }

    // Sort by relevance (name match first, then likes)
    results.sort((a, b) => {
      const aNameMatch = (a.name || "").toLowerCase().includes(query)
      const bNameMatch = (b.name || "").toLowerCase().includes(query)
      
      if (aNameMatch && !bNameMatch) return -1
      if (!aNameMatch && bNameMatch) return 1
      
      // If both or neither match name, sort by likes
      return (b.likesCount || 0) - (a.likesCount || 0)
    })

    return results.slice(0, limit)
  },
})

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