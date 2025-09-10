import { CharacterValidationResult, CharacterCardSpec } from './types'
import { detectCharacterCardSpec, validateCharacterRequiredFields } from './parser'

/**
 * Validates a character card data structure
 */
export function validateCharacterCard(data: any): CharacterValidationResult {
  const result: CharacterValidationResult = {
    isValid: false,
    errors: [],
    warnings: []
  }
  
  // Basic structure validation
  if (!data || typeof data !== 'object') {
    result.errors.push('Invalid JSON structure - expected an object')
    return result
  }
  
  // Detect character card specification
  const detectedSpec = detectCharacterCardSpec(data)
  if (!detectedSpec) {
    result.errors.push('Unable to detect character card specification - may be an unsupported format')
    return result
  }
  
  result.detectedSpec = detectedSpec
  
  // Spec-specific validation
  switch (detectedSpec) {
    case 'chara_card_v1':
      validateCharacterCardV1(data, result)
      break
    case 'chara_card_v2':
      validateCharacterCardV2(data, result)
      break
    case 'chara_card_v3':
      validateCharacterCardV3(data, result)
      break
    default:
      result.warnings.push(`Character card spec '${detectedSpec}' has limited validation support`)
  }
  
  // Mark as valid if no errors
  result.isValid = result.errors.length === 0
  
  return result
}

/**
 * Validates V1 character card structure
 */
function validateCharacterCardV1(data: any, result: CharacterValidationResult): void {
  const requiredFields = ['name', 'description', 'personality', 'scenario', 'first_mes', 'mes_example']
  
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== 'string') {
      result.errors.push(`V1 character card is missing required field: ${field}`)
    }
  }
  
  // Check field lengths
  if (data.name && data.name.length > 100) {
    result.warnings.push('Character name is very long - may be truncated in some contexts')
  }
  
  if (data.description && data.description.length > 2000) {
    result.warnings.push('Character description is very long - may hit token limits')
  }
  
  if (data.personality && data.personality.length > 1000) {
    result.warnings.push('Character personality is very long - may hit token limits')
  }
  
  // Validate tags if present
  if (data.tags && !Array.isArray(data.tags)) {
    result.errors.push('Tags field must be an array')
  }
  
  // Validate talkativeness if present
  if (data.talkativeness !== undefined) {
    if (typeof data.talkativeness !== 'number' || data.talkativeness < 0 || data.talkativeness > 1) {
      result.warnings.push('Talkativeness should be a number between 0 and 1')
    }
  }
}

/**
 * Validates V2 character card structure
 */
function validateCharacterCardV2(data: any, result: CharacterValidationResult): void {
  // Validate spec fields
  if (data.spec !== 'chara_card_v2') {
    result.errors.push('Invalid spec field for V2 character card')
  }
  
  if (data.spec_version !== '2.0') {
    result.errors.push('Invalid spec_version for V2 character card')
  }
  
  // Validate data object
  if (!data.data || typeof data.data !== 'object') {
    result.errors.push('V2 character card missing required data object')
    return
  }
  
  const cardData = data.data
  
  // Only name is truly required for V2 cards - other fields can be empty
  const essentialFields = ['name']
  const optionalFields = ['description', 'personality', 'scenario', 'first_mes', 'mes_example', 'creator_notes']
  
  for (const field of essentialFields) {
    if (!cardData[field] || typeof cardData[field] !== 'string' || !cardData[field].trim()) {
      result.errors.push(`V2 character card data is missing required field: ${field}`)
    }
  }
  
  // Check optional fields exist but allow empty strings
  for (const field of optionalFields) {
    if (cardData[field] !== undefined && typeof cardData[field] !== 'string') {
      result.errors.push(`V2 character card field '${field}' must be a string if provided`)
    }
  }
  
  // Validate optional arrays
  if (cardData.tags && !Array.isArray(cardData.tags)) {
    result.errors.push('Tags field must be an array')
  }
  
  if (cardData.alternate_greetings && !Array.isArray(cardData.alternate_greetings)) {
    result.errors.push('Alternate greetings field must be an array')
  }
  
  // Validate character book if present
  if (cardData.character_book) {
    validateCharacterBook(cardData.character_book, result)
  }
  
  // Check content lengths
  validateContentLengths(cardData, result)
}

/**
 * Validates V3 character card structure
 */
function validateCharacterCardV3(data: any, result: CharacterValidationResult): void {
  // Validate spec fields
  if (data.spec !== 'chara_card_v3') {
    result.errors.push('Invalid spec field for V3 character card')
  }
  
  if (data.spec_version !== '3.0') {
    result.errors.push('Invalid spec_version for V3 character card')
  }
  
  // Validate data object
  if (!data.data || typeof data.data !== 'object') {
    result.errors.push('V3 character card missing required data object')
    return
  }
  
  const cardData = data.data
  
  // Only name is truly required for V3 cards - other fields can be empty
  const essentialFields = ['name']
  const optionalFields = ['description', 'personality', 'scenario', 'first_mes', 'mes_example', 'creator_notes']
  
  for (const field of essentialFields) {
    const value = cardData[field] || data[field] // V3 allows fields in both locations
    if (!value || typeof value !== 'string' || !value.trim()) {
      result.errors.push(`V3 character card is missing required field: ${field}`)
    }
  }
  
  // Check optional fields exist but allow empty strings
  for (const field of optionalFields) {
    const value = cardData[field] || data[field]
    if (value !== undefined && typeof value !== 'string') {
      result.errors.push(`V3 character card field '${field}' must be a string if provided`)
    }
  }
  
  // Validate arrays
  if (cardData.tags && !Array.isArray(cardData.tags)) {
    result.errors.push('Tags field must be an array')
  }
  
  if (cardData.alternate_greetings && !Array.isArray(cardData.alternate_greetings)) {
    result.errors.push('Alternate greetings field must be an array')
  }
  
  if (cardData.group_only_greetings && !Array.isArray(cardData.group_only_greetings)) {
    result.errors.push('Group only greetings field must be an array')
  }
  
  // Validate character book if present
  if (cardData.character_book) {
    validateCharacterBook(cardData.character_book, result)
  }
  
  // Check content lengths
  validateContentLengths(cardData, result)
}

/**
 * Validates character book/lorebook structure
 */
function validateCharacterBook(book: any, result: CharacterValidationResult): void {
  if (!book || typeof book !== 'object') {
    result.errors.push('Character book must be an object')
    return
  }
  
  if (!book.entries || !Array.isArray(book.entries)) {
    result.errors.push('Character book must have an entries array')
    return
  }
  
  // Validate each entry
  book.entries.forEach((entry: any, index: number) => {
    if (!entry || typeof entry !== 'object') {
      result.errors.push(`Character book entry ${index} must be an object`)
      return
    }
    
    if (!entry.keys || !Array.isArray(entry.keys)) {
      result.errors.push(`Character book entry ${index} must have a keys array`)
    }
    
    if (typeof entry.content !== 'string') {
      result.errors.push(`Character book entry ${index} must have content string`)
    }
    
    if (typeof entry.enabled !== 'boolean') {
      result.warnings.push(`Character book entry ${index} missing enabled flag - defaulting to true`)
    }
    
    if (typeof entry.insertion_order !== 'number') {
      result.warnings.push(`Character book entry ${index} missing insertion_order - may affect ordering`)
    }
  })
  
  // Check token budget
  if (book.token_budget && (typeof book.token_budget !== 'number' || book.token_budget < 1)) {
    result.warnings.push('Character book token budget should be a positive number')
  }
  
  // Check scan depth
  if (book.scan_depth && (typeof book.scan_depth !== 'number' || book.scan_depth < 1)) {
    result.warnings.push('Character book scan depth should be a positive number')
  }
}

/**
 * Validates content lengths and provides warnings
 */
function validateContentLengths(data: any, result: CharacterValidationResult): void {
  const lengthChecks = [
    { field: 'name', max: 100, label: 'Character name' },
    { field: 'description', max: 2000, label: 'Character description' },
    { field: 'personality', max: 1000, label: 'Character personality' },
    { field: 'scenario', max: 1500, label: 'Character scenario' },
    { field: 'first_mes', max: 1000, label: 'First message' },
    { field: 'mes_example', max: 2000, label: 'Message example' },
    { field: 'creator_notes', max: 1000, label: 'Creator notes' },
    { field: 'system_prompt', max: 2000, label: 'System prompt' },
    { field: 'post_history_instructions', max: 1000, label: 'Post history instructions' }
  ]
  
  for (const check of lengthChecks) {
    const value = data[check.field]
    if (value && typeof value === 'string' && value.length > check.max) {
      result.warnings.push(`${check.label} is very long (${value.length} chars) - may hit token limits`)
    }
  }
  
  // Check total greeting count
  const alternateGreetings = data.alternate_greetings || []
  const totalGreetings = 1 + alternateGreetings.length // first_mes + alternates
  if (totalGreetings > 20) {
    result.warnings.push(`Character has many greetings (${totalGreetings}) - may impact performance`)
  }
}

/**
 * Checks compatibility with fromyou2 features
 */
export function checkCharacterCompatibility(spec: CharacterCardSpec, data: any): {
  compatible: boolean
  supportedFeatures: string[]
  unsupportedFeatures: string[]
  recommendations: string[]
} {
  const result = {
    compatible: true,
    supportedFeatures: [] as string[],
    unsupportedFeatures: [] as string[],
    recommendations: [] as string[]
  }
  
  // Common supported features
  result.supportedFeatures.push(
    'Character conversations',
    'Custom personality and scenarios',
    'Message examples',
    'Creator notes'
  )
  
  switch (spec) {
    case 'chara_card_v1':
      result.supportedFeatures.push('Basic character data', 'Tags')
      result.recommendations.push('Consider upgrading to V2/V3 format for more features')
      break
      
    case 'chara_card_v2':
    case 'chara_card_v3':
      result.supportedFeatures.push(
        'System prompts',
        'Post-history instructions',
        'Alternate greetings',
        'Character books/lorebooks',
        'Advanced metadata'
      )
      
      if (data.data?.character_book) {
        result.supportedFeatures.push('World info integration')
      }
      
      if (spec === 'chara_card_v3') {
        result.supportedFeatures.push('Group chat support')
      }
      break
  }
  
  return result
}