import { action, mutation, query } from "../_generated/server"
import { makeFunctionReference } from "convex/server"
import { v } from "convex/values"
import { validatePreset } from './validators'
import { detectPresetType, extractPresetName } from './parser'
import { Id } from "../_generated/dataModel"

type PresetType =
  | "openai"
  | "textgen"
  | "kobold"
  | "novelai"
  | "instruct"
  | "context"
  | "sysprompt"
  | "reasoning"

const presetTypeValidator = v.union(
  v.literal("openai"),
  v.literal("textgen"),
  v.literal("kobold"),
  v.literal("novelai"),
  v.literal("instruct"),
  v.literal("context"),
  v.literal("sysprompt"),
  v.literal("reasoning")
)

const storePresetMutation = makeFunctionReference<
  "mutation",
  {
    userId?: string
    sessionId?: string
    storageId: Id<"_storage">
    presetType: PresetType
    name: string
  },
  {
    id: Id<"importedPresets">
    name: string
    type: PresetType
  }
>("presets/storage:storePreset")

// Generate upload URL for preset file
export const generateUploadUrl = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, sessionId }) => {
    // Basic auth check - either user or session must be provided
    if (!userId && !sessionId) {
      throw new Error('Authentication required')
    }
    
    return await ctx.storage.generateUploadUrl()
  },
})

// Store preset metadata with storage reference
export const storePreset = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    storageId: v.id("_storage"),
    presetType: presetTypeValidator,
    name: v.string(),
  },
  handler: async (ctx, { userId, sessionId, storageId, presetType, name }) => {
    // Basic validation - storage ID should be valid 
    // Note: We can't validate storage existence in mutations, but the file should exist
    // if it was just uploaded via generateUploadUrl

    // Extract or use provided name
    const baseName = name
    
    // Find a unique name by checking for conflicts
    let finalName = baseName
    let counter = 1
    
    while (true) {
      // Check if name exists for this user/session
      const existing = userId
        ? await ctx.db
            .query("importedPresets")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("name"), finalName))
            .take(1)
            .then(results => results.length > 0)
        : sessionId
        ? await ctx.db
            .query("importedPresets")
            .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
            .filter((q) => q.eq(q.field("name"), finalName))
            .take(1)
            .then(results => results.length > 0)
        : false

      if (!existing) {
        break // Found a unique name
      }
      
      // Try next name with counter
      finalName = `${baseName} (${counter})`
      counter++
      
      // Safety check to prevent infinite loop
      if (counter > 100) {
        await ctx.storage.delete(storageId)
        throw new Error('Unable to generate unique preset name')
      }
    }

    // Get user info for author fields
    let user = null
    if (userId) {
      user = await ctx.db
        .query("users")
        .withIndex("by_external_id", (q) => q.eq("externalId", userId))
        .first()
    }

    // Store the preset metadata with storage reference
    const presetId = await ctx.db.insert("importedPresets", {
      userId,
      sessionId,
      name: finalName,
      presetType: presetType,
      originalDataId: storageId,
      isActive: true,
      importedAt: Date.now(),
      // Initialize social fields
      isPublic: false, // Default to private
      authorId: user?._id,
      authorName: user?.name,
      likesCount: 0,
      usesCount: 0,
      version: 1,
    })

    return {
      id: presetId,
      name: finalName,
      type: presetType,
    }
  },
})

// Get user's imported presets (metadata only)
export const getUserPresets = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    presetType: v.optional(v.union(
      v.literal("openai"),
      v.literal("textgen"),
      v.literal("kobold"),
      v.literal("novelai"),
      v.literal("instruct"),
      v.literal("context"),
      v.literal("sysprompt"),
      v.literal("reasoning")
    )),
  },
  handler: async (ctx, { userId, sessionId, presetType }) => {
    let presets

    // Filter by user or session
    if (userId) {
      presets = await ctx.db
        .query("importedPresets")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
    } else if (sessionId) {
      presets = await ctx.db
        .query("importedPresets")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .collect()
    } else {
      return []
    }

    // Filter by preset type if specified
    if (presetType) {
      presets = presets.filter(preset => preset.presetType === presetType)
    }

    // Sort by last used, then by imported date
    return presets
      .sort((a, b) => {
        const aTime = a.lastUsed || a.importedAt
        const bTime = b.lastUsed || b.importedAt
        return bTime - aTime
      })
  },
})

// Get a specific preset with data URL for fetching content
export const getPresetWithUrl = query({
  args: { 
    presetId: v.id("importedPresets"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { presetId, userId, sessionId }) => {
    const preset = await ctx.db.get(presetId)
    if (!preset) {
      return null
    }

    // Verify ownership
    if (userId && preset.userId !== userId) {
      throw new Error('Unauthorized access to preset')
    }
    if (sessionId && preset.sessionId !== sessionId) {
      throw new Error('Unauthorized access to preset')
    }

    // Generate URL for client to fetch the data
    const dataUrl = await ctx.storage.getUrl(preset.originalDataId)
    
    return {
      ...preset,
      dataUrl
    }
  },
})

// Update preset metadata
export const updatePreset = mutation({
  args: {
    presetId: v.id("importedPresets"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    updates: v.object({
      name: v.optional(v.string()),
      isActive: v.optional(v.boolean()),
    }),
  },
  handler: async (ctx, { presetId, userId, sessionId, updates }) => {
    const preset = await ctx.db.get(presetId)
    if (!preset) {
      throw new Error('Preset not found')
    }

    // Verify ownership
    if (userId && preset.userId !== userId) {
      throw new Error('Unauthorized access to preset')
    }
    if (sessionId && preset.sessionId !== sessionId) {
      throw new Error('Unauthorized access to preset')
    }

    // Check if name is unique when updating name
    if (updates.name && updates.name !== preset.name) {
      const existing = userId
        ? await ctx.db
            .query("importedPresets")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .filter((q) => q.eq(q.field("name"), updates.name))
            .first()
        : sessionId
        ? await ctx.db
            .query("importedPresets")
            .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
            .filter((q) => q.eq(q.field("name"), updates.name))
            .first()
        : null

      if (existing && existing._id !== presetId) {
        throw new Error('A preset with this name already exists')
      }
    }

    await ctx.db.patch(presetId, {
      ...updates,
      lastUsed: Date.now(),
    })

    return { success: true }
  },
})

// Delete preset and its associated file
export const deletePreset = mutation({
  args: {
    presetId: v.id("importedPresets"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { presetId, userId, sessionId }) => {
    const preset = await ctx.db.get(presetId)
    if (!preset) {
      throw new Error('Preset not found')
    }

    // Verify ownership
    if (userId && preset.userId !== userId) {
      throw new Error('Unauthorized access to preset')
    }
    if (sessionId && preset.sessionId !== sessionId) {
      throw new Error('Unauthorized access to preset')
    }

    // Delete the file from storage
    await ctx.storage.delete(preset.originalDataId)

    // Delete the database record
    await ctx.db.delete(presetId)

    return { success: true }
  },
})

// Get preset count for user/session
export const getPresetCount = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, sessionId }) => {
    if (userId) {
      return await ctx.db
        .query("importedPresets")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect()
        .then(presets => presets.length)
    } else if (sessionId) {
      return await ctx.db
        .query("importedPresets")
        .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
        .collect()
        .then(presets => presets.length)
    }
    return 0
  },
})

// Get chat preset association (for backward compatibility)
export const getChatPreset = query({
  args: {
    chatId: v.id("characterChats"),
  },
  handler: async (ctx, { chatId }) => {
    // Check if there's an active preset association for this chat
    const association = await ctx.db
      .query("chatPresetSettings")
      .filter((q) => q.and(
        q.eq(q.field("chatId"), chatId),
        q.eq(q.field("isActive"), true)
      ))
      .first()

    if (!association) {
      return null
    }

    // Get the preset
    const preset = await ctx.db.get(association.presetId)
    if (!preset) {
      return null
    }

    return {
      preset,
      association
    }
  },
})

// Create preset from template (for backward compatibility)
export const createPreset = action({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    presetData: v.any(),
    name: v.string(),
  },
  handler: async (ctx, { userId, sessionId, presetData, name }) => {
    // Validate preset data and detect type
    const validation = validatePreset(presetData)
    if (!validation.isValid) {
      throw new Error(`Invalid preset: ${validation.errors.join(', ')}`)
    }

    const presetType = (validation.detectedType || detectPresetType(presetData)) as PresetType | null
    if (!presetType) {
      throw new Error('Unable to detect preset type')
    }

    // Determine base name
    const baseName = name || extractPresetName(presetData) || 'Untitled Preset'

    // Serialize and store preset JSON in Convex storage
    const json = JSON.stringify(presetData, null, 2)
    const storageId = await ctx.storage.store(new Blob([json], { type: 'application/json' }))

    // Reuse storePreset mutation to handle metadata persistence and unique naming
    return await ctx.runMutation(storePresetMutation, {
      userId,
      sessionId,
      storageId,
      presetType,
      name: baseName,
    })
  },
})

// Apply preset to chat (placeholder)
export const applyChatPreset = mutation({
  args: {
    chatId: v.id("characterChats"),
    presetId: v.id("importedPresets"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    throw new Error('Chat preset application is not yet implemented with file storage.')
  },
})

// Remove preset from chat (placeholder)
export const removeChatPreset = mutation({
  args: {
    chatId: v.id("characterChats"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    throw new Error('Chat preset removal is not yet implemented with file storage.')
  },
})

// Legacy importPreset function (for backward compatibility)
export const importPreset = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    presetData: v.any(),
    customName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Return a minimal compatible response to avoid breaking existing components
    return {
      id: 'legacy' as any,
      name: args.customName || 'Legacy Preset',
      type: 'openai' as any,
      validation: {
        isValid: false,
        errors: ['Legacy importPreset is deprecated. Use the 3-step file storage process: generateUploadUrl -> upload -> storePreset.'],
        warnings: []
      }
    }
  },
})
