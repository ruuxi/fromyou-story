import { ValidationResult, PresetType, SillyTavernPreset } from './types'
import { detectPresetType } from './parser'

/**
 * Validate a SillyTavern preset JSON structure
 */
export function validatePreset(data: any): ValidationResult {
  const result: ValidationResult = {
    isValid: false,
    errors: [],
    warnings: [],
  }

  // Basic structure validation
  if (!data || typeof data !== 'object') {
    result.errors.push('Invalid JSON structure - expected an object')
    return result
  }

  // Detect preset type
  const detectedType = detectPresetType(data)
  if (!detectedType) {
    result.errors.push('Unable to detect preset type - may be an unsupported format')
    return result
  }

  result.detectedType = detectedType

  // Type-specific validation
  switch (detectedType) {
    case 'openai':
      validateOpenAIPreset(data, result)
      break
    case 'textgen':
    case 'kobold':
      validateTextGenPreset(data, result)
      break
    case 'instruct':
      validateInstructPreset(data, result)
      break
    case 'context':
      validateContextPreset(data, result)
      break
    case 'sysprompt':
      validateSystemPromptPreset(data, result)
      break
    default:
      result.warnings.push(`Preset type '${detectedType}' has limited validation support`)
  }

  // Mark as valid if no errors
  result.isValid = result.errors.length === 0

  return result
}

/**
 * Validate OpenAI preset structure
 */
function validateOpenAIPreset(data: any, result: ValidationResult): void {
  // Check for temperature range
  if (typeof data.temperature === 'number') {
    if (data.temperature < 0 || data.temperature > 2) {
      result.warnings.push('Temperature should be between 0 and 2')
    }
  }

  // Check token limits
  if (typeof data.openai_max_tokens === 'number') {
    if (data.openai_max_tokens < 1 || data.openai_max_tokens > 32000) {
      result.warnings.push('Max tokens should be between 1 and 32000')
    }
  }

  // Validate prompts array structure
  if (data.prompts && Array.isArray(data.prompts)) {
    data.prompts.forEach((prompt: any, index: number) => {
      if (!prompt.identifier) {
        result.errors.push(`Prompt at index ${index} is missing required 'identifier' field`)
      }
      if (!prompt.name) {
        result.warnings.push(`Prompt at index ${index} is missing 'name' field`)
      }
      // Only validate content for non-marker prompts
      if (!prompt.marker && typeof prompt.content !== 'string') {
        result.errors.push(`Prompt at index ${index} has invalid 'content' field`)
      }
      // Marker prompts don't need content as they're placeholders for dynamic content
      if (prompt.marker && prompt.content) {
        result.warnings.push(`Prompt at index ${index} is a marker but has content - content will be ignored`)
      }
    })
  }

  // Validate prompt order structure
  if (data.prompt_order && Array.isArray(data.prompt_order)) {
    data.prompt_order.forEach((order: any, index: number) => {
      if (!Array.isArray(order.order)) {
        result.errors.push(`Prompt order at index ${index} has invalid 'order' field`)
      }
    })
  }

  // Check for deprecated fields
  if (data.legacy_api) {
    result.warnings.push('Using legacy API settings - consider updating to newer format')
  }
}

/**
 * Validate TextGen/KoboldAI preset structure
 */
function validateTextGenPreset(data: any, result: ValidationResult): void {
  // Temperature validation
  const temp = data.temp || data.temperature
  if (typeof temp === 'number' && (temp < 0 || temp > 5)) {
    result.warnings.push('Temperature should typically be between 0 and 2')
  }

  // Top-p validation
  if (typeof data.top_p === 'number' && (data.top_p < 0 || data.top_p > 1)) {
    result.warnings.push('Top-p should be between 0 and 1')
  }

  // Top-k validation
  if (typeof data.top_k === 'number' && data.top_k < 0) {
    result.warnings.push('Top-k should be non-negative')
  }

  // Repetition penalty validation
  const repPen = data.rep_pen || data.repetition_penalty
  if (typeof repPen === 'number' && (repPen < 0.1 || repPen > 3)) {
    result.warnings.push('Repetition penalty should typically be between 0.1 and 3')
  }

  // Mirostat validation
  if (data.mirostat_mode && ![0, 1, 2].includes(data.mirostat_mode)) {
    result.errors.push('Mirostat mode must be 0, 1, or 2')
  }

  // Sampler order validation
  if (data.sampler_order && Array.isArray(data.sampler_order)) {
    const validRange = data.sampler_order.every((val: any) => 
      typeof val === 'number' && val >= 0 && val <= 10
    )
    if (!validRange) {
      result.warnings.push('Sampler order contains invalid values')
    }
  }
}

/**
 * Validate Instruct preset structure
 */
function validateInstructPreset(data: any, result: ValidationResult): void {
  if (!data.name || typeof data.name !== 'string') {
    result.errors.push('Instruct template is missing required name field')
  }

  if (!data.input_sequence && !data.output_sequence) {
    result.warnings.push('Instruct template should have at least input or output sequence')
  }

  // Check for common instruct template patterns
  const hasUserToken = data.input_sequence?.includes('{{user}}') || 
                      data.input_sequence?.includes('<|user|>')
  const hasAssistantToken = data.output_sequence?.includes('{{char}}') || 
                           data.output_sequence?.includes('<|assistant|>')

  if (!hasUserToken && !hasAssistantToken) {
    result.warnings.push('Instruct template may be missing user/assistant tokens')
  }
}

/**
 * Validate Context preset structure
 */
function validateContextPreset(data: any, result: ValidationResult): void {
  if (!data.name || typeof data.name !== 'string') {
    result.errors.push('Context template is missing required name field')
  }

  if (!data.story_string || typeof data.story_string !== 'string') {
    result.errors.push('Context template is missing required story_string field')
  }

  // Check for template variables
  if (data.story_string && !data.story_string.includes('{{')) {
    result.warnings.push('Context template may be missing template variables')
  }
}

/**
 * Validate System Prompt preset structure
 */
function validateSystemPromptPreset(data: any, result: ValidationResult): void {
  if (!data.name || typeof data.name !== 'string') {
    result.errors.push('System prompt is missing required name field')
  }

  if (!data.content || typeof data.content !== 'string') {
    result.errors.push('System prompt is missing required content field')
  }

  if (data.content && data.content.length > 8000) {
    result.warnings.push('System prompt is very long - may hit token limits')
  }
}

/**
 * Check compatibility with fromyou2 features
 */
export function checkCompatibility(presetType: PresetType, data: any): {
  compatible: boolean
  supportedFeatures: string[]
  unsupportedFeatures: string[]
  recommendations: string[]
} {
  const result = {
    compatible: true,
    supportedFeatures: [] as string[],
    unsupportedFeatures: [] as string[],
    recommendations: [] as string[],
  }

  switch (presetType) {
    case 'openai':
      result.supportedFeatures.push(
        'Temperature control',
        'Token limits',
        'Top-p sampling',
        'Frequency/presence penalties',
        'Custom prompts',
        'Prompt ordering'
      )

      if (data.stream_openai !== undefined) {
        result.supportedFeatures.push('Streaming responses')
      }

      if (data.legacy_streaming) {
        result.unsupportedFeatures.push('Legacy streaming format')
        result.recommendations.push('Update to use modern streaming')
      }
      break

    case 'textgen':
    case 'kobold':
      result.supportedFeatures.push(
        'Temperature control',
        'Top-p/Top-k sampling',
        'Repetition penalty',
        'Advanced sampling methods'
      )

      if (data.mirostat_mode) {
        result.supportedFeatures.push('Mirostat sampling')
      }

      if (data.guidance_scale) {
        result.unsupportedFeatures.push('Guidance scale')
        result.recommendations.push('Consider adjusting temperature instead')
      }
      break

    case 'instruct':
      result.supportedFeatures.push(
        'Custom instruction templates',
        'Input/output formatting',
        'System message handling'
      )
      break

    case 'context':
      result.supportedFeatures.push(
        'Story context templates',
        'Chat formatting',
        'Character descriptions'
      )
      break

    default:
      result.recommendations.push('Limited compatibility testing for this preset type')
  }

  return result
}