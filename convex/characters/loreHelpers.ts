import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// Helper query to check if world lore exists
export const checkWorldLoreExists = query({
  args: { source: v.string() },
  handler: async (ctx, { source }) => {
    const exists = await ctx.db
      .query("worldLore")
      .withIndex("by_source", q => q.eq("source", source))
      .first();
    return !!exists;
  },
});

// Helper mutation to insert world lore
export const insertWorldLore = internalMutation({
  args: { 
    source: v.string(),
    lore: v.string(),
  },
  handler: async (ctx, { source, lore }) => {
    // Check if world lore already exists to prevent duplicates
    const existing = await ctx.db
      .query("worldLore")
      .withIndex("by_source", q => q.eq("source", source))
      .first();

    if (existing) {
      return { success: true }; // Already exists, no need to insert
    }

    await ctx.db.insert("worldLore", {
      source,
      lore,
    });
    return { success: true };
  },
});

// Helper query to get character for lore generation
export const getCharacterForLore = query({
  args: { 
    fullName: v.string(),
    source: v.string(),
  },
  handler: async (ctx, { fullName, source }) => {
    return await ctx.db
      .query("characters")
      .withIndex("by_name_source", q =>
        q.eq("fullNameLower", fullName.toLowerCase()).eq("source", source)
      )
      .unique();
  },
});

// Helper mutation to update character lore
export const updateCharacterLore = internalMutation({
  args: { 
    characterId: v.id("characters"),
    lore: v.string(),
  },
  handler: async (ctx, { characterId, lore }) => {
    await ctx.db.patch(characterId, { 
      characterLore: lore 
    });
    return { success: true };
  },
});

// Helper query to get world lore by source
export const getWorldLore = query({
  args: { source: v.string() },
  handler: async (ctx, { source }) => {
    const worldLore = await ctx.db
      .query("worldLore")
      .withIndex("by_source", q => q.eq("source", source))
      .first();
    return worldLore?.lore || null;
  },
});

// Helper query to get character lore for multiple characters in a story
export const getCharacterLoreForStory = query({
  args: { 
    characterNames: v.array(v.string()),
    source: v.string(),
  },
  handler: async (ctx, { characterNames, source }) => {
    // Deduplicate incoming names by lowercase to minimize DB queries
    const lowerCaseUniqueNames = Array.from(
      new Set(characterNames.map((name) => name.toLowerCase()))
    );

    // Fetch all character docs in parallel
    const characters = await Promise.all(
      lowerCaseUniqueNames.map((lowerName) =>
        ctx.db
          .query("characters")
          .withIndex("by_name_source", (q) =>
            q.eq("fullNameLower", lowerName).eq("source", source)
          )
          .unique()
      )
    );

    // Build a quick lookup by lowercase name
    const loreByLowerName: Record<string, string> = {};
    characters.forEach((character, index) => {
      if (character?.characterLore) {
        loreByLowerName[lowerCaseUniqueNames[index]] = character.characterLore;
      }
    });

    // Map back to original names (preserve original casing and duplicates)
    const characterLoreMap: Record<string, string> = {};
    for (const originalName of characterNames) {
      const lore = loreByLowerName[originalName.toLowerCase()];
      if (lore) {
        characterLoreMap[originalName] = lore;
      }
    }

    return characterLoreMap;
  },
}); 