import { mutation, query } from "../_generated/server"
import { v } from "convex/values"
import { Id } from "../_generated/dataModel"

// Create a new chat from an imported character
export const createChatFromCharacter = mutation({
  args: {
    characterId: v.id("importedCharacters"),
    presetId: v.optional(v.id("importedPresets")),
    selectedGreeting: v.optional(v.number()), // Index for alternate greeting, 0 for first_mes
    formatMode: v.optional(v.union(v.literal('classic_rp'), v.literal('chatml'))),
    title: v.optional(v.string()),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { characterId, presetId, selectedGreeting, formatMode, title, userId, sessionId }) => {
    // Get character data
    const character = await ctx.db.get(characterId)
    if (!character) {
      throw new Error('Character not found')
    }

    // Verify character ownership
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

    // Determine the greeting to use
    let selectedGreetingText = character.firstMessage
    if (selectedGreeting && selectedGreeting > 0 && character.alternateGreetings) {
      const greetingIndex = selectedGreeting - 1 // Convert to 0-based index
      if (greetingIndex < character.alternateGreetings.length) {
        selectedGreetingText = character.alternateGreetings[greetingIndex]
      }
    }

    // Create the chat
    const chatId = await ctx.db.insert("characterChats", {
      userId,
      sessionId,
      title: title || `Chat with ${character.name}`,
      participants: [character.name],
      primarySource: character.creator || 'SillyTavern Import',
      authorNote: character.creatorNotes,
      memory: '', // Start with empty memory
      formatMode: formatMode || 'classic_rp',
      isGroup: false,
      isActive: true,
      updatedAt: Date.now(),
      lastMessageAt: undefined,
      lastPreview: undefined,
    })

    // Associate character with chat
    await ctx.db.insert("characterChatSettings", {
      chatId,
      characterId,
      presetId,
      selectedGreeting: selectedGreeting || 0,
      appliedAt: Date.now(),
      isActive: true,
    })

    // Add initial system message with character context if available
    let messageIndex = 0
    
    // System prompt from character or preset
    const systemPrompt = await buildSystemPrompt(ctx, character, presetId)
    if (systemPrompt) {
      await ctx.db.insert("characterChatMessages", {
        chatId,
        role: "system",
        content: systemPrompt,
        messageIndex: messageIndex++,
      })
    }

    // Add character's greeting message
    await ctx.db.insert("characterChatMessages", {
      chatId,
        role: "assistant",
        name: character.name,
        content: selectedGreetingText,
        messageIndex: messageIndex++,
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

    // Update chat with initial message info
    await ctx.db.patch(chatId, {
      lastMessageAt: Date.now(),
      lastPreview: selectedGreetingText.slice(0, 100) + (selectedGreetingText.length > 100 ? '...' : ''),
    })

    return chatId
  },
})

// Build system prompt combining character and preset data
async function buildSystemPrompt(ctx: any, character: any, presetId?: Id<"importedPresets">): Promise<string> {
  const promptParts: string[] = []

  // Get preset data if provided
  let preset = null
  if (presetId) {
    preset = await ctx.db.get(presetId)
  }

  // Add character's system prompt if available
  if (character.systemPrompt) {
    promptParts.push(character.systemPrompt)
  }

  // Add preset's system prompt if available and different
  if (preset?.parsedSettings?.systemPrompt && preset.parsedSettings.systemPrompt !== character.systemPrompt) {
    promptParts.push(preset.parsedSettings.systemPrompt)
  }

  // Build character context prompt
  const characterContext = buildCharacterContextPrompt(character)
  if (characterContext) {
    promptParts.push(characterContext)
  }

  // Add character book entries if available
  const characterBookContext = buildCharacterBookContext(character)
  if (characterBookContext) {
    promptParts.push(characterBookContext)
  }

  // Add post-history instructions as a note
  if (character.postHistoryInstructions) {
    promptParts.push(`\n[Post-conversation instructions: ${character.postHistoryInstructions}]`)
  }

  return promptParts.filter(part => part.trim()).join('\n\n')
}

// Build character context from character data
function buildCharacterContextPrompt(character: any): string {
  const parts: string[] = []

  // Character name and basic info
  parts.push(`Character: ${character.name}`)

  // Description
  if (character.description) {
    parts.push(`Description: ${character.description}`)
  }

  // Personality
  if (character.personality) {
    parts.push(`Personality: ${character.personality}`)
  }

  // Scenario/Setting
  if (character.scenario) {
    parts.push(`Scenario: ${character.scenario}`)
  }

  // Example dialogue
  if (character.messageExample) {
    parts.push(`Example dialogue:\n${character.messageExample}`)
  }

  return parts.join('\n\n')
}

// Build character book context for world info
function buildCharacterBookContext(character: any): string {
  if (!character.characterBook?.entries) {
    return ''
  }

  const enabledEntries = character.characterBook.entries
    .filter((entry: any) => entry.enabled !== false)
    .sort((a: any, b: any) => (a.insertion_order || 0) - (b.insertion_order || 0))

  if (enabledEntries.length === 0) {
    return ''
  }

  const contextParts = ['[World Information]']
  
  enabledEntries.forEach((entry: any) => {
    if (entry.content) {
      const entryHeader = entry.name ? `${entry.name}: ` : ''
      contextParts.push(`${entryHeader}${entry.content}`)
    }
  })

  return contextParts.join('\n')
}

// Get character context for existing chat
export const getCharacterContext = query({
  args: {
    chatId: v.id("characterChats"),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { chatId, userId, sessionId }) => {
    // Verify chat ownership
    const chat = await ctx.db.get(chatId)
    if (!chat) {
      return null
    }

    if (userId && chat.userId !== userId) {
      return null
    }
    if (sessionId && chat.sessionId !== sessionId) {
      return null
    }

    // Get character association
    const association = await ctx.db
      .query("characterChatSettings")
      .withIndex("by_chat_active", (q) => q.eq("chatId", chatId).eq("isActive", true))
      .first()

    if (!association) {
      return null
    }

    // Get character and preset
    const character = await ctx.db.get(association.characterId)
    if (!character) {
      return null
    }

    const preset = association.presetId ? await ctx.db.get(association.presetId) : null

    // Build context information
    const systemPrompt = await buildSystemPrompt(ctx, character, association.presetId || undefined)
    const characterContext = buildCharacterContextPrompt(character)
    const characterBookContext = buildCharacterBookContext(character)

    // Get the greeting being used
    let currentGreeting = character.firstMessage
    if (association.selectedGreeting && association.selectedGreeting > 0 && character.alternateGreetings) {
      const greetingIndex = association.selectedGreeting - 1
      if (greetingIndex < character.alternateGreetings.length) {
        currentGreeting = character.alternateGreetings[greetingIndex]
      }
    }

    return {
      character: {
        ...character,
        currentGreeting,
      },
      preset,
      systemPrompt,
      characterContext,
      characterBookContext,
      association,
    }
  },
})

// Get available greetings for a character
export const getCharacterGreetings = query({
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

    const greetings = [
      {
        index: 0,
        content: character.firstMessage,
        isDefault: true,
      }
    ]

    if (character.alternateGreetings) {
      character.alternateGreetings.forEach((greeting, index) => {
        greetings.push({
          index: index + 1,
          content: greeting,
          isDefault: false,
        })
      })
    }

    return greetings
  },
})

// Update the greeting selection for a chat
export const updateChatGreeting = mutation({
  args: {
    chatId: v.id("characterChats"),
    selectedGreeting: v.number(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { chatId, selectedGreeting, userId, sessionId }) => {
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

    // Get character association
    const association = await ctx.db
      .query("characterChatSettings")
      .withIndex("by_chat_active", (q) => q.eq("chatId", chatId).eq("isActive", true))
      .first()

    if (!association) {
      throw new Error('No character associated with this chat')
    }

    // Update the greeting selection
    await ctx.db.patch(association._id, {
      selectedGreeting,
    })

    // Get the character to access greetings
    const character = await ctx.db.get(association.characterId)
    if (!character) {
      throw new Error('Character not found')
    }

    // Determine new greeting text
    let newGreetingText = character.firstMessage
    if (selectedGreeting > 0 && character.alternateGreetings) {
      const greetingIndex = selectedGreeting - 1
      if (greetingIndex < character.alternateGreetings.length) {
        newGreetingText = character.alternateGreetings[greetingIndex]
      }
    }

    return {
      selectedGreeting,
      greetingText: newGreetingText,
    }
  },
})