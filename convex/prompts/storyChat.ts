import { 
  STORY_CHAT_SYSTEM_PROMPT,
  STORY_CHAT_INITIAL_TEMPLATE,
  STORY_CHAT_CONTINUATION_TEMPLATE 
} from "./templates/storyChat";
import { renderTemplate } from "./templateRenderer";

interface StoryChatPromptParams {
  story: {
    suggestion: {
      text: string;
      characters: {
        main_characters: string[];
        side_characters: string[];
      };
      metadata: {
        primarySource?: string;
        genre?: string;
        storyType?: string;
        playerMode?: boolean;
        characterCount?: string;
        pov?: string;
      };
    };
    playerName?: string;
    selectedCharacters: string[];
  };
  messages: any[];
  isInitialGeneration: boolean;
  characterLore: Record<string, string>;
  worldLore: string | null;
  summaries?: any[];
  currentOutline?: any;
  currentChapter?: number;
  currentAct?: number;
}

export function buildStoryChatSystemPrompt(): string {
  return STORY_CHAT_SYSTEM_PROMPT;
}

export function buildStoryChatPrompt({
  story,
  messages,
  isInitialGeneration,
  characterLore,
  worldLore,
  summaries = [],
  currentOutline,
  currentChapter,
  currentAct,
}: StoryChatPromptParams): string {
  const { suggestion, playerName, selectedCharacters } = story;
  const { metadata } = suggestion;
  
  if (isInitialGeneration) {
    // Prepare character lore section
    const characterLoreSection = Object.keys(characterLore).length > 0
      ? `CHARACTER LORE:
${Object.entries(characterLore)
  .map(([name, lore]) => `${name}: ${lore}`)
  .join('\n\n')}`
      : '';

    // Prepare world lore section
    const worldLoreSection = worldLore
      ? `WORLD LORE:
${worldLore}`
      : '';

    return renderTemplate(STORY_CHAT_INITIAL_TEMPLATE, {
      suggestionText: suggestion.text,
      pov: metadata.pov || 'third person',
      mode: metadata.playerMode ? 'Player-driven (user makes choices)' : 'Reader experience (guided narrative)',
      genre: metadata.genre || 'general fiction',
      characterCount: metadata.characterCount || 'multiple characters',
      storyType: metadata.storyType || 'fanfiction',
      primarySource: metadata.primarySource || 'original',
      playerName: playerName || 'Player',
      mainCharacters: suggestion.characters.main_characters.join(', '),
      sideCharacters: suggestion.characters.side_characters.join(', '),
      selectedCharacters: selectedCharacters.join(', '),
      characterLoreSection: characterLoreSection || '',
      worldLoreSection: worldLoreSection || '',
    });
  } else {
    // Continuation prompt
    const lastUserMessage = messages[messages.length - 1];
    const userInstruction = lastUserMessage?.parts?.find((p: any) => p.type === 'text')?.text || 'Continue the story.';
    const userSelectedAction = !!(lastUserMessage?.metadata && (lastUserMessage.metadata as any).actionId);
    
    // Get the last few messages for context (limit to avoid token overflow)
    const recentMessages = messages.slice(-6); // Last 6 messages for context
    const contextSection = recentMessages.length > 0
      ? `RECENT STORY CONTEXT:
${recentMessages
  .map((msg: any, index: number) => {
    const role = msg.role === 'user' ? 'USER DIRECTION' : 'STORY';
    const text = msg.parts?.find((p: any) => p.type === 'text')?.text || '';
    return `${role}: ${text}`;
  })
  .join('\n\n')}`
      : '';

    const characterLoreSection = Object.keys(characterLore).length > 0
      ? `CHARACTER LORE (maintain consistency):
${Object.entries(characterLore)
  .map(([name, lore]) => `${name}: ${lore}`)
  .join('\n\n')}`
      : '';

    // Add story summaries if available
    const summariesSection = summaries.length > 0
      ? `STORY SUMMARY (previous events):
${summaries.map((summary: any) => {
  const pageInfo = `Pages ${summary.pageRange.start}-${summary.pageRange.end}:`;
  const plot = `Plot: ${summary.summary.plot}`;
  const events = summary.summary.keyEvents.length > 0 
    ? `Key Events:\n${summary.summary.keyEvents.map((e: string) => `- ${e}`).join('\n')}`
    : '';
  return `${pageInfo}\n${plot}\n${events}`;
}).join('\n\n')}`
      : '';

    // Add current story position if outline is available
    let storyPositionSection = '';
    if (currentOutline && currentChapter && currentAct) {
      const currentActData = currentOutline.acts[currentAct - 1];
      const currentChapterData = currentActData?.chapters[currentChapter - 1];
      
      if (currentActData && currentChapterData) {
        const actTitle = currentActData.title || `Act ${currentAct}`;
        const chapterTitle = currentChapterData.title || `Chapter ${currentChapter}`;
        
        storyPositionSection = `CURRENT STORY POSITION:
Act ${currentAct}: ${actTitle}
Chapter ${currentChapter}: ${chapterTitle}

${userSelectedAction ? 'OUTLINE BEATS (reference only; IGNORE if they conflict with the user\'s command):' : 'UPCOMING STORY BEATS (guide but do not force):'}
${currentChapterData.beats.map((beat: string) => `- ${beat}`).join('\n')}`;
      }
    }

    return renderTemplate(STORY_CHAT_CONTINUATION_TEMPLATE, {
      suggestionText: suggestion.text,
      mainCharacters: suggestion.characters.main_characters.join(', '),
      sideCharacters: suggestion.characters.side_characters.join(', '),
      selectedCharacters: selectedCharacters.join(', '),
      contextSection: contextSection || '',
      userInstruction,
      pov: metadata.pov || 'third person',
      mode: metadata.playerMode ? 'Player-driven' : 'Reader experience',
      genre: metadata.genre || 'general fiction',
      primarySource: metadata.primarySource || 'original',
      characterLoreSection: characterLoreSection || '',
      summariesSection: summariesSection || '',
      storyPositionSection: storyPositionSection || '',
    });
  }
}

// Keep the old function name for backward compatibility
export const generateStoryChatPrompt = buildStoryChatPrompt; 