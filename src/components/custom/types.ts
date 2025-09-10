import { Id } from '../../../convex/_generated/dataModel'

export type TabType = 'characters' | 'worldLore' | 'storyStarter'

export interface CustomCharacter {
  _id: Id<'customCharacters'>
  _creationTime: number
  fullName: string
  gender: string
  characterLore?: string
  isActive: boolean
  updatedAt: number
}

export interface CustomWorldLore {
  _id: Id<'customWorldLore'>
  _creationTime: number
  title: string
  lore: string
  isActive: boolean
  updatedAt: number
}

export interface CustomStorySuggestion {
  _id: Id<'customStorySuggestions'>
  _creationTime: number
  text: string
  characters: {
    main_characters: string[]
    side_characters: string[]
  }
  metadata: {
    characters: string[]
    sources: string[]
    primarySource: string
    genre: string
    storyType: string
    playerMode: boolean
    characterCount: string
  }
  isActive: boolean
}