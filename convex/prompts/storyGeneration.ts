  import { 
  STORY_GENERATION_SYSTEM_PROMPT,
  STORY_FIRST_PAGE_SYSTEM_PROMPT,
  STORY_PROMPT_TEMPLATE,
  STORY_FIRST_PAGE_TEMPLATE 
} from "./templates/storyGeneration";
import { renderTemplate, applyGoonMode } from "./templateRenderer";

interface StoryPromptParams {
  storySuggestion: {
    id: string;
    text: string;
    characters: string[];
    metadata: {
      primarySource?: string;
      genre?: string;
      storyType?: string;
      goonMode?: boolean;
    };
  };
  playerName: string;
  selectedCharacters: string[];
  characterLore?: Record<string, string>;
  worldLore?: string | null;
  goonMode?: boolean;
}

interface Outline {
  acts: Array<{
    title?: string;
    chapters: Array<{
      title?: string;
      beats: string[];
    }>;
  }>;
}

export function buildStoryGenerationSystemPrompt(): string {
  return STORY_GENERATION_SYSTEM_PROMPT;
}

export function buildFirstPageSystemPrompt(): string {
  return STORY_FIRST_PAGE_SYSTEM_PROMPT;
}

export function buildStoryGenerationPrompt({
  storySuggestion,
  playerName,
  selectedCharacters,
  goonMode,
}: StoryPromptParams): string {
  const prompt = renderTemplate(STORY_PROMPT_TEMPLATE, {
    storyText: storySuggestion.text,
    playerName,
    selectedCharacters: selectedCharacters.join(", "),
    genre: storySuggestion.metadata.genre || "General fiction",
    source: storySuggestion.metadata.primarySource || "Original",
  });
  
  return applyGoonMode(
    prompt,
    goonMode || ((storySuggestion.metadata.genre || '').toLowerCase() === 'goon-mode')
  );
}

// Helper to convert outline to readable text
function stringifyOutline(outline: Outline): string {
  const lines: string[] = [];
  
  outline.acts.forEach((act, actIndex) => {
    lines.push(`ACT ${actIndex + 1}: ${act.title || `Act ${actIndex + 1}`}`);
    
    act.chapters.forEach((chapter, chapterIndex) => {
      lines.push(`  Chapter ${chapterIndex + 1}: ${chapter.title || `Chapter ${chapterIndex + 1}`}`);
      
      chapter.beats.forEach((beat, beatIndex) => {
        lines.push(`    - Beat ${beatIndex + 1}: ${beat}`);
      });
    });
    
    lines.push(''); // Empty line between acts
  });
  
  return lines.join('\n').trim();
}

export function buildFirstPagePrompt({
  storySuggestion,
  playerName,
  selectedCharacters,
  outline,
  characterLore = {},
  worldLore = null,
  goonMode,
}: StoryPromptParams & { outline: Outline }): string {
  const actOne = outline?.acts?.[0];
  const chapterOne = actOne?.chapters?.[0];
  
  // Format character lore if available
  const characterLoreText = Object.keys(characterLore).length > 0
    ? Object.entries(characterLore)
        .map(([name, lore]) => `${name}: ${lore}`)
        .join('\n')
    : null;
  
  // Determine if this is fanfiction or inspired story
  const isFanfiction = storySuggestion.metadata.storyType === 'fanfiction';
  
  const prompt = renderTemplate(STORY_FIRST_PAGE_TEMPLATE, {
    storyText: storySuggestion.text,
    playerName,
    selectedCharacters: selectedCharacters.join(", "),
    genre: storySuggestion.metadata.genre || "General fiction",
    source: storySuggestion.metadata.primarySource || "Original",
    storyType: storySuggestion.metadata.storyType || "fanfiction",
    isFanfiction: isFanfiction,
    isInspired: !isFanfiction,
    outlineText: outline ? stringifyOutline(outline) : 'Act I outline unavailable.',
    beats: chapterOne?.beats ? chapterOne.beats.map((beat, i) => `${i + 1}. ${beat}`).join('\n') : '1. Begin the story based on the premise and characters.',
    characterLore: characterLoreText,
    worldLore: worldLore,
  });

  return applyGoonMode(
    prompt,
    goonMode || ((storySuggestion.metadata.genre || '').toLowerCase() === 'goon-mode')
  );
}

// Keep the old function name for backward compatibility
export const generateStoryPrompt = buildStoryGenerationPrompt; 