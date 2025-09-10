export type PresetType = 
  | 'openai'
  | 'textgen' 
  | 'kobold'
  | 'novelai'
  | 'instruct'
  | 'context'
  | 'sysprompt'
  | 'reasoning'

export interface SillyTavernPreset {
  [key: string]: any
}

export interface ParsedPrompt {
  identifier: string
  name: string
  content: string
  role?: string
  enabled: boolean
  systemPrompt?: boolean
  marker?: boolean
}

export interface ParsedPromptOrder {
  characterId?: number
  order: Array<{
    identifier: string
    enabled: boolean
  }>
}

export interface InstructTemplate {
  inputSequence?: string
  outputSequence?: string
  systemSequence?: string
  stopSequence?: string
  wrapStyle?: string
  macroInDisable?: boolean
}

export interface SamplingSettings {
  topA?: number
  minP?: number
  tfs?: number
  typical?: number
  mirostatMode?: number
  mirostatTau?: number
  mirostatEta?: number
  repetitionPenalty?: number
  repetitionPenaltyRange?: number
  samplerOrder?: number[]
  samplerPriority?: string[]
}

export interface ContextTemplate {
  storyString?: string
  chatStart?: string
  exampleSeparator?: string
  chatSeparator?: string
}

export interface ParsedPresetSettings {
  // Common settings
  temperature?: number
  maxTokens?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  
  // Prompts and templates
  systemPrompt?: string
  prompts?: ParsedPrompt[]
  promptOrder?: ParsedPromptOrder[]
  
  // Instruct mode
  instructTemplate?: InstructTemplate
  
  // Advanced sampling
  samplingSettings?: SamplingSettings
  
  // Context template
  contextTemplate?: ContextTemplate
}

export interface ImportedPreset {
  _id: string
  userId?: string
  sessionId?: string
  name: string
  presetType: PresetType
  originalData: SillyTavernPreset
  parsedSettings: ParsedPresetSettings
  isActive: boolean
  importedAt: number
  lastUsed?: number
}

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  detectedType?: PresetType
}

export interface PresetCompatibilityInfo {
  supportedFeatures: string[]
  unsupportedFeatures: string[]
  recommendedModifications: string[]
}

// Mapping types for fromyou2 compatibility
export interface ModelParameters {
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stopSequences?: string[]
}

export interface PromptContext {
  systemPrompt?: string
  userContext?: string
  characterContext?: string
  instructionContext?: string
  formatInstructions?: string
}

export interface MacroContext {
  userName?: string
  playerName?: string
  characterName?: string
  activeChar?: string
  time?: string
  date?: string
  [key: string]: string | undefined
}