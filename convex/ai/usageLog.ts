import { query, internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const logAiUsage = internalMutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    useCase: v.string(),
    provider: v.string(),
    model: v.string(),
    modelName: v.optional(v.string()), // Internal model name reference
    temperature: v.optional(v.number()), // Temperature setting used
    tier: v.optional(v.string()), // User tier at time of usage
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    cachedInputTokens: v.optional(v.number()),
    inputCost: v.optional(v.number()),
    outputCost: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // AI usage logging disabled - return early without logging
    return null;
    
    // Original logging code (disabled):
    // return await ctx.db.insert("aiUsageLogs", {
    //   userId: args.userId,
    //   sessionId: args.sessionId,
    //   useCase: args.useCase,
    //   provider: args.provider,
    //   model: args.model,
    //   modelName: args.modelName,
    //   temperature: args.temperature,
    //   tier: args.tier,
    //   inputTokens: args.inputTokens,
    //   outputTokens: args.outputTokens,
    //   totalTokens: args.totalTokens,
    //   reasoningTokens: args.reasoningTokens,
    //   cachedInputTokens: args.cachedInputTokens,
    //   inputCost: args.inputCost,
    //   outputCost: args.outputCost,
    //   totalCost: args.totalCost,
    //   success: args.success,
    //   errorMessage: args.errorMessage,
    // });
  },
});

// Get usage logs for a specific user
export const getUserUsageLogs = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id("aiUsageLogs"),
    _creationTime: v.number(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    useCase: v.string(),
    provider: v.string(),
    model: v.string(),
    modelName: v.optional(v.string()),
    temperature: v.optional(v.number()),
    tier: v.optional(v.string()),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    reasoningTokens: v.optional(v.number()),
    cachedInputTokens: v.optional(v.number()),
    inputCost: v.optional(v.number()),
    outputCost: v.optional(v.number()),
    totalCost: v.optional(v.number()),
    success: v.boolean(),
    errorMessage: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("aiUsageLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50);
  },
});

// Get usage summary for a user
export const getUserUsageSummary = query({
  args: {
    userId: v.string(),
    fromTimestamp: v.optional(v.number()), // Optional start date
    toTimestamp: v.optional(v.number()), // Optional end date
  },
  returns: v.object({
    totalRequests: v.number(),
    successfulRequests: v.number(),
    failedRequests: v.number(),
    totalInputTokens: v.number(),
    totalOutputTokens: v.number(),
    totalCost: v.number(),
    byUseCase: v.record(v.string(), v.object({
      requests: v.number(),
      inputTokens: v.number(),
      outputTokens: v.number(),
      cost: v.number(),
    })),
  }),
  handler: async (ctx, args) => {
    // Build index range in one pass
    const logs = await ctx.db
      .query("aiUsageLogs")
      .withIndex("by_user", (q) => {
        if (args.fromTimestamp !== undefined && args.toTimestamp !== undefined) {
          return q
            .eq("userId", args.userId)
            .gte("_creationTime", args.fromTimestamp)
            .lte("_creationTime", args.toTimestamp);
        }
        if (args.fromTimestamp !== undefined) {
          return q.eq("userId", args.userId).gte("_creationTime", args.fromTimestamp);
        }
        if (args.toTimestamp !== undefined) {
          return q.eq("userId", args.userId).lte("_creationTime", args.toTimestamp);
        }
        return q.eq("userId", args.userId);
      })
      .take(1000); // defensive cap
    
    // Calculate totals
    const summary = logs.reduce(
      (acc, log) => {
        acc.totalRequests++;
        if (log.success) {
          acc.successfulRequests++;
        } else {
          acc.failedRequests++;
        }
        acc.totalInputTokens += log.inputTokens || 0;
        acc.totalOutputTokens += log.outputTokens || 0;
        acc.totalCost += log.totalCost || 0;
        
        // Track by use case
        if (!acc.byUseCase[log.useCase]) {
          acc.byUseCase[log.useCase] = {
            requests: 0,
            inputTokens: 0,
            outputTokens: 0,
            cost: 0,
          };
        }
        acc.byUseCase[log.useCase].requests++;
        acc.byUseCase[log.useCase].inputTokens += log.inputTokens || 0;
        acc.byUseCase[log.useCase].outputTokens += log.outputTokens || 0;
        acc.byUseCase[log.useCase].cost += log.totalCost || 0;
        
        return acc;
      },
      {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalCost: 0,
        byUseCase: {} as Record<string, {
          requests: number;
          inputTokens: number;
          outputTokens: number;
          cost: number;
        }>,
      }
    );

    return summary;
  },
});

// Get recent usage statistics (for monitoring)
export const getRecentUsageStats = query({
  args: {
    hours: v.optional(v.number()), // Default to last 24 hours
  },
  returns: v.object({
    totalRequests: v.number(),
    successfulRequests: v.number(),
    failedRequests: v.number(),
    totalCost: v.number(),
    totalTokens: v.number(),
    byProvider: v.record(v.string(), v.number()),
    byUseCase: v.record(v.string(), v.number()),
  }),
  handler: async (ctx, args) => {
    const hoursBack = args.hours || 24;
    const cutoffTime = Date.now() - (hoursBack * 60 * 60 * 1000);
    
    // For system-wide stats, we need to query all logs
    // Since we can't use the by_creation_time index with a range query in this context,
    // we'll use a filter which is acceptable for monitoring queries
    const recent = await ctx.db
      .query("aiUsageLogs")
      .filter((q) => q.gte(q.field("_creationTime"), cutoffTime))
      .take(2000);

    type RecentLog = { success: boolean; totalCost?: number; totalTokens?: number; provider: string; useCase: string };
    const stats = {
      totalRequests: (recent as RecentLog[]).length,
      successfulRequests: (recent as RecentLog[]).filter((log) => log.success).length,
      failedRequests: (recent as RecentLog[]).filter((log) => !log.success).length,
      totalCost: (recent as RecentLog[]).reduce((sum, log) => sum + (log.totalCost || 0), 0),
      totalTokens: (recent as RecentLog[]).reduce((sum, log) => sum + (log.totalTokens || 0), 0),
      byProvider: {} as Record<string, number>,
      byUseCase: {} as Record<string, number>,
    };

    // Group by provider and use case
    (recent as RecentLog[]).forEach((log) => {
      stats.byProvider[log.provider] = (stats.byProvider[log.provider] || 0) + 1;
      stats.byUseCase[log.useCase] = (stats.byUseCase[log.useCase] || 0) + 1;
    });

    return stats;
  },
}); 