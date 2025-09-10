import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import { parseLorebook, extractLorebookName, normalizeLorebookData } from './parser'
import { validateLorebook } from './validators'
import { extractLorebookFromPNG, isValidPNG } from './pngProcessor'
import { Id } from "../_generated/dataModel"

// Import a SillyTavern lorebook
export const importLorebook = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    fileData: v.string(), // Base64 encoded file data
    fileName: v.string(),
    fileType: v.union(v.literal("json"), v.literal("png")),
    customName: v.optional(v.string()),
  },
  handler: async (ctx, { userId, sessionId, fileData, fileName, fileType, customName }) => {
    let lorebookDataString: string
    
    try {
      // Parse file based on type
      if (fileType === "png") {
        // Decode base64 to Uint8Array (Buffer not available in Convex)
        const binaryString = atob(fileData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        const buffer = bytes.buffer
        
        // Validate PNG format
        if (!isValidPNG(buffer)) {
          throw new Error('Invalid PNG file format')
        }
        
        // Extract lorebook data from PNG metadata
        lorebookDataString = extractLorebookFromPNG(buffer)
      } else {
        // Direct JSON handling - decode base64 to string
        const binaryString = atob(fileData)
        lorebookDataString = binaryString
      }
      
      // Parse JSON
      const lorebookData = JSON.parse(lorebookDataString)
      
      // Validate lorebook
      const validation = validateLorebook(lorebookData)
      if (!validation.isValid) {
        throw new Error(`Invalid lorebook: ${validation.errors.join(', ')}`)
      }
      
      // Parse lorebook
      const parsed = parseLorebook(lorebookData, fileName)
      if (!parsed) {
        throw new Error('Failed to parse lorebook')
      }
      
      // Normalize data
      const normalized = normalizeLorebookData(parsed)
      
      // Extract or use custom name
      const baseName = customName || normalized.name
      
      // Find a unique name by checking for conflicts
      let finalName = baseName
      let counter = 1
      
      while (true) {
        const existing = userId
          ? await ctx.db
              .query("importedLorebooks")
              .withIndex("by_user", (q) => q.eq("userId", userId))
              .filter((q) => q.eq(q.field("name"), finalName))
              .first()
          : sessionId
          ? await ctx.db
              .query("importedLorebooks")
              .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
              .filter((q) => q.eq(q.field("name"), finalName))
              .first()
          : null

        if (!existing) {
          break // Found a unique name
        }
        
        // Try next name with counter
        finalName = `${baseName} (${counter})`
        counter++
        
        // Safety check to prevent infinite loop
        if (counter > 100) {
          throw new Error('Unable to generate unique lorebook name')
        }
      }
      
      // Count entries
      const entryCount = Object.keys(normalized.entries).length
      
      // Get user info for author fields
      let user = null
      if (userId) {
        user = await ctx.db
          .query("users")
          .withIndex("by_external_id", (q) => q.eq("externalId", userId))
          .first()
      }
      
      // Store the lorebook
      const lorebookId = await ctx.db.insert("importedLorebooks", {
        userId,
        sessionId,
        name: finalName,
        description: normalized.description,
        entries: normalized.entries,
        settings: normalized.settings,
        format: normalized.format,
        version: normalized.version,
        originalData: normalized.originalData,
        entryCount,
        importedAt: Date.now(),
        isActive: true,
        // Initialize social fields
        isPublic: false, // Default to private
        authorId: user?._id,
        authorName: user?.name,
        likesCount: 0,
        usesCount: 0,
        versionNumber: 1,
      })

      return {
        id: lorebookId,
        name: finalName,
        format: normalized.format,
        entryCount,
        validation,
      }
    } catch (error) {
      console.error('Lorebook import error:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to import lorebook')
    }
  },
})

// Get user's imported lorebooks
export const getUserLorebooks = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, sessionId }) => {
    if (!userId && !sessionId) {
      return []
    }

    const baseQuery = userId
      ? ctx.db.query("importedLorebooks").withIndex("by_user", (q) => q.eq("userId", userId))
      : ctx.db.query("importedLorebooks").withIndex("by_session", (q) => q.eq("sessionId", sessionId!))

    const lorebooks = await baseQuery
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()

    return lorebooks.sort((a, b) => b.importedAt - a.importedAt)
  },
})

// Get a specific lorebook by ID
export const getLorebook = query({
  args: {
    lorebookId: v.id("importedLorebooks"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { lorebookId, userId, sessionId }) => {
    const lorebook = await ctx.db.get(lorebookId)
    
    if (!lorebook) {
      return null
    }

    // Verify ownership
    if (userId && lorebook.userId !== userId) {
      return null
    }
    if (sessionId && lorebook.sessionId !== sessionId) {
      return null
    }

    return lorebook
  },
})

// Update lorebook usage timestamp
export const updateLorebookUsage = mutation({
  args: {
    lorebookId: v.id("importedLorebooks"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { lorebookId, userId, sessionId }) => {
    const lorebook = await ctx.db.get(lorebookId)
    
    if (!lorebook) {
      throw new Error('Lorebook not found')
    }

    // Verify ownership
    if (userId && lorebook.userId !== userId) {
      throw new Error('Unauthorized access to lorebook')
    }
    if (sessionId && lorebook.sessionId !== sessionId) {
      throw new Error('Unauthorized access to lorebook')
    }

    await ctx.db.patch(lorebookId, {
      lastUsed: Date.now(),
    })

    return { success: true }
  },
})

// Delete a lorebook
export const deleteLorebook = mutation({
  args: {
    lorebookId: v.id("importedLorebooks"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { lorebookId, userId, sessionId }) => {
    const lorebook = await ctx.db.get(lorebookId)
    
    if (!lorebook) {
      throw new Error('Lorebook not found')
    }

    // Verify ownership
    if (userId && lorebook.userId !== userId) {
      throw new Error('Unauthorized access to lorebook')
    }
    if (sessionId && lorebook.sessionId !== sessionId) {
      throw new Error('Unauthorized access to lorebook')
    }

    // Check if lorebook is in use
    const activeChats = await ctx.db
      .query("lorebookChatSettings")
      .withIndex("by_lorebook", (q) => q.eq("lorebookId", lorebookId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()

    if (activeChats.length > 0) {
      // Mark as inactive instead of deleting
      await ctx.db.patch(lorebookId, {
        isActive: false,
      })
      
      return { 
        success: true, 
        deactivated: true,
        message: `Lorebook deactivated (in use by ${activeChats.length} chat(s))` 
      }
    }

    // Delete associated chat settings
    const allChatSettings = await ctx.db
      .query("lorebookChatSettings")
      .withIndex("by_lorebook", (q) => q.eq("lorebookId", lorebookId))
      .collect()

    for (const setting of allChatSettings) {
      await ctx.db.delete(setting._id)
    }

    // Delete the lorebook
    await ctx.db.delete(lorebookId)

    return { success: true, deleted: true }
  },
})

// Get lorebook statistics
export const getLorebookStats = query({
  args: {
    lorebookId: v.id("importedLorebooks"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { lorebookId, userId, sessionId }) => {
    const lorebook = await ctx.db.get(lorebookId)
    
    if (!lorebook) {
      return null
    }

    // Verify ownership
    if (userId && lorebook.userId !== userId) {
      return null
    }
    if (sessionId && lorebook.sessionId !== sessionId) {
      return null
    }

    // Get usage stats
    const chatSettings = await ctx.db
      .query("lorebookChatSettings")
      .withIndex("by_lorebook", (q) => q.eq("lorebookId", lorebookId))
      .collect()

    const activeChats = chatSettings.filter(s => s.isActive).length
    const totalChats = chatSettings.length

    // Calculate entry statistics
    let totalKeys = 0
    let activeEntries = 0
    let constantEntries = 0
    
    Object.values(lorebook.entries as any).forEach((entry: any) => {
      if (!entry.disable) activeEntries++
      if (entry.constant) constantEntries++
      totalKeys += (entry.key?.length || 0) + (entry.keysecondary?.length || 0)
    })

    return {
      name: lorebook.name,
      format: lorebook.format,
      entryCount: lorebook.entryCount,
      activeEntries,
      constantEntries,
      totalKeys,
      activeChats,
      totalChats,
      importedAt: lorebook.importedAt,
      lastUsed: lorebook.lastUsed,
    }
  },
})