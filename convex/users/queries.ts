import { query } from "../_generated/server";
import { v } from "convex/values";

export const getUserByClerkId = query({
  args: {
    clerkId: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      clerkId: v.string(),
      email: v.string(),
      name: v.optional(v.string()),
    })
  ),
  handler: async (ctx, args) => {
    // In a real app, you'd have a users table with Clerk ID
    // For now, we'll return a mock user
    // You should create a proper users table and query it here
    return {
      _id: "mock_user_id" as any,
      clerkId: args.clerkId,
      email: "user@example.com",
      name: "User",
    };
  },
});