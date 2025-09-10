import { renderTemplate } from './templateRenderer';
import { SEARCH_SUGGESTION_TEMPLATE } from './templates/storySearchSuggestions';

interface CharacterLite { fullName: string; source: string }

export interface SearchSuggestionPromptArgs {
  genre: string;
  storyType: string;
  playerMode: boolean;
  playerName?: string;
  characterCount: 'solo' | 'one-on-one' | 'group';
  mainCharacter: CharacterLite;
  additionalCharacters: CharacterLite[];
  searchQuery: string;
}

export function buildSearchSuggestionPrompt(args: SearchSuggestionPromptArgs): string {
  const { genre, storyType, playerMode, playerName, characterCount, mainCharacter, additionalCharacters, searchQuery } = args;
  const charactersList = [mainCharacter, ...additionalCharacters]
    .map(c => `- ${c.fullName} from ${c.source}`)
    .join('\n');

  const inclusionRulesLines: string[] = [
    `Primary focus: ${mainCharacter.fullName}`,
  ];
  if (additionalCharacters.length > 0) {
    inclusionRulesLines.push(`Include ALL of the following with ${mainCharacter.fullName}: ${additionalCharacters.map(c => c.fullName).join(', ')}`);
    if (characterCount === 'one-on-one') {
      inclusionRulesLines.push(`Treat ${mainCharacter.fullName} and ${additionalCharacters[0].fullName} as co-leads for a one-on-one dynamic.`);
    } else {
      inclusionRulesLines.push(`Treat additional characters as supporting roles that clearly appear with ${mainCharacter.fullName}.`);
    }
  }
  inclusionRulesLines.push('Do NOT introduce any unlisted canon characters by name.');
  const inclusionRules = inclusionRulesLines.join('\n');

  return renderTemplate(SEARCH_SUGGESTION_TEMPLATE, {
    genre,
    storyType,
    playerMode, // boolean for conditional blocks
    playerModeLabel: playerMode ? 'Yes' : 'No',
    playerName,
    characterCount,
    charactersList,
    inclusionRules,
    searchQuery,
  });
}


