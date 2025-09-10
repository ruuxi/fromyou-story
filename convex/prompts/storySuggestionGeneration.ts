import { 
  GENRE_MODIFIERS, 
  FANFICTION_TEMPLATE,
  INSPIRED_TEMPLATE
} from "./templates/storySuggestionGeneration";
import { renderTemplate, applyGoonMode } from "./templateRenderer";

export type Genre = keyof typeof GENRE_MODIFIERS;

interface CharacterInfo {
  name: string;
  source: string;
}

interface StoryPromptParams {
  playerMode: boolean;
  playerName?: string;
  mainCharacter: CharacterInfo;
  additionalCharacters: CharacterInfo[];
  characterSlots: number;
  genre: Genre;
  storyType: "fanfiction" | "inspired" | "custom";
  characterDynamics: "solo" | "one-on-one" | "group";
  selectedTags?: string[];
  searchRule?: string;
  goonMode?: boolean;
}

export function buildStorySuggestionGenerationPrompt({
  playerMode,
  playerName = 'Hero',
  mainCharacter,
  additionalCharacters,
  characterSlots,
  genre,
  storyType,
  characterDynamics,
  selectedTags,
  searchRule,
  goonMode,
}: StoryPromptParams): string {
  // Calculate character configuration flags
  const hasCharacterSlots = characterSlots > 0;
  const hasAdditionalCharacters = characterSlots > 1 && additionalCharacters.length > 0;
  const needsAdditionalCharacters = characterSlots > 1 && additionalCharacters.length === 0;
  const additionalCharacterCount = characterSlots - 1;
  const additionalCharactersList = hasAdditionalCharacters 
    ? additionalCharacters.slice(0, characterSlots - 1).map(c => c.name).join(", ")
    : "";

  // Calculate character dynamics flags
  const isSoloCharacter = characterDynamics === "solo";
  const isOneOnOneCharacter = characterDynamics === "one-on-one";
  const isGroupCharacter = characterDynamics === "group";

  // Get genre modifier
  const genreModifier = GENRE_MODIFIERS[genre];

  // Select template based on story type
  // Use INSPIRED_TEMPLATE for both 'inspired' and 'custom' story types
  const template = storyType === 'fanfiction' ? FANFICTION_TEMPLATE : INSPIRED_TEMPLATE;

  const prompt = renderTemplate(template, {
    playerMode,
    playerName,
    hasCharacterSlots,
    hasAdditionalCharacters,
    needsAdditionalCharacters,
    additionalCharacterCount,
    additionalCharactersList,
    mainCharacterName: mainCharacter.name,
    mainCharacterSource: mainCharacter.source,
    genre,
    genreModifier,
    storyType,
    isSoloCharacter,
    isOneOnOneCharacter,
    isGroupCharacter,
    selectedTags,
    searchRule,
    hasSelectedTags: selectedTags && selectedTags.length > 0,
    selectedTagsList: selectedTags ? selectedTags.join(", ") : "",
    
  });
  
  return applyGoonMode(prompt, goonMode);
}