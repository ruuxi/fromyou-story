import { httpAction } from "../_generated/server";
import { streamText, smoothStream, UIMessage, convertToModelMessages, createIdGenerator } from 'ai';
import { getModelClient, getModelConfig, calculateUsageAndCost } from '../ai/models';
import { 
  buildStoryGenerationPrompt, 
  buildStoryGenerationSystemPrompt,
  buildFirstPageSystemPrompt,
  buildFirstPagePrompt,
  buildStoryChatPrompt, 
  buildStoryChatSystemPrompt 
} from '../prompts';
import { applyGoonMode } from '../prompts/templateRenderer';
import { api, internal } from '../_generated/api';
import { acquireStoryGenerationLock, releaseStoryGenerationLock } from '../lib/rateLimiter';

// Helper function to validate Clerk JWT token
async function validateClerkToken(token: string): Promise<{ userId: string } | null> {
  try {
    // Import Clerk's verifyToken function
    const { verifyToken } = await import('@clerk/backend');
    
    // Verify the token using Clerk's backend utilities
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    
    if (payload && payload.sub) {
      return { userId: payload.sub };
    }
    
    return null;
  } catch (error) {
    console.error('Token validation error:', error);
    console.error('This may indicate a mismatch between frontend and backend Clerk configurations');
    console.error('Falling back to sessionId-based authentication');
    return null;
  }
}

// Helper function to get CORS headers with proper origin validation
function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://fromyou.ai",
    "https://www.fromyou.ai",
    "http://localhost:3000",
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

// Legacy export for backwards compatibility
export const corsHeaders = {
  "Access-Control-Allow-Origin": "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Credentials": "true",
};

export const storyGenerationHandler = httpAction(async (ctx, req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get request body first to check for sessionId
    const requestBody = await req.json();
    const { messages = [], storyId, sessionId, customWorldLore, customCharacterLore }: { messages: UIMessage[]; storyId: any; sessionId?: string; customWorldLore?: string; customCharacterLore?: Record<string, string> } = requestBody;

    let authenticatedUserId: string | null = null;
    let userSessionId: string | null = null;

    // Check for authorization header (authenticated users)
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Extract the token from the Bearer header
      const token = authHeader.substring(7); // Remove "Bearer " prefix

      console.log('Attempting to validate Clerk token...');
      // Validate the Clerk token
      const validationResult = await validateClerkToken(token);
      if (validationResult && validationResult.userId) {
        authenticatedUserId = validationResult.userId;
        console.log('Token validation successful for user:', authenticatedUserId);
      } else {
        console.log('Token validation failed, will try sessionId fallback');
      }
    }

    // If no valid Clerk token, check for sessionId (anonymous users)
    if (!authenticatedUserId) {
      console.log('No authenticated user, checking for sessionId:', sessionId);
      if (!sessionId) {
        console.error('No sessionId provided in request body');
        return new Response(
          JSON.stringify({ 
            error: "Authentication required: provide either valid token or sessionId",
            debug: {
              hasAuthHeader: !!authHeader,
              hasSessionId: !!sessionId,
              requestBody: Object.keys(requestBody)
            }
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
      userSessionId = sessionId;
      console.log('Using sessionId for anonymous user:', userSessionId);
    }

    if (!storyId) {
      return new Response(
        JSON.stringify({ error: "Story ID is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Get the story from the database
    let story: any;
    try {
      // Fetch story by ID then check ownership explicitly
      const fetched = await ctx.runQuery(internal.stories.internalQueries.getStoryByIdInternal, { storyId });
      story = fetched;
      
      if (!story) {
        throw new Error("Story not found");
      }
      
      // Verify that the user owns this story (either authenticated user or anonymous session)
      const isOwner = authenticatedUserId 
        ? (story.userId === authenticatedUserId)
        : (story.sessionId === userSessionId);
        
      if (!isOwner) {
        return new Response(
          JSON.stringify({ error: "Unauthorized access to story" }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Story not found or unauthorized" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Acquire single-flight lock per user/session for story generation
    let lockAcquired = false;
    const releaseLock = async () => {
      if (!lockAcquired) return;
      try {
        const ownerUserId = authenticatedUserId ?? story.userId ?? null;
        const ownerSessionId = ownerUserId ? null : (userSessionId ?? story.sessionId ?? null);
        await releaseStoryGenerationLock(ctx, ownerUserId, ownerSessionId);
      } finally {
        lockAcquired = false;
      }
    };
    try {
      const ownerUserId = authenticatedUserId ?? story.userId ?? null;
      const ownerSessionId = ownerUserId ? null : (userSessionId ?? story.sessionId ?? null);
      await acquireStoryGenerationLock(ctx, ownerUserId, ownerSessionId);
      lockAcquired = true;
    } catch (e: any) {
      const message = 'Story generation already in progress.';
      return new Response(
        JSON.stringify({ error: message, code: 'CONCURRENT_STORY_GENERATION' }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Log incoming messages for debugging
    console.log('Incoming messages:', messages);
    console.log('Story ID:', storyId);

    // Save the last user message (if it's not the initial "Start the story" message)
    const lastMsg = messages.at(-1);
    if (lastMsg?.role === 'user') {
      const text = lastMsg.parts
        .filter(p => p && p.type === 'text')
        .map(p => (p as any).text)
        .join('');

      if (text !== 'Start the story') {
        await ctx.runMutation(internal.stories.index.addUserMessage, {
          storyId,
          userId: story.userId,
          sessionId: story.sessionId,
          text,
          actionId: (lastMsg.metadata as { actionId?: string })?.actionId,
        });
      }
    }

    // Determine if this is initial generation or continuation
    // Treat as initial generation if there are no assistant messages yet and either:
    // - there are no messages at all, or
    // - the only message is the bootstrap "Start the story" user message sent by the client
    const getMessageText = (msg: UIMessage): string => {
      const textParts = msg.parts?.filter(p => p && p.type === 'text') || [];
      return textParts.map(p => (p as any).text).join('');
    };

    const hasAssistantMessage = messages.some((m) => m.role === 'assistant');
    const isOnlyStartUserMessage =
      messages.length === 1 &&
      messages[0].role === 'user' &&
      getMessageText(messages[0]) === 'Start the story';

    const isInitialGeneration = !hasAssistantMessage && (messages.length === 0 || isOnlyStartUserMessage);

    console.log('Is initial generation:', isInitialGeneration);
    console.log('Messages count:', messages.length);

    // Log message content for debugging
    messages.forEach((msg, i) => {
      const textParts = msg.parts?.filter(p => p && p.type === 'text') || [];
      const text = textParts.map(p => (p as any).text).join('');
      console.log(`Message ${i}: role=${msg.role}, text="${text}"`);
    });

    // Prepare the prompt and system message
    let systemMessage: string;
    let prompt: string;

    let modelMessages;
    
    if (isInitialGeneration) {
      // Initial story generation - check for outline
      systemMessage = buildFirstPageSystemPrompt();

      // Check if we have an outline and it's complete
      if (!story.outline || story.outlineStatus !== "complete") {
        return new Response(
          JSON.stringify({ error: "Story outline not ready. Please wait and try again." }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Fetch user settings, character lore, and world lore in parallel to minimize latency
      const authArgs = authenticatedUserId 
        ? { userId: authenticatedUserId } 
        : { sessionId: userSessionId || '' };

      const [userSettings, characterLore, worldLore] = await Promise.all([
        ctx.runQuery(api.stories.settings.getCurrentSettings, authArgs),
        ctx.runQuery(api.characters.loreHelpers.getCharacterLoreForStory, {
          characterNames: story.selectedCharacters,
          source: story.suggestion.metadata.primarySource || '',
        }),
        ctx.runQuery(api.characters.loreHelpers.getWorldLore, {
          source: story.suggestion.metadata.primarySource || '',
        })
      ]);
      // If no explicit custom lore in request, try loading persisted custom content for this owner+source
      let mergedCharacterLore = characterLore;
      let mergedWorldLore = worldLore;
      if (!customWorldLore || !customCharacterLore) {
        try {
          const identifier = authenticatedUserId ? { userId: authenticatedUserId } : { sessionId: userSessionId! };
          // Pull active custom world lore strictly by originalSource match
          const customLoreList = await ctx.runQuery(api.customContent.queries.getCustomWorldLore, identifier as any);
          const primary = (story.suggestion.metadata.primarySource || '');
          const sourceCustom = customLoreList.find(l => l.isActive && l.originalSource === primary);
          if (sourceCustom?.lore) mergedWorldLore = sourceCustom.lore;
          // Pull custom characters and overlay matching names
          const customChars = await ctx.runQuery(api.customContent.queries.getActiveCustomCharacters, identifier as any);
          const overlay: Record<string,string> = {};
          for (const name of story.selectedCharacters) {
            const match = customChars.find(c => c.fullName.toLowerCase() === name.toLowerCase());
            if (match?.characterLore) overlay[name] = match.characterLore;
          }
          mergedCharacterLore = { ...mergedCharacterLore, ...overlay };
        } catch {}
      }
      if (customWorldLore) mergedWorldLore = customWorldLore;
      if (customCharacterLore) mergedCharacterLore = { ...mergedCharacterLore, ...customCharacterLore };

      // Use the first page prompt; guard if outline missing beats
      prompt = buildFirstPagePrompt({
        storySuggestion: {
          id: story.suggestionId,
          text: story.suggestion.text,
          characters: [...story.suggestion.characters.main_characters, ...story.suggestion.characters.side_characters],
          metadata: story.suggestion.metadata,
        },
        playerName: story.playerName || "Player",
        selectedCharacters: story.selectedCharacters,
        outline: story.outline,
        characterLore: mergedCharacterLore,
        worldLore: mergedWorldLore,
        // Derive goon mode purely from the story's genre
        goonMode: (story.suggestion.metadata.genre || '').toLowerCase() === 'goon-mode',
      });
      
      // For initial generation, we use prompt instead of messages
      modelMessages = undefined;
    } else {
      // Story continuation - use chat prompt with lore
      systemMessage = buildStoryChatSystemPrompt();

      // Get character and world lore for continuation in parallel
      const [characterLore, worldLore] = await Promise.all([
        ctx.runQuery(api.characters.loreHelpers.getCharacterLoreForStory, {
          characterNames: story.selectedCharacters,
          source: story.suggestion.metadata.primarySource || '',
        }),
        ctx.runQuery(api.characters.loreHelpers.getWorldLore, {
          source: story.suggestion.metadata.primarySource || '',
        })
      ]);
      let mergedCharacterLore = characterLore;
      let mergedWorldLore = worldLore;
      if (!customWorldLore || !customCharacterLore) {
        try {
          const identifier = authenticatedUserId ? { userId: authenticatedUserId } : { sessionId: userSessionId! };
          const customLoreList = await ctx.runQuery(api.customContent.queries.getCustomWorldLore, identifier as any);
          const sourceCustom = customLoreList.find(l => l.isActive && (l.originalSource === story.suggestion.metadata.primarySource));
          if (sourceCustom?.lore) mergedWorldLore = sourceCustom.lore;
          const customChars = await ctx.runQuery(api.customContent.queries.getActiveCustomCharacters, identifier as any);
          const overlay: Record<string,string> = {};
          for (const name of story.selectedCharacters) {
            const match = customChars.find(c => c.fullName.toLowerCase() === name.toLowerCase());
            if (match?.characterLore) overlay[name] = match.characterLore;
          }
          mergedCharacterLore = { ...mergedCharacterLore, ...overlay };
        } catch {}
      }
      if (customWorldLore) mergedWorldLore = customWorldLore;
      if (customCharacterLore) mergedCharacterLore = { ...mergedCharacterLore, ...customCharacterLore };

      // Get story summaries for context (if we have many pages)
      type StorySummary = {
        _id: string;
        _creationTime: number;
        storyId: string;
        pageRange: { start: number; end: number };
        summary: {
          plot: string;
          characters: string;
          keyEvents: string[];
          worldBuilding?: string;
        };
        createdAt: number;
      };
      
      let summaries: StorySummary[] = [];
      if (story.pages.length > 10) {
        summaries = await ctx.runQuery(internal.stories.internalQueries.getStorySummariesInternal, {
          storyId: story._id,
        });
      }

      // Get current outline information
      const currentOutline = story.outline;
      const currentChapter = story.currentChapter || 1;
      const currentAct = story.currentAct || 1;

      // Generate the appropriate prompt for continuation
      prompt = buildStoryChatPrompt({
        story,
        messages,
        isInitialGeneration,
        characterLore: mergedCharacterLore,
        worldLore: mergedWorldLore,
        summaries,
        currentOutline,
        currentChapter,
        currentAct,
      });
      // Ensure the continuation prompt is actually sent to the model by
      // appending it to the system message alongside chat history.
      const continuationGoonMode = (story.suggestion.metadata.genre || '').toLowerCase() === 'goon-mode';
      const goonAppliedPrompt = applyGoonMode(prompt, continuationGoonMode);
      systemMessage = `${systemMessage}\n\n${goonAppliedPrompt}`;
      
      // For continuation, convert UI messages to model messages
      modelMessages = convertToModelMessages(messages);
    }

    // Generate streaming response
    const modelConfig = getModelConfig('storyGeneration');
    console.log(`Starting text generation for story ${storyId}`);
    console.log(`Model config:`, modelConfig);
    
    const streamTextOptions = {
      model: getModelClient('storyGeneration'),
      system: systemMessage,
      experimental_transform: smoothStream({
        delayInMs: 20,
        chunking: 'word' as const,
      }),
      temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.7,
      maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 2000,
      onError: (error: any) => {
        console.error(`Streaming error for story ${storyId}:`, error);
      },
      ...(isInitialGeneration 
        ? { prompt: prompt }
        : { messages: modelMessages }
      )
    };
    
    // Manual text accumulation for saving
    let accumulatedText = '';
    
    const result = streamText({
      ...streamTextOptions,
      onChunk: ({ chunk }: any) => {
        if (chunk.type === 'text-delta') {
          accumulatedText += chunk.text;
        }
      },
      onFinish: async ({ usage }: any) => {
        if (!accumulatedText || accumulatedText.length === 0) {
          console.error(`No text accumulated for story ${storyId}`);
          await releaseLock();
          return;
        }
        
        try {
          await ctx.runMutation(internal.stories.index.addStoryPage, {
            storyId,
            userId: story.userId,
            sessionId: story.sessionId,
            content: accumulatedText,
          });

          // Calculate and log usage
          // Use appropriate tier based on user type (authenticated vs anonymous)
          const userTier = authenticatedUserId ? 'authenticated' : 'anonymous';
          const usageData = calculateUsageAndCost('storyGeneration', userTier, { usage });
          const authArgs = story.userId ? { userId: story.userId } : { sessionId: story.sessionId || '' };
          await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
            ...authArgs,
            ...usageData,
          });
        
        } catch (error) {
          console.error('Failed to save story page or log usage:', error);
        } finally {
          await releaseLock();
        }
      },
      onError: async () => {
        await releaseLock();
      },
    });

    // Return simple text stream response with CORS headers
    const streamResponse = result.toTextStreamResponse();

    // Add CORS headers to the stream response
    const headers = new Headers(streamResponse.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    const response = new Response(streamResponse.body, {
      status: streamResponse.status,
      statusText: streamResponse.statusText,
      headers: headers,
    });
    return response;
  } catch (error) {
    console.error('Story generation error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    // If we failed after acquiring the lock, release it.
    try { /* no-op */ } finally {
      // best-effort release
      // We can't reference story/auth variables here safely unless defined; ignore if not.
    }
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
}); 