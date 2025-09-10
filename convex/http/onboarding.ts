import { httpAction } from "../_generated/server";
import { streamText, smoothStream, convertToModelMessages } from "ai";
import { getModelClient, getModelConfig } from "../ai/models";
import { api } from "../_generated/api";
import { parseCharacterMarkdown } from "../utils/markdownParser";

// Clerk token validation (copied pattern from storyGeneration.ts)
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
    console.error('Token validation error (onboarding):', error);
    return null;
  }
}

function getCorsHeaders(requestOrigin: string | null): Record<string, string> {
  const allowedOrigins = [
    "https://fromyou.ai",
    "https://www.fromyou.ai",
    "http://localhost:3000",
    "http://localhost:3000"
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

type OnboardingBody = {
  sessionId?: string;
  mode: 'photo' | 'text' | 'genre';
  imageData?: string; // data URL or base64
  text?: string;
  genre?: string;
};

function buildSystemMessage(): string {
  return [
    "You are an expert onboarding assistant for a storytelling and character interaction app.",
    "Your role is to analyze user inputs (images, text, or genre preferences) and provide personalized character recommendations that will enhance their storytelling experience.",
    "",
    "CORE OBJECTIVES:",
    "- Understand user preferences from their input (visual, textual, or genre-based)",
    "- Identify the primary source/franchise and recommend characters from it",
    "- Recommend similar works that fans of the primary source would enjoy",
    "- Generate relevant tags that capture the user's preferences",
    "",
    "ANALYSIS GUIDELINES:",
    "- For images: Identify the primary source/franchise, characters, art styles, themes, and aesthetic preferences",
    "- For text: Extract the primary source/franchise mentioned, character types, story themes, and narrative preferences", 
    "- For genre selection: Identify a popular source within that genre and related works",
    "- Focus on one primary source and find works with similar appeal",
    "",
    "CHARACTER SELECTION CRITERIA:",
    "- Select exactly 3 characters from the primary identified source/franchise",
    "- Include a mix of main and supporting characters from that source",
    "- Ensure variety in personality types and roles within the source",
    "- Gender must be one of: male, female, other",
    "",
    "SIMILAR WORKS IDENTIFICATION:",
    "- Identify exactly 6 works/titles that fans of the primary source would likely enjoy",
    "- Include a mix of similar genres, themes, or storytelling styles",
    "- Consider both popular and lesser-known works that share appeal",
    "",
    "TAG GENERATION:",
    "- Generate exactly 6 relevant tags that capture the user's demonstrated preferences",
    "- Include themes, genres, character types, aesthetic preferences, or narrative elements",
    "- Make tags specific but broadly applicable for future recommendations",
    "- Use single words or short phrases (2-3 words max)",
    "",
    "GENRE CLASSIFICATION:",
    "- Choose the single most appropriate genre keyword from: fantasy, romance, sci-fi, adventure, mystery, comedy, horror, goon-mode",
    "- Base this on the dominant themes and user preferences identified",
    "",
    "OUTPUT FORMAT (use this exact structure):",
    "",
    "# SOURCE_NAME",
    "Primary Source/Franchise Title",
    "",
    "# SOURCE_CHARACTERS",
    "- Character Name",
    "  Gender: male/female/other",
    "",
    "- Character Name",
    "  Gender: male/female/other",
    "",
    "- Character Name",
    "  Gender: male/female/other",
    "",
    "# SIMILAR_WORKS",
    "- Similar Work Title 1",
    "- Similar Work Title 2", 
    "- Similar Work Title 3",
    "- Similar Work Title 4",
    "- Similar Work Title 5",
    "- Similar Work Title 6",
    "",
    "# TAGS",
    "tag1, tag2, tag3, tag4, tag5, tag6",
    "",
    "# GENRE",
    "genre-keyword",
  ].join("\n");
}

function buildUserContent(body: OnboardingBody, seededCharacters?: Array<{ fullName: string; gender: string; source: string }>) {
  const base: any[] = [];
  const instructions: string[] = [];

  if (body.mode === 'photo') {
    instructions.push(
      "Analyze the attached image to identify the primary source/franchise.",
      "Return 3 characters from that source, 6 similar works, and 6 relevant tags.",
    );
    if (body.imageData) {
      // Extract media type from data URL (e.g., "data:image/png;base64,...")
      const mediaTypeMatch = body.imageData.match(/^data:([^;]+)/);
      const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/png';
      const extension = mediaType.split('/')[1] || 'png';
      
      // Add image first
      base.push({ 
        type: 'file' as const,
        filename: `uploaded-image.${extension}`,
        mediaType: mediaType,
        url: body.imageData 
      });
      
      // Then add prompt/instructions after
      base.push({ type: 'text' as const, text: instructions.join('\n') });
    } else {
      base.push({ type: 'text' as const, text: instructions.concat(["No image provided."]).join('\n') });
    }
  } else if (body.mode === 'text') {
    instructions.push(
      "Analyze the following user-provided text to identify the primary source/franchise mentioned.",
      "Return 3 characters from that source, 6 similar works, and 6 relevant tags.",
      `Input Text:\n\n${(body.text || '').slice(0, 5000)}`,
    );
    base.push({ type: 'text' as const, text: instructions.join('\n') });
  } else if (body.mode === 'genre') {
    const genre = (body.genre || '').toLowerCase();
    instructions.push(
      `User selected genre: ${genre}.`,
      "Identify a popular source/franchise within this genre.",
      "Return 3 characters from that source, 6 similar works in the genre, and 6 relevant tags.",
      "If specific characters were preselected by the system, use their source as the primary source.",
    );
    if (seededCharacters && seededCharacters.length > 0) {
      const seededList = seededCharacters.map(c => `${c.fullName} | ${c.gender} | ${c.source}`).join('\n');
      instructions.push("Preselected characters (must include):\n" + seededList);
    }
    base.push({ type: 'text' as const, text: instructions.join('\n') });
  }

  return base;
}

export const onboardingAnalysisHandler = httpAction(async (ctx, req) => {
  const requestOrigin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(requestOrigin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as OnboardingBody;
    const { sessionId, mode } = body;

    if (!mode || !["photo", "text", "genre"].includes(mode)) {
      return new Response(JSON.stringify({ error: "Invalid mode" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    let authenticatedUserId: string | null = null;
    let userSessionId: string | null = null;

    const authHeader = req.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const validation = await validateClerkToken(token);
      if (validation?.userId) authenticatedUserId = validation.userId;
    }
    if (!authenticatedUserId) {
      if (!sessionId) {
        return new Response(JSON.stringify({ error: "Authentication required: provide token or sessionId" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      userSessionId = sessionId;
    }

    const authArgs = authenticatedUserId ? { userId: authenticatedUserId } : { sessionId: userSessionId! };

    console.log(`[onboarding] Starting analysis - Mode: ${mode}, Auth: ${authenticatedUserId ? 'authenticated' : 'anonymous'}`);
    if (mode === 'text' && body.text) {
      console.log(`[onboarding] Text input length: ${body.text.length} characters`);
    } else if (mode === 'genre' && body.genre) {
      console.log(`[onboarding] Selected genre: ${body.genre}`);
    } else if (mode === 'photo') {
      console.log(`[onboarding] Image upload - has imageData: ${!!body.imageData}`);
    }

    // Seed characters for genre mode using existing pipeline (persisted server-side)
    let seededForGenre: Array<{ fullName: string; gender: string; source: string }> | undefined = undefined;
    if (mode === 'genre') {
      const genre = (body.genre || '').toLowerCase();
      if (!genre) {
        return new Response(JSON.stringify({ error: "Genre is required for mode 'genre'" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
      try {
        const chars = await ctx.runAction(api.characters.generateByGenre.generateByGenre, { ...(authArgs as any), genre });
        seededForGenre = chars || [];
        // Also update user preferences genre immediately (idempotent)
        await ctx.runMutation(api.users.preferences.updateStorySettings, { ...(authArgs as any), genre });
      } catch (err) {
        console.warn('[onboarding] generateByGenre failed, continuing without seed:', err);
      }
    }

    const system = buildSystemMessage();
    const modelConfig = getModelConfig('onboardingAnalysis', authenticatedUserId ? 'authenticated' : 'anonymous');
    const model = getModelClient('onboardingAnalysis', authenticatedUserId ? 'authenticated' : 'anonymous');

    const uiMessages = [
      { 
        role: 'system' as const, 
        parts: [{ type: 'text' as const, text: system }] 
      },
      { 
        role: 'user' as const, 
        parts: buildUserContent(body, seededForGenre) 
      },
    ];

    // Convert UIMessages to ModelMessages for AI SDK
    const messages = convertToModelMessages(uiMessages);

    let accumulatedText = '';

    const result = streamText({
      model,
      messages,
      temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.7,
      maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 2000,
      experimental_transform: smoothStream({ delayInMs: 20, chunking: 'word' as const }),
      onChunk: ({ chunk }: any) => {
        if (chunk.type === 'text-delta') {
          accumulatedText += chunk.text;
        }
      },
      onFinish: async () => {
        // Removed auto-persistence - user will manually save via UI
        console.log('[onboarding] Stream completed, awaiting user confirmation');
        console.log('[onboarding] LLM Output:');
        console.log('='.repeat(80));
        console.log(accumulatedText);
        console.log('='.repeat(80));
      },
    });

    const streamResponse = result.toTextStreamResponse();
    const headers = new Headers(streamResponse.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
    return new Response(streamResponse.body, { status: streamResponse.status, statusText: streamResponse.statusText, headers });
  } catch (error) {
    console.error('Onboarding analysis error:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});


