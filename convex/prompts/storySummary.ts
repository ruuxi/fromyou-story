import { 
  STORY_SUMMARY_SYSTEM_PROMPT,
  STORY_SUMMARY_GENERATION_TEMPLATE 
} from "./templates/storySummary";
import { renderTemplate, applyGoonMode } from "./templateRenderer";

interface StorySummaryParams {
  genre: string;
  primarySource: string;
  mainCharacters: string[];
  pageStart: number;
  pageEnd: number;
  storyContent: string;
  goonMode?: boolean;
}

export function buildStorySummarySystemPrompt(): string {
  return STORY_SUMMARY_SYSTEM_PROMPT;
}

export function buildStorySummaryPrompt({
  genre,
  primarySource,
  mainCharacters,
  pageStart,
  pageEnd,
  storyContent,
  goonMode,
}: StorySummaryParams): string {
  const prompt = renderTemplate(STORY_SUMMARY_GENERATION_TEMPLATE, {
    genre,
    primarySource,
    mainCharacters: mainCharacters.join(', '),
    pageStart: pageStart.toString(),
    pageEnd: pageEnd.toString(),
    storyContent,
  });
  
  return applyGoonMode(prompt, goonMode);
}