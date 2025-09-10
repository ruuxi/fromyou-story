import { ParsedPresetSettings, SamplingSettings } from '../../presets/types'

export interface MappedSamplerSettings {
  // Core parameters supported by most models
  temperature?: number
  maxOutputTokens?: number
  topP?: number
  topK?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stopSequences?: string[]
  
  // Advanced parameters (model-specific)
  advanced?: {
    topA?: number
    minP?: number
    tfs?: number
    typicalP?: number
    mirostat?: {
      mode: number
      tau: number
      eta: number
    }
    repetitionPenalty?: {
      penalty: number
      range: number
    }
    samplerOrder?: number[]
    samplerPriority?: string[]
  }
}

/**
 * Maps SillyTavern sampling settings to model-compatible parameters
 */
export class SamplerSettingsMapper {
  /**
   * Map preset settings to model parameters with appropriate bounds checking
   */
  static mapSettings(settings: ParsedPresetSettings): MappedSamplerSettings {
    const mapped: MappedSamplerSettings = {}

    // Core parameters with bounds checking
    if (settings.temperature !== undefined) {
      mapped.temperature = this.clamp(settings.temperature, 0, 2)
    }

    if (settings.maxTokens !== undefined) {
      mapped.maxOutputTokens = Math.max(1, Math.min(8192, settings.maxTokens))
    }

    if (settings.topP !== undefined) {
      mapped.topP = this.clamp(settings.topP, 0, 1)
    }

    if (settings.topK !== undefined) {
      mapped.topK = Math.max(1, settings.topK)
    }

    if (settings.frequencyPenalty !== undefined) {
      mapped.frequencyPenalty = this.clamp(settings.frequencyPenalty, -2, 2)
    }

    if (settings.presencePenalty !== undefined) {
      mapped.presencePenalty = this.clamp(settings.presencePenalty, -2, 2)
    }

    // Advanced sampling settings
    if (settings.samplingSettings) {
      mapped.advanced = this.mapAdvancedSettings(settings.samplingSettings)
    }

    // Stop sequences from instruct template
    if (settings.instructTemplate?.stopSequence) {
      mapped.stopSequences = [settings.instructTemplate.stopSequence]
    }

    return mapped
  }

  /**
   * Map advanced sampling settings
   */
  private static mapAdvancedSettings(sampling: SamplingSettings): MappedSamplerSettings['advanced'] {
    const advanced: NonNullable<MappedSamplerSettings['advanced']> = {}

    // Top-A sampling
    if (sampling.topA !== undefined) {
      advanced.topA = this.clamp(sampling.topA, 0, 1)
    }

    // Min-P sampling
    if (sampling.minP !== undefined) {
      advanced.minP = this.clamp(sampling.minP, 0, 1)
    }

    // Tail-free sampling
    if (sampling.tfs !== undefined) {
      advanced.tfs = this.clamp(sampling.tfs, 0, 1)
    }

    // Typical sampling
    if (sampling.typical !== undefined) {
      advanced.typicalP = this.clamp(sampling.typical, 0, 1)
    }

    // Mirostat sampling
    if (sampling.mirostatMode !== undefined && sampling.mirostatMode > 0) {
      advanced.mirostat = {
        mode: sampling.mirostatMode,
        tau: sampling.mirostatTau || 5,
        eta: sampling.mirostatEta || 0.1,
      }
    }

    // Repetition penalty
    if (sampling.repetitionPenalty !== undefined) {
      advanced.repetitionPenalty = {
        penalty: this.clamp(sampling.repetitionPenalty, 0.1, 3),
        range: sampling.repetitionPenaltyRange || 1024,
      }
    }

    // Sampler configuration
    if (sampling.samplerOrder) {
      advanced.samplerOrder = sampling.samplerOrder
    }

    if (sampling.samplerPriority) {
      advanced.samplerPriority = sampling.samplerPriority
    }

    return Object.keys(advanced).length > 0 ? advanced : undefined
  }

  /**
   * Get model-specific parameter mappings for different providers
   */
  static getProviderMapping(mapped: MappedSamplerSettings, provider: string): Record<string, any> {
    switch (provider.toLowerCase()) {
      case 'openai':
        return this.mapToOpenAI(mapped)
      case 'anthropic':
        return this.mapToAnthropic(mapped)
      case 'google':
      case 'vertex':
        return this.mapToGoogle(mapped)
      case 'cohere':
        return this.mapToCohere(mapped)
      default:
        return this.mapToGeneric(mapped)
    }
  }

  /**
   * Map to OpenAI API parameters
   */
  private static mapToOpenAI(mapped: MappedSamplerSettings): Record<string, any> {
    const params: Record<string, any> = {}

    if (mapped.temperature !== undefined) params.temperature = mapped.temperature
    if (mapped.maxOutputTokens !== undefined) params.max_tokens = mapped.maxOutputTokens
    if (mapped.topP !== undefined) params.top_p = mapped.topP
    if (mapped.frequencyPenalty !== undefined) params.frequency_penalty = mapped.frequencyPenalty
    if (mapped.presencePenalty !== undefined) params.presence_penalty = mapped.presencePenalty
    if (mapped.stopSequences) params.stop = mapped.stopSequences

    return params
  }

  /**
   * Map to Anthropic API parameters
   */
  private static mapToAnthropic(mapped: MappedSamplerSettings): Record<string, any> {
    const params: Record<string, any> = {}

    if (mapped.temperature !== undefined) params.temperature = mapped.temperature
    if (mapped.maxOutputTokens !== undefined) params.max_tokens = mapped.maxOutputTokens
    if (mapped.topP !== undefined) params.top_p = mapped.topP
    if (mapped.topK !== undefined) params.top_k = mapped.topK
    if (mapped.stopSequences) params.stop_sequences = mapped.stopSequences

    return params
  }

  /**
   * Map to Google/Vertex AI parameters
   */
  private static mapToGoogle(mapped: MappedSamplerSettings): Record<string, any> {
    const params: Record<string, any> = {}

    if (mapped.temperature !== undefined) params.temperature = mapped.temperature
    if (mapped.maxOutputTokens !== undefined) params.maxOutputTokens = mapped.maxOutputTokens
    if (mapped.topP !== undefined) params.topP = mapped.topP
    if (mapped.topK !== undefined) params.topK = mapped.topK
    if (mapped.stopSequences) params.stopSequences = mapped.stopSequences

    return params
  }

  /**
   * Map to Cohere parameters
   */
  private static mapToCohere(mapped: MappedSamplerSettings): Record<string, any> {
    const params: Record<string, any> = {}

    if (mapped.temperature !== undefined) params.temperature = mapped.temperature
    if (mapped.maxOutputTokens !== undefined) params.max_tokens = mapped.maxOutputTokens
    if (mapped.topP !== undefined) params.p = mapped.topP
    if (mapped.topK !== undefined) params.k = mapped.topK
    if (mapped.frequencyPenalty !== undefined) params.frequency_penalty = mapped.frequencyPenalty
    if (mapped.presencePenalty !== undefined) params.presence_penalty = mapped.presencePenalty
    if (mapped.stopSequences) params.stop_sequences = mapped.stopSequences

    return params
  }

  /**
   * Map to generic parameters
   */
  private static mapToGeneric(mapped: MappedSamplerSettings): Record<string, any> {
    return {
      temperature: mapped.temperature,
      maxOutputTokens: mapped.maxOutputTokens,
      topP: mapped.topP,
      topK: mapped.topK,
      frequencyPenalty: mapped.frequencyPenalty,
      presencePenalty: mapped.presencePenalty,
      stopSequences: mapped.stopSequences,
      ...mapped.advanced,
    }
  }

  /**
   * Validate sampling parameters
   */
  static validateSettings(mapped: MappedSamplerSettings): { valid: boolean; warnings: string[] } {
    const warnings: string[] = []
    let valid = true

    // Check temperature
    if (mapped.temperature !== undefined) {
      if (mapped.temperature < 0 || mapped.temperature > 2) {
        warnings.push('Temperature should be between 0 and 2')
      }
      if (mapped.temperature === 0) {
        warnings.push('Temperature of 0 may produce repetitive outputs')
      }
    }

    // Check top-p and top-k interaction
    if (mapped.topP !== undefined && mapped.topK !== undefined) {
      if (mapped.topP < 1 && mapped.topK < 100) {
        warnings.push('Using both low top-p and low top-k may be overly restrictive')
      }
    }

    // Check max tokens
    if (mapped.maxOutputTokens !== undefined && mapped.maxOutputTokens > 4096) {
      warnings.push('Very high token limits may cause long response times')
    }

    // Check advanced settings
    if (mapped.advanced?.mirostat) {
      const mirostat = mapped.advanced.mirostat
      if (mirostat.tau < 1 || mirostat.tau > 10) {
        warnings.push('Mirostat tau should typically be between 1 and 10')
      }
      if (mirostat.eta < 0.01 || mirostat.eta > 1) {
        warnings.push('Mirostat eta should typically be between 0.01 and 1')
      }
    }

    return { valid, warnings }
  }

  /**
   * Get recommended settings for different use cases
   */
  static getRecommendedSettings(useCase: 'creative' | 'balanced' | 'precise'): MappedSamplerSettings {
    switch (useCase) {
      case 'creative':
        return {
          temperature: 0.9,
          topP: 0.9,
          frequencyPenalty: 0.3,
          presencePenalty: 0.1,
        }
      
      case 'balanced':
        return {
          temperature: 0.7,
          topP: 0.8,
          frequencyPenalty: 0.1,
          presencePenalty: 0.0,
        }
      
      case 'precise':
        return {
          temperature: 0.3,
          topP: 0.7,
          topK: 40,
          frequencyPenalty: 0.0,
          presencePenalty: 0.0,
        }
      
      default:
        return this.getRecommendedSettings('balanced')
    }
  }

  /**
   * Clamp value between min and max
   */
  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  /**
   * Merge multiple sampler settings (later settings override earlier ones)
   */
  static mergeSettings(...settingsArray: MappedSamplerSettings[]): MappedSamplerSettings {
    const merged: MappedSamplerSettings = {}

    for (const settings of settingsArray) {
      Object.assign(merged, {
        temperature: settings.temperature ?? merged.temperature,
        maxOutputTokens: settings.maxOutputTokens ?? merged.maxOutputTokens,
        topP: settings.topP ?? merged.topP,
        topK: settings.topK ?? merged.topK,
        frequencyPenalty: settings.frequencyPenalty ?? merged.frequencyPenalty,
        presencePenalty: settings.presencePenalty ?? merged.presencePenalty,
        stopSequences: settings.stopSequences ?? merged.stopSequences,
      })

      if (settings.advanced) {
        merged.advanced = { ...merged.advanced, ...settings.advanced }
      }
    }

    return merged
  }
}