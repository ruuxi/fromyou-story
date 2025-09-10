import { 
  CHARACTER_SEARCH_TEMPLATE,
  SAME_SOURCE_SUGGESTIONS_TEMPLATE,
  SIMILAR_CHARACTER_SUGGESTIONS_TEMPLATE 
} from "./templates/characterSearch";
import { renderTemplate, applyGoonMode } from "./templateRenderer";

export function buildCharacterSearchPrompt(query: string, goonMode?: boolean): string {
  const prompt = renderTemplate(CHARACTER_SEARCH_TEMPLATE, { query });
  return applyGoonMode(prompt, goonMode);
}

interface SameSourceParams {
  source: string;
  selectedCharacter: string;
  excludeList: string;
  goonMode?: boolean;
}

export function buildSameSourceSuggestionsPrompt({
  source,
  selectedCharacter,
  excludeList,
  goonMode,
}: SameSourceParams): string {
  const prompt = renderTemplate(SAME_SOURCE_SUGGESTIONS_TEMPLATE, {
    source,
    selectedCharacter,
    excludeList,
  });
  
  return applyGoonMode(prompt, goonMode);
}

interface SimilarCharacterParams {
  characterName: string;
  source: string;
  excludeList: string;
  goonMode?: boolean;
}

export function buildSimilarCharacterSuggestionsPrompt({
  characterName,
  source,
  excludeList,
  goonMode,
}: SimilarCharacterParams): string {
  const prompt = renderTemplate(SIMILAR_CHARACTER_SUGGESTIONS_TEMPLATE, {
    characterName,
    source,
    excludeList,
  });
  
  return applyGoonMode(prompt, goonMode);
}