import { v } from "convex/values";
import { mutation, internalMutation } from "../_generated/server";
import { api } from "../_generated/api";

// Generate a unique referral code (6 characters)
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoiding ambiguous characters
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Create a new referral code for a user
export const createReferralCode = mutation({
  args: {
    productId: v.string(),
  },
  returns: v.object({
    _id: v.id("referralCodes"),
    code: v.string(),
    expiresAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;

    // Check if user already has an active referral code
    const existingCode = await ctx.db
      .query("referralCodes")
      .withIndex("by_creator_status", (q) => 
        q.eq("createdBy", userId).eq("status", "active")
      )
      .first();

    if (existingCode) {
      // Check if it's still valid
      const now = Date.now();
      if (existingCode.expiresAt > now) {
        return { _id: existingCode._id, code: existingCode.code, expiresAt: existingCode.expiresAt };
      }
      // Mark as expired if it's past expiration
      await ctx.db.patch(existingCode._id, { status: "expired" });
    }

    // Generate a unique code
    let code: string;
    let attempts = 0;
    do {
      code = generateReferralCode();
      const existing = await ctx.db
        .query("referralCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .first();
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new Error("Failed to generate unique code");
    }

    const now = Date.now();
    const expiresAt = now + 24 * 60 * 60 * 1000; // 24 hours from now

    // Create the referral code in the database
    const referralId = await ctx.db.insert("referralCodes", {
      code,
      createdBy: userId,
      expiresAt,
      status: "active",
    });

    // Create discount in Polar via API route
    // Note: This will be called from the client side
    // as we can't make external API calls directly from Convex

    return { _id: referralId, code, expiresAt };
  },
});

// Mark a referral code as used
export const redeemReferralCode = mutation({
  args: {
    code: v.string(),
  },
  returns: v.object({ success: v.boolean(), code: v.string() }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const userId = identity.subject;
    const now = Date.now();

    // Find the referral code
    const referralCode = await ctx.db
      .query("referralCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .first();

    if (!referralCode) {
      throw new Error("Invalid referral code");
    }

    // Check if code is expired
    if (referralCode.expiresAt < now) {
      await ctx.db.patch(referralCode._id, { status: "expired" });
      throw new Error("Referral code has expired");
    }

    // Check if code is already used
    if (referralCode.status === "used") {
      throw new Error("Referral code has already been used");
    }

    // Check if user is trying to use their own code
    if (referralCode.createdBy === userId) {
      throw new Error("You cannot use your own referral code");
    }

    // Mark the code as used
    await ctx.db.patch(referralCode._id, {
      status: "used",
      usedBy: userId,
      usedAt: now,
    });

    return {
      success: true,
      code: referralCode.code,
    };
  },
});

// Update referral code with Stripe coupon ID
export const updateReferralCodeDiscountId = mutation({
  args: {
    code: v.string(),
    stripeCouponId: v.optional(v.string()),
    polarDiscountId: v.optional(v.string()), // Keep for backwards compatibility during migration
  },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const referralCode = await ctx.db
      .query("referralCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!referralCode) {
      throw new Error("Referral code not found");
    }

    const updateData: any = {};
    if (args.stripeCouponId) {
      updateData.stripeCouponId = args.stripeCouponId;
    }
    if (args.polarDiscountId) {
      updateData.polarDiscountId = args.polarDiscountId;
    }

    await ctx.db.patch(referralCode._id, updateData);

    return { success: true };
  },
});

// Clean up expired codes (called by cron job)
export const cleanupExpiredCodes = internalMutation({
  args: {},
  returns: v.object({ cleaned: v.number() }),
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find all expired codes that are still marked as active
    const expiredCodes = await ctx.db
      .query("referralCodes")
      .withIndex("by_status_expiration", (q) => 
        q.eq("status", "active").lt("expiresAt", now)
      )
      .collect();

    // Mark them as expired
    for (const code of expiredCodes) {
      await ctx.db.patch(code._id, { status: "expired" });
    }

    return {
      cleaned: expiredCodes.length,
    };
  },
});