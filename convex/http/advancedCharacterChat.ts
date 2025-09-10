import { httpAction } from "../_generated/server";
import { streamText, smoothStream, UIMessage } from 'ai';
import { api, internal } from "../_generated/api";
import { getModelClient, getModelConfig, calculateUsageAndCost } from "../ai/models";
import { AdvancedPromptBuilder } from "../prompts/advanced/promptBuilder";
import { ContextManager } from "../prompts/advanced/contextManager";
import { SamplerSettingsMapper } from "../prompts/advanced/samplerSettings";
import { parsePreset } from "../presets/parser";

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

export const advancedCharacterChatHandler = httpAction(async (ctx, req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      chatId, 
      messages = [], 
      userMessage, 
      speaker, 
      ooc,
      usePreset = true,
      formatMode = 'classic_rp',
      modelOverride,
    } = (body || {}) as { 
      chatId: string; 
      messages?: UIMessage[]; 
      userMessage?: string; 
      speaker?: string; 
      sessionId?: string; 
      ooc?: boolean;
      usePreset?: boolean;
      formatMode?: 'classic_rp' | 'chatml';
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

    // Get active preset for this chat if using presets
    let chatPreset = null;
    if (usePreset) {
      chatPreset = await ctx.runQuery(api.presets.storage.getChatPreset, { chatId: chatId as any });
    }

    // Convert messages to model format
    const combinedUiMessages: UIMessage[] = (messages && messages.length > 0 ? messages : recentMessages.map((m: any) => ({
      id: `${m._id}`,
      role: m.role === 'assistant' ? 'assistant' : m.role === 'user' ? 'user' : 'system',
      parts: [{ type: 'text', text: m.content }],
    })) as UIMessage[]);

    const activeChar = speaker || chat.participants[0] || 'Character';

    let systemPrompt: string;
    let modelParams: Record<string, any> = {};
    let stopSequences: string[] = [];

    if (chatPreset?.preset && usePreset) {
      // Get preset data from storage
      const presetBlob = await ctx.storage.get(chatPreset.preset.originalDataId)
      if (!presetBlob) {
        throw new Error('Preset data not found in storage')
      }
      
      const presetData = JSON.parse(await presetBlob.text())
      
      // Parse preset settings on-demand
      const parsedPreset = parsePreset(presetData)
      const parsedSettings = parsedPreset?.settings || {}
      
      // Use advanced preset-based prompting
      const promptBuilder = new AdvancedPromptBuilder({
        settings: parsedSettings,
        characterDescription: undefined, // TODO: Load from character data
        characterPersonality: undefined, // TODO: Load from character data  
        scenario: undefined, // TODO: Load from scenario data
        worldInfo: undefined, // TODO: Load from world info
        memory: chat.memory,
        authorNote: chat.authorNote,
        userName: playerName,
        playerName: playerName,
        characterName: activeChar,
        activeChar: activeChar,
        formatMode: formatMode,
      });

      const builtPrompt = promptBuilder.buildPrompt({
        settings: parsedSettings,
        memory: chat.memory,
        authorNote: chat.authorNote,
        userName: playerName,
        playerName: playerName,
        characterName: activeChar,
        activeChar: activeChar,
        formatMode: formatMode,
      });

      systemPrompt = builtPrompt.systemPrompt;
      
      // Map sampler settings
      const mappedSettings = SamplerSettingsMapper.mapSettings(parsedSettings);
      modelParams = SamplerSettingsMapper.getProviderMapping(mappedSettings, 'google'); // Using Google/Vertex

      if (builtPrompt.stopSequences) {
        stopSequences = builtPrompt.stopSequences;
      }

      // Add OOC context if needed
      if (ooc) {
        systemPrompt += "\n\n(The following user message is out-of-character; respond helpfully without roleplay unless asked.)";
      }

      // Update preset last used time
      await ctx.runMutation(api.presets.storage.updatePreset, {
        presetId: chatPreset.preset._id,
        userId: authenticatedUserId || undefined,
        sessionId: sessionId || undefined,
        updates: {} // Just update lastUsed timestamp
      });
    } else {
      // Fallback to basic prompting (existing behavior)
      systemPrompt = `You are ${activeChar}. You are having a conversation with ${playerName}. Stay in character and respond naturally.${
        chat.memory ? `\n\nBackground: ${chat.memory}` : ''
      }${
        chat.authorNote ? `\n\nGuidance: ${chat.authorNote}` : ''
      }${
        ooc ? "\n\n(The following user message is out-of-character; respond helpfully without roleplay unless asked.)" : ''
      }`;

      // Default model parameters
      modelParams = {
        temperature: 0.9,
        maxOutputTokens: 1200,
      };
    }

    // Build final messages for the model
    const modelMessages = combinedUiMessages.map((msg: any) => ({
      role: msg.role,
      content: (msg.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
    }));

    let accumulatedText = '';
    
    // Get model configuration
    let modelConfig = getModelConfig('characterChat');
    let modelClient = getModelClient('characterChat');

    // Prefer request override, then user preference
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
    
    const result = streamText({
      model: modelClient,
      system: systemPrompt,
      messages: modelMessages,
      ...modelParams, // Apply preset parameters
      stopSequences: stopSequences.length > 0 ? stopSequences : undefined,
      experimental_transform: smoothStream({ delayInMs: 50, chunking: 'line' as const }),
      onChunk: ({ chunk }: any) => {
        if (chunk.type === 'text-delta') accumulatedText += chunk.text;
      },
      onFinish: async ({ usage }: any) => {
        if (!accumulatedText) return;
        try {
          await ctx.runMutation(internal.chats.index.appendAssistantMessage, {
            userId: chat.userId,
            sessionId: chat.sessionId,
            chatId: chatId as any,
            name: activeChar,
            content: accumulatedText,
            usage,
            model: `${(modelConfig as any).provider || 'openrouter'}/${modelConfig.model}`,
          });
          const userTier = authenticatedUserId ? 'authenticated' : 'anonymous';
          const usageData = calculateUsageAndCost('characterChat' as any, userTier as any, { usage });
          await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
            userId: chat.userId,
            sessionId: chat.sessionId,
            ...usageData,
          });
        } catch (e) {
          console.error('Failed to append assistant message or log usage', e);
        }
      },
    });

    const streamResponse = result.toTextStreamResponse();
    
    // Add CORS headers to the streaming response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      streamResponse.headers.set(key, value);
    });

    // Add preset information to response headers if using presets
    if (chatPreset?.preset) {
      streamResponse.headers.set('X-Preset-Used', chatPreset.preset.name);
      streamResponse.headers.set('X-Preset-Type', chatPreset.preset.presetType);
    }

    return streamResponse;
  } catch (error) {
    console.error('Advanced character chat error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    );
  }
});