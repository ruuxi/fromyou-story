'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useSearchOverlay } from '@/contexts/SearchOverlayContext'
import { TagAutoComplete } from './TagAutoComplete'
import { CharacterSearch } from '@/components/characters/CharacterSearch'
import { Unlink, Star, UserRound } from 'lucide-react'
import { useCharacterSelection } from '@/hooks/useCharacterSelection'
import { useAuthState } from '@/hooks/useAuthState'
import { AnonUserSignUpNotification } from '@/components/auth/AnonUserSignUpNotification'

interface SearchAssistantPanelProps {
  selectedTags: string[]
  setSelectedTags: (tags: string[]) => void
  authArgs: { userId: string } | { sessionId: string } | null
  feedRules?: string[]
  setFeedRules?: (rules: string[]) => void
  isExpanded?: boolean
  setIsExpanded?: (value: boolean) => void
  onClose?: () => void
}

// Inline Panel variant of the Assistant overlay content.
// Renders feed/character/custom content inside a scrollable container with a max height.
export function SearchAssistantPanel({
  selectedTags,
  setSelectedTags,
  authArgs,
  feedRules,
  setFeedRules,
  isExpanded = false,
  setIsExpanded,
  onClose,
}: SearchAssistantPanelProps) {
  const {
    mode,
    searchQuery,
    setSearchQuery,
    requestFeedRefresh,
    characterGroups,
    setCharacterGroups,
    characterRoles,
    setCharacterRole,
    clearCharacterGrouping,
  } = useSearchOverlay()

  const { isAnonymous } = useAuthState()
  const {
    selectedCharacters: globalSelectedCharacters,
    setSelectedCharacters: commitCharacters,
  } = useCharacterSelection()

  const userPreferences = useQuery(
    api.users.preferences.getUserPreferences,
    authArgs || 'skip'
  )
  const updateTagPreferences = useMutation(
    api.users.preferences.updateTagPreferences
  )

  const [isConfirming, setIsConfirming] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [initialCharacters, setInitialCharacters] = useState<string[]>([])
  const [initialGroupsSnapshot, setInitialGroupsSnapshot] = useState<string[][]>([])
  const [initialRolesSnapshot, setInitialRolesSnapshot] = useState<Record<string, 'main' | 'side'>>({})
  const [hasInitializedTags, setHasInitializedTags] = useState(false)
  const [hasInitializedCharacters, setHasInitializedCharacters] = useState(false)
  const [selectedRulesInternal, setSelectedRulesInternal] = useState<string[]>([])
  const selectedRules = feedRules ?? selectedRulesInternal
  const setSelectedRules = setFeedRules ?? setSelectedRulesInternal
  const [editingRuleIndex, setEditingRuleIndex] = useState<number | null>(null)
  const editingRuleInputRef = useRef<HTMLInputElement | null>(null)
  const [showSignUpNotification, setShowSignUpNotification] = useState(false)
  const [groupSelection, setGroupSelection] = useState<Record<string, boolean>>({})
  const saveDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const [isFeedSnapshotReady, setIsFeedSnapshotReady] = useState(false)
  const createChat = useMutation(api.chats.index.createChat)

  // Inline panel: always show full editor for feed; character respects expand/collapse
  const effectiveIsExpanded = mode === 'feed' ? true : ((mode === 'character' || mode === 'settings' || mode === 'import') && isExpanded)

  // Reserve a bit of space immediately in character mode to avoid initial jump
  const reservedMinHeight = useMemo(() => {
    if (mode !== 'character') return undefined
    return effectiveIsExpanded ? 240 : 140
  }, [mode, effectiveIsExpanded])
  const handleStartChat = useCallback(async () => {
    if (characterGroups.length === 0) return
    // Use first group for MVP
    const names = characterGroups[0]
    const chatId = await createChat({ ...(authArgs as any), participants: names, formatMode: 'classic_rp' as any })
    if (typeof window !== 'undefined') {
      window.location.href = `/c/${chatId}`
    }
  }, [characterGroups, createChat, authArgs])

  // Initialize character snapshots when character mode opens
  useEffect(() => {
    if (mode === 'character' && !hasInitializedCharacters) {
      setInitialCharacters(globalSelectedCharacters.map(c => `${c.fullName}|${c.source}`))
      setInitialGroupsSnapshot(
        characterGroups.map(g => [...g]).sort((a, b) => a.join('|').localeCompare(b.join('|')))
      )
      setInitialRolesSnapshot({ ...characterRoles })
      setHasInitializedCharacters(true)
    }
  }, [mode, hasInitializedCharacters, globalSelectedCharacters, characterGroups, characterRoles])

  // Initialize tags when entering feed mode
  useEffect(() => {
    if (mode === 'feed' && !hasInitializedTags) {
      if (userPreferences) {
        const savedTags = userPreferences.selectedTags || []
        const savedRule = userPreferences.searchRule || null
        setSelectedTags(savedTags)
        const parsedRules = typeof savedRule === 'string'
          ? savedRule.split(/\s*\|\s*/).filter(Boolean)
          : []
        setSelectedRules(parsedRules)
      } else {
        setSelectedTags([])
        setSelectedRules([])
      }
      setHasInitializedTags(true)
    }
  }, [mode, hasInitializedTags, userPreferences, setSelectedTags])

  // Focus rule input when editing index changes
  useEffect(() => {
    if (editingRuleIndex !== null && editingRuleInputRef.current) {
      const input = editingRuleInputRef.current
      input.focus()
      const len = input.value.length
      try {
        input.setSelectionRange(len, len)
      } catch {}
    }
  }, [editingRuleIndex])

  // Track initial tag/rule snapshot in feed
  const [initialTagSnapshot, setInitialTagSnapshot] = useState<string[]>([])
  const [initialRuleSnapshot, setInitialRuleSnapshot] = useState<string[]>([])
  useEffect(() => {
    if (mode === 'feed' && initialTagSnapshot.length === 0) {
      setInitialTagSnapshot(selectedTags)
      setInitialRuleSnapshot(selectedRules)
      setIsFeedSnapshotReady(true)
    }
    if (mode !== 'feed') {
      setInitialTagSnapshot([])
      setInitialRuleSnapshot([])
      setIsFeedSnapshotReady(false)
    }
  }, [mode, selectedTags, selectedRules])

  // Auto-save feed preferences when changed (debounced). This does NOT refresh the feed automatically.
  useEffect(() => {
    if (mode !== 'feed') return
    if (!authArgs) return
    if (!hasInitializedTags) return
    if (!isFeedSnapshotReady) return
    const tagsChanged = initialTagSnapshot.length !== selectedTags.length ||
      !initialTagSnapshot.every(t => selectedTags.includes(t))
    const ruleChanged = JSON.stringify(selectedRules) !== JSON.stringify(initialRuleSnapshot)
    if (!tagsChanged && !ruleChanged) return
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(async () => {
      try {
        const combinedRule = selectedRules.map(r => r.trim()).filter(Boolean).join(' | ')
        const searchRuleToSave = combinedRule.length === 0 ? null : combinedRule
        await updateTagPreferences({
          ...authArgs,
          selectedTags,
          searchRule: searchRuleToSave === null ? null : searchRuleToSave,
        })
      } catch (e) {
        console.error('Auto-save feed preferences failed:', e)
      }
    }, 600)
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current)
    }
  }, [mode, authArgs, hasInitializedTags, selectedRules, selectedTags, updateTagPreferences, requestFeedRefresh, isFeedSnapshotReady, initialTagSnapshot, initialRuleSnapshot])



  // Keep groups/roles consistent with selection
  useEffect(() => {
    const validIds = new Set(globalSelectedCharacters.map(c => `${c.fullName}|${c.source}`))
    const nextGroups = characterGroups
      .map(g => g.filter(id => validIds.has(id)))
      .filter(g => g.length >= 2)
    if (nextGroups.length !== characterGroups.length || nextGroups.some((g, i) => g.length !== characterGroups[i].length)) {
      setCharacterGroups(nextGroups)
    }
    const hadExtraRoles = Object.keys(characterRoles).some(id => !validIds.has(id))
    if (hadExtraRoles) {
      const nextRoles: Record<string, 'main' | 'side'> = {}
      for (const id of Object.keys(characterRoles)) if (validIds.has(id)) nextRoles[id] = characterRoles[id]
      Object.entries(nextRoles).forEach(([id, role]) => setCharacterRole(id, role))
    }
    setGroupSelection(prev => {
      const next: Record<string, boolean> = {}
      for (const id of Object.keys(prev)) if (validIds.has(id)) next[id] = prev[id]
      return next
    })
  }, [globalSelectedCharacters, characterGroups, characterRoles, setCharacterGroups, setCharacterRole])

  const handleConfirmTags = async () => {
    setIsConfirming(true)
    try {
      if (authArgs) {
        const combinedRule = selectedRules.map(r => r.trim()).filter(Boolean).join(' | ')
        const searchRuleToSave = combinedRule.length === 0 ? null : combinedRule
        await updateTagPreferences({
          ...authArgs,
          selectedTags,
          searchRule: searchRuleToSave === null ? null : searchRuleToSave,
        })
      }
      setShowSuccess(true)
      setSearchQuery('')
      onClose?.()
    } catch (error) {
      console.error('Error applying tags:', error)
    } finally {
      setIsConfirming(false)
    }
  }

  const anyCharacterChanges = useMemo(() => {
    const currentIds = globalSelectedCharacters.map(c => `${c.fullName}|${c.source}`)
    const hasChanged = currentIds.length !== initialCharacters.length || !currentIds.every(id => initialCharacters.includes(id))
    const norm = (groups: string[][]) => groups.map(g => [...g].sort().join('#')).sort().join('|')
    const groupsChanged = norm(characterGroups) !== norm(initialGroupsSnapshot)
    const rolesChanged = JSON.stringify(characterRoles) !== JSON.stringify(initialRolesSnapshot)
    return hasChanged || groupsChanged || rolesChanged
  }, [globalSelectedCharacters, initialCharacters, characterGroups, initialGroupsSnapshot, characterRoles, initialRolesSnapshot])

  return (
    <div className="w-full relative" style={{ minHeight: reservedMinHeight }}>
      {/* Close button in header padding */}
      <button
        type="button"
        aria-label="Close"
        onClick={() => onClose?.()}
        className="absolute top-1 right-2 w-5 h-5 flex items-center justify-center text-white/60 hover:text-white z-10 pointer-events-auto"
        title="Close"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>

      {/* Inline content (no internal scrolling) */}
      <div className="w-full">
        {/* Feed Mode */}
        {mode === 'feed' && (
          <div className="space-y-3 animate-in fade-in duration-300">
            {!effectiveIsExpanded ? (
              <div>
                <p className="text-xs md:text-sm text-white/70">The feed will present stories based on your request</p>
                {selectedRules.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedRules.map((rule, idx) => (
                      <div key={`${rule}-${idx}`} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/30 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 text-white/90">
                        <span className="text-sm md:text-base">{`"${rule}"`}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedRules(selectedRules.filter((_, i) => i !== idx))}
                          className="ml-1 text-white/60 hover:text-white"
                          title="Remove rule"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-lg md:text-xl font-semibold text-white mb-2 drop-shadow-lg">Edit Feed</h3>
                  <p className="text-xs md:text-sm text-white/80">Search to add a rule. Click Update to refresh your feed.</p>
                </div>
                <TagAutoComplete
                  query={searchQuery}
                  selectedTags={selectedTags}
                  selectedRule={null}
                  onTagSelect={(tag) => setSelectedTags([...selectedTags, tag])}
                  onTagRemove={(tag) => {
                    setSelectedTags(selectedTags.filter(t => t !== tag))
                  }}
                  onRuleSelect={() => {}}
                  onRuleRemove={() => {}}
                  showActions={false}
                  showRuleControls={false}
                />
                <div className="flex flex-wrap items-center gap-2">
                  {selectedRules.map((rule, idx) => (
                    <div
                      key={`${rule}-${idx}`}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/30 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 text-white/90"
                    >
                      {editingRuleIndex === idx ? (
                        <input
                          ref={(el) => { if (idx === editingRuleIndex) editingRuleInputRef.current = el }}
                          value={rule}
                          onChange={(e) => {
                            const next = [...selectedRules]
                            next[idx] = e.target.value
                            setSelectedRules(next)
                          }}
                          onBlur={() => {
                            const trimmed = rule.trim()
                            if (!trimmed) {
                              setSelectedRules(selectedRules.filter((_, i) => i !== idx))
                            }
                            setEditingRuleIndex(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              (e.target as HTMLInputElement).blur()
                            }
                          }}
                          className="bg-transparent outline-none text-sm md:text-base text-white/90 placeholder-white/40 min-w-[6rem]"
                          placeholder="Edit rule"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditingRuleIndex(idx)}
                          className="cursor-text text-sm md:text-base text-white/90"
                        >
                          {`"${rule}"`}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedRules(selectedRules.filter((_, i) => i !== idx))}
                        className="ml-1 text-white/60 hover:text-white"
                        title="Remove rule"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                      </button>
                    </div>
                  ))}
                  {(() => {
                    const trimmed = (searchQuery || '').trim()
                    const alreadyAdded = selectedRules.includes(trimmed)
                    if (trimmed && !alreadyAdded) {
                      const label = `Use as rule: "${trimmed.length > 40 ? trimmed.substring(0, 37) + '...' : trimmed}"`
                      return (
                        <button
                          type="button"
                          onClick={() => setSelectedRules([...selectedRules, trimmed])}
                          className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-gradient-to-br from-amber-900/6 via-sky-900/4 to-purple-900/3 text-white/80 cursor-pointer font-medium text-xs px-2.5 py-1.5"
                          title={label}
                        >
                          {label}
                        </button>
                      )
                    }
                    return null
                  })()}
                </div>
                {/* No explicit Update button in feed mode here; the search bar shows Update when dirty. */}
              </div>
            )}
          </div>
        )}

        {/* Character Mode */}
        {mode === 'character' && (
          <div className="space-y-3 animate-in fade-in duration-300">

            <CharacterSearch
              searchQuery={searchQuery}
              selectedCharacters={globalSelectedCharacters}
              setSelectedCharacters={commitCharacters}
              showSelectedList={!effectiveIsExpanded}
              advancedButton={
                !effectiveIsExpanded && typeof setIsExpanded === 'function' ? (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!effectiveIsExpanded)}
                    className="px-2.5 py-1.5 text-xs rounded-lg border border-white/20 text-white/70 bg-gradient-to-br from-amber-900/5 via-sky-900/3 to-purple-900/2 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4 transition z-10"
                  >
                    {effectiveIsExpanded ? 'Collapse' : 'Advanced'}
                  </button>
                ) : undefined
              }
            />

            {effectiveIsExpanded && globalSelectedCharacters.length === 0 && typeof setIsExpanded === 'function' && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-white/20 text-white/70 bg-gradient-to-br from-amber-900/5 via-sky-900/3 to-purple-900/2 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4 transition-all"
                >
                  Collapse
                </button>
              </div>
            )}

                {effectiveIsExpanded && globalSelectedCharacters.length > 0 && (
              <div className="mt-2 space-y-4">
                <p className="text-xs md:text-sm text-white/70">
                  Link characters to make them appear together. Set roles to guide focus: <span className="font-semibold">Main</span> is the prioritized lead, <span className="font-semibold">Side</span> is supporting.
                </p>
                <div className="flex items-center justify-between">
                  <h4 className="text-white/80 text-sm font-medium">Advanced pairing & roles</h4>
                  <div className="flex items-center gap-2">
                    {typeof setIsExpanded === 'function' && (
                      <button
                        type="button"
                        onClick={() => setIsExpanded(false)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-white/20 text-white/70 bg-gradient-to-br from-amber-900/5 via-sky-900/3 to-purple-900/2 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4 transition-all"
                      >
                        Collapse
                      </button>
                    )}
                    {Object.values(groupSelection).filter(Boolean).length > 0 && (
                      <button
                        type="button"
                        onClick={() => setGroupSelection({})}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-white/20 text-white/70 bg-gradient-to-br from-amber-900/5 via-sky-900/3 to-purple-900/2 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4 transition-all"
                      >
                        Cancel Selection
                      </button>
                    )}
                    {characterGroups.length > 0 && (
                      <button
                        type="button"
                        onClick={() => clearCharacterGrouping()}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-white/20 text-white/70 bg-gradient-to-br from-amber-900/5 via-sky-900/3 to-purple-900/2 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4 transition-all"
                      >
                        Clear Links
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {globalSelectedCharacters.map((c) => {
                    const id = `${c.fullName}|${c.source}`
                    const isPicked = !!groupSelection[id]
                    const role = characterRoles[id] || 'main'
                    return (
                      <div
                        key={id}
                        onClick={() => {
                          setGroupSelection(prev => ({ ...prev, [id]: !prev[id] }))
                        }}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border ${isPicked ? 'border-white/70 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6' : 'border-white/20 bg-gradient-to-br from-amber-900/6 via-sky-900/4 to-purple-900/3'} text-white/90 cursor-pointer select-none`}
                      >
                        <span className="text-xs whitespace-nowrap">{c.fullName}</span>
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCharacterRole(id, 'main') }}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg ${role === 'main' ? 'bg-white/80 text-black' : 'bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 text-white/70 hover:from-amber-900/18 hover:via-sky-900/12 hover:to-purple-900/8'}`}
                            title="Set as main"
                          >
                            <Star className="w-3 h-3" /> Main
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setCharacterRole(id, 'side') }}
                            className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] rounded-lg ${role === 'side' ? 'bg-white/80 text-black' : 'bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 text-white/70 hover:from-amber-900/18 hover:via-sky-900/12 hover:to-purple-900/8'}`}
                            title="Set as side"
                          >
                            <UserRound className="w-3 h-3" /> Side
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            commitCharacters(prev => prev.filter(p => `${p.fullName}|${p.source}` !== id))
                          }}
                          className="ml-1 text-white/60 hover:text-white"
                          title="Remove"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      </div>
                    )
                  })}
                </div>

                {characterGroups.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-white/60 text-xs">Linked groups (these characters will appear together)</div>
                    <div className="flex flex-wrap gap-2">
                      {characterGroups.map((g, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-white/30 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 text-white/90">
                          <span className="text-xs">{g.map(id => id.split('|')[0]).join(' + ')}</span>
                          <button
                            type="button"
                            onClick={() => setCharacterGroups(characterGroups.filter((_, i) => i !== idx))}
                            className="text-white/70 hover:text-white"
                            title="Remove link"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}


              </div>
            )}


          </div>
        )}

        {/* Custom Mode - still supported inline but typically rendered via right-side slide-in */}
        {mode === 'custom' && (
          <div>
            {/* Custom mode is generally shown in a right-side portal; left inline support available if needed. */}
          </div>
        )}
      </div>

      {/* Sign-up notification for anonymous users (portal to escape container stacking/overflow) */}
      {typeof window !== 'undefined' && createPortal(
        <AnonUserSignUpNotification
          isOpen={showSignUpNotification}
          onClose={() => setShowSignUpNotification(false)}
          context="assistant-overlay"
        />,
        document.getElementById('overlay-root') as HTMLElement
      )}
    </div>
  )
}


