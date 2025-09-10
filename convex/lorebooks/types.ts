// SillyTavern World Info / Lorebook type definitions

export enum WorldInfoLogic {
  AND_ANY = 0,
  NOT_ALL = 1,
  NOT_ANY = 2,
  AND_ALL = 3,
}

export enum WorldInfoPosition {
  before = 0,
  after = 1,
  EMTop = 2,
  EMBottom = 3,
  ANTop = 4,
  ANBottom = 5,
  atDepth = 6,
}

export enum WorldInfoInsertionStrategy {
  evenly = 0,
  character_first = 1,
  global_first = 2,
}

// Single World Info Entry
export interface WorldInfoEntry {
  uid: number
  key: string[]
  keysecondary: string[]
  comment: string
  content: string
  constant: boolean
  vectorized: boolean
  selective: boolean
  selectiveLogic: WorldInfoLogic
  addMemo: boolean
  order: number
  position: WorldInfoPosition | number
  disable: boolean
  excludeRecursion: boolean
  preventRecursion: boolean
  delayUntilRecursion: number | boolean
  probability: number
  useProbability: boolean
  depth: number
  group: string
  groupOverride: boolean
  groupWeight: number
  scanDepth: number | null
  caseSensitive: boolean | null
  matchWholeWords: boolean | null
  useGroupScoring: boolean | null
  automationId: string
  role: number // extension_prompt_roles
  sticky: number | null
  cooldown: number | null
  delay: number | null
  displayIndex?: number
  // Character filters
  matchPersonaDescription?: boolean
  matchCharacterDescription?: boolean
  matchCharacterPersonality?: boolean
  matchCharacterDepthPrompt?: boolean
  matchScenario?: boolean
  matchCreatorNotes?: boolean
  characterFilter?: {
    isExclude: boolean
    names: string[]
    tags: string[]
  }
  triggers?: string[]
  // Extensions
  extensions?: any
}

// Native SillyTavern World Info format
export interface SillyTavernWorldInfo {
  entries: Record<string | number, WorldInfoEntry>
  // Optional global settings (may be added by ST)
  recursive?: boolean
  scan_depth?: number
  token_budget?: number
  recursion_depth?: number
  recursion_steps?: number
  min_activations?: number
  max_depth?: number
  insertion_strategy?: WorldInfoInsertionStrategy
  include_names?: boolean
  case_sensitive?: boolean
  match_whole_words?: boolean
  use_group_scoring?: boolean
  budget_cap?: number
}

// NovelAI Lorebook format
export interface NovelAILorebook {
  lorebookVersion: number
  entries: Array<{
    text: string
    contextConfig?: {
      budgetPriority?: number
      reservedTokens?: number
      insertionPosition?: number
      insertionType?: string
      maximumTrimType?: string
      prefix?: string
      suffix?: string
    }
    displayName?: string
    keys: string[]
    searchRange?: number
    enabled: boolean
    forceActivation?: boolean
    keyRelative?: boolean
    nonStoryActivatable?: boolean
    category?: string
    loreBiasGroups?: any[]
  }>
  settings?: {
    orderByKeyLocations?: boolean
  }
  categories?: any[]
}

// Agnai Memory Book format
export interface AgnaiMemoryBook {
  kind: 'memory'
  entries: Array<{
    name?: string
    entry: string
    keywords: string[]
    priority?: number
    weight?: number
    enabled: boolean
  }>
}

// Risu Lorebook format
export interface RisuLorebook {
  type: 'risu'
  data: Array<{
    key: string
    secondkey?: string
    comment: string
    content: string
    alwaysActive: boolean
    selective: boolean
    insertorder: number
    activationPercent?: number
  }>
}

// Validation result
export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  format?: 'sillytavern' | 'novelai' | 'agnai' | 'risu'
}

// Parsed lorebook data (normalized)
export interface ParsedLorebook {
  name: string
  description?: string
  entries: SillyTavernWorldInfo['entries']
  settings: {
    recursive: boolean
    scanDepth: number
    tokenBudget: number
    recursionDepth: number
    recursionSteps: number
    minActivations: number
    maxDepth: number
    insertionStrategy: string
    includeNames: boolean
    caseSensitive: boolean
    matchWholeWords: boolean
    useGroupScoring: boolean
    budgetCap: number
  }
  format: 'sillytavern' | 'novelai' | 'agnai' | 'risu'
  version?: string
  originalData: any
}

// Default values for world info entries
export const DEFAULT_ENTRY: Partial<WorldInfoEntry> = {
  key: [],
  keysecondary: [],
  comment: '',
  content: '',
  constant: false,
  vectorized: false,
  selective: true,
  selectiveLogic: WorldInfoLogic.AND_ANY,
  addMemo: false,
  order: 100,
  position: WorldInfoPosition.before,
  disable: false,
  excludeRecursion: false,
  preventRecursion: false,
  delayUntilRecursion: false,
  probability: 100,
  useProbability: true,
  depth: 4,
  group: '',
  groupOverride: false,
  groupWeight: 100,
  scanDepth: null,
  caseSensitive: null,
  matchWholeWords: null,
  useGroupScoring: null,
  automationId: '',
  role: 0, // system role
  sticky: null,
  cooldown: null,
  delay: null,
  matchPersonaDescription: false,
  matchCharacterDescription: false,
  matchCharacterPersonality: false,
  matchCharacterDepthPrompt: false,
  matchScenario: false,
  matchCreatorNotes: false,
  triggers: [],
}

// Default settings for lorebooks
export const DEFAULT_SETTINGS = {
  recursive: false,
  scanDepth: 2,
  tokenBudget: 2048,
  recursionDepth: 50,
  recursionSteps: 0,
  minActivations: 0,
  maxDepth: 1000,
  insertionStrategy: 'character_first',
  includeNames: true,
  caseSensitive: false,
  matchWholeWords: false,
  useGroupScoring: false,
  budgetCap: 0,
}