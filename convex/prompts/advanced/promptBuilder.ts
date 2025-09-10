import { ParsedPresetSettings, MacroContext } from '../../presets/types'
import { processMacros, buildPromptContext } from '../../presets/mapper'

export interface AdvancedPromptBuilderOptions {
  settings: ParsedPresetSettings
  characterDescription?: string
  characterPersonality?: string
  scenario?: string
  worldInfo?: string
  memory?: string
  authorNote?: string
  userName?: string
  playerName?: string
  characterName?: string
  activeChar?: string
  formatMode?: 'classic_rp' | 'chatml'
}

export interface BuiltPrompt {
  systemPrompt: string
  instructionContext?: string
  formatInstructions?: string
  stopSequences?: string[]
}

/**
 * Advanced prompt builder that handles SillyTavern preset configurations
 */
export class AdvancedPromptBuilder {
  private settings: ParsedPresetSettings
  private macroContext: MacroContext

  constructor(options: AdvancedPromptBuilderOptions) {
    this.settings = options.settings
    this.macroContext = {
      userName: options.userName || 'You',
      playerName: options.playerName || options.userName || 'You',
      characterName: options.characterName || options.activeChar || 'Character',
      activeChar: options.activeChar || options.characterName || 'Character',
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
    }
  }

  /**
   * Build the complete prompt system
   */
  buildPrompt(options: AdvancedPromptBuilderOptions): BuiltPrompt {
    const result: BuiltPrompt = {
      systemPrompt: '',
    }

    // Build main system prompt
    if (this.settings.prompts && this.settings.promptOrder) {
      result.systemPrompt = this.buildOrderedSystemPrompt(options)
    } else if (this.settings.systemPrompt) {
      result.systemPrompt = this.processSystemPrompt(this.settings.systemPrompt, options)
    } else {
      result.systemPrompt = this.buildFallbackSystemPrompt(options)
    }

    // Add instruct template formatting
    if (this.settings.instructTemplate) {
      result.formatInstructions = this.buildInstructInstructions()
      result.stopSequences = this.extractStopSequences()
    }

    // Add context template processing
    if (this.settings.contextTemplate) {
      const contextualPrompt = this.buildContextualPrompt(options)
      if (contextualPrompt) {
        result.systemPrompt = contextualPrompt
      }
    }

    return result
  }

  /**
   * Build system prompt using SillyTavern's prompt ordering system
   */
  private buildOrderedSystemPrompt(options: AdvancedPromptBuilderOptions): string {
    if (!this.settings.prompts || !this.settings.promptOrder) {
      return this.buildFallbackSystemPrompt(options)
    }

    // Get the appropriate prompt order (use first available or default)
    const promptOrder = this.settings.promptOrder.find(po => po.characterId === 100000) || 
                       this.settings.promptOrder[0]

    if (!promptOrder) {
      return this.buildFallbackSystemPrompt(options)
    }

    const promptParts: string[] = []

    // Process each prompt in the specified order
    for (const orderItem of promptOrder.order) {
      if (!orderItem.enabled) continue

      const promptContent = this.getPromptContent(orderItem.identifier, options)
      if (promptContent) {
        promptParts.push(promptContent)
      }
    }

    return promptParts.filter(Boolean).join('\n\n')
  }

  /**
   * Get content for a specific prompt identifier
   */
  private getPromptContent(identifier: string, options: AdvancedPromptBuilderOptions): string | null {
    // Check for actual prompts first
    const prompt = this.settings.prompts?.find(p => p.identifier === identifier)
    if (prompt && prompt.content) {
      return processMacros(prompt.content, this.macroContext)
    }

    // Handle marker prompts (placeholders for dynamic content)
    switch (identifier) {
      case 'main':
        return this.buildMainPrompt(options)
      
      case 'charDescription':
        return options.characterDescription ? 
          processMacros(options.characterDescription, this.macroContext) : null
      
      case 'charPersonality':
        return options.characterPersonality ? 
          processMacros(options.characterPersonality, this.macroContext) : null
      
      case 'scenario':
        return options.scenario ? 
          processMacros(options.scenario, this.macroContext) : null
      
      case 'worldInfoBefore':
      case 'worldInfoAfter':
        return options.worldInfo ? 
          processMacros(options.worldInfo, this.macroContext) : null
      
      case 'enhanceDefinitions':
        return this.buildEnhanceDefinitionsPrompt(options)
      
      case 'jailbreak':
        return this.buildJailbreakPrompt(options)
      
      case 'nsfw':
        return this.buildNsfwPrompt(options)
      
      // Note: chatHistory is handled separately by the chat system
      // dialogueExamples would need to be provided in options
      
      default:
        return null
    }
  }

  /**
   * Build main conversation prompt
   */
  private buildMainPrompt(options: AdvancedPromptBuilderOptions): string {
    const charName = this.macroContext.characterName
    const userName = this.macroContext.playerName

    let mainPrompt = `You are ${charName}. You are having a conversation with ${userName}.`

    if (options.formatMode === 'classic_rp') {
      mainPrompt += '\n\nStay in character and respond naturally. Use actions in asterisks when appropriate.'
    } else {
      mainPrompt += '\n\nStay in character and respond naturally using the conversation history to maintain context and consistency.'
    }

    if (options.memory) {
      mainPrompt += `\n\nImportant context: ${processMacros(options.memory, this.macroContext)}`
    }

    if (options.authorNote) {
      mainPrompt += `\n\nGuidance: ${processMacros(options.authorNote, this.macroContext)}`
    }

    return mainPrompt
  }

  /**
   * Build enhance definitions prompt
   */
  private buildEnhanceDefinitionsPrompt(options: AdvancedPromptBuilderOptions): string {
    const charName = this.macroContext.characterName
    return `If you have more knowledge of ${charName}, add to the character's lore and personality to enhance them but keep the Character Sheet's definitions absolute.`
  }

  /**
   * Build jailbreak/post-history instructions
   */
  private buildJailbreakPrompt(options: AdvancedPromptBuilderOptions): string {
    // This would typically contain user-defined jailbreak instructions
    // For safety, we'll provide a mild creativity boost instead
    return 'Focus on creating engaging, creative responses that fit the character and scenario.'
  }

  /**
   * Build NSFW/auxiliary prompt
   */
  private buildNsfwPrompt(options: AdvancedPromptBuilderOptions): string {
    // For safety and compliance, we'll return content-appropriate instructions
    return 'Keep responses appropriate and respectful while maintaining character authenticity.'
  }

  /**
   * Process a system prompt with macro replacement
   */
  private processSystemPrompt(systemPrompt: string, options: AdvancedPromptBuilderOptions): string {
    let processed = processMacros(systemPrompt, this.macroContext)

    // Add character context if available
    if (options.characterDescription) {
      processed += `\n\nCharacter: ${processMacros(options.characterDescription, this.macroContext)}`
    }

    if (options.scenario) {
      processed += `\n\nScenario: ${processMacros(options.scenario, this.macroContext)}`
    }

    if (options.memory) {
      processed += `\n\nBackground: ${processMacros(options.memory, this.macroContext)}`
    }

    if (options.authorNote) {
      processed += `\n\nInstructions: ${processMacros(options.authorNote, this.macroContext)}`
    }

    return processed
  }

  /**
   * Build fallback system prompt when no preset is available
   */
  private buildFallbackSystemPrompt(options: AdvancedPromptBuilderOptions): string {
    return this.buildMainPrompt(options)
  }

  /**
   * Build contextual prompt using context template
   */
  private buildContextualPrompt(options: AdvancedPromptBuilderOptions): string | null {
    if (!this.settings.contextTemplate) return null

    const template = this.settings.contextTemplate
    let contextPrompt = ''

    if (template.storyString) {
      contextPrompt = template.storyString

      // Replace context variables
      if (options.characterDescription) {
        contextPrompt = contextPrompt.replace(/\{\{char\}\}/g, options.characterDescription)
      }
      if (options.scenario) {
        contextPrompt = contextPrompt.replace(/\{\{scenario\}\}/g, options.scenario)
      }

      contextPrompt = processMacros(contextPrompt, this.macroContext)
    }

    if (template.chatStart) {
      contextPrompt += '\n\n' + processMacros(template.chatStart, this.macroContext)
    }

    return contextPrompt || null
  }

  /**
   * Build instruction template formatting
   */
  private buildInstructInstructions(): string {
    if (!this.settings.instructTemplate) return ''

    const template = this.settings.instructTemplate
    const parts: string[] = []

    if (template.systemSequence) {
      parts.push(`System messages should be formatted as: ${processMacros(template.systemSequence, this.macroContext)}`)
    }

    if (template.inputSequence) {
      parts.push(`User input should be formatted as: ${processMacros(template.inputSequence, this.macroContext)}`)
    }

    if (template.outputSequence) {
      parts.push(`Your responses should be formatted as: ${processMacros(template.outputSequence, this.macroContext)}`)
    }

    if (template.wrapStyle === 'wrapped') {
      parts.push('Use proper formatting and structure in your responses.')
    }

    return parts.join('\n')
  }

  /**
   * Extract stop sequences from instruct template
   */
  private extractStopSequences(): string[] {
    const sequences: string[] = []

    if (this.settings.instructTemplate?.stopSequence) {
      sequences.push(this.settings.instructTemplate.stopSequence)
    }

    // Add common stop sequences for safety
    sequences.push(
      processMacros('{{user}}:', this.macroContext),
      processMacros('{{playerName}}:', this.macroContext)
    )

    return sequences.filter((seq, index, arr) => arr.indexOf(seq) === index) // Deduplicate
  }

  /**
   * Update macro context
   */
  updateMacroContext(updates: Partial<MacroContext>): void {
    Object.assign(this.macroContext, updates)
  }
}