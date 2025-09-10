import { query } from "../_generated/server";
import { v } from "convex/values";
import { authArgsValidator, requireAuth } from "../lib/authHelpers";

// Get story outline status
export const getOutlineStatus = query({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
  },
  returns: v.union(
    v.object({
      outlineStatus: v.union(
        v.literal("pending"),
        v.literal("complete"),
        v.literal("error")
      ),
      outline: v.optional(v.object({
        acts: v.array(v.object({
          title: v.optional(v.string()),
          chapters: v.array(v.object({
            title: v.optional(v.string()),
            beats: v.array(v.string())
          }))
        }))
      })),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const story = await ctx.db.get(args.storyId);
    if (!story) return null;
    const ownerOk = args.userId ? story.userId === args.userId : story.sessionId === args.sessionId;
    if (!ownerOk) return null;
    return {
      outlineStatus: story.outlineStatus || "pending",
      outline: story.outline,
    };
  },
});