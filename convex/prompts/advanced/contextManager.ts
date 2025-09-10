import { ParsedPresetSettings } from '../../presets/types'
import { MacroProcessor } from './macroProcessor'

export interface ContextManagerOptions {
  settings: ParsedPresetSettings
  characterDescription?: string
  characterPersonality?: string
  scenario?: string
  worldInfo?: string
  memory?: string
  authorNote?: string
  playerName?: string
  characterName?: string
  maxContextLength?: number
}

export interface ManagedContext {
  systemPrompt: string
  contextLength: number
  truncated: boolean
  sections: ContextSection[]
}

export interface ContextSection {
  identifier: string
  content: string
  priority: number
  length: number
  required: boolean
}

/**
 * Manages context for character chat with SillyTavern preset configurations
 */
export class ContextManager {
  private settings: ParsedPresetSettings
  private macroProcessor: MacroProcessor
  private maxContextLength: number

  constructor(options: ContextManagerOptions) {
    this.settings = options.settings
    this.maxContextLength = options.maxContextLength || 4000

    this.macroProcessor = new MacroProcessor({
      userName: options.playerName || 'You',
      playerName: options.playerName || 'You',
      characterName: options.characterName || 'Character',
      activeChar: options.characterName || 'Character',
    })
  }

  /**
   * Build context with proper prioritization and truncation
   */
  buildContext(options: ContextManagerOptions): ManagedContext {
    const sections = this.buildContextSections(options)
    const orderedSections = this.orderSectionsByPriority(sections)
    const fittedSections = this.fitToContextLimit(orderedSections)

    const systemPrompt = fittedSections
      .map(section => section.content)
      .filter(Boolean)
      .join('\n\n')

    const totalLength = fittedSections.reduce((sum, section) => sum + section.length, 0)
    const truncated = fittedSections.length < orderedSections.length

    return {
      systemPrompt: this.macroProcessor.process(systemPrompt),
      contextLength: totalLength,
      truncated,
      sections: fittedSections,
    }
  }

  /**
   * Build context sections based on preset configuration
   */
  private buildContextSections(options: ContextManagerOptions): ContextSection[] {
    const sections: ContextSection[] = []

    // If we have prompt order configuration, use it
    if (this.settings.promptOrder && this.settings.prompts) {
      return this.buildOrderedSections(options)
    }

    // Fallback to default section ordering
    return this.buildDefaultSections(options)
  }

  /**
   * Build sections using SillyTavern prompt order
   */
  private buildOrderedSections(options: ContextManagerOptions): ContextSection[] {
    const sections: ContextSection[] = []
    
    if (!this.settings.promptOrder || !this.settings.prompts) {
      return this.buildDefaultSections(options)
    }

    // Use first prompt order (character_id 100000 is default)
    const promptOrder = this.settings.promptOrder.find(po => po.characterId === 100000) || 
                       this.settings.promptOrder[0]

    if (!promptOrder) {
      return this.buildDefaultSections(options)
    }

    let priority = 100 // Higher numbers = higher priority

    for (const orderItem of promptOrder.order) {
      if (!orderItem.enabled) continue

      const sectionContent = this.getSectionContent(orderItem.identifier, options)
      if (sectionContent) {
        sections.push({
          identifier: orderItem.identifier,
          content: sectionContent,
          priority: priority--,
          length: sectionContent.length,
          required: this.isRequiredSection(orderItem.identifier),
        })
      }
    }

    return sections
  }

  /**
   * Build default sections when no prompt order is available
   */
  private buildDefaultSections(options: ContextManagerOptions): ContextSection[] {
    const sections: ContextSection[] = []

    // Main system prompt (highest priority)
    if (this.settings.systemPrompt || options.characterDescription) {
      const mainContent = this.buildMainSystemPrompt(options)
      if (mainContent) {
        sections.push({
          identifier: 'main',
          content: mainContent,
          priority: 100,
          length: mainContent.length,
          required: true,
        })
      }
    }

    // Character description
    if (options.characterDescription) {
      sections.push({
        identifier: 'charDescription',
        content: options.characterDescription,
        priority: 90,
        length: options.characterDescription.length,
        required: true,
      })
    }

    // Character personality
    if (options.characterPersonality) {
      sections.push({
        identifier: 'charPersonality',
        content: options.characterPersonality,
        priority: 85,
        length: options.characterPersonality.length,
        required: true,
      })
    }

    // Scenario
    if (options.scenario) {
      sections.push({
        identifier: 'scenario',
        content: options.scenario,
        priority: 80,
        length: options.scenario.length,
        required: true,
      })
    }

    // World info
    if (options.worldInfo) {
      sections.push({
        identifier: 'worldInfo',
        content: options.worldInfo,
        priority: 70,
        length: options.worldInfo.length,
        required: false,
      })
    }

    // Memory/background
    if (options.memory) {
      sections.push({
        identifier: 'memory',
        content: `Background: ${options.memory}`,
        priority: 75,
        length: options.memory.length + 12,
        required: false,
      })
    }

    // Author note/instructions
    if (options.authorNote) {
      sections.push({
        identifier: 'authorNote',
        content: `Instructions: ${options.authorNote}`,
        priority: 60,
        length: options.authorNote.length + 14,
        required: false,
      })
    }

    return sections
  }

  /**
   * Get content for a specific section identifier
   */
  private getSectionContent(identifier: string, options: ContextManagerOptions): string | null {
    // Check for explicit prompts first
    const prompt = this.settings.prompts?.find(p => p.identifier === identifier)
    if (prompt?.content) {
      return prompt.content
    }

    // Handle special identifiers
    switch (identifier) {
      case 'main':
        return this.buildMainSystemPrompt(options)
      
      case 'charDescription':
        return options.characterDescription || null
      
      case 'charPersonality':
        return options.characterPersonality || null
      
      case 'scenario':
        return options.scenario || null
      
      case 'worldInfoBefore':
      case 'worldInfoAfter':
        return options.worldInfo || null
      
      case 'enhanceDefinitions':
        return this.buildEnhanceDefinitionsPrompt(options)
      
      case 'nsfw':
        return 'Keep responses appropriate and respectful while maintaining character authenticity.'
      
      case 'jailbreak':
        return 'Focus on creating engaging, creative responses that fit the character and scenario.'
      
      default:
        return null
    }
  }

  /**
   * Build main system prompt
   */
  private buildMainSystemPrompt(options: ContextManagerOptions): string {
    if (this.settings.systemPrompt) {
      return this.settings.systemPrompt
    }

    const charName = options.characterName || 'Character'
    const playerName = options.playerName || 'You'

    let prompt = `You are ${charName}. You are having a conversation with ${playerName}. Stay in character and respond naturally.`

    if (options.memory) {
      prompt += `\n\nBackground: ${options.memory}`
    }

    if (options.authorNote) {
      prompt += `\n\nGuidance: ${options.authorNote}`
    }

    return prompt
  }

  /**
   * Build enhance definitions prompt
   */
  private buildEnhanceDefinitionsPrompt(options: ContextManagerOptions): string {
    const charName = options.characterName || 'Character'
    return `If you have more knowledge of ${charName}, add to the character's lore and personality to enhance them but keep the Character Sheet's definitions absolute.`
  }

  /**
   * Determine if a section is required (should not be truncated)
   */
  private isRequiredSection(identifier: string): boolean {
    const requiredSections = ['main', 'charDescription', 'charPersonality', 'scenario']
    return requiredSections.includes(identifier)
  }

  /**
   * Order sections by priority
   */
  private orderSectionsByPriority(sections: ContextSection[]): ContextSection[] {
    return sections.sort((a, b) => {
      // Required sections always come first
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      
      // Then by priority
      return b.priority - a.priority
    })
  }

  /**
   * Fit sections to context limit
   */
  private fitToContextLimit(sections: ContextSection[]): ContextSection[] {
    const fitted: ContextSection[] = []
    let totalLength = 0

    for (const section of sections) {
      // Always include required sections
      if (section.required) {
        fitted.push(section)
        totalLength += section.length
        continue
      }

      // Check if optional section fits
      if (totalLength + section.length <= this.maxContextLength) {
        fitted.push(section)
        totalLength += section.length
      } else {
        // Try to fit a truncated version
        const remainingSpace = this.maxContextLength - totalLength
        if (remainingSpace > 100) { // Only truncate if we have reasonable space
          const truncatedContent = this.truncateContent(section.content, remainingSpace - 50)
          if (truncatedContent) {
            fitted.push({
              ...section,
              content: truncatedContent + '...',
              length: truncatedContent.length + 3,
            })
          }
        }
        break
      }
    }

    return fitted
  }

  /**
   * Truncate content to fit length while preserving meaning
   */
  private truncateContent(content: string, maxLength: number): string | null {
    if (content.length <= maxLength) return content
    if (maxLength < 50) return null

    // Try to truncate at sentence boundaries
    const sentences = content.split(/[.!?]\s+/)
    let result = ''

    for (const sentence of sentences) {
      if (result.length + sentence.length + 2 <= maxLength) {
        result += (result ? '. ' : '') + sentence
      } else {
        break
      }
    }

    // If no complete sentences fit, truncate at word boundaries
    if (!result) {
      const words = content.split(/\s+/)
      for (const word of words) {
        if (result.length + word.length + 1 <= maxLength) {
          result += (result ? ' ' : '') + word
        } else {
          break
        }
      }
    }

    return result || null
  }

  /**
   * Update context settings
   */
  updateSettings(settings: ParsedPresetSettings): void {
    this.settings = settings
  }

  /**
   * Update macro context
   */
  updateMacroContext(updates: Record<string, string>): void {
    this.macroProcessor.updateContext(updates)
  }

  /**
   * Get context statistics
   */
  getContextStats(context: ManagedContext): {
    totalSections: number
    requiredSections: number
    optionalSections: number
    utilizationPercentage: number
  } {
    const requiredSections = context.sections.filter(s => s.required).length
    const optionalSections = context.sections.filter(s => !s.required).length
    const utilizationPercentage = (context.contextLength / this.maxContextLength) * 100

    return {
      totalSections: context.sections.length,
      requiredSections,
      optionalSections,
      utilizationPercentage: Math.round(utilizationPercentage),
    }
  }
}