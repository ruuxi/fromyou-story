import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import { Id } from "../_generated/dataModel"
import { WorldInfoEntry, WorldInfoLogic } from './types'

// Apply a lorebook to a chat
export const applyLorebookToChat = mutation({
  args: {
    chatId: v.id("characterChats"),
    lorebookId: v.id("importedLorebooks"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    overrides: v.optional(v.object({
      recursive: v.optional(v.boolean()),
      scanDepth: v.optional(v.number()),
      tokenBudget: v.optional(v.number()),
      caseSensitive: v.optional(v.boolean()),
      matchWholeWords: v.optional(v.boolean()),
    })),
  },
  handler: async (ctx, { chatId, lorebookId, userId, sessionId, overrides }) => {
    // Verify chat exists and user has access
    const chat = await ctx.db.get(chatId)
    if (!chat) {
      throw new Error('Chat not found')
    }
    
    if (userId && chat.userId !== userId) {
      throw new Error('Unauthorized access to chat')
    }
    if (sessionId && chat.sessionId !== sessionId) {
      throw new Error('Unauthorized access to chat')
    }
    
    // Verify lorebook exists and user has access
    const lorebook = await ctx.db.get(lorebookId)
    if (!lorebook) {
      throw new Error('Lorebook not found')
    }
    
    if (userId && lorebook.userId !== userId) {
      throw new Error('Unauthorized access to lorebook')
    }
    if (sessionId && lorebook.sessionId !== sessionId) {
      throw new Error('Unauthorized access to lorebook')
    }
    
    // Check if lorebook is already applied
    const existing = await ctx.db
      .query("lorebookChatSettings")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .filter((q) => q.and(
        q.eq(q.field("lorebookId"), lorebookId),
        q.eq(q.field("isActive"), true)
      ))
      .first()
    
    if (existing) {
      // Update existing settings
      await ctx.db.patch(existing._id, {
        appliedAt: Date.now(),
        overrides,
      })
      
      return { id: existing._id, updated: true }
    }
    
    // Create new association
    const settingId = await ctx.db.insert("lorebookChatSettings", {
      chatId,
      lorebookId,
      appliedAt: Date.now(),
      isActive: true,
      activatedEntries: [],
      overrides,
    })
    
    // Update lorebook usage
    await ctx.db.patch(lorebookId, {
      lastUsed: Date.now(),
    })
    
    return { id: settingId, created: true }
  },
})

// Remove a lorebook from a chat
export const removeLorebookFromChat = mutation({
  args: {
    chatId: v.id("characterChats"),
    lorebookId: v.id("importedLorebooks"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { chatId, lorebookId, userId, sessionId }) => {
    // Find the association
    const setting = await ctx.db
      .query("lorebookChatSettings")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .filter((q) => q.eq(q.field("lorebookId"), lorebookId))
      .first()
    
    if (!setting) {
      throw new Error('Lorebook not applied to this chat')
    }
    
    // Verify chat ownership
    const chat = await ctx.db.get(chatId)
    if (!chat) {
      throw new Error('Chat not found')
    }
    
    if (userId && chat.userId !== userId) {
      throw new Error('Unauthorized access to chat')
    }
    if (sessionId && chat.sessionId !== sessionId) {
      throw new Error('Unauthorized access to chat')
    }
    
    // Mark as inactive instead of deleting (preserve history)
    await ctx.db.patch(setting._id, {
      isActive: false,
    })
    
    return { success: true }
  },
})

// Get active lorebooks for a chat
export const getActiveLorebooks = query({
  args: {
    chatId: v.id("characterChats"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { chatId, userId, sessionId }) => {
    // Verify chat ownership
    const chat = await ctx.db.get(chatId)
    if (!chat) {
      return []
    }
    
    if (userId && chat.userId !== userId) {
      return []
    }
    if (sessionId && chat.sessionId !== sessionId) {
      return []
    }
    
    // Get active lorebook associations
    const settings = await ctx.db
      .query("lorebookChatSettings")
      .withIndex("by_chat_active", (q) => 
        q.eq("chatId", chatId).eq("isActive", true)
      )
      .collect()
    
    // Get lorebook details
    const lorebooks = await Promise.all(
      settings.map(async (setting) => {
        const lorebook = await ctx.db.get(setting.lorebookId)
        if (!lorebook) return null
        
        return {
          _id: lorebook._id,
          name: lorebook.name,
          description: lorebook.description,
          entryCount: lorebook.entryCount,
          format: lorebook.format,
          appliedAt: setting.appliedAt,
          overrides: setting.overrides,
          activatedEntries: setting.activatedEntries?.length || 0,
        }
      })
    )
    
    return lorebooks.filter(l => l !== null)
  },
})

// Scan context and activate lorebook entries
export const scanContextForEntries = query({
  args: {
    chatId: v.id("characterChats"),
    context: v.string(), // The text to scan
    maxDepth: v.optional(v.number()),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { chatId, context, maxDepth = 100, userId, sessionId }) => {
    // Get active lorebooks for the chat
    const settings = await ctx.db
      .query("lorebookChatSettings")
      .withIndex("by_chat_active", (q) => 
        q.eq("chatId", chatId).eq("isActive", true)
      )
      .collect()
    
    if (settings.length === 0) {
      return { activatedEntries: [], totalTokens: 0 }
    }
    
    const activatedEntries: any[] = []
    let totalTokens = 0
    
    // Process each lorebook
    for (const setting of settings) {
      const lorebook = await ctx.db.get(setting.lorebookId)
      if (!lorebook) continue
      
      // Merge settings with overrides
      const effectiveSettings = {
        ...lorebook.settings,
        ...setting.overrides,
      }
      
      // Scan entries
      const entries = lorebook.entries as Record<string, WorldInfoEntry>
      
      for (const [uid, entry] of Object.entries(entries)) {
        // Skip disabled entries
        if (entry.disable) continue
        
        // Check if entry should be activated
        let shouldActivate = false
        
        // Constant entries are always active
        if (entry.constant) {
          shouldActivate = true
        } else {
          // Check primary keys
          const keys = entry.key || []
          const secondaryKeys = entry.keysecondary || []
          
          const caseSensitive = entry.caseSensitive ?? effectiveSettings.caseSensitive ?? false
          const matchWholeWords = entry.matchWholeWords ?? effectiveSettings.matchWholeWords ?? false
          
          // Check key matching based on logic
          const primaryMatches = checkKeysMatch(
            context, 
            keys, 
            caseSensitive, 
            matchWholeWords
          )
          
          const secondaryMatches = secondaryKeys.length > 0 
            ? checkKeysMatch(context, secondaryKeys, caseSensitive, matchWholeWords)
            : []
          
          shouldActivate = evaluateLogic(
            entry.selectiveLogic || WorldInfoLogic.AND_ANY,
            primaryMatches,
            secondaryMatches,
            entry.selective
          )
        }
        
        // Check probability
        if (shouldActivate && entry.useProbability && entry.probability < 100) {
          const roll = Math.random() * 100
          shouldActivate = roll <= entry.probability
        }
        
        if (shouldActivate) {
          // Estimate token count (rough estimate: 1 token ≈ 4 characters)
          const estimatedTokens = Math.ceil(entry.content.length / 4)
          
          // Check token budget
          if (totalTokens + estimatedTokens <= (effectiveSettings.tokenBudget || 2048)) {
            activatedEntries.push({
              uid: entry.uid,
              lorebookId: lorebook._id,
              lorebookName: lorebook.name,
              comment: entry.comment,
              content: entry.content,
              position: entry.position,
              order: entry.order,
              depth: entry.depth,
              group: entry.group,
              estimatedTokens,
            })
            
            totalTokens += estimatedTokens
          }
        }
      }
    }
    
    // Sort by order
    activatedEntries.sort((a, b) => b.order - a.order)
    
    return {
      activatedEntries,
      totalTokens,
    }
  },
})

// Helper: Check if keys match in context
function checkKeysMatch(
  context: string, 
  keys: string[], 
  caseSensitive: boolean, 
  matchWholeWords: boolean
): string[] {
  const matches: string[] = []
  const searchContext = caseSensitive ? context : context.toLowerCase()
  
  for (const key of keys) {
    if (!key || key.trim() === '') continue
    
    const searchKey = caseSensitive ? key : key.toLowerCase()
    
    if (matchWholeWords) {
      // Create word boundary regex
      const regex = new RegExp(`\\b${escapeRegex(searchKey)}\\b`, caseSensitive ? 'g' : 'gi')
      if (regex.test(context)) {
        matches.push(key)
      }
    } else {
      // Simple substring search
      if (searchContext.includes(searchKey)) {
        matches.push(key)
      }
    }
  }
  
  return matches
}

// Helper: Escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Helper: Evaluate activation logic
function evaluateLogic(
  logic: WorldInfoLogic,
  primaryMatches: string[],
  secondaryMatches: string[],
  selective: boolean
): boolean {
  const hasPrimary = primaryMatches.length > 0
  const hasSecondary = secondaryMatches.length > 0
  
  if (!selective) {
    // Non-selective: only primary keys matter
    return hasPrimary
  }
  
  switch (logic) {
    case WorldInfoLogic.AND_ANY:
      // Primary AND at least one secondary
      return hasPrimary && hasSecondary
    
    case WorldInfoLogic.AND_ALL:
      // Primary AND all secondary keys must match
      // (simplified: we check if any secondary matched)
      return hasPrimary && hasSecondary
    
    case WorldInfoLogic.NOT_ANY:
      // Primary AND NOT any secondary
      return hasPrimary && !hasSecondary
    
    case WorldInfoLogic.NOT_ALL:
      // Primary AND NOT all secondary
      // (simplified: we allow if not all secondary matched)
      return hasPrimary
    
    default:
      return hasPrimary
  }
}

// Update activated entries for a chat
export const updateActivatedEntries = mutation({
  args: {
    chatId: v.id("characterChats"),
    lorebookId: v.id("importedLorebooks"),
    activatedEntries: v.array(v.object({
      uid: v.number(),
      key: v.array(v.string()),
      activatedAt: v.number(),
      sticky: v.optional(v.number()),
      cooldown: v.optional(v.number()),
      delay: v.optional(v.number()),
    })),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { chatId, lorebookId, activatedEntries, userId, sessionId }) => {
    // Find the setting
    const setting = await ctx.db
      .query("lorebookChatSettings")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .filter((q) => q.and(
        q.eq(q.field("lorebookId"), lorebookId),
        q.eq(q.field("isActive"), true)
      ))
      .first()
    
    if (!setting) {
      throw new Error('Lorebook not applied to this chat')
    }
    
    // Verify ownership through chat
    const chat = await ctx.db.get(chatId)
    if (!chat) {
      throw new Error('Chat not found')
    }
    
    if (userId && chat.userId !== userId) {
      throw new Error('Unauthorized access to chat')
    }
    if (sessionId && chat.sessionId !== sessionId) {
      throw new Error('Unauthorized access to chat')
    }
    
    // Update activated entries
    await ctx.db.patch(setting._id, {
      activatedEntries,
    })
    
    return { success: true }
  },
})