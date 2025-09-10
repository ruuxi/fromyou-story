'use client'

import { useState, useEffect, useRef } from 'react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { useCharacterSelection } from '@/hooks/useCharacterSelection'
import { useRouter } from 'next/navigation'
import { Character } from '@/types/character'
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion'
import { 
  Sparkles, 
  Plus, 
  ChevronRight, 
  ChevronLeft,
  Loader2,
  Check,
  Edit2,
  Wand2,
  Users,
  Globe,
  BookOpen,
  X,
  ArrowLeft,
  Save,
  Play,
  Trash2,
  Zap,
  Star,
  Heart,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type WizardMode = 'combined'

interface CustomCharacter {
  id: string
  docId?: string
  fullName: string
  gender: string
  characterLore?: string
  isCustomized?: boolean
  originalCharacter?: { fullName: string; source: string }
}

interface CustomWorld {
  id: string
  title: string
  lore: string
  isCustomized?: boolean
  originalSource?: string
}

interface CustomCreationWizardProps {
  onClose: () => void
  authArgs: { userId: string } | { sessionId: string } | null
}

const springConfig = { damping: 30, stiffness: 300 }
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export function CustomCreationWizard({ onClose, authArgs }: CustomCreationWizardProps) {
  // State management
  const [mode] = useState<WizardMode>('combined')
  const [isProcessing, setIsProcessing] = useState(false)
  const [actionType, setActionType] = useState<'save' | 'start'>('save')
  const [confirmingDeleteCharacterId, setConfirmingDeleteCharacterId] = useState<string | null>(null)
  const router = useRouter()
  
  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  
  // Content state
  const [storyIdea, setStoryIdea] = useState('')
  const [expandedIdeas, setExpandedIdeas] = useState<string[]>([])
  const [selectedIdeaIndex, setSelectedIdeaIndex] = useState<number>(-1)
  const [customCharacters, setCustomCharacters] = useState<CustomCharacter[]>([])
  const [customWorlds, setCustomWorlds] = useState<CustomWorld[]>([])
  const [showWorldSection, setShowWorldSection] = useState<boolean>(false)
  const [showCharactersSection, setShowCharactersSection] = useState<boolean>(false)
  
  // Get selected characters and their worlds
  const { selectedCharacters: globalSelectedCharacters, setSelectedCharacters: setGlobalSelectedCharacters } = useCharacterSelection()
  const [characterWorlds, setCharacterWorlds] = useState<Set<string>>(new Set())
  
  // Actions and mutations
  const expandStoryIdea = useAction(api.customContent.actions.expandStoryIdea)
  const generateCharacterLore = useAction(api.customContent.actions.generateCharacterLore)
  const generateWorldLore = useAction(api.customContent.actions.generateWorldLore)
  const createCustomCharacter = useMutation(api.customContent.mutations.createCustomCharacter)
  const createCustomizedCharacter = useMutation(api.customContent.mutations.createCustomizedCharacter)
  const createCustomWorldLore = useMutation(api.customContent.mutations.createCustomWorldLore)
  const createCustomizedWorldLore = useMutation(api.customContent.mutations.createCustomizedWorldLore)
  const createCustomStorySuggestion = useMutation(api.customContent.mutations.createCustomStorySuggestion)
  const updateCustomCharacter = useMutation(api.customContent.mutations.updateCustomCharacter)
  const saveSuggestion = useMutation(api.stories.mutations.saveSuggestion)
  const updateTagPreferences = useMutation(api.users.preferences.updateTagPreferences)
  const getFeed = useAction(api.stories.feed.getFeed)
  
  // Get character lore for selected characters
  const getCharacterLore = useQuery(api.characters.loreHelpers.getCharacterForLore, 
    globalSelectedCharacters.length > 0 ? {
      fullName: globalSelectedCharacters[0]?.fullName || '',
      source: globalSelectedCharacters[0]?.source || ''
    } : 'skip'
  )
  // Load existing custom characters to prefill editor
  const existingCustomChars = useQuery(api.customContent.queries.getActiveCustomCharacters, authArgs || 'skip') as any[] | 'skip'
  
  // Extract unique worlds from selected characters
  useEffect(() => {
    const worlds = new Set(globalSelectedCharacters.map(c => c.source))
    setCharacterWorlds(worlds)
  }, [globalSelectedCharacters])
  
  // No stepper/mode selection in combined mode
  // Initialize custom characters from existing database on first load
  useEffect(() => {
    if (existingCustomChars && existingCustomChars !== 'skip' && customCharacters.length === 0) {
      const mapped = existingCustomChars.map((c: any): CustomCharacter => ({
        id: String(c._id),
        docId: String(c._id),
        fullName: c.fullName,
        gender: c.gender || 'other',
        characterLore: c.characterLore || '',
        isCustomized: c.isCustomized || false,
        originalCharacter: c.originalCharacter,
      }))
      setCustomCharacters(mapped)
    }
  }, [existingCustomChars])

  // Active character selection for description editor
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null)
  const [selectedCustomIds, setSelectedCustomIds] = useState<Set<string>>(new Set())

  // Pick first available as default when list changes
  useEffect(() => {
    if (!activeCharacterId) {
      if (customCharacters.length > 0) setActiveCharacterId(customCharacters[0].id)
    } else {
      if (!customCharacters.some(c => c.id === activeCharacterId)) {
        setActiveCharacterId(customCharacters[0]?.id || null)
      }
    }
  }, [customCharacters, activeCharacterId])
  
  const handleExpandIdea = async () => {
    if (!storyIdea.trim() || !authArgs) return
    
    setIsProcessing(true)
    try {
      const expanded = await expandStoryIdea({
        ...authArgs,
        originalIdea: storyIdea,
        characters: globalSelectedCharacters
      })
      setExpandedIdeas(expanded)
    } catch (error) {
      console.error('Failed to expand idea:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleEnhanceCharacter = async (index: number) => {
    if (!authArgs) return
    const char = customCharacters[index]
    if (!char.fullName || !char.gender) return
    setIsProcessing(true)
    try {
      const lore = await generateCharacterLore({
        ...(authArgs as any),
        characterName: char.fullName,
        gender: char.gender,
      })
      const updated = [...customCharacters]
      updated[index].characterLore = lore
      setCustomCharacters(updated)
    } catch (e) {
      console.error('Failed to enhance character lore:', e)
    } finally {
      setIsProcessing(false)
    }
  }
  
  // Ensure a custom entry exists for a selected character; return its index
  const ensureCustomForSelected = (character: Character): number => {
    const existingIdx = customCharacters.findIndex(c =>
      (c.originalCharacter && c.originalCharacter.fullName === character.fullName && c.originalCharacter.source === character.source) ||
      (c.fullName === character.fullName && !c.originalCharacter)
    )
    if (existingIdx >= 0) return existingIdx
    const customChar: CustomCharacter = {
      id: `temp-${Date.now()}-${Math.random()}`,
      fullName: character.fullName,
      gender: character.gender || 'other',
      characterLore: '',
      isCustomized: true,
      originalCharacter: {
        fullName: character.fullName,
        source: character.source,
      },
    }
    setCustomCharacters(prev => [...prev, customChar])
    return customCharacters.length
  }
  
  const handleAddNewCharacter = () => {
    const newChar: CustomCharacter = {
      id: `new-${Date.now()}-${Math.random()}`,
      fullName: '',
      gender: 'other',
      characterLore: '',
      isCustomized: false
    }
    setCustomCharacters([...customCharacters, newChar])
    setActiveCharacterId(newChar.id)
  }
  
  const handleCustomizeWorld = async (source: string) => {
    const customWorld: CustomWorld = {
      id: `world-${Date.now()}-${Math.random()}`,
      title: source,
      lore: '',
      isCustomized: true,
      originalSource: source
    }
    setCustomWorlds([...customWorlds, customWorld])
  }
  
  const handleComplete = async (action: 'save' | 'start' = 'save') => {
    setIsProcessing(true)
    setActionType(action)
    try {
      // Save all custom content
      for (const char of customCharacters) {
        if (char.fullName.trim()) {
          if (char.docId) {
            await updateCustomCharacter({
              ...(authArgs as any),
              characterId: char.docId as any,
              fullName: char.fullName,
              gender: char.gender,
              characterLore: char.characterLore,
              isActive: true,
            })
            // Ensure appears in global selected characters list
            setGlobalSelectedCharacters(prev => {
              const exists = prev.some(p => p.fullName === char.fullName && p.source === 'Custom')
              return exists ? prev : [...prev, { fullName: char.fullName, gender: char.gender, source: 'Custom' }]
            })
          } else if (char.isCustomized && char.originalCharacter) {
            const id = await createCustomizedCharacter({
              ...authArgs,
              originalFullName: char.originalCharacter.fullName,
              originalSource: char.originalCharacter.source,
              fullName: char.fullName,
              gender: char.gender,
              characterLore: char.characterLore
            })
            char.docId = String(id)
            setGlobalSelectedCharacters(prev => {
              const exists = prev.some(p => p.fullName === char.fullName && p.source === 'Custom')
              return exists ? prev : [...prev, { fullName: char.fullName, gender: char.gender, source: 'Custom' }]
            })
          } else {
            const id = await createCustomCharacter({
              ...authArgs,
              fullName: char.fullName,
              gender: char.gender,
              characterLore: char.characterLore,
              isCustomized: false
            })
            char.docId = String(id)
            setGlobalSelectedCharacters(prev => {
              const exists = prev.some(p => p.fullName === char.fullName && p.source === 'Custom')
              return exists ? prev : [...prev, { fullName: char.fullName, gender: char.gender, source: 'Custom' }]
            })
          }
        }
      }
      
      for (const world of customWorlds) {
        if (world.title.trim() && world.lore.trim()) {
          if (world.isCustomized && world.originalSource) {
            await createCustomizedWorldLore({
              ...authArgs,
              originalSource: world.originalSource,
              title: world.title,
              lore: world.lore
            })
          } else {
            await createCustomWorldLore({
              ...authArgs,
              title: world.title,
              lore: world.lore,
              isCustomized: false
            })
          }
        }
      }
      
      // Create story suggestion
      let suggestionId = null
      if (storyIdea.trim() || selectedIdeaIndex >= 0 || action === 'start') {
        const finalIdea = selectedIdeaIndex >= 0 ? expandedIdeas[selectedIdeaIndex] : (storyIdea || 'A custom story')
        const mainChars = customCharacters.filter(c => selectedCustomIds.has(c.id) && c.fullName).map(c => c.fullName)
        
        await createCustomStorySuggestion({
          ...authArgs,
          text: finalIdea,
          mainCharacters: mainChars.slice(0, 2),
          sideCharacters: mainChars.slice(2),
          genre: 'custom',
          storyType: 'custom',
          playerMode: false,
           characterCount: mainChars.length.toString()
        })
        
        if (action === 'start') {
          const storySuggestionId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          await saveSuggestion({
            ...authArgs,
            suggestionId: storySuggestionId,
            text: finalIdea,
            characters: {
              main_characters: mainChars.slice(0, 2),
              side_characters: mainChars.slice(2)
            },
            metadata: {
              characters: mainChars,
              sources: ['Custom'],
              primarySource: 'Custom',
              genre: 'custom',
              storyType: 'custom',
              playerMode: false,
              characterCount: mainChars.length.toString()
            }
          })
          suggestionId = storySuggestionId
        }
      }
      
      if (action === 'start' && suggestionId) {
        router.push(`/stories/new?suggestionId=${suggestionId}`)
      } else {
        onClose()
      }
    } catch (error) {
      console.error('Failed to save custom content:', error)
    } finally {
      setIsProcessing(false)
      setActionType('save')
    }
  }

  const handleAddAsFeedRule = async () => {
    if (!authArgs) return
    const finalIdea = selectedIdeaIndex >= 0 ? expandedIdeas[selectedIdeaIndex] : (storyIdea || '')
    if (!finalIdea.trim()) return
    setIsProcessing(true)
    try {
      // Save rule to preferences
      await updateTagPreferences({
        ...(authArgs as any),
        selectedTags: undefined,
        searchRule: finalIdea,
      })

      // Ensure we have at least one custom suggestion persisted so feed treats user as having custom
      const mainChars = customCharacters.filter(c => c.fullName).map(c => c.fullName)
      await createCustomStorySuggestion({
        ...(authArgs as any),
        text: finalIdea,
        mainCharacters: mainChars.slice(0, 2),
        sideCharacters: mainChars.slice(2),
        genre: 'custom',
        storyType: 'custom',
        playerMode: false,
        characterCount: mainChars.length.toString(),
      })

      // Warm the feed in background
      try {
      const baseArgs: any = { ...(authArgs as any), limit: 12, selectedTags: [], searchRule: finalIdea }
      // character grouping/roles are not used here; keep minimal for validator compatibility
      await getFeed(baseArgs)
      } catch {}
      
      onClose()
    } catch (e) {
      console.error('Failed to add rule:', e)
    } finally {
      setIsProcessing(false)
    }
  }
  
  const renderCombined = () => (
    <motion.div className="space-y-6 relative" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
      {/* Close button */}
      {onClose && (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-1 right-2 w-5 h-5 flex items-center justify-center text-white/60 hover:text-white z-10 pointer-events-auto"
          title="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      )}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">Create Your Story</h2>
        <p className="text-white/70 text-sm">Start with a story concept and characters. World is optional.</p>
      </div>

      {/* Story Concept */}
      <div className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg md:text-xl font-semibold text-white">Story Concept</h3>
          <motion.button
            onClick={handleAddAsFeedRule}
            disabled={(!storyIdea.trim() && selectedIdeaIndex < 0) || isProcessing}
            className="px-3 py-1.5 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 hover:from-amber-900/18 hover:via-sky-900/12 hover:to-purple-900/8 border border-white/20 text-white/80 text-sm rounded-lg disabled:opacity-40 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Add as Feed Rule
          </motion.button>
        </div>
        <div className="relative">
          <textarea
            value={storyIdea}
            onChange={(e) => setStoryIdea(e.target.value)}
            placeholder="A story about..."
            className="w-full h-28 px-4 py-3 bg-white/5 hover:bg-white/8 focus:bg-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none transition-all duration-300 backdrop-blur-xl resize-none border border-white/5 focus:border-white/10"
          />
          <div className="absolute bottom-2 right-3 text-xs text-white/40">{storyIdea.length} characters</div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/50">Use AI to polish your concept or save it as a rule to guide your feed.</p>
          <motion.button
            onClick={handleExpandIdea}
            disabled={!storyIdea.trim() || isProcessing}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 hover:from-amber-900/18 hover:via-sky-900/12 hover:to-purple-900/8 border border-white/20 text-white/80 rounded-lg disabled:opacity-30 transition-all"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            Enhance with AI
          </motion.button>
        </div>
        <AnimatePresence>
          {expandedIdeas.length > 0 && (
            <motion.div className="space-y-2 pt-1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div className="text-xs text-white/50 font-medium uppercase tracking-wider">Enhanced Versions</div>
              {expandedIdeas.map((idea, index) => (
                <motion.button
                  key={index}
                  onClick={() => setSelectedIdeaIndex(index)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${selectedIdeaIndex === index ? 'bg-white/10 border-white/20 text-white' : 'bg-white/5 border-white/5 text-white/80 hover:bg-white/8'}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <p className="text-sm leading-relaxed pr-6">{idea}</p>
                  {selectedIdeaIndex === index && (
                    <Check className="w-4 h-4 text-white/60 absolute top-3 right-3" />
                  )}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Characters - collapsible section (progressive disclosure) */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowCharactersSection(v => !v)}
          className="w-full px-0 py-3 text-left flex items-center justify-between"
        >
          <span className="text-white font-medium">Characters</span>
          {showCharactersSection ? <ChevronUp className="w-4 h-4 text-white/70" /> : <ChevronDown className="w-4 h-4 text-white/70" />}
        </button>
        <AnimatePresence>
          {showCharactersSection && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/60">Tap a bubble to edit</div>
                  <motion.button onClick={handleAddNewCharacter} disabled={customCharacters.length >= 24} className="px-3 py-1.5 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 hover:from-amber-900/18 hover:via-sky-900/12 hover:to-purple-900/8 border border-white/20 text-white/80 text-xs rounded-lg disabled:opacity-30 transition-all">Add</motion.button>
                </div>
                {/* Custom bubbles */}
                <div className="space-y-2">
                  <div className="text-xs text-white/60">Custom</div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const customBubbles = customCharacters
                        .filter(c => c.fullName && c.fullName.trim().length > 0)
                        .map(c => ({ id: c.id, fullName: c.fullName }))
                      return customBubbles.map(({ id, fullName }) => {
                        const isActive = id === activeCharacterId
                        const isSelected = selectedCustomIds.has(id)
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              setActiveCharacterId(id)
                              setSelectedCustomIds(prev => {
                                const next = new Set(prev)
                                if (next.has(id)) next.delete(id); else next.add(id)
                                return next
                              })
                            }}
                            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${isSelected ? 'bg-white/20 border-white/40 text-white' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
                          >
                            {fullName}
                          </button>
                        )
                      })
                    })()}
                  </div>
                </div>

                {/* Selected bubbles (non-custom only, dedup against custom) */}
                <div className="space-y-2">
                  <div className="text-xs text-white/60">Selected</div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const customNames = new Set(customCharacters.map(c => (c.fullName || '').toLowerCase()))
                      const seen = new Set<string>()
                      const selectedOnly = globalSelectedCharacters.filter(c => (c.source || '').toLowerCase() !== 'custom')
                      const bubbles = selectedOnly.filter(c => {
                        const key = `${(c.source||'').toLowerCase()}|${(c.fullName||'').toLowerCase()}`
                        if (seen.has(key)) return false
                        seen.add(key)
                        // If a custom exists with same name, skip to avoid duplicate appearance
                        if (customNames.has((c.fullName||'').toLowerCase())) return false
                        return true
                      })
                      return bubbles.map((c) => (
                        <button
                          key={`${c.source}|${c.fullName}`}
                          type="button"
                          onClick={() => {
                            const idx = ensureCustomForSelected(c as Character)
                            const id = customCharacters[idx]?.id || customCharacters[customCharacters.length - 1]?.id
                            if (id) {
                              setActiveCharacterId(id)
                              setShowCharactersSection(true)
                              setSelectedCustomIds(prev => new Set(prev).add(id))
                            }
                          }}
                          className="px-3 py-1.5 text-xs rounded-full border bg-white/5 border-white/10 text-white/80 hover:bg-white/10"
                        >
                          {c.fullName}
                        </button>
                      ))
                    })()}
                  </div>
                </div>
                
                {activeCharacterId && (() => {
                  const idx = customCharacters.findIndex(c => c.id === activeCharacterId)
                  if (idx < 0) return null
                  const char = customCharacters[idx]
                  return (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={char.fullName}
                          onChange={(e) => {
                            const updated = [...customCharacters]
                            updated[idx].fullName = e.target.value
                            setCustomCharacters(updated)
                          }}
                          placeholder="Character name"
                          className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:bg-white/15"
                        />
                <select
                  value={char.gender}
                  onChange={(e) => {
                    const updated = [...customCharacters]
                    updated[idx].gender = e.target.value
                    setCustomCharacters(updated)
                  }}
                  className="px-3 py-2 bg-white/10 rounded-lg text-white"
                  style={{ colorScheme: 'dark' }}
                >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                        <motion.button onClick={() => handleEnhanceCharacter(idx)} disabled={!char.fullName || isProcessing} className="px-3 py-1.5 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 hover:from-amber-900/18 hover:via-sky-900/12 hover:to-purple-900/8 border border-white/20 text-white/80 text-xs rounded-lg disabled:opacity-40 transition-all">
                          {isProcessing ? 'Enhancing...' : 'Enhance'}
                        </motion.button>
                        <motion.button
                          onClick={() => {
                            setConfirmingDeleteCharacterId(char.id)
                          }}
                          className="p-2 text-white/30 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                      {char.gender === 'other' && (
                        <input type="text" placeholder="Specify gender" className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/30" />
                      )}
                      <div className="space-y-2">
                        <div className="text-xs text-white/60">Description</div>
                        <textarea
                          value={char.characterLore || ''}
                          onChange={(e) => {
                            const updated = [...customCharacters]
                            updated[idx].characterLore = e.target.value
                            setCustomCharacters(updated)
                          }}
                          placeholder="Character description (can be long)"
                          className="w-full min-h-[120px] max-h-[40vh] px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:bg-white/15 resize-y"
                        />
                        {confirmingDeleteCharacterId === char.id && (
                          <ConfirmDialog
                            isOpen={true}
                            title="Delete this character?"
                            message="This will remove it from your custom characters."
                            confirmText="Delete"
                            cancelText="Cancel"
                            destructive
                            onCancel={() => setConfirmingDeleteCharacterId(null)}
                            onConfirm={async () => {
                              const updated = customCharacters.filter(c => c.id !== char.id)
                              setCustomCharacters(updated)
                              setConfirmingDeleteCharacterId(null)
                              setGlobalSelectedCharacters(prev => prev.filter(p => !(p.fullName === char.fullName && p.source === 'Custom')))
                              if (char.docId && authArgs) {
                                try { updateCustomCharacter({ ...(authArgs as any), characterId: char.docId as any, isActive: false }) } catch {}
                              }
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })()}
                {customCharacters.length === 0 && (
                  <div className="py-8 text-center">
                    <Users className="w-10 h-10 text-white/20 mx-auto mb-2" />
                    <p className="text-white/50 text-sm">No custom characters yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Optional World Section */}
      <div className="border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={() => setShowWorldSection(v => !v)}
          className="w-full px-0 py-3 text-left flex items-center justify-between"
        >
          <span className="text-white font-medium">World (optional)</span>
          {showWorldSection ? <ChevronUp className="w-4 h-4 text-white/70" /> : <ChevronDown className="w-4 h-4 text-white/70" />}
        </button>
        <AnimatePresence>
          {showWorldSection && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div className="pb-2">{renderWorldStep(false)}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky Footer Actions */}
      <div className="sticky bottom-0 left-0 right-0 pt-4">
        <div className="px-2 md:px-4 py-2 md:py-3 flex justify-end gap-2 md:gap-3">
          <motion.button
            onClick={() => handleComplete('save')}
            disabled={isProcessing}
            className="px-4 md:px-5 py-2 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 hover:from-amber-900/18 hover:via-sky-900/12 hover:to-purple-900/8 border border-white/20 text-white/80 rounded-lg disabled:opacity-40 transition-all"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            {isProcessing && actionType === 'save' ? 'Saving...' : 'Save'}
          </motion.button>
          <motion.button
            onClick={() => handleComplete('start')}
            disabled={isProcessing || (!storyIdea.trim() && selectedIdeaIndex < 0 && selectedCustomIds.size === 0)}
            className="px-4 md:px-5 py-2 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 hover:from-amber-900/18 hover:via-sky-900/12 hover:to-purple-900/8 border border-white/20 text-white/80 rounded-lg disabled:opacity-40 transition-all"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            {isProcessing && actionType === 'start' ? 'Starting...' : 'Start Story'}
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
  
  const renderIdeaStep = () => (
    <motion.div className="space-y-6" {...fadeInUp}>
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">Story Concept</h3>
        <p className="text-sm text-white/50">What story do you want to tell?</p>
      </div>
      
      <div className="space-y-4">
        <motion.div 
          className="relative"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <textarea
            value={storyIdea}
            onChange={(e) => setStoryIdea(e.target.value)}
            placeholder="A story about..."
            className="w-full h-32 px-4 py-3 bg-white/5 hover:bg-white/8 focus:bg-white/10 rounded-2xl text-white placeholder-white/30 focus:outline-none transition-all duration-300 backdrop-blur-xl resize-none border border-white/5 focus:border-white/10"
            style={{ scrollbarWidth: 'thin' }}
          />
          <div className="absolute bottom-3 right-3 text-xs text-white/30">
            {storyIdea.length} characters
          </div>
        </motion.div>
        
        <motion.button
          onClick={handleExpandIdea}
          disabled={!storyIdea.trim() || isProcessing}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/15 hover:to-pink-500/15 text-white rounded-2xl transition-all duration-300 font-medium backdrop-blur-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          )}
          Enhance with AI
        </motion.button>
        
        <AnimatePresence>
          {expandedIdeas.length > 0 && (
            <motion.div 
              className="space-y-3 mt-4"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <p className="text-xs text-white/50 font-medium uppercase tracking-wider">Enhanced Versions</p>
              {expandedIdeas.map((idea, index) => (
                <motion.button
                  key={index}
                  onClick={() => setSelectedIdeaIndex(index)}
                  className={`w-full text-left p-4 rounded-2xl transition-all duration-300 relative overflow-hidden group ${
                    selectedIdeaIndex === index
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-white/5 text-white/80 hover:bg-white/8 border border-white/5'
                  }`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <p className="text-sm leading-relaxed">{idea}</p>
                  <AnimatePresence>
                    {selectedIdeaIndex === index && (
                      <motion.div 
                        className="absolute top-3 right-3"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Check className="w-4 h-4 text-white/60" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      <div className="flex justify-between items-center pt-4">
        <div />
        
        <div className="flex gap-3">
          <motion.button
            onClick={() => handleComplete('save')}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-all duration-300 font-medium flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <>
              <Save className="w-4 h-4" />
              Save
            </>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
  
  const renderCharactersStep = () => (
    <motion.div className="space-y-6" {...fadeInUp}>
      <div className="text-center">
        <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">Characters</h3>
        <p className="text-sm text-white/50">Bring your characters to life</p>
      </div>
      
      <AnimatePresence mode="wait">
        {globalSelectedCharacters.length > 0 && (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-xs text-white/50 font-medium uppercase tracking-wider">Selected Characters</p>
            <div className="grid gap-2">
              {globalSelectedCharacters.map((char, index) => (
                <motion.div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-xl backdrop-blur-xl hover:bg-white/8 transition-all duration-300 group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div>
                    <p className="text-white font-medium">{char.fullName}</p>
                    <p className="text-xs text-white/40">{char.source}</p>
                  </div>
                    <motion.button
                      onClick={() => {
                        const idx = ensureCustomForSelected(char)
                        const newId = (customCharacters[idx]?.id) || `temp-${Date.now()}-${Math.random()}`
                        setActiveCharacterId(newId)
                      }}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all duration-300 flex items-center gap-1.5 opacity-0 group-hover:opacity-100"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/50 font-medium uppercase tracking-wider">Custom Characters</p>
          <motion.button
            onClick={handleAddNewCharacter}
            disabled={customCharacters.length >= 24}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white text-sm rounded-lg transition-all duration-300 flex items-center gap-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus className="w-3 h-3" />
            Add
          </motion.button>
        </div>
        
        <AnimatePresence>
          {customCharacters.map((char, index) => (
            <motion.div 
              key={char.id} 
              className="p-4 bg-white/5 rounded-2xl backdrop-blur-xl space-y-3 border border-white/5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  value={char.fullName}
                  onChange={(e) => {
                    const updated = [...customCharacters]
                    updated[index].fullName = e.target.value
                    setCustomCharacters(updated)
                  }}
                  placeholder="Character name"
                  className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-all duration-300"
                />
                <select
                  value={char.gender}
                  onChange={(e) => {
                    const updated = [...customCharacters]
                    updated[index].gender = e.target.value
                    setCustomCharacters(updated)
                  }}
                  className="px-3 py-2 bg-white/10 rounded-lg text-white focus:outline-none focus:bg-white/15 transition-all duration-300 cursor-pointer"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <motion.button
                  onClick={() => {
                    const updated = customCharacters.filter(c => c.id !== char.id)
                    setCustomCharacters(updated)
                  }}
                  className="p-2 text-white/30 hover:text-red-400 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
              
              <AnimatePresence>
                {char.gender === 'other' && (
                  <motion.input
                    type="text"
                    placeholder="Specify gender"
                    className="w-full px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-all duration-300"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  />
                )}
              </AnimatePresence>
              
              <textarea
                value={char.characterLore || ''}
                onChange={(e) => {
                  const updated = [...customCharacters]
                  updated[index].characterLore = e.target.value
                  setCustomCharacters(updated)
                }}
                placeholder="Character description (optional)"
                className="w-full h-20 px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-all duration-300 resize-none"
              />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {customCharacters.length === 0 && (
          <motion.div 
            className="py-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Users className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No custom characters yet</p>
            <p className="text-white/30 text-xs mt-1">Click "Add" to create one</p>
          </motion.div>
        )}
      </div>
      
      <div className="flex justify-between items-center pt-4">
        <div />
        
        <div className="flex gap-3">
          <motion.button
            onClick={() => handleComplete('save')}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-all duration-300 font-medium flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <>
              <Save className="w-4 h-4" />
              Save
            </>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
  
  const renderWorldStep = (showActions: boolean = true) => (
    <motion.div className="space-y-6" {...fadeInUp}>
      {showActions && (
        <div className="text-center">
          <h3 className="text-xl md:text-2xl font-semibold text-white mb-2">World Building</h3>
          <p className="text-sm text-white/50">Define your story's universe</p>
        </div>
      )}
      
      <AnimatePresence>
        {characterWorlds.size > 0 && (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-xs text-white/60">Character Worlds</p>
            <div className="flex flex-wrap gap-2">
              {Array.from(characterWorlds).map((world, index) => (
                <button
                  key={world}
                  type="button"
                  onClick={() => handleCustomizeWorld(world)}
                  className="px-3 py-1.5 text-xs rounded-full border bg-white/5 border-white/10 text-white/80 hover:bg-white/10 transition-all"
                >
                  {world}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="space-y-3">
        <motion.button
          onClick={() => {
            const newWorld: CustomWorld = {
              id: `world-${Date.now()}-${Math.random()}`,
              title: '',
              lore: '',
              isCustomized: false
            }
            setCustomWorlds([...customWorlds, newWorld])
          }}
          className="w-full px-4 py-3 bg-white/5 hover:bg-white/10 text-white/80 rounded-xl transition-all duration-300 font-medium backdrop-blur-xl flex items-center justify-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus className="w-4 h-4" />
          Add World Manually
        </motion.button>
        
        <motion.button
          onClick={async () => {
            if (!authArgs) return
            setIsProcessing(true)
            try {
              const result = await generateWorldLore({
                ...authArgs,
                theme: storyIdea || 'fantasy adventure',
                existingLore: customWorlds.map(w => w.lore).filter(Boolean)
              })
              const newWorld: CustomWorld = {
                id: `world-${Date.now()}-${Math.random()}`,
                title: result.title,
                lore: result.lore,
                isCustomized: false
              }
              setCustomWorlds([...customWorlds, newWorld])
            } catch (error) {
              console.error('Failed to generate world lore:', error)
            } finally {
              setIsProcessing(false)
            }
          }}
          disabled={isProcessing}
          className="w-full px-4 py-3 bg-gradient-to-r from-sky-500/10 to-cyan-500/10 hover:from-sky-500/15 hover:to-cyan-500/15 border border-sky-300/20 text-sky-100/90 rounded-2xl transition-all duration-300 font-medium backdrop-blur-xl disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Wand2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          )}
          Generate World
        </motion.button>
        
        <AnimatePresence>
          {customWorlds.map((world, index) => (
            <motion.div 
              key={world.id} 
              className="p-4 bg-white/5 rounded-2xl backdrop-blur-xl space-y-3 border border-white/5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              layout
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  value={world.title}
                  onChange={(e) => {
                    const updated = [...customWorlds]
                    updated[index].title = e.target.value
                    setCustomWorlds(updated)
                  }}
                  placeholder="World name"
                  className="flex-1 px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-all duration-300"
                />
                <motion.button
                  onClick={() => {
                    const updated = customWorlds.filter(w => w.id !== world.id)
                    setCustomWorlds(updated)
                  }}
                  className="p-2 text-white/30 hover:text-red-400 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Trash2 className="w-4 h-4" />
                </motion.button>
              </div>
              
              <textarea
                value={world.lore}
                onChange={(e) => {
                  const updated = [...customWorlds]
                  updated[index].lore = e.target.value
                  setCustomWorlds(updated)
                }}
                placeholder="Describe the world, its history, magic systems, technology..."
                className="w-full h-32 px-3 py-2 bg-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:bg-white/15 transition-all duration-300 resize-none"
              />
            </motion.div>
          ))}
        </AnimatePresence>
        
        {customWorlds.length === 0 && (
          <motion.div 
            className="py-12 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Globe className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No worlds created yet</p>
            <p className="text-white/30 text-xs mt-1">Click "Add World Manually" or generate one with AI</p>
          </motion.div>
        )}
      </div>
      
      {showActions && (
        <div className="flex justify-between items-center pt-4">
          <div />
          
          <div className="flex gap-3">
            <motion.button
              onClick={() => handleComplete('save')}
              disabled={isProcessing}
              className="px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl transition-all duration-300 font-medium flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isProcessing && actionType === 'save' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save
                </>
              )}
            </motion.button>
            
            <motion.button
              onClick={() => handleComplete('start')}
              disabled={isProcessing || (!storyIdea.trim() && selectedIdeaIndex < 0 && customCharacters.length === 0)}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-white rounded-xl transition-all duration-300 font-medium backdrop-blur-xl flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed border border-white/10"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isProcessing && actionType === 'start' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Story
                </>
              )}
            </motion.button>
          </div>
        </div>
      )}
    </motion.div>
  )
  
  const renderContent = () => {
    return renderCombined()
  }
  
  return (
    <div className="mx-auto w-full max-w-4xl px-3 md:px-4 py-4 md:py-6" ref={containerRef}>
      <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
    </div>
  )
}