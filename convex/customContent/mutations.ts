import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth, buildIdentifierQueryNormalized, buildIdentifierQuery } from "../lib/authHelpers";
import { Id } from "../_generated/dataModel";

// Character mutations
export const createCustomCharacter = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    fullName: v.string(),
    gender: v.string(),
    characterLore: v.optional(v.string()),
    isCustomized: v.optional(v.boolean()),
    originalCharacter: v.optional(v.object({
      fullName: v.string(),
      source: v.string(),
    })),
  },
  returns: v.id("customCharacters"),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    
    const characterId = await ctx.db.insert("customCharacters", {
      ...identifierQuery,
      fullName: args.fullName,
      gender: args.gender,
      characterLore: args.characterLore,
      isActive: true,
      isCustomized: args.isCustomized || false,
      originalCharacter: args.originalCharacter,
      updatedAt: Date.now(),
    });
    
    // Also add to selected characters
    await ctx.db.insert("selectedCharacters", {
      ...identifierQuery,
      fullName: args.fullName,
      gender: args.gender,
      source: "Custom",
    });
    
    return characterId;
  },
});

export const createCustomizedCharacter = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    originalFullName: v.string(),
    originalSource: v.string(),
    fullName: v.string(),
    gender: v.string(),
    characterLore: v.optional(v.string()),
  },
  returns: v.id("customCharacters"),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    
    // Check if a customized version already exists
    const existing = await ctx.db
      .query("customCharacters")
      .withIndex(args.userId ? "by_user_active" : "by_session_active", (q) => {
        const base = args.userId ? q.eq("userId", args.userId) : q.eq("sessionId", args.sessionId!);
        return base.eq("isActive", true);
      })
      .collect()
      .then(rows => rows.find(r => r.isCustomized === true && r.originalCharacter?.fullName === args.originalFullName && r.originalCharacter?.source === args.originalSource));
    
    if (existing) {
      // Update existing customized character
      await ctx.db.patch(existing._id, {
        fullName: args.fullName,
        gender: args.gender,
        characterLore: args.characterLore,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    
    // Create new customized character
    const characterId = await ctx.db.insert("customCharacters", {
      ...identifierQuery,
      fullName: args.fullName,
      gender: args.gender,
      characterLore: args.characterLore,
      isActive: true,
      isCustomized: true,
      originalCharacter: {
        fullName: args.originalFullName,
        source: args.originalSource,
      },
      updatedAt: Date.now(),
    });
    
    return characterId;
  },
});

export const updateCustomCharacter = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    characterId: v.id("customCharacters"),
    fullName: v.optional(v.string()),
    gender: v.optional(v.string()),
    characterLore: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    // Verify ownership
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");
    
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    if (args.userId && character.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    if (args.sessionId && character.sessionId !== args.sessionId) {
      throw new Error("Unauthorized");
    }
    
    const updates: any = { updatedAt: Date.now() };
    if (args.fullName !== undefined) updates.fullName = args.fullName;
    if (args.gender !== undefined) updates.gender = args.gender;
    if (args.characterLore !== undefined) updates.characterLore = args.characterLore;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    
    await ctx.db.patch(args.characterId, updates);
    
    // Update in selected characters if name/gender changed
    if (args.fullName !== undefined || args.gender !== undefined) {
      const selectedChars = await ctx.db
        .query("selectedCharacters")
        .withIndex(args.userId ? "by_user" : "by_session", (q) =>
          args.userId ? q.eq("userId", args.userId) : q.eq("sessionId", args.sessionId!)
        )
        .collect();
      
      const matchingChar = selectedChars.find(
        sc => sc.fullName === character.fullName && sc.source === "Custom"
      );
      
      if (matchingChar) {
        await ctx.db.patch(matchingChar._id, {
          fullName: args.fullName || character.fullName,
          gender: args.gender || character.gender,
        });
      }
    }
  },
});

export const deleteCustomCharacter = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    characterId: v.id("customCharacters"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    // Verify ownership
    const character = await ctx.db.get(args.characterId);
    if (!character) throw new Error("Character not found");
    
    if (args.userId && character.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    if (args.sessionId && character.sessionId !== args.sessionId) {
      throw new Error("Unauthorized");
    }
    
    // Remove from selected characters
    const selectedChars = await ctx.db
      .query("selectedCharacters")
      .withIndex(args.userId ? "by_user" : "by_session", (q) =>
        args.userId ? q.eq("userId", args.userId) : q.eq("sessionId", args.sessionId!)
      )
      .collect();
    
    const matchingChar = selectedChars.find(
      sc => sc.fullName === character.fullName && sc.source === "Custom"
    );
    
    if (matchingChar) {
      await ctx.db.delete(matchingChar._id);
    }
    
    await ctx.db.delete(args.characterId);
  },
});

// World lore mutations
export const createCustomWorldLore = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    title: v.string(),
    lore: v.string(),
    isCustomized: v.optional(v.boolean()),
    originalSource: v.optional(v.string()),
  },
  returns: v.id("customWorldLore"),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    
    return await ctx.db.insert("customWorldLore", {
      ...identifierQuery,
      title: args.title,
      lore: args.lore,
      isActive: true,
      isCustomized: args.isCustomized || false,
      originalSource: args.originalSource,
      updatedAt: Date.now(),
    });
  },
});

export const createCustomizedWorldLore = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    originalSource: v.string(),
    title: v.string(),
    lore: v.string(),
  },
  returns: v.id("customWorldLore"),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    
    // Check if a customized version already exists
    const existing = await ctx.db
      .query("customWorldLore")
      .withIndex(args.userId ? "by_user" : "by_session", (q) =>
        args.userId ? q.eq("userId", args.userId) : q.eq("sessionId", args.sessionId!)
      )
      .collect()
      .then(rows => rows.find(r => r.isCustomized === true && r.originalSource === args.originalSource));
    
    if (existing) {
      // Update existing customized world lore
      await ctx.db.patch(existing._id, {
        title: args.title,
        lore: args.lore,
        updatedAt: Date.now(),
      });
      return existing._id;
    }
    
    // Create new customized world lore
    const loreId = await ctx.db.insert("customWorldLore", {
      ...identifierQuery,
      title: args.title,
      lore: args.lore,
      isActive: true,
      isCustomized: true,
      originalSource: args.originalSource,
      updatedAt: Date.now(),
    });
    
    return loreId;
  },
});

export const updateCustomWorldLore = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    loreId: v.id("customWorldLore"),
    title: v.optional(v.string()),
    lore: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    // Verify ownership
    const worldLore = await ctx.db.get(args.loreId);
    if (!worldLore) throw new Error("World lore not found");
    
    if (args.userId && worldLore.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    if (args.sessionId && worldLore.sessionId !== args.sessionId) {
      throw new Error("Unauthorized");
    }
    
    const updates: any = { updatedAt: Date.now() };
    if (args.title !== undefined) updates.title = args.title;
    if (args.lore !== undefined) updates.lore = args.lore;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    
    await ctx.db.patch(args.loreId, updates);
  },
});

export const deleteCustomWorldLore = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    loreId: v.id("customWorldLore"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    // Verify ownership
    const worldLore = await ctx.db.get(args.loreId);
    if (!worldLore) throw new Error("World lore not found");
    
    if (args.userId && worldLore.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    if (args.sessionId && worldLore.sessionId !== args.sessionId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.loreId);
  },
});

// Story suggestion mutations
export const createCustomStorySuggestion = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    text: v.string(),
    mainCharacters: v.array(v.string()),
    sideCharacters: v.array(v.string()),
    genre: v.string(),
    storyType: v.string(),
    playerMode: v.boolean(),
    characterCount: v.string(),
  },
  returns: v.id("customStorySuggestions"),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const identifierQuery = buildIdentifierQuery(args);
    
    const allCharacters = [...args.mainCharacters, ...args.sideCharacters];
    
    return await ctx.db.insert("customStorySuggestions", {
      ...identifierQuery,
      text: args.text,
      characters: {
        main_characters: args.mainCharacters,
        side_characters: args.sideCharacters,
      },
      metadata: {
        characters: allCharacters,
        sources: ["Custom"],
        primarySource: "Custom",
        genre: args.genre,
        storyType: args.storyType,
        playerMode: args.playerMode,
        characterCount: args.characterCount,
      },
      isActive: true,
    });
  },
});

export const updateCustomStorySuggestion = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    suggestionId: v.id("customStorySuggestions"),
    text: v.optional(v.string()),
    mainCharacters: v.optional(v.array(v.string())),
    sideCharacters: v.optional(v.array(v.string())),
    isActive: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    // Verify ownership
    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) throw new Error("Story suggestion not found");
    
    if (args.userId && suggestion.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    if (args.sessionId && suggestion.sessionId !== args.sessionId) {
      throw new Error("Unauthorized");
    }
    
    const updates: any = {};
    if (args.text !== undefined) updates.text = args.text;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    
    if (args.mainCharacters !== undefined || args.sideCharacters !== undefined) {
      updates.characters = {
        main_characters: args.mainCharacters || suggestion.characters.main_characters,
        side_characters: args.sideCharacters || suggestion.characters.side_characters,
      };
      
      const allCharacters = [...updates.characters.main_characters, ...updates.characters.side_characters];
      updates.metadata = {
        ...suggestion.metadata,
        characters: allCharacters,
      };
    }
    
    await ctx.db.patch(args.suggestionId, updates);
  },
});

export const deleteCustomStorySuggestion = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    suggestionId: v.id("customStorySuggestions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    // Verify ownership
    const suggestion = await ctx.db.get(args.suggestionId);
    if (!suggestion) throw new Error("Story suggestion not found");
    
    if (args.userId && suggestion.userId !== args.userId) {
      throw new Error("Unauthorized");
    }
    if (args.sessionId && suggestion.sessionId !== args.sessionId) {
      throw new Error("Unauthorized");
    }
    
    await ctx.db.delete(args.suggestionId);
  },
});

// Save per-user (or per-session) custom lore for a specific story/source without overwriting originals
export const saveStoryCustomLore = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    primarySource: v.string(),
    worldLore: v.optional(v.string()),
    characterLore: v.optional(v.record(v.string(), v.string())), // name -> lore
  },
  returns: v.object({
    savedWorldLore: v.optional(v.boolean()),
    savedCharacters: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);

    const savedCharacters: string[] = [];
    let savedWorldLore = false;

    // Handle world lore customization
    if (args.worldLore && args.worldLore.trim().length > 0) {
      // Check for existing customized world lore for this source
      const existing = await ctx.db
        .query("customWorldLore")
        .withIndex(args.userId ? "by_user" : "by_session", (q) =>
          args.userId ? q.eq("userId", args.userId) : q.eq("sessionId", args.sessionId!)
        )
        .collect()
        .then(rows => rows.find(r => r.isCustomized === true && r.originalSource === args.primarySource));

      if (existing) {
        await ctx.db.patch(existing._id, {
          lore: args.worldLore,
          updatedAt: Date.now(),
        });
      } else {
        await ctx.db.insert("customWorldLore", {
          ...identifierQuery,
          title: `${args.primarySource} (custom)`,
          lore: args.worldLore,
          isActive: true,
          isCustomized: true,
          originalSource: args.primarySource,
          updatedAt: Date.now(),
        });
      }
      savedWorldLore = true;
    }

    // Handle character lore customization
    if (args.characterLore) {
      for (const [name, lore] of Object.entries(args.characterLore)) {
        const lower = name.toLowerCase();

        // Lookup original character to get gender (if available)
        const original = await ctx.db
          .query("characters")
          .withIndex("by_name_source", (q) =>
            q.eq("fullNameLower", lower).eq("source", args.primarySource)
          )
          .unique();

        const gender = original?.gender || "unknown";

        // Check if a customized character already exists for this original
        const existing = await ctx.db
          .query("customCharacters")
          .withIndex(args.userId ? "by_user_active" : "by_session_active", (q) => {
            const base = args.userId ? q.eq("userId", args.userId) : q.eq("sessionId", args.sessionId!);
            return base.eq("isActive", true);
          })
          .collect()
          .then(rows => rows.find(r => r.isCustomized === true && r.originalCharacter?.fullName === name && r.originalCharacter?.source === args.primarySource));

        if (existing) {
          await ctx.db.patch(existing._id, {
            characterLore: lore,
            updatedAt: Date.now(),
          });
        } else {
          await ctx.db.insert("customCharacters", {
            ...identifierQuery,
            fullName: name,
            gender,
            characterLore: lore,
            isActive: true,
            isCustomized: true,
            originalCharacter: {
              fullName: name,
              source: args.primarySource,
            },
            updatedAt: Date.now(),
          });
        }

        savedCharacters.push(name);
      }
    }

    return { savedWorldLore: savedWorldLore ? true : undefined, savedCharacters };
  },
});