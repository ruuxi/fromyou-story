import { v } from "convex/values";
import { mutation } from "../_generated/server";

export const recordVote = mutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    questionHash: v.string(),
    winnerModel: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user/session already voted on this question
    // Prefer narrower index: check by user or session first, then filter in code
    const existingVote = args.userId
      ? await ctx.db
          .query("blindTestVotes")
          .withIndex("by_user", (q) => q.eq("userId", args.userId))
          .take(100)
          .then(rows => rows.find(v => v.questionHash === args.questionHash) || null)
      : args.sessionId
      ? await ctx.db
          .query("blindTestVotes")
          .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
          .take(100)
          .then(rows => rows.find(v => v.questionHash === args.questionHash) || null)
      : null;

    if (existingVote) {
      return { success: false, message: "Already voted on this question" };
    }

    // Record the vote
    await ctx.db.insert("blindTestVotes", {
      userId: args.userId,
      sessionId: args.sessionId,
      questionHash: args.questionHash,
      winnerModel: args.winnerModel,
      votedAt: Date.now(),
    });

    return { success: true };
  },
});

export const getVoteCounts = mutation({
  args: {
    questionHash: v.optional(v.string()),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get global votes
    let globalVotes;
    if (args.questionHash) {
      globalVotes = await ctx.db
        .query("blindTestVotes")
        .withIndex("by_question", q => q.eq("questionHash", args.questionHash!))
        .collect();
    } else {
      globalVotes = await ctx.db
        .query("blindTestVotes")
        .collect();
    }

    // Get user-specific votes
    let userVotes: Array<{
      userId?: string;
      sessionId?: string;
      questionHash: string;
      winnerModel: string;
      votedAt: number;
    }> = [];
    if (args.userId || args.sessionId) {
      const userQuery = args.userId 
        ? ctx.db.query("blindTestVotes").withIndex("by_user", q => q.eq("userId", args.userId!))
        : ctx.db.query("blindTestVotes").withIndex("by_session", q => q.eq("sessionId", args.sessionId!));
      
      userVotes = await userQuery.collect();
      
      if (args.questionHash) {
        userVotes = userVotes.filter(v => v.questionHash === args.questionHash);
      }
    }

    // Count global votes by model
    const globalCounts = globalVotes.reduce((acc, vote) => {
      acc[vote.winnerModel] = (acc[vote.winnerModel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Count user votes by model
    const userCounts = userVotes.reduce((acc, vote) => {
      acc[vote.winnerModel] = (acc[vote.winnerModel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      global: {
        "gpt-4o": globalCounts["gpt-4o"] || 0,
        "gpt-5-chat": globalCounts["gpt-5-chat"] || 0,
      },
      user: {
        "gpt-4o": userCounts["gpt-4o"] || 0,
        "gpt-5-chat": userCounts["gpt-5-chat"] || 0,
        total: userVotes.length,
      }
    };
  },
});
