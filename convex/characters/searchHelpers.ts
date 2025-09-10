import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { api } from "../_generated/api";

// Helper query to get cached characters
export const getCachedCharacters = query({
  args: {
    query: v.string(),
  },
  returns: v.array(v.object({
    fullName: v.string(),
    gender: v.string(),
    source: v.string(),
  })),
  handler: async (ctx, args) => {
    const normalizedQuery = args.query.trim().toLowerCase();
    const cachedCharacters = await ctx.db
      .query("characters")
      .withIndex("by_name_lower", q => q.eq("fullNameLower", normalizedQuery))
      .collect();

    return cachedCharacters.map(({ fullName, gender, source }) => ({
      fullName,
      gender,
      source,
    }));
  },
});

// Helper mutation to only cache new characters (internal - no auth needed)
export const cacheCharacters = internalMutation({
  args: {
    characters: v.array(v.object({
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    })),
  },
  returns: v.array(v.object({
    fullName: v.string(),
    gender: v.string(),
    source: v.string(),
  })),
  handler: async (ctx, args) => {
    const newCharacters = [];
    
    for (const character of args.characters) {
      // Check if character already exists (to avoid duplicates)
      const existingCharacter = await ctx.db
        .query("characters")
        .withIndex("by_name_source", q =>
          q.eq("fullNameLower", character.fullName.toLowerCase())
           .eq("source", character.source)
        )
        .unique();

      if (!existingCharacter) {
        // Insert new character document
        await ctx.db.insert("characters", {
          fullName: character.fullName,
          fullNameLower: character.fullName.toLowerCase(),
          gender: character.gender,
          source: character.source,
        });
        newCharacters.push(character);
      }
    }

    return newCharacters;
  },
});

// Helper mutation to schedule lore generation only for characters missing lore (internal - no auth needed)
export const scheduleMissingLore = internalMutation({
  args: {
    characters: v.array(v.object({
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    })),
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    for (const character of args.characters) {
      // Check if world lore exists
      const worldLoreExists = await ctx.runQuery(
        api.characters.loreHelpers.checkWorldLoreExists,
        { source: character.source },
      );

      // Check if character lore exists
      const charDoc = await ctx.runQuery(
        api.characters.loreHelpers.getCharacterForLore,
        { fullName: character.fullName, source: character.source },
      );

      const needsWorldLore = !worldLoreExists;
      const needsCharacterLore = !charDoc || !charDoc.characterLore;

      if (needsWorldLore || needsCharacterLore) {
        await ctx.scheduler.runAfter(0, api.characters.lore.generateLore, {
          fullName: character.fullName,
          source: character.source,
        });
      }
    }

    return { success: true };
  },
});

 