import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

// Process Stripe webhook (calls Node.js action for actual processing)
export const processWebhook = internalAction({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Call the Node.js action to handle Stripe operations
    await ctx.runAction(api.stripe.handleWebhookEvent, args);
    return null;
  },
});
