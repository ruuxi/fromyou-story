import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Generic get by ID query
export const get = query({
  args: {
    id: v.id("storySuggestions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});