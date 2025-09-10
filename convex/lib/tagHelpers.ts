import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { Id } from "../_generated/dataModel";

/**
 * Canonicalizes a tag name to lowercase, trimmed format
 */
export function canonicaliseTag(tag: string): string {
  return tag.toLowerCase().trim();
}

/**
 * Upserts a tag in the database, returning its ID
 */
export const upsertTag = internalMutation({
  args: {
    name: v.string(),
  },
  returns: v.id("tags"),
  handler: async (ctx, args) => {
    const canonicalName = canonicaliseTag(args.name);
    
    // Check if tag already exists
    const existingTag = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", canonicalName))
      .first();
    
    if (existingTag) {
      return existingTag._id;
    }
    
    // Create new tag
    return await ctx.db.insert("tags", {
      name: canonicalName,
    });
  },
});

/**
 * Internal mutation to create a tag
 */
export const createTag = internalMutation({
  args: {
    name: v.string(),
  },
  returns: v.id("tags"),
  handler: async (ctx, args) => {
    const canonicalName = canonicaliseTag(args.name);
    
    // Create new tag (assumes caller has already checked it doesn't exist)
    return await ctx.db.insert("tags", {
      name: canonicalName,
    });
  },
});