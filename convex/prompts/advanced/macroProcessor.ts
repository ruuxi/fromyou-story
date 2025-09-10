import { MacroContext } from '../../presets/types'

/**
 * Advanced macro processor that handles SillyTavern's macro system
 */
export class MacroProcessor {
  private context: MacroContext
  private customMacros: Map<string, string | (() => string)> = new Map()

  constructor(context: MacroContext) {
    this.context = { ...context }
    this.initializeBuiltinMacros()
  }

  /**
   * Initialize built-in SillyTavern macros
   */
  private initializeBuiltinMacros(): void {
    // Time and date macros
    this.customMacros.set('time', () => new Date().toLocaleTimeString())
    this.customMacros.set('date', () => new Date().toLocaleDateString())
    this.customMacros.set('datetime', () => new Date().toLocaleString())
    this.customMacros.set('timestamp', () => Math.floor(Date.now() / 1000).toString())

    // Random number macros
    this.customMacros.set('random', () => Math.random().toString())
    this.customMacros.set('randomint', () => Math.floor(Math.random() * 100).toString())

    // Weekday macro
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    this.customMacros.set('weekday', () => weekdays[new Date().getDay()])

    // Month macro
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    this.customMacros.set('month', () => months[new Date().getMonth()])
  }

  /**
   * Process all macros in the given text
   */
  process(text: string): string {
    if (!text) return ''

    let result = text

    // Process basic context macros first
    result = this.processBasicMacros(result)

    // Process custom/builtin macros
    result = this.processCustomMacros(result)

    // Process advanced macros
    result = this.processAdvancedMacros(result)

    return result
  }

  /**
   * Process basic character and user macros
   */
  private processBasicMacros(text: string): string {
    const basicMacros = {
      '{{user}}': this.context.userName || this.context.playerName || 'You',
      '{{char}}': this.context.characterName || this.context.activeChar || 'Character',
      '{{playerName}}': this.context.playerName || this.context.userName || 'You',
      '{{userName}}': this.context.userName || this.context.playerName || 'You',
      '{{characterName}}': this.context.characterName || this.context.activeChar || 'Character',
      '{{activeChar}}': this.context.activeChar || this.context.characterName || 'Character',
    }

    let result = text
    for (const [macro, replacement] of Object.entries(basicMacros)) {
      const regex = new RegExp(this.escapeRegex(macro), 'g')
      result = result.replace(regex, replacement)
    }

    return result
  }

  /**
   * Process custom and builtin macros
   */
  private processCustomMacros(text: string): string {
    let result = text

    for (const [macroName, macroValue] of this.customMacros.entries()) {
      const macro = `{{${macroName}}}`
      const regex = new RegExp(this.escapeRegex(macro), 'g')
      
      const replacement = typeof macroValue === 'function' ? macroValue() : macroValue
      result = result.replace(regex, replacement)
    }

    // Process context macros that weren't covered by basic macros
    for (const [key, value] of Object.entries(this.context)) {
      if (typeof value === 'string' && !['userName', 'playerName', 'characterName', 'activeChar'].includes(key)) {
        const macro = `{{${key}}}`
        const regex = new RegExp(this.escapeRegex(macro), 'g')
        result = result.replace(regex, value)
      }
    }

    return result
  }

  /**
   * Process advanced macros with parameters
   */
  private processAdvancedMacros(text: string): string {
    let result = text

    // {{random:min:max}} - Random number between min and max
    result = result.replace(/\{\{random:(\d+):(\d+)\}\}/g, (match, min, max) => {
      const minNum = parseInt(min, 10)
      const maxNum = parseInt(max, 10)
      return (Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum).toString()
    })

    // {{pick:option1|option2|option3}} - Pick random option
    result = result.replace(/\{\{pick:([^}]+)\}\}/g, (match, options) => {
      const choices = options.split('|')
      const randomChoice = choices[Math.floor(Math.random() * choices.length)]
      return randomChoice.trim()
    })

    // {{roll:XdY}} - Dice roll (e.g., {{roll:2d6}})
    result = result.replace(/\{\{roll:(\d+)d(\d+)\}\}/g, (match, numDice, sides) => {
      const num = parseInt(numDice, 10)
      const sideCount = parseInt(sides, 10)
      let total = 0
      for (let i = 0; i < num; i++) {
        total += Math.floor(Math.random() * sideCount) + 1
      }
      return total.toString()
    })

    // {{time:format}} - Formatted time
    result = result.replace(/\{\{time:([^}]+)\}\}/g, (match, format) => {
      const now = new Date()
      switch (format.toLowerCase()) {
        case '12h':
          return now.toLocaleTimeString('en-US', { hour12: true })
        case '24h':
          return now.toLocaleTimeString('en-US', { hour12: false })
        case 'hour':
          return now.getHours().toString()
        case 'minute':
          return now.getMinutes().toString()
        case 'second':
          return now.getSeconds().toString()
        default:
          return now.toLocaleTimeString()
      }
    })

    // {{date:format}} - Formatted date
    result = result.replace(/\{\{date:([^}]+)\}\}/g, (match, format) => {
      const now = new Date()
      switch (format.toLowerCase()) {
        case 'short':
          return now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        case 'long':
          return now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        case 'iso':
          return now.toISOString().split('T')[0]
        case 'year':
          return now.getFullYear().toString()
        case 'month':
          return (now.getMonth() + 1).toString()
        case 'day':
          return now.getDate().toString()
        default:
          return now.toLocaleDateString()
      }
    })

    return result
  }

  /**
   * Add custom macro
   */
  addMacro(name: string, value: string | (() => string)): void {
    this.customMacros.set(name, value)
  }

  /**
   * Remove custom macro
   */
  removeMacro(name: string): void {
    this.customMacros.delete(name)
  }

  /**
   * Update context
   */
  updateContext(updates: Partial<MacroContext>): void {
    Object.assign(this.context, updates)
  }

  /**
   * Get current context
   */
  getContext(): MacroContext {
    return { ...this.context }
  }

  /**
   * Escape special regex characters in macro names
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Check if text contains any macros
   */
  hasMacros(text: string): boolean {
    return /\{\{[^}]+\}\}/.test(text)
  }

  /**
   * Extract all macro names from text
   */
  extractMacros(text: string): string[] {
    const matches = text.match(/\{\{([^}]+)\}\}/g)
    if (!matches) return []

    return matches.map(match => match.slice(2, -2)) // Remove {{ and }}
  }

  /**
   * Validate macro syntax
   */
  validateMacros(text: string): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    let valid = true

    // Check for unclosed macros
    const openCount = (text.match(/\{\{/g) || []).length
    const closeCount = (text.match(/\}\}/g) || []).length

    if (openCount !== closeCount) {
      valid = false
      errors.push('Mismatched macro brackets')
    }

    // Check for nested macros (not supported)
    const nestedPattern = /\{\{[^}]*\{\{/
    if (nestedPattern.test(text)) {
      valid = false
      errors.push('Nested macros are not supported')
    }

    // Check for empty macros
    const emptyPattern = /\{\{\s*\}\}/
    if (emptyPattern.test(text)) {
      valid = false
      errors.push('Empty macros found')
    }

    return { valid, errors }
  }
}