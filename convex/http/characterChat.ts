import { httpAction } from "../_generated/server";
import { generateText, UIMessage } from 'ai';
import { api, internal } from "../_generated/api";
import { getModelClient, getModelConfig, calculateUsageAndCost } from "../ai/models";

async function validateClerkToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { verifyToken } = await import('@clerk/backend');
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    if (payload?.sub) return { userId: payload.sub };
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
    "http://localhost:3000",
  ];
  if (process.env.ALLOWED_ORIGIN) allowedOrigins.push(process.env.ALLOWED_ORIGIN);
  const origin = requestOrigin && allowedOrigins.includes(requestOrigin) ? requestOrigin : "http://localhost:3000";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

export const characterChatHandler = httpAction(async (ctx, req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { chatId, messages = [], userMessage, speaker, ooc, modelOverride } = (body || {}) as { 
      chatId: string; 
      messages?: UIMessage[]; 
      userMessage?: string; 
      speaker?: string; 
      sessionId?: string; 
      ooc?: boolean; 
      modelOverride?: string | undefined;
    };
    const sessionId = (body?.sessionId as string | undefined);

    let authenticatedUserId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = await validateClerkToken(token);
      if (result?.userId) authenticatedUserId = result.userId;
    }

    if (!authenticatedUserId && !sessionId) {
      return new Response(JSON.stringify({ error: 'Authentication required: provide token or sessionId' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    // Rate limit
    try {
      const { checkRateLimit } = await import('../lib/rateLimiter');
      await checkRateLimit(ctx as any, 'characterChat' as any, authenticatedUserId, sessionId, 1);
    } catch (e) {
      return new Response(JSON.stringify({ error: (e as Error).message || 'Rate limit exceeded' }), { 
        status: 429, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    // Load chat
    const chat = await ctx.runQuery(
      api.chats.index.getChat,
      authenticatedUserId
        ? { userId: authenticatedUserId, chatId: chatId as any }
        : { sessionId: sessionId!, chatId: chatId as any }
    );
    if (!chat) {
      return new Response(JSON.stringify({ error: 'Chat not found' }), { 
        status: 404, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    // Persist user message if provided
    if (userMessage && userMessage.trim().length > 0) {
      await ctx.runMutation(internal.chats.index.appendUserMessage, {
        userId: chat.userId,
        sessionId: chat.sessionId,
        chatId: chatId as any,
        name: undefined,
        content: userMessage,
      });
    }

    // Fetch recent messages for context
    const recentMessages = await ctx.runQuery(
      api.chats.index.getMessages,
      authenticatedUserId
        ? { userId: authenticatedUserId, chatId: chatId as any, limit: 50 }
        : { sessionId: sessionId!, chatId: chatId as any, limit: 50 }
    );

    // Get user preferences for player name
    const authArgs = authenticatedUserId ? { userId: authenticatedUserId } : { sessionId: sessionId! };
    const userPreferences = await ctx.runQuery(api.users.preferences.getUserPreferences, authArgs as any);
    const playerName = userPreferences?.playerName || userPreferences?.username || 'You';

    // Convert messages to model format
    const combinedUiMessages: UIMessage[] = (messages && messages.length > 0 ? messages : recentMessages.map((m: any) => ({
      id: `${m._id}`,
      role: m.role === 'assistant' ? 'assistant' : m.role === 'user' ? 'user' : 'system',
      parts: [{ type: 'text', text: m.content }],
    })) as UIMessage[]);

    const activeChar = speaker || chat.participants[0] || 'Character';
    
    // Build simple messages for the model
    const modelMessages = combinedUiMessages.map((msg: any) => ({
      role: msg.role,
      content: (msg.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
    }));

    // Build basic system prompt
    const systemPrompt = `You are ${activeChar}. You are having a conversation with ${playerName}. Stay in character and respond naturally.${
      chat.memory ? `\n\nBackground: ${chat.memory}` : ''
    }${
      chat.authorNote ? `\n\nGuidance: ${chat.authorNote}` : ''
    }${
      ooc ? "\n\n(The following user message is out-of-character; respond helpfully without roleplay unless asked.)" : ''
    }`;

    // Get model configuration
    let modelConfig = getModelConfig('characterChat');
    let modelClient = getModelClient('characterChat');

    // Apply OpenRouter override if provided (request or user preferences)
    const effectiveOverrideRaw = (typeof modelOverride === 'string' && modelOverride) || (typeof userPreferences?.openrouterModelOverride === 'string' && userPreferences.openrouterModelOverride) || undefined;
    const effectiveOverride = typeof effectiveOverrideRaw === 'string' ? effectiveOverrideRaw.trim() : undefined;
    if (effectiveOverride && effectiveOverride.includes('/')) {
      const [provider, ...rest] = effectiveOverride.split('/');
      const modelPath = rest.join('/');
      if (provider && modelPath) {
        modelConfig = {
          ...modelConfig,
          useOpenRouter: true,
          provider,
          model: modelPath,
        } as any;
        modelClient = (await import('../ai/models')).openrouter.chat(`${provider}/${modelPath}`);
      }
    }
    
    // Generate a non-streaming response
    const result = await generateText({
      model: modelClient,
      system: systemPrompt,
      messages: modelMessages,
      temperature: 0.9,
      maxOutputTokens: 1200,
    });

    const text = result.text || '';

    if (text) {
      try {
        await ctx.runMutation(internal.chats.index.appendAssistantMessage, {
          userId: chat.userId,
          sessionId: chat.sessionId,
          chatId: chatId as any,
          name: activeChar,
          content: text,
          usage: result.usage,
          model: `${(modelConfig as any).provider || 'openrouter'}/${modelConfig.model}`,
        });
        const userTier = authenticatedUserId ? 'authenticated' : 'anonymous';
        const usageData = calculateUsageAndCost('characterChat' as any, userTier as any, { usage: result.usage });
        await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
          userId: chat.userId,
          sessionId: chat.sessionId,
          ...usageData,
        });
      } catch (e) {
        console.error('Failed to append assistant message or log usage', e);
      }
    }

    // Return the generated text as a simple text response (non-streaming)
    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', ...corsHeaders },
    });
  } catch (error) {
    console.error('Character chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});