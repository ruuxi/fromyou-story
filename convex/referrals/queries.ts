import { query } from "../_generated/server";
import { v } from "convex/values";

export const getUserReferralCode = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      code: v.string(),
      expiresAt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const referralCode = await ctx.db
      .query("referralCodes")
      .withIndex("by_creator", (q) => q.eq("createdBy", identity.subject))
      // Use in-memory checks after indexed fetch; if high volume, add composite index by_creator_and_status or by_creator_status_expires
      .first();

    if (!referralCode || referralCode.status !== "active" || referralCode.expiresAt <= Date.now()) {
      return null;
    }

    return {
      code: referralCode.code,
      expiresAt: referralCode.expiresAt,
    };
  },
});

export const hasUsedReferralCode = query({
  args: {},
  returns: v.boolean(),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return false;
    }

    const usedCode = await ctx.db
      .query("referralCodes")
      .withIndex("by_status", (q) => q.eq("status", "used"))
      .first();

    return !!(usedCode && usedCode.usedBy === identity.subject);
  },
});

export const validateReferralCode = query({
  args: { code: v.string() },
  returns: v.union(
    v.object({
      valid: v.literal(true),
      expiresAt: v.number(),
    }),
    v.object({
      valid: v.literal(false),
      error: v.string(),
    })
  ),
  handler: async (ctx, args) => {
    const referralCode = await ctx.db
      .query("referralCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code))
      .first();

    if (!referralCode) {
      return { valid: false as const, error: "Invalid referral code" };
    }

    if (referralCode.status === "used") {
      return { valid: false as const, error: "This code has already been used" };
    }

    if (referralCode.status === "expired" || referralCode.expiresAt < Date.now()) {
      return { valid: false as const, error: "This code has expired" };
    }

    return { valid: true as const, expiresAt: referralCode.expiresAt };
  },
});
