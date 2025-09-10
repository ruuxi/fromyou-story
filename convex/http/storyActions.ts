import { httpAction } from "../_generated/server";
import { generateObject } from 'ai';
import { z } from 'zod';
import { getModelClient, getModelConfig, calculateUsageAndCost } from '../ai/models';
import { buildStoryActionsPrompt, STORY_ACTIONS_SYSTEM_PROMPT } from '../prompts';
import { api, internal } from '../_generated/api';

// Helper function to validate Clerk JWT token
async function validateClerkToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { verifyToken } = await import('@clerk/backend');
    
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

export const storyActionsHandler = httpAction(async (ctx, req) => {
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
    const { storyId, currentPage, sessionId } = requestBody;

    let authenticatedUserId: string | null = null;
    let userSessionId: string | null = null;

    // Check for authorization header (authenticated users)
    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      // Extract the token from the Bearer header
      const token = authHeader.substring(7);

      // Validate the Clerk token
      const validationResult = await validateClerkToken(token);
      if (validationResult && validationResult.userId) {
        authenticatedUserId = validationResult.userId;
      }
    }

    // If no valid Clerk token, check for sessionId (anonymous users)
    if (!authenticatedUserId) {
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: "Authentication required: provide either valid token or sessionId" }),
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
    }

    if (!storyId || !currentPage) {
      return new Response(
        JSON.stringify({ error: "Story ID and current page are required" }),
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
    let story;
    try {
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

    // Get user preferences to check for goon mode. Use the story's owner identifier to avoid
    // relying on Convex identity in this HTTP context.
    const ownerAuthArgs = story.userId ? { userId: story.userId } : { sessionId: story.sessionId || '' };
    const userSettings = await ctx.runQuery(internal.stories.settings.getCurrentSettingsInternal, ownerAuthArgs);

    // Build the prompt for action generation
    const prompt = buildStoryActionsPrompt({
      currentPage,
      genre: story.suggestion.metadata.genre,
      pov: 'third person', // Default POV as POV is not stored in story metadata
      playerName: story.playerName || "Player",
      characters: story.selectedCharacters,
      // Derive goon-mode from the story's genre when building prompts
      goonMode: (story.suggestion.metadata.genre || '').toLowerCase() === 'goon-mode',
    });

    // Generate actions using AI
    const modelConfig = getModelConfig('storyGeneration');
    const result = await generateObject({
      model: getModelClient('storyGeneration'),
      system: STORY_ACTIONS_SYSTEM_PROMPT,
      prompt: prompt,
      schema: z.object({
        actions: z.array(z.string()).length(4).describe('Array of exactly 4 short action text strings')
      }),
      temperature: ('temperature' in modelConfig.settings ? modelConfig.settings.temperature : null) || 0.7,
      maxOutputTokens: 500,
    });

    // Calculate and log usage
    // Use appropriate tier based on user type (authenticated vs anonymous)
    const userTier = authenticatedUserId ? 'authenticated' : 'anonymous';
    const usageData = calculateUsageAndCost('storyGeneration', userTier, { usage: result.usage });
    const storyAuthArgs = story.userId ? { userId: story.userId } : { sessionId: story.sessionId || '' };
    await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
      ...storyAuthArgs,
      ...usageData,
    });

    // Convert array of strings to action objects
    const actions = result.object.actions.map((text, index) => ({
      id: `action-${Date.now()}-${index}`, // Use timestamp + index for unique IDs
      text: text,
      type: (index === 0 ? 'continue' : index === 1 ? 'introduce' : index === 2 ? 'change' : 'explore') as 'continue' | 'introduce' | 'change' | 'explore'
    }));

    // Return the generated actions
    return new Response(
      JSON.stringify({ actions }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error('Story actions generation error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

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