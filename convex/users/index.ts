import { v } from "convex/values"
import { mutation, query, internalMutation } from "../_generated/server"

export const getCurrentUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      userId: v.string(),
      email: v.union(v.string(), v.null()),
      name: v.union(v.string(), v.null()),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return null
    }
    
    return {
      userId: identity.subject,
      email: identity.email ?? null,
      name: identity.name ?? null,
    }
  },
})

export const updateProfile = mutation({
  args: {
    name: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }
    
    // Here you would typically update the user's profile in the database
    console.log(`Updating profile for user ${identity.subject} with name: ${args.name}`)
    
    return null
  },
})

// Helper function to find user by external ID
export async function userByExternalId(ctx: any, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_external_id", (q: any) => q.eq("externalId", externalId))
    .unique();
}

// Internal mutation to upsert user from Clerk webhook
export const upsertFromClerk = internalMutation({
  args: { data: v.any() }, // Trust Clerk's data structure
  returns: v.null(),
  handler: async (ctx, { data }) => {
    const now = Date.now();
    const userAttributes = {
      externalId: data.id,
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || data.email_addresses?.[0]?.email_address || "User",
      email: data.email_addresses?.[0]?.email_address || undefined,
      imageUrl: data.image_url || undefined,
      updatedAt: now,
    };
    
    const existingUser = await userByExternalId(ctx, data.id);
    if (existingUser === null) {
      // Create new user
      await ctx.db.insert("users", {
        ...userAttributes,
      });
      console.log("Created new user from Clerk:", data.id);
    } else {
      // Update existing user
      await ctx.db.patch(existingUser._id, userAttributes);
      console.log("Updated user from Clerk:", data.id);
    }
  },
});

// Internal mutation to delete user from Clerk webhook
export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  returns: v.null(),
  handler: async (ctx, { clerkUserId }) => {
    const user = await userByExternalId(ctx, clerkUserId);
    if (user !== null) {
      await ctx.db.delete(user._id);
      console.log("Deleted user from Clerk:", clerkUserId);
    } else {
      console.log("User not found for deletion:", clerkUserId);
    }
  },
});