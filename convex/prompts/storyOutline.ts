import { 
  STORY_OUTLINE_SYSTEM_PROMPT,
  STORY_OUTLINE_GENERATION_TEMPLATE,
  STORY_SINGLE_ACT_OUTLINE_TEMPLATE 
} from "./templates/storyOutline";
import { renderTemplate, applyGoonMode } from "./templateRenderer";

interface StoryOutlineParams {
  storyPremise: string;
  genre: string;
  storyType: string;
  characterCount: string;
  playerMode: boolean;
  primarySource: string;
  mainCharacters: string[];
  sideCharacters: string[];
  characterLore?: Record<string, string>;
  worldLore?: string | null;
  goonMode?: boolean;
}

export function buildStoryOutlineSystemPrompt(): string {
  return STORY_OUTLINE_SYSTEM_PROMPT;
}

export function buildStoryOutlinePrompt({
  storyPremise,
  genre,
  storyType,
  characterCount,
  playerMode,
  primarySource,
  mainCharacters,
  sideCharacters,
  characterLore,
  worldLore,
  goonMode,
}: StoryOutlineParams): string {
  // Format character lore if available
  const characterLoreSection = characterLore && Object.keys(characterLore).length > 0
    ? Object.entries(characterLore)
        .map(([name, lore]) => `${name}: ${lore}`)
        .join('\n\n')
    : '';

  const prompt = renderTemplate(STORY_OUTLINE_GENERATION_TEMPLATE, {
    storyPremise,
    genre,
    storyType,
    characterCount,
    playerMode: playerMode ? 'Player-driven (interactive choices)' : 'Reader experience (guided narrative)',
    primarySource,
    mainCharacters: mainCharacters.join(', '),
    sideCharacters: sideCharacters.join(', '),
    characterLore: characterLoreSection || null,
    worldLore: worldLore || null,
  });
  
  return applyGoonMode(prompt, goonMode);
}

interface SingleActOutlineParams extends StoryOutlineParams {
  actNumber: 1 | 2 | 3;
  previousOutlineText?: string | null;
  summariesText?: string | null;
  recentPagesText?: string | null;
}

export function buildSingleActOutlinePrompt({
  actNumber,
  storyPremise,
  genre,
  storyType,
  characterCount,
  playerMode,
  primarySource,
  mainCharacters,
  sideCharacters,
  characterLore,
  worldLore,
  previousOutlineText,
  summariesText,
  recentPagesText,
  goonMode,
}: SingleActOutlineParams): string {
  const characterLoreSection = characterLore && Object.keys(characterLore).length > 0
    ? Object.entries(characterLore)
        .map(([name, lore]) => `${name}: ${lore}`)
        .join('\n\n')
    : '';

  const prompt = renderTemplate(STORY_SINGLE_ACT_OUTLINE_TEMPLATE, {
    actNumber,
    storyPremise,
    genre,
    storyType,
    characterCount,
    playerMode: playerMode ? 'Player-driven (interactive choices)' : 'Reader experience (guided narrative)',
    primarySource,
    mainCharacters: mainCharacters.join(', '),
    sideCharacters: sideCharacters.join(', '),
    characterLore: characterLoreSection || null,
    worldLore: worldLore || null,
    previousOutlineText: previousOutlineText || null,
    summariesText: summariesText || null,
    recentPagesText: recentPagesText || null,
  });

  return applyGoonMode(prompt, goonMode);
}