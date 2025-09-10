"use node";

import { action, internalAction } from "../_generated/server";
import { v } from "convex/values";
import { generateText } from 'ai';
import { getModelClient, getModelConfig, calculateUsageAndCost } from '../ai/models';
import { buildStoryOutlinePrompt, buildStoryOutlineSystemPrompt, buildSingleActOutlinePrompt } from '../prompts/storyOutline';
import { api, internal } from '../_generated/api';
import { authArgsValidator, requireAuth, getNormalizedAuthArgs } from "../lib/authHelpers";

// Parse the outline text into structured format
function parseOutline(outlineText: string) {
  const acts: any[] = [];
  let currentAct: any = null;
  let currentChapter: any = null;

  const lines = outlineText.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Match ACT
    const actMatch = trimmed.match(/^ACT\s+([IVX]+):\s*(.+)$/i);
    if (actMatch) {
      if (currentChapter) {
        currentAct.chapters.push(currentChapter);
      }
      if (currentAct) {
        acts.push(currentAct);
      }
      currentAct = {
        title: actMatch[2]?.trim() || `Act ${actMatch[1]}`,
        chapters: []
      };
      currentChapter = null;
      continue;
    }

    // Match Chapter
    const chapterMatch = trimmed.match(/^Chapter\s+\d+:\s*(.+)$/i);
    if (chapterMatch && currentAct) {
      if (currentChapter) {
        currentAct.chapters.push(currentChapter);
      }
      currentChapter = {
        title: chapterMatch[1]?.trim() || `Chapter ${currentAct.chapters.length + 1}`,
        beats: []
      };
      continue;
    }

    // Match Beat
    const beatMatch = trimmed.match(/^-\s*Beat\s+\d+:\s*(.+)$/i);
    if (beatMatch && currentChapter) {
      currentChapter.beats.push(beatMatch[1].trim());
      continue;
    }

    // Also match beats without "Beat" prefix
    const simpleBeatMatch = trimmed.match(/^-\s*(.+)$/);
    if (simpleBeatMatch && currentChapter) {
      currentChapter.beats.push(simpleBeatMatch[1].trim());
    }
  }

  // Add the last chapter and act
  if (currentChapter && currentAct) {
    currentAct.chapters.push(currentChapter);
  }
  if (currentAct) {
    acts.push(currentAct);
  }

  return { acts };
}

export const generateStoryOutline = action({
  args: {
    ...authArgsValidator.fields,
    storyPremise: v.string(),
    genre: v.string(),
    storyType: v.string(),
    characterCount: v.string(),
    playerMode: v.boolean(),
    primarySource: v.string(),
    mainCharacters: v.array(v.string()),
    sideCharacters: v.array(v.string()),
    goonMode: v.optional(v.boolean()),
  },
  returns: v.object({
    acts: v.array(v.object({
      title: v.optional(v.string()),
      chapters: v.array(v.object({
        title: v.optional(v.string()),
        beats: v.array(v.string())
      }))
    }))
  }),
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);

    try {
      // Get character and world lore if available
      const characterLore = await ctx.runQuery(api.characters.loreHelpers.getCharacterLoreForStory, {
        characterNames: [...args.mainCharacters, ...args.sideCharacters],
        source: args.primarySource,
      });

      const worldLore = await ctx.runQuery(api.characters.loreHelpers.getWorldLore, {
        source: args.primarySource,
      });

      // Build the prompt
      const systemPrompt = buildStoryOutlineSystemPrompt();
      const prompt = buildStoryOutlinePrompt({
        storyPremise: args.storyPremise,
        genre: args.genre,
        storyType: args.storyType,
        characterCount: args.characterCount,
        playerMode: args.playerMode,
        primarySource: args.primarySource,
        mainCharacters: args.mainCharacters,
        sideCharacters: args.sideCharacters,
        characterLore,
        worldLore,
        goonMode: args.goonMode,
      });

      // Generate the outline
      const modelConfig = getModelConfig('storyGeneration');
      const result = await generateText({
        model: getModelClient('storyGeneration'),
        system: systemPrompt,
        prompt: prompt,
        temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.7,
        maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 2000,
      });

      // Parse the generated outline
      const outline = parseOutline(result.text);

      // Log usage
      const usageData = calculateUsageAndCost('storyGeneration', 'authenticated', { usage: result.usage });
      const authArgs = args.userId ? { userId: args.userId } : { sessionId: args.sessionId || '' };
      await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
        ...authArgs,
        ...usageData,
        useCase: 'storyOutlineGeneration',
      });

      return outline;
    } catch (error) {
      console.error('Error generating story outline:', error);
      throw new Error('Failed to generate story outline');
    }
  },
});

// Internal helper to generate an outline for a single act without requiring identity
async function generateActOutlineInternal(
  ctx: any,
  args: {
    userId?: string;
    sessionId?: string;
    actNumber: 1 | 2 | 3;
    storyPremise: string;
    genre: string;
    storyType: string;
    characterCount: string;
    playerMode: boolean;
    primarySource: string;
    mainCharacters: string[];
    sideCharacters: string[];
    previousOutlineText?: string;
    summariesText?: string;
    recentPagesText?: string;
    goonMode?: boolean;
  }
) {
  const characterLore = await ctx.runQuery(api.characters.loreHelpers.getCharacterLoreForStory, {
    characterNames: [...args.mainCharacters, ...args.sideCharacters],
    source: args.primarySource,
  });

  const worldLore = await ctx.runQuery(api.characters.loreHelpers.getWorldLore, {
    source: args.primarySource,
  });

  const systemPrompt = buildStoryOutlineSystemPrompt();
  const prompt = buildSingleActOutlinePrompt({
    actNumber: args.actNumber,
    storyPremise: args.storyPremise,
    genre: args.genre,
    storyType: args.storyType,
    characterCount: args.characterCount,
    playerMode: args.playerMode,
    primarySource: args.primarySource,
    mainCharacters: args.mainCharacters,
    sideCharacters: args.sideCharacters,
    characterLore,
    worldLore,
    previousOutlineText: args.previousOutlineText,
    summariesText: args.summariesText,
    recentPagesText: args.recentPagesText,
    goonMode: args.goonMode,
  });

  const modelConfig = getModelConfig('storyGeneration');
  const result = await generateText({
    model: getModelClient('storyGeneration'),
    system: systemPrompt,
    prompt,
    temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.7,
    maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 2000,
  });

  const outline = parseOutline(result.text);

  // Log usage
  const usageData = calculateUsageAndCost('storyGeneration', 'authenticated', { usage: result.usage });
  const authArgs = args.userId ? { userId: args.userId } : { sessionId: args.sessionId || '' };
  await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
    ...authArgs,
    ...usageData,
    useCase: 'storyOutlineGenerationAct',
  });

  return outline;
}

// Generate and save outline directly (for background processing)
export const generateAndSaveOutline = action({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    storyPremise: v.string(),
    genre: v.string(),
    storyType: v.string(),
    characterCount: v.string(),
    playerMode: v.boolean(),
    primarySource: v.string(),
    mainCharacters: v.array(v.string()),
    sideCharacters: v.array(v.string()),
    goonMode: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      // Generate only Act I outline first for faster start
      let act1Only: { acts: Array<{ title?: string; chapters: Array<{ title?: string; beats: string[] }>} > };

      if (args.sessionId) {
        // Anonymous flow can safely use the sub-action with sessionId
        act1Only = await ctx.runAction(api.actions.storyOutline.generateSingleActOutline, {
          sessionId: args.sessionId,
          actNumber: 1,
          storyPremise: args.storyPremise,
          genre: args.genre,
          storyType: args.storyType,
          characterCount: args.characterCount,
          playerMode: args.playerMode,
          primarySource: args.primarySource,
          mainCharacters: args.mainCharacters,
          sideCharacters: args.sideCharacters,
          goonMode: args.goonMode,
        });
      } else {
        // Authenticated flow in background: no identity present, so generate inline
        act1Only = await generateActOutlineInternal(ctx, {
          userId: args.userId,
          sessionId: args.sessionId,
          actNumber: 1,
          storyPremise: args.storyPremise,
          genre: args.genre,
          storyType: args.storyType,
          characterCount: args.characterCount,
          playerMode: args.playerMode,
          primarySource: args.primarySource,
          mainCharacters: args.mainCharacters,
          sideCharacters: args.sideCharacters,
          goonMode: args.goonMode,
        });
      }

      // Save Act I outline and mark status as complete (for Act I)
      await ctx.runMutation(internal.stories.mutations.updateStoryOutline, {
        storyId: args.storyId,
        userId: args.userId,
        sessionId: args.sessionId,
        outline: act1Only,
        outlineStatus: "complete",
      });

      // Schedule background generation for Act II and III after initial pages accumulate
      // We'll rely on addStoryPage to trigger these later based on page count

      return null;
    } catch (error) {
      console.error('Failed to generate and save story outline:', error);
      // Update status to error
      await ctx.runMutation(internal.stories.mutations.updateStoryOutline, {
        storyId: args.storyId,
        userId: args.userId,
        sessionId: args.sessionId,
        outline: undefined,
        outlineStatus: "error",
      });
      return null;
    }
  },
});

// Internal version intended for scheduler/background use
export const generateAndSaveOutlineInternal = internalAction({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    storyPremise: v.string(),
    genre: v.string(),
    storyType: v.string(),
    characterCount: v.string(),
    playerMode: v.boolean(),
    primarySource: v.string(),
    mainCharacters: v.array(v.string()),
    sideCharacters: v.array(v.string()),
    goonMode: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      let act1Only: { acts: Array<{ title?: string; chapters: Array<{ title?: string; beats: string[] }>}> };
      if (args.sessionId) {
        act1Only = await ctx.runAction(api.actions.storyOutline.generateSingleActOutline, {
          sessionId: args.sessionId,
          actNumber: 1,
          storyPremise: args.storyPremise,
          genre: args.genre,
          storyType: args.storyType,
          characterCount: args.characterCount,
          playerMode: args.playerMode,
          primarySource: args.primarySource,
          mainCharacters: args.mainCharacters,
          sideCharacters: args.sideCharacters,
          goonMode: args.goonMode,
        });
      } else {
        act1Only = await generateActOutlineInternal(ctx, {
          userId: args.userId,
          sessionId: args.sessionId,
          actNumber: 1,
          storyPremise: args.storyPremise,
          genre: args.genre,
          storyType: args.storyType,
          characterCount: args.characterCount,
          playerMode: args.playerMode,
          primarySource: args.primarySource,
          mainCharacters: args.mainCharacters,
          sideCharacters: args.sideCharacters,
          goonMode: args.goonMode,
        });
      }

      await ctx.runMutation(internal.stories.mutations.updateStoryOutline, {
        storyId: args.storyId,
        userId: args.userId,
        sessionId: args.sessionId,
        outline: act1Only,
        outlineStatus: "complete",
      });
      return null;
    } catch (error) {
      await ctx.runMutation(internal.stories.mutations.updateStoryOutline, {
        storyId: args.storyId,
        userId: args.userId,
        sessionId: args.sessionId,
        outline: undefined,
        outlineStatus: "error",
      });
      return null;
    }
  },
});

// Action: generate outline for a single act only
export const generateSingleActOutline = action({
  args: {
    ...authArgsValidator.fields,
    actNumber: v.union(v.literal(1), v.literal(2), v.literal(3)),
    storyPremise: v.string(),
    genre: v.string(),
    storyType: v.string(),
    characterCount: v.string(),
    playerMode: v.boolean(),
    primarySource: v.string(),
    mainCharacters: v.array(v.string()),
    sideCharacters: v.array(v.string()),
    previousOutlineText: v.optional(v.string()),
    summariesText: v.optional(v.string()),
    recentPagesText: v.optional(v.string()),
    goonMode: v.optional(v.boolean()),
  },
  returns: v.object({
    acts: v.array(v.object({
      title: v.optional(v.string()),
      chapters: v.array(v.object({
        title: v.optional(v.string()),
        beats: v.array(v.string())
      }))
    }))
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);

    // Get character and world lore if available
    const characterLore = await ctx.runQuery(api.characters.loreHelpers.getCharacterLoreForStory, {
      characterNames: [...args.mainCharacters, ...args.sideCharacters],
      source: args.primarySource,
    });

    const worldLore = await ctx.runQuery(api.characters.loreHelpers.getWorldLore, {
      source: args.primarySource,
    });

    const systemPrompt = buildStoryOutlineSystemPrompt();
    const prompt = buildSingleActOutlinePrompt({
      actNumber: args.actNumber,
      storyPremise: args.storyPremise,
      genre: args.genre,
      storyType: args.storyType,
      characterCount: args.characterCount,
      playerMode: args.playerMode,
      primarySource: args.primarySource,
      mainCharacters: args.mainCharacters,
      sideCharacters: args.sideCharacters,
      characterLore,
      worldLore,
      previousOutlineText: args.previousOutlineText,
      summariesText: args.summariesText,
      recentPagesText: args.recentPagesText,
      goonMode: args.goonMode,
    });

    const modelConfig = getModelConfig('storyGeneration');
    const result = await generateText({
      model: getModelClient('storyGeneration'),
      system: systemPrompt,
      prompt,
      temperature: 'temperature' in modelConfig.settings ? modelConfig.settings.temperature : 0.7,
      maxOutputTokens: 'maxTokens' in modelConfig.settings ? modelConfig.settings.maxTokens : 2000,
    });

    const outline = parseOutline(result.text);

    // Log usage
    const usageData = calculateUsageAndCost('storyGeneration', 'authenticated', { usage: result.usage });
    const authArgs = args.userId ? { userId: args.userId } : { sessionId: args.sessionId || '' };
    await ctx.runMutation(internal.ai.usageLog.logAiUsage, {
      ...authArgs,
      ...usageData,
      useCase: 'storyOutlineGenerationAct',
    });

    return outline;
  }
});

// Action: Generate next act and attach to existing outline
export const generateAndAttachNextAct = action({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    actNumber: v.union(v.literal(2), v.literal(3)),
    previousOutlineText: v.optional(v.string()),
    summariesText: v.optional(v.string()),
    recentPagesText: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const story = await ctx.runQuery(internal.stories.internalQueries.getStoryByIdInternal, { storyId: args.storyId });
      if (!story) return null;

      // If we already have this act, do nothing
      const actsCount = story.outline?.acts?.length || 0;
      if ((args.actNumber === 2 && actsCount >= 2) || (args.actNumber === 3 && actsCount >= 3)) {
        return null;
      }

      // Build summaries text from DB if not provided
      let summariesText = args.summariesText || '';
      if (!summariesText) {
        const summaries = await ctx.runQuery(internal.stories.internalQueries.getStorySummariesInternal, { storyId: args.storyId });
        if (summaries.length > 0) {
          summariesText = summaries.map((s: any) => {
            const keyEvents = s.summary.keyEvents?.length ? `\nKey Events:\n${s.summary.keyEvents.map((e: string) => `- ${e}`).join('\n')}` : '';
            return `Pages ${s.pageRange.start}-${s.pageRange.end}:\nPlot: ${s.summary.plot}\nCharacters: ${s.summary.characters}${keyEvents}`;
          }).join('\n\n');
        }
      }

      // Generate act outline
      const actOutline: { acts: Array<{ title?: string; chapters: Array<{ title?: string; beats: string[] }>} > } = story.sessionId
        ? await ctx.runAction(api.actions.storyOutline.generateSingleActOutline, {
            sessionId: story.sessionId,
            actNumber: args.actNumber,
            storyPremise: story.suggestion.text,
            genre: story.suggestion.metadata.genre,
            storyType: story.suggestion.metadata.storyType,
            characterCount: story.suggestion.metadata.characterCount,
            playerMode: story.suggestion.metadata.playerMode,
            primarySource: story.suggestion.metadata.primarySource,
            mainCharacters: story.suggestion.characters.main_characters,
            sideCharacters: story.suggestion.characters.side_characters,
            previousOutlineText: args.previousOutlineText || (story.outline ? JSON.stringify(story.outline) : undefined),
            summariesText,
            recentPagesText: args.recentPagesText,
          })
        : await generateActOutlineInternal(ctx, {
            userId: story.userId,
            sessionId: story.sessionId,
            actNumber: args.actNumber,
            storyPremise: story.suggestion.text,
            genre: story.suggestion.metadata.genre,
            storyType: story.suggestion.metadata.storyType,
            characterCount: story.suggestion.metadata.characterCount,
            playerMode: story.suggestion.metadata.playerMode,
            primarySource: story.suggestion.metadata.primarySource,
            mainCharacters: story.suggestion.characters.main_characters,
            sideCharacters: story.suggestion.characters.side_characters,
            previousOutlineText: args.previousOutlineText || (story.outline ? JSON.stringify(story.outline) : undefined),
            summariesText,
            recentPagesText: args.recentPagesText,
          });

      // Merge into existing outline
      const mergedOutline = {
        acts: [
          ...(story.outline?.acts || []),
          ...(actOutline.acts || []),
        ]
      };

      await ctx.runMutation(internal.stories.mutations.updateStoryOutline, {
        storyId: args.storyId,
        userId: story.userId,
        sessionId: story.sessionId,
        outline: mergedOutline,
        outlineStatus: "complete",
      });

      return null;
    } catch (e) {
      console.error('Failed to generate and attach next act:', e);
      return null;
    }
  }
});

// Internal version intended for scheduler/background use
export const generateAndAttachNextActInternal = internalAction({
  args: {
    ...authArgsValidator.fields,
    storyId: v.id("stories"),
    actNumber: v.union(v.literal(2), v.literal(3)),
    previousOutlineText: v.optional(v.string()),
    summariesText: v.optional(v.string()),
    recentPagesText: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    try {
      const story = await ctx.runQuery(internal.stories.internalQueries.getStoryByIdInternal, { storyId: args.storyId });
      if (!story) return null;

      const actsCount = story.outline?.acts?.length || 0;
      if ((args.actNumber === 2 && actsCount >= 2) || (args.actNumber === 3 && actsCount >= 3)) {
        return null;
      }

      let summariesText = args.summariesText || '';
      if (!summariesText) {
        const summaries = await ctx.runQuery(internal.stories.internalQueries.getStorySummariesInternal, { storyId: args.storyId });
        if (summaries.length > 0) {
          summariesText = summaries.map((s: any) => {
            const keyEvents = s.summary.keyEvents?.length ? `\nKey Events:\n${s.summary.keyEvents.map((e: string) => `- ${e}`).join('\n')}` : '';
            return `Pages ${s.pageRange.start}-${s.pageRange.end}:\nPlot: ${s.summary.plot}\nCharacters: ${s.summary.characters}${keyEvents}`;
          }).join('\n\n');
        }
      }

      const actOutline: { acts: Array<{ title?: string; chapters: Array<{ title?: string; beats: string[] }>} > } = story.sessionId
        ? await ctx.runAction(api.actions.storyOutline.generateSingleActOutline, {
            sessionId: story.sessionId,
            actNumber: args.actNumber,
            storyPremise: story.suggestion.text,
            genre: story.suggestion.metadata.genre,
            storyType: story.suggestion.metadata.storyType,
            characterCount: story.suggestion.metadata.characterCount,
            playerMode: story.suggestion.metadata.playerMode,
            primarySource: story.suggestion.metadata.primarySource,
            mainCharacters: story.suggestion.characters.main_characters,
            sideCharacters: story.suggestion.characters.side_characters,
            previousOutlineText: args.previousOutlineText || (story.outline ? JSON.stringify(story.outline) : undefined),
            summariesText,
            recentPagesText: args.recentPagesText,
          })
        : await generateActOutlineInternal(ctx, {
            userId: story.userId,
            sessionId: story.sessionId,
            actNumber: args.actNumber,
            storyPremise: story.suggestion.text,
            genre: story.suggestion.metadata.genre,
            storyType: story.suggestion.metadata.storyType,
            characterCount: story.suggestion.metadata.characterCount,
            playerMode: story.suggestion.metadata.playerMode,
            primarySource: story.suggestion.metadata.primarySource,
            mainCharacters: story.suggestion.characters.main_characters,
            sideCharacters: story.suggestion.characters.side_characters,
            previousOutlineText: args.previousOutlineText || (story.outline ? JSON.stringify(story.outline) : undefined),
            summariesText,
            recentPagesText: args.recentPagesText,
          });

      const mergedOutline = {
        acts: [
          ...(story.outline?.acts || []),
          ...(actOutline.acts || []),
        ]
      };

      await ctx.runMutation(internal.stories.mutations.updateStoryOutline, {
        storyId: args.storyId,
        userId: story.userId,
        sessionId: story.sessionId,
        outline: mergedOutline,
        outlineStatus: "complete",
      });

      return null;
    } catch (e) {
      return null;
    }
  },
});