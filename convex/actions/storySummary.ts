"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { generateText } from 'ai';
import { getModelClient, getModelConfig, calculateUsageAndCost } from '../ai/models';
import { buildStorySummaryPrompt, buildStorySummarySystemPrompt } from '../prompts/storySummary';
import { api, internal } from '../_generated/api';

// Parse the summary text into structured format
function parseSummary(summaryText: string) {
  const sections = {
    plot: '',
    characters: '',
    keyEvents: [] as string[],
    worldBuilding: undefined as string | undefined,
  };

  const lines = summaryText.split('\n');
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect section headers
    if (trimmed.startsWith('PLOT SUMMARY:')) {
      currentSection = 'plot';
      continue;
    } else if (trimmed.startsWith('CHARACTER DEVELOPMENTS:')) {
      currentSection = 'characters';
      continue;
    } else if (trimmed.startsWith('KEY EVENTS:')) {
      currentSection = 'keyEvents';
      continue;
    } else if (trimmed.startsWith('WORLD BUILDING:')) {
      currentSection = 'worldBuilding';
      continue;
    }

    // Process content based on current section
    switch (currentSection) {
      case 'plot':
        sections.plot += (sections.plot ? '\n' : '') + trimmed;
        break;
      case 'characters':
        sections.characters += (sections.characters ? '\n' : '') + trimmed;
        break;
      case 'keyEvents':
        if (trimmed.startsWith('- ')) {
          sections.keyEvents.push(trimmed.substring(2));
        }
        break;
      case 'worldBuilding':
        if (!sections.worldBuilding) sections.worldBuilding = '';
        sections.worldBuilding += (sections.worldBuilding ? '\n' : '') + trimmed;
        break;
    }
  }

  return sections;
}

export const generateStorySummary = action({
  args: {
    storyId: v.id("stories"),
    pageStart: v.number(),
    pageEnd: v.number(),
  },
  returns: v.object({
    plot: v.string(),
    characters: v.string(),
    keyEvents: v.array(v.string()),
    worldBuilding: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    return await generateStorySummaryCore(ctx, args);
  },
});

export const generateStorySummaryInternal = internalAction({
  args: {
    storyId: v.id("stories"),
    pageStart: v.number(),
    pageEnd: v.number(),
  },
  returns: v.object({
    plot: v.string(),
    characters: v.string(),
    keyEvents: v.array(v.string()),
    worldBuilding: v.optional(v.string())
  }),
  handler: async (ctx, args) => {
    return await generateStorySummaryCore(ctx as any, args as any);
  },
});

// Shared core implementation for public/internal variants
async function generateStorySummaryCore(ctx: any, args: { storyId: string; pageStart: number; pageEnd: number }) {
  try {
    const story = await ctx.runQuery(internal.stories.internalQueries.getStoryByIdInternal, {
      storyId: args.storyId,
    });
    if (!story) throw new Error("Story not found");

    const pagesToSummarize = story.pages.slice(args.pageStart - 1, args.pageEnd);
    if (pagesToSummarize.length === 0) throw new Error("No pages to summarize");

    const storyContent = pagesToSummarize
      .map((page: any, index: number) => `Page ${args.pageStart + index}:\n${page.content}`)
      .join('\n\n');

    const systemPrompt = buildStorySummarySystemPrompt();
    const prompt = buildStorySummaryPrompt({
      genre: story.suggestion.metadata.genre,
      primarySource: story.suggestion.metadata.primarySource,
      mainCharacters: story.suggestion.characters.main_characters,
      pageStart: args.pageStart,
      pageEnd: args.pageEnd,
      storyContent,
      goonMode: (story.suggestion.metadata.genre || '').toLowerCase() === 'goon-mode',
    });

    const result = await generateText({
      model: getModelClient('storyGeneration'),
      system: systemPrompt,
      prompt,
      temperature: 0.3,
      maxOutputTokens: 1000,
    });

    const summary = parseSummary(result.text);
    const storyAuthArgs = story.userId ? { userId: story.userId } : { sessionId: story.sessionId || '' };

    await ctx.runMutation(internal.stories.mutations.saveStorySummary, {
      ...storyAuthArgs,
      storyId: args.storyId,
      pageRange: { start: args.pageStart, end: args.pageEnd },
      summary,
    });

    const usageData = calculateUsageAndCost('storyGeneration', 'authenticated', { usage: result.usage });
    await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
      ...storyAuthArgs,
      ...usageData,
      useCase: 'storySummaryGeneration',
    });

    return summary;
  } catch (error) {
    console.error('Error generating story summary:', error);
    throw new Error('Failed to generate story summary');
  }
}