import { v } from "convex/values";
import { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server";
import { UserTier } from "../config/rateLimits";

export const authArgsValidator = v.object({
  userId: v.optional(v.string()),
  sessionId: v.optional(v.string()),
});

export type AuthArgs = {
  userId?: string;
  sessionId?: string;
};

export type AuthContext = AuthArgs & {
  tier?: UserTier;
};

export function getIdentifier(args: AuthArgs): string | null {
  if (args.userId) return args.userId;
  if (args.sessionId) return args.sessionId;
  return null;
}

export function buildIdentifierQuery(args: AuthArgs) {
  if (args.userId) {
    return { userId: args.userId };
  } else if (args.sessionId) {
    return { sessionId: args.sessionId };
  }
  throw new Error("Either userId or sessionId must be provided");
}

/**
 * Normalize auth by preferring server identity over client-provided userId.
 * Always check for authenticated identity first, even if sessionId is provided.
 * This prevents stories from being created under sessionId for signed-in users
 * when the client hasn't loaded Clerk auth state yet.
 */
export async function normalizeAuth(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  args: AuthArgs
): Promise<{ userId?: string; sessionId?: string; identifier: string }>
{
  // Always check for authenticated identity first, regardless of what client sent
  const identity = await ctx.auth.getUserIdentity();
  if (identity) {
    // If client provided userId, verify it matches the authenticated identity
    if (args.userId && args.userId !== identity.subject) {
      throw new Error("Forbidden: Provided userId does not match authenticated user");
    }
    // Use authenticated identity even if client only sent sessionId (Clerk not loaded yet)
    return { userId: identity.subject, sessionId: undefined, identifier: identity.subject };
  }

  // No authenticated identity - fall back to sessionId for anonymous users
  if (args.sessionId) {
    return { userId: undefined, sessionId: args.sessionId, identifier: args.sessionId };
  }

  // Disallow unauthenticated userId spoofing
  if (args.userId) {
    throw new Error("Authentication required for user operations");
  }
  
  throw new Error("Authentication required: Either signed-in user or sessionId must be provided");
}

export async function requireAuth(ctx: QueryCtx | MutationCtx | ActionCtx, args: AuthArgs) {
  const { identifier } = await normalizeAuth(ctx, args);
  return identifier;
}

export async function requireUser(ctx: QueryCtx | MutationCtx | ActionCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity.subject;
}

export function isAnonymous(args: AuthArgs): boolean {
  return !args.userId && !!args.sessionId;
}

export function isAuthenticated(args: AuthArgs): boolean {
  return !!args.userId;
}

/**
 * Build auth context with tier information
 * This is useful for passing complete auth information through functions
 */
export async function buildAuthContext(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  args: AuthArgs
): Promise<AuthContext> {
  const { getUserTier } = await import("./userTier");
  const tier = await getUserTier(ctx, args.userId);
  
  return {
    ...args,
    tier,
  };
}

/** Return sanitized auth args with userId derived from identity if present. */
export async function getNormalizedAuthArgs(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  args: AuthArgs
): Promise<AuthArgs> {
  const normalized = await normalizeAuth(ctx, args);
  return { userId: normalized.userId, sessionId: normalized.sessionId };
}

/** Build identifier query using normalized auth (prefers identity). */
export async function buildIdentifierQueryNormalized(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  args: AuthArgs
): Promise<{ userId?: string; sessionId?: string }> {
  const normalized = await getNormalizedAuthArgs(ctx, args);
  return buildIdentifierQuery(normalized);
}