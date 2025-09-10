import { 
  CharacterCardSpec, 
  CharacterCardV1, 
  CharacterCardV2, 
  CharacterCardV3,
  ParsedCharacterCard,
  SillyTavernCharacterCard
} from './types'

/**
 * Determines character card specification version from data
 */
export function detectCharacterCardSpec(data: any): CharacterCardSpec | null {
  if (!data || typeof data !== 'object') return null
  
  // Check for V3
  if (data.spec === 'chara_card_v3' && data.spec_version === '3.0') {
    return 'chara_card_v3'
  }
  
  // Check for V2
  if (data.spec === 'chara_card_v2' && data.spec_version === '2.0') {
    return 'chara_card_v2'
  }
  
  // Check for V1 (has required fields but no spec)
  if (data.name && data.description && data.personality && 
      data.scenario && data.first_mes && data.mes_example &&
      !data.spec) {
    return 'chara_card_v1'
  }
  
  return null
}

/**
 * Parses V1 character card
 */
export function parseCharacterCardV1(data: CharacterCardV1): ParsedCharacterCard {
  return {
    name: data.name || '',
    description: data.description || '',
    personality: data.personality || '',
    scenario: data.scenario || '',
    firstMessage: data.first_mes || '',
    messageExample: data.mes_example || '',
    creatorNotes: data.creatorcomment || '',
    systemPrompt: undefined,
    postHistoryInstructions: undefined,
    alternateGreetings: undefined,
    tags: Array.isArray(data.tags) ? data.tags : [],
    creator: data.creator || '',
    characterVersion: undefined,
    avatar: data.avatar && data.avatar !== 'none' ? data.avatar : undefined,
    spec: 'chara_card_v1',
    specVersion: '1.0',
    characterBook: undefined,
    extensions: {
      talkativeness: data.talkativeness,
      fav: data.fav,
      chat: data.chat
    },
    originalData: data
  }
}

/**
 * Parses V2 character card
 */
export function parseCharacterCardV2(data: CharacterCardV2): ParsedCharacterCard {
  const cardData = data.data
  
  return {
    name: cardData.name || '',
    description: cardData.description || '',
    personality: cardData.personality || '',
    scenario: cardData.scenario || '',
    firstMessage: cardData.first_mes || '',
    messageExample: cardData.mes_example || '',
    creatorNotes: cardData.creator_notes || '',
    systemPrompt: cardData.system_prompt || undefined,
    postHistoryInstructions: cardData.post_history_instructions || undefined,
    alternateGreetings: cardData.alternate_greetings || undefined,
    tags: cardData.tags || [],
    creator: cardData.creator || '',
    characterVersion: cardData.character_version || undefined,
    avatar: undefined, // V2 doesn't embed avatar in JSON
    spec: 'chara_card_v2',
    specVersion: '2.0',
    characterBook: cardData.character_book || undefined,
    extensions: cardData.extensions || {},
    originalData: data
  }
}

/**
 * Parses V3 character card
 */
export function parseCharacterCardV3(data: CharacterCardV3): ParsedCharacterCard {
  const cardData = data.data
  
  return {
    name: cardData.name || data.name || '',
    description: cardData.description || data.description || '',
    personality: cardData.personality || data.personality || '',
    scenario: cardData.scenario || data.scenario || '',
    firstMessage: cardData.first_mes || data.first_mes || '',
    messageExample: cardData.mes_example || data.mes_example || '',
    creatorNotes: cardData.creator_notes || data.creatorcomment || '',
    systemPrompt: cardData.system_prompt || undefined,
    postHistoryInstructions: cardData.post_history_instructions || undefined,
    alternateGreetings: cardData.alternate_greetings || undefined,
    tags: cardData.tags || data.tags || [],
    creator: cardData.creator || '',
    characterVersion: cardData.character_version || undefined,
    avatar: data.avatar && data.avatar !== 'none' ? data.avatar : undefined,
    spec: 'chara_card_v3',
    specVersion: '3.0',
    characterBook: cardData.character_book || undefined,
    extensions: {
      ...cardData.extensions,
      talkativeness: data.talkativeness,
      fav: data.fav,
      chat: data.chat,
      group_only_greetings: cardData.group_only_greetings
    },
    originalData: data
  }
}

/**
 * Main parser function that handles all character card specs
 */
export function parseCharacterCard(data: any): ParsedCharacterCard | null {
  const spec = detectCharacterCardSpec(data)
  if (!spec) return null
  
  switch (spec) {
    case 'chara_card_v1':
      return parseCharacterCardV1(data as CharacterCardV1)
    case 'chara_card_v2':
      return parseCharacterCardV2(data as CharacterCardV2)
    case 'chara_card_v3':
      return parseCharacterCardV3(data as CharacterCardV3)
    default:
      return null
  }
}

/**
 * Extracts character name from data with fallback strategies
 */
export function extractCharacterName(data: any): string {
  // Try V2/V3 data structure first
  if (data.data?.name) {
    return data.data.name
  }
  
  // Try top-level name (V1 or V3)
  if (data.name) {
    return data.name
  }
  
  // Try filename-like fields
  if (data.filename) {
    return data.filename.replace(/\.(json|png)$/i, '')
  }
  
  // Generate fallback name with timestamp
  const timestamp = new Date().toISOString().slice(0, 16).replace('T', ' ')
  return `Character - ${timestamp}`
}

/**
 * Normalizes character data for consistent storage
 */
export function normalizeCharacterData(parsed: ParsedCharacterCard): ParsedCharacterCard {
  return {
    ...parsed,
    name: parsed.name.trim() || 'Unnamed Character',
    description: parsed.description.trim() || 'No description provided.',
    personality: parsed.personality.trim() || 'No personality defined.',
    scenario: parsed.scenario.trim() || 'No scenario defined.',
    firstMessage: parsed.firstMessage.trim() || 'Hello! How can I help you today?',
    messageExample: parsed.messageExample.trim() || '',
    creatorNotes: parsed.creatorNotes?.trim() || undefined,
    systemPrompt: parsed.systemPrompt?.trim() || undefined,
    postHistoryInstructions: parsed.postHistoryInstructions?.trim() || undefined,
    tags: parsed.tags?.filter(tag => tag.trim()) || [],
    creator: parsed.creator?.trim() || undefined,
    characterVersion: parsed.characterVersion?.trim() || undefined
  }
}

/**
 * Validates required fields for character data
 */
export function validateCharacterRequiredFields(data: any): string[] {
  const errors: string[] = []
  
  if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
    errors.push('Character name is required')
  }
  
  if (!data.description || typeof data.description !== 'string') {
    errors.push('Character description is required')
  }
  
  if (!data.personality || typeof data.personality !== 'string') {
    errors.push('Character personality is required')
  }
  
  if (!data.scenario || typeof data.scenario !== 'string') {
    errors.push('Character scenario is required')
  }
  
  if (!data.firstMessage || typeof data.firstMessage !== 'string') {
    errors.push('First message is required')
  }
  
  return errors
}