export type StoryStructure = 'player' | 'reader'
export type SaveStatus = 'idle' | 'saving' | 'saved'
export type CharactersPerStory = 'solo' | 'one-on-one' | 'group'

export interface GenreOption {
  value: string
  label: string
  icon: string
}

export interface POVOption {
  value: string
  label: string
  description: string
}

export interface CharactersPerStoryOption {
  value: CharactersPerStory
  label: string
  description: string
  icon: string
}