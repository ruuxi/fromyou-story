import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import { parseCharacterCard, extractCharacterName, normalizeCharacterData } from './parser'
import { validateCharacterCard } from './validators'
import { extractCharacterFromPNG, isValidPNG, extractAvatarFromCharacterData } from './pngProcessor'
import { Id } from "../_generated/dataModel"

// Import a SillyTavern character card
export const importCharacter = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    fileData: v.string(), // Base64 encoded file data
    fileName: v.string(),
    fileType: v.union(v.literal("json"), v.literal("png")),
    customName: v.optional(v.string()),
  },
  handler: async (ctx, { userId, sessionId, fileData, fileName, fileType, customName }) => {
    let characterDataString: string
    
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
        
        // Extract character data from PNG metadata
        characterDataString = extractCharacterFromPNG(buffer)
      } else {
        // Direct JSON handling - decode base64 to string
        const binaryString = atob(fileData)
        characterDataString = binaryString
      }
      
      // Parse JSON
      const characterData = JSON.parse(characterDataString)
      
      // Validate character card
      const validation = validateCharacterCard(characterData)
      if (!validation.isValid) {
        throw new Error(`Invalid character card: ${validation.errors.join(', ')}`)
      }
      
      // Parse character card
      const parsed = parseCharacterCard(characterData)
      if (!parsed) {
        throw new Error('Failed to parse character card')
      }
      
      // Normalize data
      const normalized = normalizeCharacterData(parsed)
      
      // Extract or use custom name
      const baseName = customName || normalized.name
      
      // Find a unique name by checking for conflicts
      let finalName = baseName
      let counter = 1
      
      while (true) {
        const existing = userId
          ? await ctx.db
              .query("importedCharacters")
              .withIndex("by_user", (q) => q.eq("userId", userId))
              .filter((q) => q.eq(q.field("name"), finalName))
              .first()
          : sessionId
          ? await ctx.db
              .query("importedCharacters")
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
          throw new Error('Unable to generate unique character name')
        }
      }
      
      // Extract avatar if present (from character data, not the PNG file itself)
      let avatarData: string | undefined = extractAvatarFromCharacterData(characterData) || undefined
      
      // Get user info for author fields
      let user = null
      if (userId) {
        user = await ctx.db
          .query("users")
          .withIndex("by_external_id", (q) => q.eq("externalId", userId))
          .first()
      }
      
      // Store the character
      const characterId = await ctx.db.insert("importedCharacters", {
        userId,
        sessionId,
        name: finalName,
        description: normalized.description,
        personality: normalized.personality,
        scenario: normalized.scenario,
        firstMessage: normalized.firstMessage,
        messageExample: normalized.messageExample,
        creatorNotes: normalized.creatorNotes,
        systemPrompt: normalized.systemPrompt,
        postHistoryInstructions: normalized.postHistoryInstructions,
        alternateGreetings: normalized.alternateGreetings,
        tags: normalized.tags,
        creator: normalized.creator,
        characterVersion: normalized.characterVersion,
        avatar: avatarData,
        spec: normalized.spec,
        specVersion: normalized.specVersion,
        characterBook: normalized.characterBook,
        extensions: normalized.extensions,
        originalData: normalized.originalData,
        importedAt: Date.now(),
        isActive: true,
        // Initialize social fields
        isPublic: false, // Default to private
        authorId: user?._id,
        authorName: user?.name,
        likesCount: 0,
        usesCount: 0,
        version: 1,
      })

      return {
        id: characterId,
        name: finalName,
        spec: normalized.spec,
        validation,
      }
    } catch (error) {
      console.error('Character import error:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to import character')
    }
  },
})

// Get user's imported characters
export const getUserCharacters = query({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { userId, sessionId }) => {
    if (!userId && !sessionId) {
      return []
    }

    const baseQuery = userId
      ? ctx.db.query("importedCharacters").withIndex("by_user", (q) => q.eq("userId", userId))
      : ctx.db.query("importedCharacters").withIndex("by_session", (q) => q.eq("sessionId", sessionId!))

    const characters = await baseQuery
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect()

    return characters.sort((a, b) => b.importedAt - a.importedAt)
  },
})

// Get a specific character by ID
export const getCharacter = query({
  args: {
    characterId: v.id("importedCharacters"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { characterId, userId, sessionId }) => {
    const character = await ctx.db.get(characterId)
    
    if (!character) {
      return null
    }

    // Verify ownership
    if (userId && character.userId !== userId) {
      return null
    }
    if (sessionId && character.sessionId !== sessionId) {
      return null
    }

    return character
  },
})

// Update character usage timestamp
export const updateCharacterUsage = mutation({
  args: {
    characterId: v.id("importedCharacters"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { characterId, userId, sessionId }) => {
    const character = await ctx.db.get(characterId)
    
    if (!character) {
      throw new Error('Character not found')
    }

    // Verify ownership
    if (userId && character.userId !== userId) {
      throw new Error('Unauthorized')
    }
    if (sessionId && character.sessionId !== sessionId) {
      throw new Error('Unauthorized')
    }

    await ctx.db.patch(characterId, {
      lastUsed: Date.now(),
    })
  },
})

// Delete a character
export const deleteCharacter = mutation({
  args: {
    characterId: v.id("importedCharacters"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { characterId, userId, sessionId }) => {
    const character = await ctx.db.get(characterId)
    
    if (!character) {
      throw new Error('Character not found')
    }

    // Verify ownership
    if (userId && character.userId !== userId) {
      throw new Error('Unauthorized')
    }
    if (sessionId && character.sessionId !== sessionId) {
      throw new Error('Unauthorized')
    }

    // Soft delete by marking as inactive
    await ctx.db.patch(characterId, {
      isActive: false,
    })

    // Also remove any chat associations
    const chatAssociations = await ctx.db
      .query("characterChatSettings")
      .withIndex("by_character", (q) => q.eq("characterId", characterId))
      .collect()

    await Promise.all(
      chatAssociations.map(association =>
        ctx.db.patch(association._id, { isActive: false })
      )
    )
  },
})

// Rename a character
export const renameCharacter = mutation({
  args: {
    characterId: v.id("importedCharacters"),
    newName: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { characterId, newName, userId, sessionId }) => {
    const character = await ctx.db.get(characterId)
    
    if (!character) {
      throw new Error('Character not found')
    }

    // Verify ownership
    if (userId && character.userId !== userId) {
      throw new Error('Unauthorized')
    }
    if (sessionId && character.sessionId !== sessionId) {
      throw new Error('Unauthorized')
    }

    // Check for name conflicts
    const existing = userId
      ? await ctx.db
          .query("importedCharacters")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) => q.and(
            q.eq(q.field("name"), newName),
            q.neq(q.field("_id"), characterId)
          ))
          .first()
      : sessionId
      ? await ctx.db
          .query("importedCharacters")
          .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
          .filter((q) => q.and(
            q.eq(q.field("name"), newName),
            q.neq(q.field("_id"), characterId)
          ))
          .first()
      : null

    if (existing) {
      throw new Error(`A character named "${newName}" already exists`)
    }

    await ctx.db.patch(characterId, {
      name: newName,
    })
  },
})

// Apply character to a chat
export const applyCharacterToChat = mutation({
  args: {
    chatId: v.id("characterChats"),
    characterId: v.id("importedCharacters"),
    presetId: v.optional(v.id("importedPresets")),
    selectedGreeting: v.optional(v.number()),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { chatId, characterId, presetId, selectedGreeting, userId, sessionId }) => {
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

    // Verify character ownership
    const character = await ctx.db.get(characterId)
    if (!character) {
      throw new Error('Character not found')
    }

    if (userId && character.userId !== userId) {
      throw new Error('Unauthorized access to character')
    }
    if (sessionId && character.sessionId !== sessionId) {
      throw new Error('Unauthorized access to character')
    }

    // Verify preset ownership if provided
    if (presetId) {
      const preset = await ctx.db.get(presetId)
      if (!preset) {
        throw new Error('Preset not found')
      }

      if (userId && preset.userId !== userId) {
        throw new Error('Unauthorized access to preset')
      }
      if (sessionId && preset.sessionId !== sessionId) {
        throw new Error('Unauthorized access to preset')
      }
    }

    // Deactivate any existing character association for this chat
    const existingAssociations = await ctx.db
      .query("characterChatSettings")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .collect()

    await Promise.all(
      existingAssociations.map(association =>
        ctx.db.patch(association._id, { isActive: false })
      )
    )

    // Create new association
    const associationId = await ctx.db.insert("characterChatSettings", {
      chatId,
      characterId,
      presetId,
      selectedGreeting,
      appliedAt: Date.now(),
      isActive: true,
    })

    // Update character usage
    await ctx.db.patch(characterId, {
      lastUsed: Date.now(),
    })

    // Update preset usage if provided
    if (presetId) {
      await ctx.db.patch(presetId, {
        lastUsed: Date.now(),
      })
    }

    return associationId
  },
})

// Get active character for a chat
export const getChatCharacter = query({
  args: {
    chatId: v.id("characterChats"),
  },
  handler: async (ctx, { chatId }) => {
    const association = await ctx.db
      .query("characterChatSettings")
      .withIndex("by_chat_active", (q) => q.eq("chatId", chatId).eq("isActive", true))
      .first()

    if (!association) {
      return null
    }

    const character = await ctx.db.get(association.characterId)
    if (!character) {
      return null
    }

    const preset = association.presetId ? await ctx.db.get(association.presetId) : null

    return {
      character,
      preset,
      association,
    }
  },
})

// Remove character from chat
export const removeCharacterFromChat = mutation({
  args: {
    chatId: v.id("characterChats"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { chatId, userId, sessionId }) => {
    // Verify chat ownership
    const chat = await ctx.db.get(chatId)
    if (!chat) {
      throw new Error('Chat not found')
    }

    if (userId && chat.userId !== userId) {
      throw new Error('Unauthorized')
    }
    if (sessionId && chat.sessionId !== sessionId) {
      throw new Error('Unauthorized')
    }

    // Deactivate character associations
    const associations = await ctx.db
      .query("characterChatSettings")
      .withIndex("by_chat", (q) => q.eq("chatId", chatId))
      .collect()

    await Promise.all(
      associations.map(association =>
        ctx.db.patch(association._id, { isActive: false })
      )
    )
  },
})

// Create a new character from scratch
export const createCharacter = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    characterData: v.any(), // Character card data
  },
  handler: async (ctx, { userId, sessionId, characterData }) => {
    try {
      // Validate character card
      const validation = validateCharacterCard(characterData)
      if (!validation.isValid) {
        throw new Error(`Invalid character card: ${validation.errors.join(', ')}`)
      }
      
      // Parse character card
      const parsed = parseCharacterCard(characterData)
      if (!parsed) {
        throw new Error('Failed to parse character card')
      }
      
      // Normalize data
      const normalized = normalizeCharacterData(parsed)
      
      // Extract name
      const baseName = normalized.name
      if (!baseName) {
        throw new Error('Character name is required')
      }
      
      // Find a unique name by checking for conflicts
      let finalName = baseName
      let counter = 1
      
      while (true) {
        const existing = userId
          ? await ctx.db
              .query("importedCharacters")
              .withIndex("by_user", (q) => q.eq("userId", userId))
              .filter((q) => q.eq(q.field("name"), finalName))
              .first()
          : sessionId
          ? await ctx.db
              .query("importedCharacters")
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
          throw new Error('Unable to generate unique character name')
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
      
      // Store the character
      const characterId = await ctx.db.insert("importedCharacters", {
        userId,
        sessionId,
        name: finalName,
        description: normalized.description,
        personality: normalized.personality,
        scenario: normalized.scenario,
        firstMessage: normalized.firstMessage,
        messageExample: normalized.messageExample,
        creatorNotes: normalized.creatorNotes,
        systemPrompt: normalized.systemPrompt,
        postHistoryInstructions: normalized.postHistoryInstructions,
        alternateGreetings: normalized.alternateGreetings,
        tags: normalized.tags,
        creator: normalized.creator,
        characterVersion: normalized.characterVersion,
        avatar: undefined, // No avatar for created characters
        spec: normalized.spec,
        specVersion: normalized.specVersion,
        characterBook: normalized.characterBook,
        extensions: normalized.extensions,
        originalData: normalized.originalData,
        importedAt: Date.now(),
        isActive: true,
        // Initialize social fields
        isPublic: false, // Default to private
        authorId: user?._id,
        authorName: user?.name,
        likesCount: 0,
        usesCount: 0,
        version: 1,
      })

      return {
        id: characterId,
        name: finalName,
        spec: normalized.spec,
        validation,
      }
    } catch (error) {
      console.error('Character creation error:', error)
      throw new Error(error instanceof Error ? error.message : 'Failed to create character')
    }
  },
})