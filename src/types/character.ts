export interface Character {
  fullName: string
  gender: string
  source: string
}

export type CharacterSearchResult = Character

export interface CharacterSuggestions {
  sourceCharacters: Character[]
  similarCharacters: Character[]
  hasMoreSource: boolean
  hasMoreSimilar: boolean
}