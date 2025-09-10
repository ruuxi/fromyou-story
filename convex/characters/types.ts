// Character card format types based on SillyTavern specifications

export type CharacterCardSpec = 'chara_card_v1' | 'chara_card_v2' | 'chara_card_v3'

// V1 Character Card Format
export interface CharacterCardV1 {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  creatorcomment?: string
  avatar?: string
  chat?: string
  talkativeness?: number
  fav?: boolean
  tags?: string[]
  creator?: string
}

// V2/V3 Character Card Format
export interface CharacterCardV2 {
  spec: 'chara_card_v2'
  spec_version: '2.0'
  data: CharacterCardV2Data
}

export interface CharacterCardV3 {
  spec: 'chara_card_v3'
  spec_version: '3.0'
  name?: string
  description?: string
  personality?: string
  scenario?: string
  first_mes?: string
  mes_example?: string
  creatorcomment?: string
  avatar?: string
  chat?: string
  talkativeness?: number
  fav?: boolean
  tags?: string[]
  data: CharacterCardV3Data
}

export interface CharacterCardV2Data {
  name: string
  description: string
  personality: string
  scenario: string
  first_mes: string
  mes_example: string
  creator_notes: string
  system_prompt?: string
  post_history_instructions?: string
  tags?: string[]
  creator?: string
  character_version?: string
  alternate_greetings?: string[]
  character_book?: CharacterBook
  extensions?: Record<string, any>
}

export interface CharacterCardV3Data extends CharacterCardV2Data {
  group_only_greetings?: string[]
}

// Character Book (World Info/Lorebook)
export interface CharacterBook {
  name?: string
  description?: string
  scan_depth?: number
  token_budget?: number
  recursive_scanning?: boolean
  extensions?: Record<string, any>
  entries: CharacterBookEntry[]
}

export interface CharacterBookEntry {
  keys: string[]
  content: string
  extensions?: Record<string, any>
  enabled: boolean
  insertion_order: number
  case_sensitive?: boolean
  name?: string
  priority?: number
  id?: number
  comment?: string
  selective?: boolean
  secondary_keys?: string[]
  constant?: boolean
  position?: 'before_char' | 'after_char'
}

// Parsed character data for storage
export interface ParsedCharacterCard {
  name: string
  description: string
  personality: string
  scenario: string
  firstMessage: string
  messageExample: string
  creatorNotes?: string
  systemPrompt?: string
  postHistoryInstructions?: string
  alternateGreetings?: string[]
  tags?: string[]
  creator?: string
  characterVersion?: string
  avatar?: string
  spec: CharacterCardSpec
  specVersion: string
  characterBook?: CharacterBook
  extensions?: Record<string, any>
  originalData: any
}

// Validation result
export interface CharacterValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  detectedSpec?: CharacterCardSpec
}

// PNG metadata chunk types
export interface PNGTextChunk {
  keyword: string
  text: string
}

export type SillyTavernCharacterCard = CharacterCardV1 | CharacterCardV2 | CharacterCardV3