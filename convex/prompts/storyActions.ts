import { renderTemplate, applyGoonMode } from './templateRenderer';
import { STORY_ACTIONS_PROMPT_TEMPLATE } from './templates/storyActions';

export interface StoryActionPromptArgs {
  currentPage: string;
  genre: string;
  pov: string;
  playerName: string;
  characters: string[];
  goonMode?: boolean;
}

export function buildStoryActionsPrompt(args: StoryActionPromptArgs): string {
  const prompt = renderTemplate(STORY_ACTIONS_PROMPT_TEMPLATE, {
    currentPage: args.currentPage,
    genre: args.genre,
    pov: args.pov,
    playerName: args.playerName,
    characters: args.characters.join(', ')
  });
  
  return applyGoonMode(prompt, args.goonMode);
}

export { STORY_ACTIONS_SYSTEM_PROMPT } from './templates/storyActions';