import { v } from "convex/values";
import { action } from "../_generated/server";
import { requireAuth } from "../lib/authHelpers";
import { generateText } from "ai";
import { getModelClient, getModelConfig, calculateUsageAndCost } from "../ai/models";
import { api, internal } from "../_generated/api";

export const generateCharacterLore = action({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    characterName: v.string(),
    gender: v.string(),
    additionalContext: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    const prompt = `Create a rich, detailed character backstory for ${args.characterName} (${args.gender}).

${args.additionalContext ? `Additional context: ${args.additionalContext}` : ''}

Include:
- Background and origin
- Personality traits and quirks
- Key relationships
- Motivations and goals
- Notable experiences or events
- Special abilities or skills (if applicable)

Write in an engaging, narrative style. Keep it under 300 words.`;

    try {
      const modelConfig = getModelConfig('customCharacterLore', 'authenticated');
      const result = await generateText({
        model: getModelClient('customCharacterLore', 'authenticated'),
        prompt,
        temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.8,
        maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 400,
      });

      const usageData = calculateUsageAndCost('customCharacterLore', 'authenticated', result as any, true);
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        userId: args.userId,
        sessionId: args.sessionId,
        ...usageData,
      });

      const text = (result as any).text ?? String(result ?? "");
      return text.trim();
    } catch (error) {
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        userId: args.userId,
        sessionId: args.sessionId,
        ...calculateUsageAndCost('customCharacterLore', 'authenticated', {}, false, error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  },
});

export const generateWorldLore = action({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    theme: v.string(),
    existingLore: v.optional(v.array(v.string())),
  },
  returns: v.object({
    title: v.string(),
    lore: v.string(),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    const prompt = `Create world-building lore based on the theme: "${args.theme}"

${args.existingLore?.length ? `Build upon or complement this existing lore:
${args.existingLore.join('\n\n')}` : ''}

Generate:
1. A concise, descriptive title (5-10 words)
2. Rich world-building content that includes setting details, culture, history, or magical/technological systems

Keep the lore engaging and immersive. Aim for 200-400 words.

Format:
Title: [Your title here]
---
[Your lore content here]`;

    try {
      const modelConfig = getModelConfig('customWorldLore', 'authenticated');
      const result = await generateText({
        model: getModelClient('customWorldLore', 'authenticated'),
        prompt,
        temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.85,
        maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 500,
      });

      const text = (result as any).text ?? String(result ?? "");
      const parts = text.split('---');
      const title = parts[0].replace('Title:', '').trim();
      const lore = parts[1]?.trim() || text;

      const usageData = calculateUsageAndCost('customWorldLore', 'authenticated', result as any, true);
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        userId: args.userId,
        sessionId: args.sessionId,
        ...usageData,
      });

      return { title, lore };
    } catch (error) {
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        userId: args.userId,
        sessionId: args.sessionId,
        ...calculateUsageAndCost('customWorldLore', 'authenticated', {}, false, error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  },
});

export const generateStorySuggestion = action({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    characters: v.array(v.object({
      name: v.string(),
      lore: v.optional(v.string()),
    })),
    worldLore: v.optional(v.array(v.string())),
    genre: v.string(),
    playerMode: v.boolean(),
    storyType: v.string(),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    const characterNames = args.characters.map(c => c.name);
    const characterContext = args.characters
      .filter(c => c.lore)
      .map(c => `${c.name}: ${c.lore}`)
      .join('\n\n');

    const prompt = `Create an engaging story premise featuring these characters: ${characterNames.join(', ')}

Genre: ${args.genre}
Story Type: ${args.storyType}
${args.playerMode ? 'Player Mode: The reader is the main character' : 'Reader Mode: Traditional narrative'}

${characterContext ? `Character backgrounds:\n${characterContext}` : ''}

${args.worldLore?.length ? `World context:\n${args.worldLore.join('\n\n')}` : ''}

Write a compelling 2-3 sentence story hook that:
- Sets up an intriguing situation or conflict
- Highlights the characters' roles
- Creates anticipation for the story
${args.playerMode ? '- Uses second person (you/your)' : '- Uses third person narrative'}

Be creative and make it exciting!`;

    try {
      const modelConfig = getModelConfig('customStorySuggestion', 'authenticated');
      const result = await generateText({
        model: getModelClient('customStorySuggestion', 'authenticated'),
        prompt,
        temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.9,
        maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 150,
      });

      const usageData = calculateUsageAndCost('customStorySuggestion', 'authenticated', result as any, true);
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        userId: args.userId,
        sessionId: args.sessionId,
        ...usageData,
      });

      const text = (result as any).text ?? String(result ?? "");
      return text.trim();
    } catch (error) {
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        userId: args.userId,
        sessionId: args.sessionId,
        ...calculateUsageAndCost('customStorySuggestion', 'authenticated', {}, false, error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  },
});

export const expandStoryIdea = action({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    originalIdea: v.string(),
    characters: v.optional(v.array(v.object({
      fullName: v.string(),
      gender: v.string(),
      source: v.string(),
    }))),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    
    const characterContext = args.characters?.length 
      ? `Featuring characters: ${args.characters.map(c => c.fullName).join(', ')}` 
      : '';

    const prompt = `Take this story idea and create 3 expanded, more detailed variations:

Original idea: "${args.originalIdea}"
${characterContext}

Generate 3 distinct variations that:
1. Expand on the core concept with more detail
2. Add specific plot elements or twists
3. Create different tones or approaches (e.g., one darker, one lighter, one more complex)
4. Each should be 2-3 sentences long
5. Make each variation compelling and unique

Format your response as:
Variation 1: [expanded idea]
Variation 2: [expanded idea]
Variation 3: [expanded idea]`;

    try {
      const modelConfig = getModelConfig('expandStoryIdea', 'authenticated');
      const result = await generateText({
        model: getModelClient('expandStoryIdea', 'authenticated'),
        prompt,
        temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.85,
        maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 400,
      });

      // Parse the variations from the response
      const text = (result as any).text ?? String(result ?? "");
      const variations = text
        .split(/Variation \d+:/)
        .slice(1)
        .map((v: string) => v.trim())
        .filter((v: string) => v.length > 0);

      const usageData = calculateUsageAndCost('expandStoryIdea', 'authenticated', result as any, true);
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        userId: args.userId,
        sessionId: args.sessionId,
        ...usageData,
      });

      return variations.slice(0, 3); // Ensure we return exactly 3
    } catch (error) {
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        userId: args.userId,
        sessionId: args.sessionId,
        ...calculateUsageAndCost('expandStoryIdea', 'authenticated', {}, false, error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  },
});

// Analyze imported text and return Markdown sections for characters, world lore, character lore, genre, tags, story pages, outline, and other relevant info.
export const analyzeImportedText = action({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    text: v.string(),
    // Allow caller to pass context to adapt tone/sections
    preferredGenre: v.optional(v.string()),
    playerMode: v.optional(v.boolean()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);

    const adaptiveContext = `\nUser preferences (optional):${
      args.preferredGenre ? `\n- Preferred genre: ${args.preferredGenre}` : ''
    }${
      args.playerMode !== undefined ? `\n- Player mode: ${args.playerMode ? 'on' : 'off'}` : ''
    }`;

    const prompt = `You are extracting structured writing data from user imported text. Output strictly in Markdown (no JSON) with clear headings. Be concise and skip irrelevant sections if they do not apply (leave them empty).

Input text starts below (may be truncated):\n---\n${args.text}\n---\n
Task: Summarize and extract into the following Markdown sections. Use lists when helpful. Keep names and key nouns verbatim when possible.

Required sections (use these exact headings):
## Characters
List notable characters with short descriptions and relationships.

## Character Lore
Per-character deeper lore if present. Use subheadings for names.

## World Lore
Setting, rules, factions, technology/magic, notable locations.

## Genre
Single line guess if unclear.

## Tags
Comma-separated, lowercased, short tags.

## Story Pages
If present, break into rough page-like chunks. Otherwise, provide a short sample opening paragraph.

## Other Notes
Anything else useful (themes, tone, constraints).${adaptiveContext}

Rules:
- Output must be valid Markdown. Do not wrap in code fences.
- If a section is not relevant, include the heading with no content or a single dash.
- Keep within a reasonable length; prioritize clarity.`;

    try {
      const modelConfig = getModelConfig('importAnalysis', 'authenticated');
      const result = await generateText({
        model: getModelClient('importAnalysis', 'authenticated'),
        prompt,
        temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.2,
        maxOutputTokens: 'maxTokens' in modelConfig.settings ? Math.min(2000, modelConfig.settings.maxTokens) : 2000,
      });

      const usageData = calculateUsageAndCost('importAnalysis', 'authenticated', result as any, true);
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        userId: args.userId,
        sessionId: args.sessionId,
        ...usageData,
      });

      const text = (result as any).text ?? String(result ?? "");
      return text.trim();
    } catch (error) {
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        userId: args.userId,
        sessionId: args.sessionId,
        ...calculateUsageAndCost('importAnalysis', 'authenticated', {}, false, error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  },
});