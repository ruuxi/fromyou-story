import { ParsedPresetSettings, ModelParameters, PromptContext, MacroContext } from './types'

/**
 * Map SillyTavern preset settings to fromyou2 model parameters
 */
export function mapToModelParameters(settings: ParsedPresetSettings): ModelParameters {
  const params: ModelParameters = {}

  // Core parameters
  if (settings.temperature !== undefined) {
    params.temperature = Math.max(0, Math.min(2, settings.temperature))
  }

  if (settings.maxTokens !== undefined) {
    params.maxOutputTokens = Math.max(1, Math.min(8192, settings.maxTokens))
  }

  if (settings.topP !== undefined) {
    params.topP = Math.max(0, Math.min(1, settings.topP))
  }

  if (settings.topK !== undefined) {
    params.topK = Math.max(1, settings.topK)
  }

  if (settings.frequencyPenalty !== undefined) {
    params.frequencyPenalty = Math.max(-2, Math.min(2, settings.frequencyPenalty))
  }

  if (settings.presencePenalty !== undefined) {
    params.presencePenalty = Math.max(-2, Math.min(2, settings.presencePenalty))
  }

  // Stop sequences from instruct template
  if (settings.instructTemplate?.stopSequence) {
    params.stopSequences = [settings.instructTemplate.stopSequence]
  }

  return params
}

/**
 * Process SillyTavern macros in text
 */
export function processMacros(text: string, context: MacroContext): string {
  if (!text) return ''

  let result = text

  // Basic macro replacements
  const macros = {
    '{{user}}': context.userName || context.playerName || 'You',
    '{{char}}': context.characterName || context.activeChar || 'Character',
    '{{playerName}}': context.playerName || context.userName || 'You',
    '{{time}}': context.time || new Date().toLocaleTimeString(),
    '{{date}}': context.date || new Date().toLocaleDateString(),
  }

  // Apply macro replacements
  for (const [macro, replacement] of Object.entries(macros)) {
    result = result.replace(new RegExp(macro.replace(/[{}]/g, '\\$&'), 'g'), replacement)
  }

  // Custom macros from context
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === 'string' && !['userName', 'playerName', 'characterName', 'activeChar', 'time', 'date'].includes(key)) {
      const macro = `{{${key}}}`
      result = result.replace(new RegExp(macro.replace(/[{}]/g, '\\$&'), 'g'), value)
    }
  }

  return result
}

/**
 * Build context from SillyTavern prompts with proper ordering
 */
export function buildPromptContext(
  settings: ParsedPresetSettings,
  context: {
    characterDescription?: string
    characterPersonality?: string
    scenario?: string
    worldInfo?: string
    chatHistory?: string
    userMessage?: string
    macroContext: MacroContext
  }
): PromptContext {
  const result: PromptContext = {}

  // If we have prompts and prompt order, use them
  if (settings.prompts && settings.promptOrder) {
    const orderedPrompts = getOrderedPrompts(settings.prompts, settings.promptOrder)
    result.systemPrompt = buildSystemPromptFromOrder(orderedPrompts, context, settings)
  } else if (settings.systemPrompt) {
    // Fallback to simple system prompt
    result.systemPrompt = processMacros(settings.systemPrompt, context.macroContext)
  }

  // Add instruct template formatting if available
  if (settings.instructTemplate) {
    result.formatInstructions = buildInstructFormatting(settings.instructTemplate, context.macroContext)
  }

  // Add context template formatting if available
  if (settings.contextTemplate) {
    result.characterContext = buildContextFromTemplate(settings.contextTemplate, context, settings)
  }

  return result
}

/**
 * Get prompts in the correct order based on prompt_order configuration
 */
function getOrderedPrompts(prompts: any[], promptOrder: any[]): any[] {
  // Use first prompt order configuration (character_id 100000 is default)
  const order = promptOrder.find(po => po.characterId === 100000) || promptOrder[0]
  if (!order) return prompts

  const orderedPrompts: any[] = []

  for (const orderItem of order.order) {
    if (!orderItem.enabled) continue

    const prompt = prompts.find(p => p.identifier === orderItem.identifier)
    if (prompt) {
      orderedPrompts.push(prompt)
    } else if (orderItem.identifier === 'chatHistory') {
      // Placeholder for chat history - will be handled by the chat system
      orderedPrompts.push({ identifier: 'chatHistory', marker: true })
    } else if (orderItem.identifier === 'charDescription') {
      orderedPrompts.push({ identifier: 'charDescription', marker: true })
    } else if (orderItem.identifier === 'charPersonality') {
      orderedPrompts.push({ identifier: 'charPersonality', marker: true })
    } else if (orderItem.identifier === 'scenario') {
      orderedPrompts.push({ identifier: 'scenario', marker: true })
    } else if (orderItem.identifier === 'worldInfoBefore' || orderItem.identifier === 'worldInfoAfter') {
      orderedPrompts.push({ identifier: orderItem.identifier, marker: true })
    }
  }

  return orderedPrompts
}

/**
 * Build system prompt from ordered prompts
 */
function buildSystemPromptFromOrder(
  orderedPrompts: any[],
  context: any,
  settings: ParsedPresetSettings
): string {
  const parts: string[] = []

  for (const prompt of orderedPrompts) {
    if (prompt.marker) {
      // Handle marker prompts (placeholders for dynamic content)
      switch (prompt.identifier) {
        case 'charDescription':
          if (context.characterDescription) {
            parts.push(processMacros(context.characterDescription, context.macroContext))
          }
          break
        case 'charPersonality':
          if (context.characterPersonality) {
            parts.push(processMacros(context.characterPersonality, context.macroContext))
          }
          break
        case 'scenario':
          if (context.scenario) {
            parts.push(processMacros(context.scenario, context.macroContext))
          }
          break
        case 'worldInfoBefore':
        case 'worldInfoAfter':
          if (context.worldInfo) {
            parts.push(processMacros(context.worldInfo, context.macroContext))
          }
          break
        // chatHistory is handled separately by the chat system
      }
    } else if (prompt.content) {
      // Regular prompt with content
      parts.push(processMacros(prompt.content, context.macroContext))
    }
  }

  return parts.filter(Boolean).join('\n\n')
}

/**
 * Build instruction formatting from instruct template
 */
function buildInstructFormatting(instructTemplate: any, macroContext: MacroContext): string {
  const parts: string[] = []

  if (instructTemplate.systemSequence) {
    parts.push(`System format: ${processMacros(instructTemplate.systemSequence, macroContext)}`)
  }

  if (instructTemplate.inputSequence) {
    parts.push(`Input format: ${processMacros(instructTemplate.inputSequence, macroContext)}`)
  }

  if (instructTemplate.outputSequence) {
    parts.push(`Output format: ${processMacros(instructTemplate.outputSequence, macroContext)}`)
  }

  if (instructTemplate.stopSequence) {
    parts.push(`Stop at: ${instructTemplate.stopSequence}`)
  }

  return parts.join('\n')
}

/**
 * Build context from context template
 */
function buildContextFromTemplate(
  contextTemplate: any,
  context: any,
  settings: ParsedPresetSettings
): string {
  const parts: string[] = []

  if (contextTemplate.storyString) {
    let storyString = contextTemplate.storyString

    // Replace context template variables
    if (context.characterDescription) {
      storyString = storyString.replace(/\{\{char\}\}/g, context.characterDescription)
    }
    if (context.scenario) {
      storyString = storyString.replace(/\{\{scenario\}\}/g, context.scenario)
    }

    parts.push(processMacros(storyString, context.macroContext))
  }

  if (contextTemplate.chatStart && context.chatHistory) {
    parts.push(processMacros(contextTemplate.chatStart, context.macroContext))
  }

  return parts.filter(Boolean).join('\n\n')
}

/**
 * Extract model configuration from advanced sampling settings
 */
export function getAdvancedSamplingConfig(settings: ParsedPresetSettings): Record<string, any> {
  const config: Record<string, any> = {}

  if (settings.samplingSettings) {
    const sampling = settings.samplingSettings

    // Map advanced sampling parameters
    if (sampling.topA !== undefined) config.topA = sampling.topA
    if (sampling.minP !== undefined) config.minP = sampling.minP
    if (sampling.tfs !== undefined) config.tfs = sampling.tfs
    if (sampling.typical !== undefined) config.typicalP = sampling.typical
    
    // Mirostat settings
    if (sampling.mirostatMode !== undefined) config.mirostatMode = sampling.mirostatMode
    if (sampling.mirostatTau !== undefined) config.mirostatTau = sampling.mirostatTau
    if (sampling.mirostatEta !== undefined) config.mirostatEta = sampling.mirostatEta

    // Repetition penalty
    if (sampling.repetitionPenalty !== undefined) {
      config.repetitionPenalty = sampling.repetitionPenalty
    }
    if (sampling.repetitionPenaltyRange !== undefined) {
      config.repetitionPenaltyRange = sampling.repetitionPenaltyRange
    }

    // Sampler configuration
    if (sampling.samplerOrder) config.samplerOrder = sampling.samplerOrder
    if (sampling.samplerPriority) config.samplerPriority = sampling.samplerPriority
  }

  return config
}

/**
 * Merge multiple preset settings (for layered presets)
 */
export function mergePresetSettings(...settingsArray: ParsedPresetSettings[]): ParsedPresetSettings {
  const merged: ParsedPresetSettings = {}

  for (const settings of settingsArray) {
    // Merge basic parameters (later settings override earlier ones)
    Object.assign(merged, {
      temperature: settings.temperature ?? merged.temperature,
      maxTokens: settings.maxTokens ?? merged.maxTokens,
      topP: settings.topP ?? merged.topP,
      topK: settings.topK ?? merged.topK,
      frequencyPenalty: settings.frequencyPenalty ?? merged.frequencyPenalty,
      presencePenalty: settings.presencePenalty ?? merged.presencePenalty,
      systemPrompt: settings.systemPrompt ?? merged.systemPrompt,
    })

    // Merge prompts (append unique prompts)
    if (settings.prompts) {
      merged.prompts = merged.prompts || []
      for (const prompt of settings.prompts) {
        const existing = merged.prompts.find(p => p.identifier === prompt.identifier)
        if (existing) {
          Object.assign(existing, prompt)
        } else {
          merged.prompts.push(prompt)
        }
      }
    }

    // Merge prompt order (later settings override)
    if (settings.promptOrder) {
      merged.promptOrder = settings.promptOrder
    }

    // Merge templates (later settings override)
    if (settings.instructTemplate) {
      merged.instructTemplate = { ...merged.instructTemplate, ...settings.instructTemplate }
    }
    if (settings.samplingSettings) {
      merged.samplingSettings = { ...merged.samplingSettings, ...settings.samplingSettings }
    }
    if (settings.contextTemplate) {
      merged.contextTemplate = { ...merged.contextTemplate, ...settings.contextTemplate }
    }
  }

  return merged
}