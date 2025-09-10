export interface Story {
  id: string
  title: string
  storyTitle?: string // For fanfiction
  description: string
  type: 'fanfiction' | 'inspired'
  tags: string[]
  characters: string[]
  inspiredBy?: string // For inspired stories
}

export interface PlaceholderStory {
  title: string
  description: string
  tags: string[]
}

export interface StorySuggestion {
  id: string
  text: string
  tags: string[]
  characters: {
    main_characters: string[]
    side_characters: string[]
  } // Characters involved in the story organized by role
  metadata: {
    characters: string[]
    sources: string[]
    primarySource: string
    genre: string
    storyType: string
    playerMode: boolean
    characterCount: string
  }
}