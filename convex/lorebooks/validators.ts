import { ValidationResult, WorldInfoEntry } from './types'

// Validate a single world info entry
function validateEntry(entry: any, index: number | string): string[] {
  const errors: string[] = []
  
  // Check required fields
  if (!Array.isArray(entry.key) && typeof entry.key !== 'string') {
    errors.push(`Entry ${index}: 'key' must be an array or string`)
  }
  
  if (typeof entry.content !== 'string' && entry.content !== undefined && entry.content !== null) {
    errors.push(`Entry ${index}: 'content' must be a string`)
  }
  
  // Check boolean fields
  const booleanFields = [
    'constant', 'selective', 'vectorized', 'disable', 
    'excludeRecursion', 'preventRecursion', 'addMemo',
    'useProbability', 'groupOverride'
  ]
  
  booleanFields.forEach(field => {
    if (entry[field] !== undefined && typeof entry[field] !== 'boolean') {
      errors.push(`Entry ${index}: '${field}' must be a boolean`)
    }
  })
  
  // Check number fields
  const numberFields = [
    'order', 'position', 'probability', 'depth', 
    'groupWeight', 'displayIndex', 'selectiveLogic', 'role'
  ]
  
  numberFields.forEach(field => {
    if (entry[field] !== undefined && entry[field] !== null && typeof entry[field] !== 'number') {
      errors.push(`Entry ${index}: '${field}' must be a number`)
    }
  })
  
  return errors
}

// Validate SillyTavern native format
function validateSillyTavernLorebook(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check for entries object
  if (!data.entries || typeof data.entries !== 'object') {
    errors.push('Lorebook must contain an "entries" object')
    return { isValid: false, errors, warnings, format: 'sillytavern' }
  }
  
  // Validate each entry
  let entryCount = 0
  Object.entries(data.entries).forEach(([key, entry]) => {
    const entryErrors = validateEntry(entry, key)
    errors.push(...entryErrors)
    entryCount++
  })
  
  if (entryCount === 0) {
    warnings.push('Lorebook contains no entries')
  }
  
  // Check optional global settings
  const optionalNumberSettings = [
    'scan_depth', 'token_budget', 'recursion_depth', 
    'recursion_steps', 'min_activations', 'max_depth', 'budget_cap'
  ]
  
  optionalNumberSettings.forEach(setting => {
    if (data[setting] !== undefined && typeof data[setting] !== 'number') {
      warnings.push(`Global setting '${setting}' should be a number`)
    }
  })
  
  const optionalBooleanSettings = [
    'recursive', 'include_names', 'case_sensitive', 
    'match_whole_words', 'use_group_scoring'
  ]
  
  optionalBooleanSettings.forEach(setting => {
    if (data[setting] !== undefined && typeof data[setting] !== 'boolean') {
      warnings.push(`Global setting '${setting}' should be a boolean`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    format: 'sillytavern'
  }
}

// Validate NovelAI lorebook format
function validateNovelAILorebook(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!Array.isArray(data.entries)) {
    errors.push('NovelAI lorebook must contain an "entries" array')
    return { isValid: false, errors, warnings, format: 'novelai' }
  }
  
  if (typeof data.lorebookVersion !== 'number') {
    warnings.push('NovelAI lorebook should have a "lorebookVersion" number')
  }
  
  data.entries.forEach((entry: any, index: number) => {
    if (!entry.text || typeof entry.text !== 'string') {
      errors.push(`Entry ${index}: NovelAI entry must have a "text" field`)
    }
    
    if (!Array.isArray(entry.keys)) {
      errors.push(`Entry ${index}: NovelAI entry must have a "keys" array`)
    }
    
    if (typeof entry.enabled !== 'boolean') {
      warnings.push(`Entry ${index}: NovelAI entry should have an "enabled" boolean`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    format: 'novelai'
  }
}

// Validate Agnai Memory Book format
function validateAgnaiMemoryBook(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (data.kind !== 'memory') {
    errors.push('Agnai Memory Book must have kind="memory"')
  }
  
  if (!Array.isArray(data.entries)) {
    errors.push('Agnai Memory Book must contain an "entries" array')
    return { isValid: false, errors, warnings, format: 'agnai' }
  }
  
  data.entries.forEach((entry: any, index: number) => {
    if (!entry.entry || typeof entry.entry !== 'string') {
      errors.push(`Entry ${index}: Agnai entry must have an "entry" field`)
    }
    
    if (!Array.isArray(entry.keywords)) {
      errors.push(`Entry ${index}: Agnai entry must have a "keywords" array`)
    }
    
    if (typeof entry.enabled !== 'boolean') {
      warnings.push(`Entry ${index}: Agnai entry should have an "enabled" boolean`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    format: 'agnai'
  }
}

// Validate Risu Lorebook format
function validateRisuLorebook(data: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (data.type !== 'risu') {
    errors.push('Risu Lorebook must have type="risu"')
  }
  
  if (!Array.isArray(data.data)) {
    errors.push('Risu Lorebook must contain a "data" array')
    return { isValid: false, errors, warnings, format: 'risu' }
  }
  
  data.data.forEach((entry: any, index: number) => {
    if (!entry.key || typeof entry.key !== 'string') {
      errors.push(`Entry ${index}: Risu entry must have a "key" string`)
    }
    
    if (!entry.content || typeof entry.content !== 'string') {
      errors.push(`Entry ${index}: Risu entry must have a "content" string`)
    }
    
    if (typeof entry.alwaysActive !== 'boolean') {
      warnings.push(`Entry ${index}: Risu entry should have an "alwaysActive" boolean`)
    }
    
    if (typeof entry.insertorder !== 'number') {
      warnings.push(`Entry ${index}: Risu entry should have an "insertorder" number`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    format: 'risu'
  }
}

// Main validation function
export function validateLorebook(data: any): ValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      errors: ['Invalid lorebook data: must be an object'],
      warnings: []
    }
  }
  
  // Detect format and validate accordingly
  if ('lorebookVersion' in data && Array.isArray(data.entries)) {
    return validateNovelAILorebook(data)
  }
  
  if (data.kind === 'memory' && Array.isArray(data.entries)) {
    return validateAgnaiMemoryBook(data)
  }
  
  if (data.type === 'risu' && Array.isArray(data.data)) {
    return validateRisuLorebook(data)
  }
  
  if ('entries' in data && typeof data.entries === 'object') {
    return validateSillyTavernLorebook(data)
  }
  
  // Try to validate as SillyTavern format by default
  return validateSillyTavernLorebook(data)
}

// Check if a lorebook is valid for import
export function isValidLorebookForImport(data: any): boolean {
  const validation = validateLorebook(data)
  return validation.isValid
}

// Get a human-readable validation summary
export function getValidationSummary(validation: ValidationResult): string {
  if (validation.isValid) {
    if (validation.warnings.length > 0) {
      return `Valid ${validation.format} lorebook with ${validation.warnings.length} warnings`
    }
    return `Valid ${validation.format} lorebook`
  }
  
  return `Invalid lorebook: ${validation.errors[0] || 'Unknown error'}`
}