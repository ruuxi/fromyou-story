import { SillyTavernPreset, ParsedPresetSettings, PresetType } from './types'

export interface SillyTavernOpenAIPreset {
  temperature?: number
  openai_max_tokens?: number
  top_p?: number
  top_k?: number
  frequency_penalty?: number
  presence_penalty?: number
  prompts?: Array<{
    identifier: string
    name: string
    content: string
    role?: string
    system_prompt?: boolean
    marker?: boolean
  }>
  prompt_order?: Array<{
    character_id?: number
    order: Array<{
      identifier: string
      enabled: boolean
    }>
  }>
  [key: string]: any
}

export interface SillyTavernTextGenPreset {
  temp?: number
  temperature?: number
  top_p?: number
  top_k?: number
  top_a?: number
  min_p?: number
  tfs?: number
  typical_p?: number
  mirostat_mode?: number
  mirostat_tau?: number
  mirostat_eta?: number
  rep_pen?: number
  repetition_penalty?: number
  rep_pen_range?: number
  sampler_order?: number[]
  sampler_priority?: string[]
  max_length?: number
  [key: string]: any
}

export interface SillyTavernInstructPreset {
  name?: string
  input_sequence?: string
  output_sequence?: string
  system_sequence?: string
  stop_sequence?: string
  wrap?: boolean
  macro_in_disable?: boolean
  [key: string]: any
}

export interface SillyTavernContextPreset {
  name?: string
  story_string?: string
  chat_start?: string
  example_separator?: string
  chat_separator?: string
  [key: string]: any
}

export interface SillyTavernSystemPromptPreset {
  name?: string
  content?: string
  [key: string]: any
}

/**
 * Determines preset type from the JSON data structure
 */
export function detectPresetType(data: any): PresetType | null {
  if (!data || typeof data !== 'object') return null

  // OpenAI preset detection
  if (data.chat_completion_source || data.openai_model || data.prompts || data.temperature !== undefined) {
    return 'openai'
  }

  // TextGen preset detection
  if (data.temp !== undefined || data.top_p !== undefined || data.sampler_order !== undefined) {
    return 'textgen'
  }

  // Instruct preset detection
  if (data.input_sequence !== undefined || data.output_sequence !== undefined) {
    return 'instruct'
  }

  // Context preset detection
  if (data.story_string !== undefined) {
    return 'context'
  }

  // System prompt detection
  if (data.content !== undefined && data.name !== undefined) {
    return 'sysprompt'
  }

  // KoboldAI detection (similar to TextGen but with different fields)
  if (data.amount_gen !== undefined || data.max_length !== undefined) {
    return 'kobold'
  }

  return null
}

/**
 * Parse OpenAI preset format
 */
export function parseOpenAIPreset(data: SillyTavernOpenAIPreset): ParsedPresetSettings {
  const settings: ParsedPresetSettings = {
    temperature: data.temperature,
    maxTokens: data.openai_max_tokens,
    topP: data.top_p,
    topK: data.top_k,
    frequencyPenalty: data.frequency_penalty,
    presencePenalty: data.presence_penalty,
  }

  // Parse prompts if available
  if (data.prompts && Array.isArray(data.prompts)) {
    settings.prompts = data.prompts.map(prompt => ({
      identifier: prompt.identifier || '',
      name: prompt.name || '',
      content: prompt.marker ? '' : (prompt.content || ''), // Marker prompts have empty content
      role: prompt.role,
      enabled: true, // Default to enabled
      systemPrompt: prompt.system_prompt,
      marker: prompt.marker || false,
    }))
  }

  // Parse prompt order if available
  if (data.prompt_order && Array.isArray(data.prompt_order)) {
    settings.promptOrder = data.prompt_order.map(order => ({
      characterId: typeof order.character_id === 'string' ? parseInt(order.character_id, 10) : order.character_id,
      order: order.order || [],
    }))
  }

  // Extract system prompt from main prompt or specific field
  if (data.system_prompt) {
    settings.systemPrompt = data.system_prompt
  } else if (settings.prompts) {
    const mainPrompt = settings.prompts.find(p => p.identifier === 'main')
    if (mainPrompt) {
      settings.systemPrompt = mainPrompt.content
    }
  }

  return settings
}

/**
 * Parse TextGen preset format
 */
export function parseTextGenPreset(data: SillyTavernTextGenPreset): ParsedPresetSettings {
  const settings: ParsedPresetSettings = {
    temperature: data.temp || data.temperature,
    maxTokens: data.max_length,
    topP: data.top_p,
    topK: data.top_k,
  }

  // Advanced sampling settings
  settings.samplingSettings = {
    topA: data.top_a,
    minP: data.min_p,
    tfs: data.tfs,
    typical: data.typical_p,
    mirostatMode: data.mirostat_mode,
    mirostatTau: data.mirostat_tau,
    mirostatEta: data.mirostat_eta,
    repetitionPenalty: data.rep_pen || data.repetition_penalty,
    repetitionPenaltyRange: data.rep_pen_range,
    samplerOrder: data.sampler_order,
    samplerPriority: data.sampler_priority,
  }

  return settings
}

/**
 * Parse Instruct preset format
 */
export function parseInstructPreset(data: SillyTavernInstructPreset): ParsedPresetSettings {
  const settings: ParsedPresetSettings = {}

  settings.instructTemplate = {
    inputSequence: data.input_sequence,
    outputSequence: data.output_sequence,
    systemSequence: data.system_sequence,
    stopSequence: data.stop_sequence,
    wrapStyle: data.wrap ? 'wrapped' : 'none',
    macroInDisable: data.macro_in_disable,
  }

  return settings
}

/**
 * Parse Context preset format
 */
export function parseContextPreset(data: SillyTavernContextPreset): ParsedPresetSettings {
  const settings: ParsedPresetSettings = {}

  settings.contextTemplate = {
    storyString: data.story_string,
    chatStart: data.chat_start,
    exampleSeparator: data.example_separator,
    chatSeparator: data.chat_separator,
  }

  return settings
}

/**
 * Parse System Prompt preset format
 */
export function parseSystemPromptPreset(data: SillyTavernSystemPromptPreset): ParsedPresetSettings {
  return {
    systemPrompt: data.content,
  }
}

/**
 * Main parser function that handles all preset types
 */
export function parsePreset(data: any): { type: PresetType; settings: ParsedPresetSettings } | null {
  const type = detectPresetType(data)
  if (!type) return null

  let settings: ParsedPresetSettings

  switch (type) {
    case 'openai':
      settings = parseOpenAIPreset(data)
      break
    case 'textgen':
    case 'kobold': // KoboldAI uses similar format to TextGen
      settings = parseTextGenPreset(data)
      break
    case 'instruct':
      settings = parseInstructPreset(data)
      break
    case 'context':
      settings = parseContextPreset(data)
      break
    case 'sysprompt':
      settings = parseSystemPromptPreset(data)
      break
    default:
      return null
  }

  return { type, settings }
}

/**
 * Extract preset name from data, with fallback strategies
 */
export function extractPresetName(data: any): string {
  if (typeof data?.name === 'string') {
    return data.name
  }
  
  // Try to extract from filename-like fields
  if (typeof data?.filename === 'string') {
    return data.filename.replace(/\.(json|txt)$/i, '')
  }
  
  // Generate unique name based on preset type and timestamp
  const type = detectPresetType(data)
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  
  if (type) {
    return `${type.charAt(0).toUpperCase() + type.slice(1)} Preset - ${timestamp}`
  }
  
  return `Imported Preset - ${timestamp}`
}