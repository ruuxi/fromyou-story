import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { storyGenerationHandler, corsHeaders } from "./http/storyGeneration";
import { onboardingAnalysisHandler } from "./http/onboarding";
import { characterChatHandler } from "./http/characterChat";
import { storyActionsHandler } from "./http/storyActions";
import { blindTestChatHandler, blindTestVoteHandler, blindTestResultsHandler } from "./http/blindTest";
import { resend } from "./resend";
import { Webhook } from "svix";

const http = httpRouter();

// Helper function to get CORS headers with proper origin validation
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://fromyou.ai",
    "https://www.fromyou.ai",
    "http://localhost:3000"
  ];
  
  // Add any additional origins from environment variable
  if (process.env.ALLOWED_ORIGIN) {
    allowedOrigins.push(process.env.ALLOWED_ORIGIN);
  }
  
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin) 
    ? requestOrigin 
    : "http://localhost:3000";
    
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, req) => {
    return new Response(
      JSON.stringify({ status: "ok", timestamp: Date.now() }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }),
});

// Clerk users webhook for syncing user data
http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateClerkRequest(request);
    if (!event) {
      return new Response("Error occurred", { status: 400 });
    }
    
    switch (event.type) {
      case "user.created":
      case "user.updated":
        await ctx.runMutation(internal.users.index.upsertFromClerk, { data: event.data });
        break;
      case "user.deleted":
        const clerkUserId = event.data.id!;
        await ctx.runMutation(internal.users.index.deleteFromClerk, { clerkUserId });
        break;
      default:
        console.log("Ignored Clerk webhook event", event.type);
    }
    
    return new Response(null, { status: 200 });
  }),
});

async function validateClerkRequest(req: Request) {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return null;
  }
  
  const wh = new Webhook(webhookSecret);
  try {
    return wh.verify(payloadString, svixHeaders) as any;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

// Stripe webhook
http.route({
  path: "/stripe/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "No signature" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    try {
      // Process the webhook using our Node.js action
      await ctx.runAction(internal.webhooks.processWebhook, {
        body,
        signature,
      });

      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" }
      });
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response(JSON.stringify({ error: "Internal error" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }),
});

// Handle preflight OPTIONS requests for CORS
http.route({
  path: "/api/story/generate",
  method: "OPTIONS",
  handler: httpAction(async (ctx, req) => {
    const requestOrigin = req.headers.get("Origin");
    const dynamicCorsHeaders = getCorsHeaders(requestOrigin);
    return new Response(null, {
      status: 204,
      headers: dynamicCorsHeaders,
    });
  }),
});

// Handle preflight OPTIONS requests for story chat endpoint
http.route({
  path: "/api/story/chat",
  method: "OPTIONS",
  handler: httpAction(async (ctx, req) => {
    const requestOrigin = req.headers.get("Origin");
    const dynamicCorsHeaders = getCorsHeaders(requestOrigin);
    return new Response(null, {
      status: 204,
      headers: dynamicCorsHeaders,
    });
  }),
});

// Handle preflight OPTIONS requests for story actions endpoint
http.route({
  path: "/api/story/actions",
  method: "OPTIONS",
  handler: httpAction(async (ctx, req) => {
    const requestOrigin = req.headers.get("Origin");
    const dynamicCorsHeaders = getCorsHeaders(requestOrigin);
    return new Response(null, {
      status: 204,
      headers: dynamicCorsHeaders,
    });
  }),
});

// Blind test OPTIONS
http.route({
  path: "/api/blind_test/chat",
  method: "OPTIONS",
  handler: httpAction(async (ctx, req) => {
    const requestOrigin = req.headers.get("Origin");
    const dynamicCorsHeaders = getCorsHeaders(requestOrigin);
    return new Response(null, { status: 204, headers: dynamicCorsHeaders });
  }),
});
http.route({
  path: "/api/blind_test/vote",
  method: "OPTIONS",
  handler: httpAction(async (ctx, req) => {
    const requestOrigin = req.headers.get("Origin");
    const dynamicCorsHeaders = getCorsHeaders(requestOrigin);
    return new Response(null, { status: 204, headers: dynamicCorsHeaders });
  }),
});
http.route({
  path: "/api/blind_test/results",
  method: "OPTIONS",
  handler: httpAction(async (ctx, req) => {
    const requestOrigin = req.headers.get("Origin");
    const dynamicCorsHeaders = getCorsHeaders(requestOrigin);
    return new Response(null, { status: 204, headers: dynamicCorsHeaders });
  }),
});

// General OPTIONS handler for other API routes
http.route({
  path: "/api/*",
  method: "OPTIONS", 
  handler: httpAction(async (ctx, req) => {
    const requestOrigin = req.headers.get("Origin");
    const dynamicCorsHeaders = getCorsHeaders(requestOrigin);
    return new Response(null, {
      status: 204,
      headers: dynamicCorsHeaders,
    });
  }),
});

// Onboarding analysis endpoint
http.route({
  path: "/api/onboarding/analyze",
  method: "OPTIONS",
  handler: httpAction(async (ctx, req) => {
    const requestOrigin = req.headers.get("Origin");
    const dynamicCorsHeaders = getCorsHeaders(requestOrigin);
    return new Response(null, { status: 204, headers: dynamicCorsHeaders });
  }),
});

http.route({
  path: "/api/onboarding/analyze",
  method: "POST",
  handler: onboardingAnalysisHandler,
});

// Story generation endpoint (handles both initial generation and chat continuation)
http.route({
  path: "/api/story/generate",
  method: "POST",
  handler: storyGenerationHandler,
});

// Story chat endpoint (alias for the generation handler)
http.route({
  path: "/api/story/chat",
  method: "POST", 
  handler: storyGenerationHandler,
});

// Character chat endpoint
http.route({
  path: "/api/character/chat",
  method: "OPTIONS",
  handler: httpAction(async (ctx, req) => {
    const requestOrigin = req.headers.get("Origin");
    const dynamicCorsHeaders = getCorsHeaders(requestOrigin);
    return new Response(null, { status: 204, headers: dynamicCorsHeaders });
  }),
});

http.route({
  path: "/api/character/chat",
  method: "POST",
  handler: characterChatHandler,
});

// Story actions endpoint
http.route({
  path: "/api/story/actions",
  method: "POST",
  handler: storyActionsHandler,
});

// Blind test endpoints (no-auth feature)
http.route({ path: "/api/blind_test/chat", method: "POST", handler: blindTestChatHandler });
http.route({ path: "/api/blind_test/vote", method: "POST", handler: blindTestVoteHandler });
http.route({ path: "/api/blind_test/results", method: "GET", handler: blindTestResultsHandler });

export default http;