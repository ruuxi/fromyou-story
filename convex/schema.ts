import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  selectedCharacters: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    fullName: v.string(),
    gender: v.string(),
    source: v.string(),
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),
  
  userPreferences: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    username: v.optional(v.string()),
    lastUpdated: v.number(),
    genre: v.optional(v.string()),
    storyType: v.optional(v.union(v.literal("fanfiction"), v.literal("inspired"), v.literal("custom"))),
    playerMode: v.optional(v.boolean()),
    playerName: v.optional(v.string()),
    characterCount: v.optional(v.union(v.literal("solo"), v.literal("one-on-one"), v.literal("group"))),
    pov: v.optional(v.union(v.literal("first"), v.literal("second"), v.literal("third"))),
    goonMode: v.optional(v.boolean()),
    selectedTags: v.optional(v.array(v.string())),
    searchRule: v.optional(v.string()),
    // Overrides
    openrouterModelOverride: v.optional(v.string()), // e.g. "openai/gpt-4o", "anthropic/claude-3.5-sonnet"
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),
  
  storySuggestions: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    suggestionId: v.string(), // Unique ID for the suggestion
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
      pov: v.optional(v.string()),
    }),
    tags: v.optional(v.array(v.string())), // Parsed tags from LLM response
    contentNSFW: v.optional(v.boolean()), // True if genre == "goon-mode"
    isSelected: v.boolean(), // Whether the user selected this suggestion
    searchQuery: v.optional(v.string()), // If this was generated from a search
    selectedAt: v.optional(v.number()), // When the suggestion was selected
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_suggestion_id", ["suggestionId"])
,
    
  recentSuggestions: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    selected: v.array(v.object({
      text: v.string(),
      characters: v.object({
        main_characters: v.array(v.string()),
        side_characters: v.array(v.string()),
      }),
      sources: v.array(v.string()),
      primarySource: v.string(),
      genre: v.string(),
      storyType: v.string(),
      playerMode: v.boolean(),
      characterCount: v.string(),
      timestamp: v.number(),
    })),
    passed: v.array(v.object({
      text: v.string(),
      characters: v.object({
        main_characters: v.array(v.string()),
        side_characters: v.array(v.string()),
      }),
      sources: v.array(v.string()),
      primarySource: v.string(),
      genre: v.string(),
      storyType: v.string(),
      playerMode: v.boolean(),
      characterCount: v.string(),
      timestamp: v.number(),
    })),
    lastUpdated: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),
  
  stories: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    suggestionId: v.string(), // Reference to the story suggestion that started this story
    suggestion: v.object({
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
    }),
    title: v.optional(v.string()),
    pages: v.array(v.object({
      content: v.string(),
      timestamp: v.number(),
    })),
    playerName: v.optional(v.string()),
    selectedCharacters: v.array(v.string()),
    isActive: v.boolean(),
    updatedAt: v.number(),
    // Story outline (hidden from user)
    outline: v.optional(v.object({
      acts: v.array(v.object({
        title: v.optional(v.string()),
        chapters: v.array(v.object({
          title: v.optional(v.string()),
          beats: v.array(v.string())
        }))
      }))
    })),
    outlineVersion: v.optional(v.number()),
    outlineStatus: v.optional(v.union(
      v.literal("pending"),
      v.literal("complete"),
      v.literal("error")
    )),
    currentChapter: v.optional(v.number()),
    currentAct: v.optional(v.number()),
    storyStatus: v.optional(v.union(
      v.literal("ongoing"),
      v.literal("act_complete"),
      v.literal("chapter_complete"),
      v.literal("story_complete")
    )),
    // Track divergences from outline
    outlineDivergence: v.optional(v.array(v.object({
      pageIndex: v.number(),
      originalBeat: v.string(),
      actualContent: v.string(),
      timestamp: v.number()
    }))),
    // Page edits tracking
    pageEdits: v.optional(v.array(v.object({
      pageIndex: v.number(),
      originalContent: v.string(),
      editedContent: v.string(),
      editedAt: v.number()
    }))),
    // User messages for persistence across reloads
    userMessages: v.optional(v.array(v.object({
      text: v.string(),
      timestamp: v.number(),
      actionId: v.optional(v.string()),
    }))),
    createdAt: v.optional(v.number()),
    // Story sharing fields
    isPublic: v.optional(v.boolean()),
    shareToken: v.optional(v.string()),
    sharedAt: v.optional(v.number()),
    shareSettings: v.optional(v.object({
      allowEntireStory: v.boolean(),
      allowSpecificPages: v.boolean(),
      sharedPages: v.optional(v.array(v.number())), // Array of page indices
    })),
    authorName: v.optional(v.string()), // Author display name for shared stories
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_and_active", ["userId", "isActive"])
    .index("by_session_and_active", ["sessionId", "isActive"])
    .index("by_share_token", ["shareToken"]),
    
  aiUsageLogs: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    useCase: v.string(), // e.g., "characterSearch", "storySuggestionGeneration"
    provider: v.string(), // e.g., "vertex", "google"
    model: v.string(), // e.g., "gemini-2.5-flash-lite-preview-06-17"
    modelName: v.optional(v.string()), // Internal model name reference
    temperature: v.optional(v.number()), // Temperature setting used
    tier: v.optional(v.string()), // User tier at time of usage
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    cachedInputTokens: v.optional(v.number()),
    inputCost: v.optional(v.number()), // Cost in USD for input tokens
    outputCost: v.optional(v.number()), // Cost in USD for output tokens
    totalCost: v.optional(v.number()), // Total cost in USD
    success: v.boolean(), // Whether the generation was successful
    errorMessage: v.optional(v.string()), // Error message if unsuccessful
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_use_case", ["useCase"])
    .index("by_provider", ["provider"])
    .index("by_model", ["model"]),

  // Character cache and lore storage
  characters: defineTable({
    fullName: v.string(),
    fullNameLower: v.string(), // normalized for fast lookup
    gender: v.string(),
    source: v.string(),
    characterLore: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_name_lower", ["fullNameLower"])
    .index("by_source", ["source"])
    .index("by_name_source", ["fullNameLower", "source"]),

  worldLore: defineTable({
    source: v.string(),
    lore: v.string(),
    createdAt: v.optional(v.number()),
  })
    .index("by_source", ["source"]),

  // Custom content tables
  customCharacters: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    fullName: v.string(),
    gender: v.string(),
    characterLore: v.optional(v.string()),
    isActive: v.boolean(),
    isCustomized: v.optional(v.boolean()),
    originalCharacter: v.optional(v.object({
      fullName: v.string(),
      source: v.string(),
    })),
    updatedAt: v.number(),
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_session_active", ["sessionId", "isActive"])
    ,

  customWorldLore: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    title: v.string(),
    lore: v.string(),
    isActive: v.boolean(),
    isCustomized: v.optional(v.boolean()),
    originalSource: v.optional(v.string()),
    updatedAt: v.number(),
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    ,

  customStorySuggestions: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
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
      pov: v.optional(v.string()),
    }),
    isActive: v.boolean(),
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),

  // Story summaries table for context management
  storySummaries: defineTable({
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
    createdAt: v.optional(v.number()),
  })
    .index("by_story", ["storyId"])
    .index("by_story_and_range", ["storyId", "pageRange.start"]),

  // Stripe customer management
  stripeCustomers: defineTable({
    userId: v.string(),
    stripeCustomerId: v.string(),
    email: v.string(),
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_customer", ["stripeCustomerId"]),

  // Stripe subscription management
  stripeSubscriptions: defineTable({
    userId: v.string(),
    subscriptionId: v.string(),
    priceId: v.string(),
    status: v.string(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_subscription_id", ["subscriptionId"])
    .index("by_status", ["status"]),

  // Tag system tables
  tags: defineTable({ 
    name: v.string() 
  }).index("by_name", ["name"]),
  // Referral codes for friend invitations
  referralCodes: defineTable({
    code: v.string(), // Unique referral code
    createdBy: v.string(), // User ID who created the code
    expiresAt: v.number(), // Timestamp when expires (24 hours later)
    usedBy: v.optional(v.string()), // User ID who redeemed the code
    usedAt: v.optional(v.number()), // Timestamp when redeemed
    stripeCouponId: v.optional(v.string()), // Stripe coupon ID
    status: v.union(v.literal("active"), v.literal("expired"), v.literal("used")),
    createdAt: v.optional(v.number()),
  })
    .index("by_code", ["code"])
    .index("by_creator", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_expiration", ["expiresAt"])
    .index("by_creator_status", ["createdBy", "status"])
    .index("by_status_expiration", ["status", "expiresAt"]),

  // Users table synced from Clerk
  users: defineTable({
    externalId: v.string(), // Clerk user ID
    name: v.string(),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    updatedAt: v.number(),
    createdAt: v.optional(v.number()),
  })
    .index("by_external_id", ["externalId"]),

  // Blind test votes
  blindTestVotes: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    questionHash: v.string(), // Hash of the question text
    winnerModel: v.string(), // "gpt-4o" or "gpt-5-chat"
    votedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_question", ["questionHash"])
    .index("by_winner", ["winnerModel"])
    ,

  // Character chat sessions (basic chat storage)
  characterChats: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    title: v.optional(v.string()),
    participants: v.array(v.string()),
    primarySource: v.optional(v.string()),
    authorNote: v.optional(v.string()),
    memory: v.optional(v.string()),
    formatMode: v.union(v.literal("classic_rp"), v.literal("chatml")),
    isGroup: v.boolean(),
    isActive: v.boolean(),
    updatedAt: v.number(),
    lastMessageAt: v.optional(v.number()),
    lastPreview: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"]) 
    .index("by_session", ["sessionId"]) 
    .index("by_user_and_updated", ["userId", "updatedAt"]) 
    .index("by_session_and_updated", ["sessionId", "updatedAt"]),

  // Character chat messages
  characterChatMessages: defineTable({
    chatId: v.id("characterChats"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system"), v.literal("ooc")),
    name: v.optional(v.string()),
    content: v.string(),
    messageIndex: v.number(),
    usage: v.optional(v.object({
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      totalTokens: v.optional(v.number()),
      reasoningTokens: v.optional(v.number()),
      cachedInputTokens: v.optional(v.number()),
    })),
    model: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  })
    .index("by_chat_and_index", ["chatId", "messageIndex"]),

  // SillyTavern imported presets
  importedPresets: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    name: v.string(),
    presetType: v.union(
      v.literal("openai"),
      v.literal("textgen"),
      v.literal("kobold"),
      v.literal("novelai"),
      v.literal("instruct"),
      v.literal("context"),
      v.literal("sysprompt"),
      v.literal("reasoning")
    ),
    originalDataId: v.id("_storage"), // Reference to file in Convex storage
    isActive: v.boolean(),
    importedAt: v.number(),
    lastUsed: v.optional(v.number()),
    // Social features
    isPublic: v.optional(v.boolean()), // Whether this preset is publicly shared
    authorId: v.optional(v.id("users")), // Reference to the author from users table
    authorName: v.optional(v.string()), // Author's display name
    publishedAt: v.optional(v.number()), // When it was made public
    likesCount: v.optional(v.number()), // Denormalized like count
    usesCount: v.optional(v.number()), // How many times it's been used by others
    version: v.optional(v.number()), // Version number for tracking updates
    parentId: v.optional(v.id("importedPresets")), // Reference to previous version
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_type", ["presetType"])
    .index("by_user_type", ["userId", "presetType"])
    .index("by_session_type", ["sessionId", "presetType"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_session_active", ["sessionId", "isActive"])
    .index("by_public", ["isPublic"])
    .index("by_author", ["authorId"])
    .index("by_public_published", ["isPublic", "publishedAt"])
    .index("by_public_likes", ["isPublic", "likesCount"])
    .index("by_public_uses", ["isPublic", "usesCount"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["isPublic", "isActive"]
    }),

  // Chat preset associations - links chats to imported presets
  chatPresetSettings: defineTable({
    chatId: v.id("characterChats"),
    presetId: v.id("importedPresets"),
    isActive: v.boolean(),
    appliedAt: v.number(),
    // Character-specific overrides
    characterOverrides: v.optional(v.object({
      characterId: v.optional(v.string()),
      customPrompts: v.optional(v.array(v.object({
        identifier: v.string(),
        content: v.string(),
        enabled: v.boolean(),
      }))),
      customSettings: v.optional(v.object({
        temperature: v.optional(v.number()),
        maxTokens: v.optional(v.number()),
      })),
    })),
  })
    .index("by_chat", ["chatId"])
    .index("by_preset", ["presetId"])
    .index("by_chat_active", ["chatId", "isActive"]),

  // SillyTavern imported character cards
  importedCharacters: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    name: v.string(),
    description: v.string(),
    personality: v.string(),
    scenario: v.string(),
    firstMessage: v.string(),
    messageExample: v.string(),
    creatorNotes: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
    postHistoryInstructions: v.optional(v.string()),
    alternateGreetings: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    creator: v.optional(v.string()),
    characterVersion: v.optional(v.string()),
    avatar: v.optional(v.string()), // Base64 or URL
    spec: v.string(), // "chara_card_v2" or "chara_card_v3"
    specVersion: v.string(),
    characterBook: v.optional(v.any()), // World info/lorebook
    extensions: v.optional(v.any()), // Additional ST-specific data
    originalData: v.any(), // Complete original card data
    importedAt: v.number(),
    lastUsed: v.optional(v.number()),
    isActive: v.boolean(),
    // Social features
    isPublic: v.optional(v.boolean()), // Whether this character is publicly shared
    authorId: v.optional(v.id("users")), // Reference to the author from users table
    authorName: v.optional(v.string()), // Author's display name
    publishedAt: v.optional(v.number()), // When it was made public
    likesCount: v.optional(v.number()), // Denormalized like count
    usesCount: v.optional(v.number()), // How many times it's been used by others
    version: v.optional(v.number()), // Version number for tracking updates
    parentId: v.optional(v.id("importedCharacters")), // Reference to previous version
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_session_active", ["sessionId", "isActive"])
    .index("by_name", ["name"])
    .index("by_public", ["isPublic"])
    .index("by_author", ["authorId"])
    .index("by_public_published", ["isPublic", "publishedAt"])
    .index("by_public_likes", ["isPublic", "likesCount"])
    .index("by_public_uses", ["isPublic", "usesCount"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["isPublic", "isActive"]
    }),

  // Character chat associations - links chats to imported characters
  characterChatSettings: defineTable({
    chatId: v.id("characterChats"),
    characterId: v.id("importedCharacters"),
    presetId: v.optional(v.id("importedPresets")),
    appliedAt: v.number(),
    isActive: v.boolean(),
    // Custom greeting selection
    selectedGreeting: v.optional(v.number()), // Index of alternate greeting or 0 for first_mes
  })
    .index("by_chat", ["chatId"])
    .index("by_character", ["characterId"])
    .index("by_chat_active", ["chatId", "isActive"]),

  // SillyTavern imported lorebooks/world info
  importedLorebooks: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    
    // World info entries - core data structure
    entries: v.any(), // Object with numeric keys containing entry data
    
    // Global settings
    settings: v.object({
      recursive: v.optional(v.boolean()),
      scanDepth: v.optional(v.number()),
      tokenBudget: v.optional(v.number()),
      recursionDepth: v.optional(v.number()),
      recursionSteps: v.optional(v.number()),
      minActivations: v.optional(v.number()),
      maxDepth: v.optional(v.number()),
      insertionStrategy: v.optional(v.string()),
      includeNames: v.optional(v.boolean()),
      caseSensitive: v.optional(v.boolean()),
      matchWholeWords: v.optional(v.boolean()),
      useGroupScoring: v.optional(v.boolean()),
      budgetCap: v.optional(v.number()),
    }),
    
    // Format info
    format: v.union(
      v.literal("sillytavern"),
      v.literal("novelai"),
      v.literal("agnai"),
      v.literal("risu")
    ),
    version: v.optional(v.string()),
    
    // Metadata
    originalData: v.any(), // Complete original lorebook data
    entryCount: v.number(),
    importedAt: v.number(),
    lastUsed: v.optional(v.number()),
    isActive: v.boolean(),
    // Social features
    isPublic: v.optional(v.boolean()), // Whether this lorebook is publicly shared
    authorId: v.optional(v.id("users")), // Reference to the author from users table
    authorName: v.optional(v.string()), // Author's display name
    publishedAt: v.optional(v.number()), // When it was made public
    likesCount: v.optional(v.number()), // Denormalized like count
    usesCount: v.optional(v.number()), // How many times it's been used by others
    versionNumber: v.optional(v.number()), // Version number for tracking updates (renamed to avoid conflict)
    parentId: v.optional(v.id("importedLorebooks")), // Reference to previous version
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_active", ["userId", "isActive"])
    .index("by_session_active", ["sessionId", "isActive"])
    .index("by_name", ["name"])
    .index("by_public", ["isPublic"])
    .index("by_author", ["authorId"])
    .index("by_public_published", ["isPublic", "publishedAt"])
    .index("by_public_likes", ["isPublic", "likesCount"])
    .index("by_public_uses", ["isPublic", "usesCount"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["isPublic", "isActive"]
    }),

  // Lorebook chat associations
  lorebookChatSettings: defineTable({
    chatId: v.id("characterChats"),
    lorebookId: v.id("importedLorebooks"),
    appliedAt: v.number(),
    isActive: v.boolean(),
    
    // Entry activation tracking
    activatedEntries: v.optional(v.array(v.object({
      uid: v.number(),
      key: v.array(v.string()),
      activatedAt: v.number(),
      // Timed effects
      sticky: v.optional(v.number()),
      cooldown: v.optional(v.number()),
      delay: v.optional(v.number()),
    }))),
    
    // Override settings for this chat
    overrides: v.optional(v.object({
      recursive: v.optional(v.boolean()),
      scanDepth: v.optional(v.number()),
      tokenBudget: v.optional(v.number()),
      caseSensitive: v.optional(v.boolean()),
      matchWholeWords: v.optional(v.boolean()),
    })),
  })
    .index("by_chat", ["chatId"])
    .index("by_lorebook", ["lorebookId"])
    .index("by_chat_active", ["chatId", "isActive"]),

  // Social features tables
  
  // Likes on public imports
  importLikes: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    itemType: v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook")),
    itemId: v.string(), // ID of the liked item (preset, character, or lorebook)
    authorId: v.id("users"), // Author of the liked item
    likedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_item", ["itemType", "itemId"])
    .index("by_user_item", ["userId", "itemType", "itemId"])
    .index("by_session_item", ["sessionId", "itemType", "itemId"])
    .index("by_author", ["authorId"]),

  // Following relationships between users
  importFollows: defineTable({
    followerId: v.optional(v.string()), // User doing the following
    followerSessionId: v.optional(v.string()),
    authorId: v.id("users"), // User being followed
    followedAt: v.number(),
  })
    .index("by_follower", ["followerId"])
    .index("by_follower_session", ["followerSessionId"])
    .index("by_author", ["authorId"])
    .index("by_follower_author", ["followerId", "authorId"])
    .index("by_session_author", ["followerSessionId", "authorId"]),

  // Usage tracking when someone applies an import
  importUsage: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    itemType: v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook")),
    itemId: v.string(), // ID of the used item
    authorId: v.id("users"), // Author of the used item
    chatId: v.optional(v.id("characterChats")), // Chat where it was applied
    usedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_item", ["itemType", "itemId"])
    .index("by_author", ["authorId"])
    .index("by_chat", ["chatId"]),

  // Version history tracking
  importVersions: defineTable({
    itemType: v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook")),
    currentItemId: v.string(), // Current version ID
    previousItemId: v.string(), // Previous version ID
    authorId: v.id("users"),
    versionNumber: v.number(),
    changeDescription: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_current_item", ["itemType", "currentItemId"])
    .index("by_previous_item", ["itemType", "previousItemId"])
    .index("by_author", ["authorId"]),

  // Notifications for updates and follows
  importNotifications: defineTable({
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    type: v.union(
      v.literal("new_version"), // Author published new version of liked item
      v.literal("new_item"), // Followed author published new item
      v.literal("item_liked"), // Someone liked your item
      v.literal("new_follower") // Someone started following you
    ),
    itemType: v.optional(v.union(v.literal("preset"), v.literal("character"), v.literal("lorebook"))),
    itemId: v.optional(v.string()),
    authorId: v.id("users"), // Author who triggered the notification
    triggerUserId: v.optional(v.string()), // User who performed the action (for likes/follows)
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_user_unread", ["userId", "isRead"])
    .index("by_session_unread", ["sessionId", "isRead"])
    .index("by_author", ["authorId"])
    .index("by_created", ["createdAt"]),
});