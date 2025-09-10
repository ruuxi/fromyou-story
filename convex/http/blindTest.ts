import { httpAction } from "../_generated/server";
import { streamText, smoothStream, UIMessage, convertToModelMessages } from "ai";

import { getUserTier } from "../lib/userTier";
import { api } from "../_generated/api";

// Helper to validate token (optional)
async function validateClerkToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { verifyToken } = await import("@clerk/backend");
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    if (payload && payload.sub) return { userId: payload.sub };
    return null;
  } catch {
    return null;
  }
}

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://fromyou.ai",
    "https://www.fromyou.ai",
    "http://localhost:3000",
  ];
  if (process.env.ALLOWED_ORIGIN) {
    allowedOrigins.push(process.env.ALLOWED_ORIGIN);
  }
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

type ChatBody = {
  messages: UIMessage[];
  sessionId?: string;
  model: "gpt-4o" | "gpt-5-chat" | string;
  system?: string;
  questionKey?: string;
};

const MODEL_TO_OPENROUTER = (model: string) => {
  // Map simple names to OpenRouter provider/model identifiers
  if (model === "gpt-4o") return "openai/gpt-4o";
  if (model === "gpt-5-chat") return "openai/gpt-5-chat";
  // Fallback: pass-through if already provider/model
  if (model.includes("/")) return model;
  throw new Error(`Unsupported model: ${model}`);
};

export const blindTestChatHandler = httpAction(async (ctx, req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { messages = [], sessionId, model, system = "", questionKey }: ChatBody = await req.json();

    // Determine identity (optional auth)
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const v = await validateClerkToken(token);
      authenticatedUserId = v?.userId ?? null;
    }

    const userId = authenticatedUserId;
    const anonSessionId = userId ? null : (sessionId || null);

    // Enforce message limit: initial + up to 5 follow-ups (6 total user messages max)
    const userMessageCount = messages.filter((m) => m.role === "user").length;
    if (userMessageCount > 6) {
      return new Response(
        JSON.stringify({ error: "Too many messages. You can send up to 5 follow-ups after the initial question." }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Acquire up to 2 concurrent slots per user/session
    let slotAcquired = false;
    try {

      slotAcquired = true;
    } catch (e) {
      return new Response(
        JSON.stringify({ error: "Too many requests in progress. Please wait for the current responses to finish.", code: "CONCURRENT_LIMIT" }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const providerModel = MODEL_TO_OPENROUTER(model);
    const modelClient = (await import("../ai/models")).openrouter.chat(providerModel);

    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model: modelClient,
      system,
      messages: modelMessages,
      experimental_transform: smoothStream({ delayInMs: 10, chunking: "line" as const }),
      onFinish: async () => {
        if (slotAcquired) {

          slotAcquired = false;
        }
      },
      onError: async () => {
        if (slotAcquired) {

          slotAcquired = false;
        }
      },
    });

    const streamResponse = result.toTextStreamResponse();
    const headers = new Headers(streamResponse.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
    return new Response(streamResponse.body, { status: streamResponse.status, statusText: streamResponse.statusText, headers });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message ?? "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...getCorsHeaders(req.headers.get("Origin")) } }
    );
  }
});

function normalizeQuestionKey(questionText: string): string {
  const s = (questionText || "").trim().toLowerCase().replace(/\s+/g, " ");
  // Simple hash to keep keys short
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return `q${Math.abs(h)}`;
}

export const blindTestVoteHandler = httpAction(async (ctx, req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { questionText, winner, winnerModel, sessionId } = (body || {}) as { questionText: string; winner?: "A" | "B"; winnerModel?: "gpt-4o" | "gpt-5-chat" | string; sessionId?: string };
    if (!questionText) {
      return new Response(JSON.stringify({ error: "Invalid vote payload: missing questionText" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    // New contract: winnerModel is required and should be the actual model id (e.g., "gpt-4o" or "gpt-5-chat").
    // Fallback: if only "winner" is present, map A->gpt-4o and B->gpt-5-chat as a legacy behavior.
    const modelKey = (winnerModel && (winnerModel === "gpt-4o" || winnerModel === "gpt-5-chat"))
      ? winnerModel
      : winner === "A" ? "gpt-4o" : winner === "B" ? "gpt-5-chat" : null;
    if (!modelKey) {
      return new Response(JSON.stringify({ error: "Invalid vote payload: missing winnerModel" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Identity
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const v = await validateClerkToken(token);
      authenticatedUserId = v?.userId ?? null;
    }
    const userId = authenticatedUserId;
    const anonSessionId = userId ? null : (sessionId || null);
    
    const qKey = normalizeQuestionKey(questionText);

    // Record vote in database
    const result = await ctx.runMutation(api.blindTest.mutations.recordVote, {
      userId: userId || undefined,
      sessionId: anonSessionId || undefined,
      questionHash: qKey,
      winnerModel: modelKey,
    });

    if (!result.success) {
      return new Response(JSON.stringify({ error: result.message }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});

export const blindTestResultsHandler = httpAction(async (ctx, req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const questionText = url.searchParams.get("questionText");
    const userSessionId = url.searchParams.get("sessionId");

    // Check for authenticated user
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const v = await validateClerkToken(token);
      authenticatedUserId = v?.userId ?? null;
    }

    const questionHash = questionText ? normalizeQuestionKey(questionText) : undefined;
    
    // Get overall counts
    const overallCounts = await ctx.runMutation(api.blindTest.mutations.getVoteCounts, {
      userId: authenticatedUserId || undefined,
      sessionId: userSessionId || undefined,
    });
    
    // Get question-specific counts if provided
    let questionCounts = null;
    if (questionHash) {
      questionCounts = await ctx.runMutation(api.blindTest.mutations.getVoteCounts, { 
        questionHash,
        userId: authenticatedUserId || undefined,
        sessionId: userSessionId || undefined,
      });
    }

    return new Response(
      JSON.stringify({ 
        overall: overallCounts,
        question: questionCounts 
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message ?? "Internal server error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});


