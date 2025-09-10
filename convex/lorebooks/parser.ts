import {
  WorldInfoEntry,
  SillyTavernWorldInfo,
  NovelAILorebook,
  AgnaiMemoryBook,
  RisuLorebook,
  ParsedLorebook,
  DEFAULT_ENTRY,
  DEFAULT_SETTINGS,
  WorldInfoLogic,
  WorldInfoPosition,
} from './types'

// Detect lorebook format
export function detectLorebookFormat(data: any): 'sillytavern' | 'novelai' | 'agnai' | 'risu' | 'unknown' {
  if (!data || typeof data !== 'object') return 'unknown'
  
  // Check for NovelAI format
  if ('lorebookVersion' in data && Array.isArray(data.entries)) {
    return 'novelai'
  }
  
  // Check for Agnai format
  if (data.kind === 'memory' && Array.isArray(data.entries)) {
    return 'agnai'
  }
  
  // Check for Risu format
  if (data.type === 'risu' && Array.isArray(data.data)) {
    return 'risu'
  }
  
  // Check for SillyTavern format
  if ('entries' in data && typeof data.entries === 'object') {
    return 'sillytavern'
  }
  
  return 'unknown'
}

// Parse SillyTavern native format
function parseSillyTavernLorebook(data: SillyTavernWorldInfo, name: string): ParsedLorebook {
  const entries: Record<string | number, WorldInfoEntry> = {}
  
  // Process entries
  Object.entries(data.entries || {}).forEach(([key, entry]) => {
    const uid = Number(key) || Number(entry.uid) || parseInt(key)
    entries[uid] = {
      ...DEFAULT_ENTRY,
      ...entry,
      uid,
      // Ensure arrays
      key: Array.isArray(entry.key) ? entry.key : [],
      keysecondary: Array.isArray(entry.keysecondary) ? entry.keysecondary : [],
      triggers: Array.isArray(entry.triggers) ? entry.triggers : [],
    }
  })
  
  return {
    name,
    description: '',
    entries,
    settings: {
      recursive: data.recursive ?? DEFAULT_SETTINGS.recursive,
      scanDepth: data.scan_depth ?? DEFAULT_SETTINGS.scanDepth,
      tokenBudget: data.token_budget ?? DEFAULT_SETTINGS.tokenBudget,
      recursionDepth: data.recursion_depth ?? DEFAULT_SETTINGS.recursionDepth,
      recursionSteps: data.recursion_steps ?? DEFAULT_SETTINGS.recursionSteps,
      minActivations: data.min_activations ?? DEFAULT_SETTINGS.minActivations,
      maxDepth: data.max_depth ?? DEFAULT_SETTINGS.maxDepth,
      insertionStrategy: data.insertion_strategy?.toString() ?? DEFAULT_SETTINGS.insertionStrategy,
      includeNames: data.include_names ?? DEFAULT_SETTINGS.includeNames,
      caseSensitive: data.case_sensitive ?? DEFAULT_SETTINGS.caseSensitive,
      matchWholeWords: data.match_whole_words ?? DEFAULT_SETTINGS.matchWholeWords,
      useGroupScoring: data.use_group_scoring ?? DEFAULT_SETTINGS.useGroupScoring,
      budgetCap: data.budget_cap ?? DEFAULT_SETTINGS.budgetCap,
    },
    format: 'sillytavern',
    originalData: data,
  }
}

// Convert NovelAI lorebook to SillyTavern format
function convertNovelAILorebook(data: NovelAILorebook, name: string): ParsedLorebook {
  const entries: Record<string | number, WorldInfoEntry> = {}
  
  data.entries.forEach((entry, index) => {
    const displayName = entry.displayName
    const addMemo = displayName !== undefined && displayName.trim() !== ''
    
    entries[index] = {
      ...DEFAULT_ENTRY,
      uid: index,
      key: Array.isArray(entry.keys) ? entry.keys : [],
      keysecondary: [],
      comment: displayName || '',
      content: entry.text,
      constant: entry.forceActivation || false,
      selective: false,
      vectorized: false,
      selectiveLogic: WorldInfoLogic.AND_ANY,
      order: entry.contextConfig?.budgetPriority ?? 100,
      position: WorldInfoPosition.before,
      disable: !entry.enabled,
      addMemo,
      excludeRecursion: false,
      preventRecursion: false,
      delayUntilRecursion: false,
      displayIndex: index,
      probability: 100,
      useProbability: true,
      depth: 4,
      group: '',
      groupOverride: false,
      groupWeight: 100,
      scanDepth: entry.searchRange ?? null,
      caseSensitive: null,
      matchWholeWords: null,
      useGroupScoring: null,
      automationId: '',
      role: 0,
      sticky: null,
      cooldown: null,
      delay: null,
      triggers: [],
    }
  })
  
  return {
    name,
    description: '',
    entries,
    settings: DEFAULT_SETTINGS,
    format: 'novelai',
    version: data.lorebookVersion?.toString(),
    originalData: data,
  }
}

// Convert Agnai Memory Book to SillyTavern format
function convertAgnaiMemoryBook(data: AgnaiMemoryBook, name: string): ParsedLorebook {
  const entries: Record<string | number, WorldInfoEntry> = {}
  
  data.entries.forEach((entry, index) => {
    entries[index] = {
      ...DEFAULT_ENTRY,
      uid: index,
      key: Array.isArray(entry.keywords) ? entry.keywords : [],
      keysecondary: [],
      comment: entry.name || '',
      content: entry.entry,
      constant: false,
      selective: false,
      vectorized: false,
      selectiveLogic: WorldInfoLogic.AND_ANY,
      order: entry.weight ?? entry.priority ?? 100,
      position: WorldInfoPosition.before,
      disable: !entry.enabled,
      addMemo: !!entry.name,
      excludeRecursion: false,
      preventRecursion: false,
      delayUntilRecursion: false,
      displayIndex: index,
      probability: 100,
      useProbability: true,
      depth: 4,
      group: '',
      groupOverride: false,
      groupWeight: 100,
      scanDepth: null,
      caseSensitive: null,
      matchWholeWords: null,
      useGroupScoring: null,
      automationId: '',
      role: 0,
      sticky: null,
      cooldown: null,
      delay: null,
      triggers: [],
    }
  })
  
  return {
    name,
    description: '',
    entries,
    settings: DEFAULT_SETTINGS,
    format: 'agnai',
    originalData: data,
  }
}

// Convert Risu Lorebook to SillyTavern format
function convertRisuLorebook(data: RisuLorebook, name: string): ParsedLorebook {
  const entries: Record<string | number, WorldInfoEntry> = {}
  
  data.data.forEach((entry, index) => {
    entries[index] = {
      ...DEFAULT_ENTRY,
      uid: index,
      key: entry.key.split(',').map(k => k.trim()).filter(k => k),
      keysecondary: entry.secondkey ? entry.secondkey.split(',').map(k => k.trim()).filter(k => k) : [],
      comment: entry.comment,
      content: entry.content,
      constant: entry.alwaysActive,
      selective: entry.selective,
      vectorized: false,
      selectiveLogic: WorldInfoLogic.AND_ANY,
      order: entry.insertorder,
      position: WorldInfoPosition.before,
      disable: false,
      addMemo: true,
      excludeRecursion: false,
      preventRecursion: false,
      delayUntilRecursion: false,
      displayIndex: index,
      probability: entry.activationPercent ?? 100,
      useProbability: true,
      depth: 4,
      group: '',
      groupOverride: false,
      groupWeight: 100,
      scanDepth: null,
      caseSensitive: null,
      matchWholeWords: null,
      useGroupScoring: null,
      automationId: '',
      role: 0,
      sticky: null,
      cooldown: null,
      delay: null,
      triggers: [],
    }
  })
  
  return {
    name,
    description: '',
    entries,
    settings: DEFAULT_SETTINGS,
    format: 'risu',
    originalData: data,
  }
}

// Main parser function
export function parseLorebook(data: any, fileName: string): ParsedLorebook | null {
  try {
    const format = detectLorebookFormat(data)
    const name = fileName.replace(/\.(json|jsonl|txt|png)$/i, '')
    
    switch (format) {
      case 'sillytavern':
        return parseSillyTavernLorebook(data as SillyTavernWorldInfo, name)
      case 'novelai':
        return convertNovelAILorebook(data as NovelAILorebook, name)
      case 'agnai':
        return convertAgnaiMemoryBook(data as AgnaiMemoryBook, name)
      case 'risu':
        return convertRisuLorebook(data as RisuLorebook, name)
      default:
        // Try to parse as SillyTavern format anyway
        if (data.entries && typeof data.entries === 'object') {
          return parseSillyTavernLorebook(data as SillyTavernWorldInfo, name)
        }
        return null
    }
  } catch (error) {
    console.error('Error parsing lorebook:', error)
    return null
  }
}

// Extract lorebook name from parsed data
export function extractLorebookName(lorebook: ParsedLorebook): string {
  return lorebook.name || 'Unnamed Lorebook'
}

// Normalize lorebook data for storage
export function normalizeLorebookData(lorebook: ParsedLorebook): ParsedLorebook {
  // Count entries
  const entryCount = Object.keys(lorebook.entries).length
  
  // Ensure all entries have proper UIDs
  const normalizedEntries: Record<string | number, WorldInfoEntry> = {}
  Object.entries(lorebook.entries).forEach(([key, entry], index) => {
    const uid = entry.uid ?? Number(key) ?? index
    normalizedEntries[uid] = {
      ...entry,
      uid,
    }
  })
  
  return {
    ...lorebook,
    entries: normalizedEntries,
    description: lorebook.description || `Imported lorebook with ${entryCount} entries`,
  }
}