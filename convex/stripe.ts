"use node";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

// Lazy initialization of Stripe
let stripe: Stripe;
function getStripe() {
  if (!stripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    stripe = new Stripe(apiKey, {
      apiVersion: "2025-07-30.basil",
    });
  }
  return stripe;
}

// Helper function to create or get customer
async function createOrGetCustomerHelper(ctx: any, userId: string, email: string): Promise<string> {
  // Check if we have an existing customer stored in our database
  const existingCustomer = await ctx.runQuery(internal.subscriptions.index.getStoredCustomer, {
    userId,
  });
  
  if (existingCustomer) {
    return existingCustomer.stripeCustomerId;
  }

  try {
    // Create new Stripe customer
    const customer = await getStripe().customers.create({
      email,
      metadata: {
        userId,
      },
    });

    // Store customer in our database
    await ctx.runMutation(internal.subscriptions.index.storeCustomer, {
      userId,
      stripeCustomerId: customer.id,
      email,
    });

    return customer.id;
  } catch (error) {
    console.error("Error creating Stripe customer:", error);
    throw new Error("Failed to create customer");
  }
}

// Create or retrieve Stripe customer
export const createOrGetCustomer = action({
  args: {
    userId: v.string(),
    email: v.string(),
  },
  returns: v.object({
    customerId: v.string(),
  }),
  handler: async (ctx, args): Promise<{ customerId: string }> => {
    const customerId = await createOrGetCustomerHelper(ctx, args.userId, args.email);
    return { customerId };
  },
});

// Generate checkout session
export const generateCheckoutLink = action({
  args: {
    productId: v.string(),
    origin: v.string(),
    successUrl: v.string(),
    couponId: v.optional(v.string()),
  },
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx, args): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Create or get customer
    const customerId = await createOrGetCustomerHelper(ctx, identity.subject, identity.email || "noemail@example.com");

    try {
      const sessionConfig: Stripe.Checkout.SessionCreateParams = {
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [
          {
            price: args.productId,
            quantity: 1,
          },
        ],
        mode: "subscription",
        success_url: args.successUrl,
        cancel_url: `${args.origin}/`,
        metadata: {
          userId: identity.subject,
        },
      };

      // Apply a coupon if provided
      if (args.couponId) {
        sessionConfig.discounts = [{ coupon: args.couponId }];
      }

      const session = await getStripe().checkout.sessions.create(sessionConfig);

      return { url: session.url! };
    } catch (error) {
      console.error("Error creating checkout session:", error);
      throw new Error("Failed to create checkout session");
    }
  },
});

// Generate customer portal URL
export const generateCustomerPortalUrl = action({
  args: {},
  returns: v.object({
    url: v.string(),
  }),
  handler: async (ctx): Promise<{ url: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get customer ID
    let customer = await ctx.runQuery(internal.subscriptions.index.getStoredCustomer, {
      userId: identity.subject,
    });

    // If no customer exists, create one
    if (!customer) {
      const customerId = await createOrGetCustomerHelper(ctx, identity.subject, identity.email || "noemail@example.com");
      customer = await ctx.runQuery(internal.subscriptions.index.getStoredCustomer, {
        userId: identity.subject,
      });
    }

    if (!customer) {
      throw new Error("No customer found");
    }

    try {
      const session = await getStripe().billingPortal.sessions.create({
        customer: customer.stripeCustomerId,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}`,
      });

      return { url: session.url };
    } catch (error) {
      console.error("Error creating customer portal session:", error);
      throw new Error("Failed to create customer portal session");
    }
  },
});

// Handle Stripe webhook event (Node.js action)
export const handleWebhookEvent = action({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    let event: Stripe.Event;

    try {
      event = getStripe().webhooks.constructEvent(
        args.body,
        args.signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      throw new Error("Invalid signature");
    }

    console.log("Received Stripe webhook:", event.type);

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Resolve userId without relying solely on retrieving the Stripe customer
        // First try our local mapping, which works even if the Stripe customer is deleted
        let userId = await ctx.runQuery(internal.subscriptions.index.getUserIdByCustomerId, {
          stripeCustomerId: subscription.customer as string,
        });
        
        if (!userId) {
          // Fallback: try retrieving the Stripe customer (may be deleted for some event types)
          const customer = await getStripe().customers.retrieve(subscription.customer as string);
          if ((customer as any).deleted) {
            console.warn("Stripe customer deleted; falling back failed to resolve userId");
          } else {
            userId = (customer as Stripe.Customer).metadata?.userId || null;
          }
        }
        
        if (!userId) {
          console.error("Unable to resolve userId for subscription event");
          throw new Error("No userId found");
        }

        // Get the price ID from the subscription
        const priceId = subscription.items.data[0]?.price.id;
        if (!priceId) {
          console.error("No price ID found in subscription");
          throw new Error("No price ID found");
        }

        // Store the subscription in our database  
        const currentPeriodEnd = (subscription as any).current_period_end 
          ? (subscription as any).current_period_end * 1000 
          : Date.now() + (30 * 24 * 60 * 60 * 1000); // Default to 30 days from now if missing
          
        await ctx.runMutation(internal.subscriptions.index.storeSubscription, {
          userId,
          subscriptionId: subscription.id,
          priceId,
          status: subscription.status,
          currentPeriodEnd,
        });

        console.log(`Subscription ${event.type} processed for user ${userId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Resolve userId using local mapping first to handle deleted Stripe customers
        let userId = await ctx.runQuery(internal.subscriptions.index.getUserIdByCustomerId, {
          stripeCustomerId: subscription.customer as string,
        });
        
        if (!userId) {
          // Fallback attempt to retrieve from Stripe if possible
          const customer = await getStripe().customers.retrieve(subscription.customer as string);
          if (!(customer as any).deleted) {
            userId = (customer as Stripe.Customer).metadata?.userId || null;
          }
        }
        
        if (!userId) {
          console.warn("Unable to resolve userId for subscription.deleted event; ignoring");
          // Nothing to update without a user mapping. Do not error the webhook.
          break;
        }

        const priceId = subscription.items.data[0]?.price.id;
        if (!priceId) {
          console.error("No price ID found in subscription");
          throw new Error("No price ID found");
        }

        // Update the subscription status to canceled
        const currentPeriodEnd = (subscription as any).current_period_end 
          ? (subscription as any).current_period_end * 1000 
          : Date.now(); // Use current time for canceled subscriptions
          
        await ctx.runMutation(internal.subscriptions.index.storeSubscription, {
          userId,
          subscriptionId: subscription.id,
          priceId,
          status: "canceled",
          currentPeriodEnd,
        });

        console.log(`Subscription canceled for user ${userId}`);
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session.id);
        // The subscription webhook events will handle the actual subscription creation
        break;
      }

      default:
        console.log(`Unhandled webhook type: ${event.type}`);
    }

    return null;
  },
});



