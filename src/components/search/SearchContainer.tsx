'use client'

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback, useMemo } from 'react'

import { SearchInput } from './SearchInput'
import { useSettings } from '@/hooks/useSettings'
import { useCharacterSelection, waitForCharacterSave } from '@/hooks/useCharacterSelection'
import { StoryStructureDropdown } from '@/components/settings/StoryStructureDropdown'
import { GenreDropdown } from '@/components/settings/GenreDropdown'
import { POVDropdown } from '@/components/settings/POVDropdown'
import { CharactersDropdown } from '@/components/settings/CharactersDropdown'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { useSearchOverlay } from '@/contexts/SearchOverlayContext'
import { SearchAssistantPanel } from './SearchAssistantPanel'
import { CustomCreationWizard } from '@/components/custom/CustomCreationWizard'
import { SettingsPanel } from '@/components/settings/SettingsPanel'
import { ImportPanel } from '@/components/import/ImportPanel'
import { Edit3, Plus, Globe, Paperclip, Settings } from 'lucide-react'
import SimpleBar from 'simplebar-react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import { usePathname, useRouter } from 'next/navigation'
import { useNavigation } from '@/contexts/NavigationContext'

const DEFAULT_STORY_ACTIONS: Array<{ id: string; text: string; type: string }> = []

interface SearchContainerProps {
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onCharacterSelectionDone?: () => void
  isViewingStory?: boolean
  isSidebarMode?: boolean
  storyActions?: Array<{ id: string; text: string; type: string }>
  onStoryAction?: (action: string) => void
  onGenerateNextPage?: () => void
  onSubmit?: (text: string) => void
  isChatMode?: boolean
}

export function SearchContainer({
  searchQuery,
  onSearchQueryChange,
  onCharacterSelectionDone,
  isViewingStory = false,
  isSidebarMode = false,
  storyActions = DEFAULT_STORY_ACTIONS,
  onStoryAction,
  onGenerateNextPage,
  onSubmit,
  isChatMode = false,
  
}: SearchContainerProps) {
  const { authArgs } = useAuthState()
  const router = useRouter()
  const pathname = usePathname()
  const { chatSendHandlerRef } = useNavigation()
  
  const { 
    setSearchQuery: setOverlaySearchQuery, 
    mode, 
    switchMode, 
    close: closeOverlayMode, 
    requestFeedRefresh,
    characterGroups,
    characterRoles 
  } = useSearchOverlay()
  const [isExpanded, setIsExpanded] = useState(false)
  const [shimmerActive, setShimmerActive] = useState(false)
  
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  // Deprecated apply flow; kept for compatibility, not used now
  const [feedRules, setFeedRules] = useState<string[]>([])
  // Track initial snapshots to decide when to show Update button
  const initialTagsRef = useRef<string[] | null>(null)
  const initialRulesRef = useRef<string[] | null>(null)
  const initialCharactersRef = useRef<string[] | null>(null)
  const initialGroupsRef = useRef<string[][] | null>(null)
  const initialRolesRef = useRef<Record<string, 'main' | 'side'> | null>(null)
  const [overlayDetailExpanded, setOverlayDetailExpanded] = useState(false)
  // Custom mode now renders inline like other modes

  // Get global character selection
  const { selectedCharacters: globalSelectedCharacters } = useCharacterSelection()

  // Import state
  const [analysisMarkdown, setAnalysisMarkdown] = useState<string | null>(null)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const updateTagPreferences = useMutation(api.users.preferences.updateTagPreferences)

  // Load saved user preferences to seed rules/tags
  const userPreferences = useQuery(api.users.preferences.getUserPreferences, authArgs || 'skip')
  const hasLoadedPrefsRef = useRef(false)
  useEffect(() => {
    if (!authArgs) return
    if (!userPreferences) return
    if (hasLoadedPrefsRef.current) return
    const savedTags = userPreferences.selectedTags || []
    const savedRule = userPreferences.searchRule || null
    const parsedRules = typeof savedRule === 'string' ? savedRule.split(/\s*\|\s*/).filter(Boolean) : []
    if (savedTags.length > 0) setSelectedTags(savedTags)
    if (parsedRules.length > 0) setFeedRules(parsedRules)
    initialTagsRef.current = savedTags
    initialRulesRef.current = parsedRules
    hasLoadedPrefsRef.current = true
  }, [userPreferences, authArgs])

  // Track initial character state
  useEffect(() => {
    if (initialCharactersRef.current === null && globalSelectedCharacters) {
      const ids = globalSelectedCharacters.map(c => `${c.fullName}|${c.source}`)
      initialCharactersRef.current = ids
      initialGroupsRef.current = characterGroups.map(g => [...g]).sort((a, b) => a.join('|').localeCompare(b.join('|')))
      initialRolesRef.current = { ...characterRoles }
    }
  }, [globalSelectedCharacters, characterGroups, characterRoles])

  // (moved below state declarations to avoid use-before-declare lint)

  // In chat routes, keep the bar in compact mode and disable overlay expansion
  useEffect(() => {
    if (pathname.startsWith('/c/')) {
      setIsExpanded(false)
      setIsSearchFocused(false)
    }
  }, [pathname])
  
  const handleModeClick = (selectedMode: 'feed' | 'character' | 'custom' | 'settings' | 'import') => {
    // Custom now behaves like other inline modes

    // If clicking the same mode (feed/character/custom) while expanded → minimize
    if ((selectedMode === 'feed' || selectedMode === 'character' || selectedMode === 'custom')) {
      if (mode === selectedMode && isExpanded) {
        handleCollapse()
        return
      }
    }

    // Ensure search is expanded and focused, then switch to the selected overlay mode
    if (!isExpanded) setIsExpanded(true)
    if (!isSearchFocused) setIsSearchFocused(true)
    if (selectedMode === 'settings' || selectedMode === 'import' || selectedMode === 'custom') {
      try { switchMode(selectedMode) } catch {}
    } else {
      try { switchMode(selectedMode as 'feed' | 'character') } catch {}
    }
    setOverlaySearchQuery(searchQuery)
  }
  // Only log when props actually change
  const prevPropsRef = useRef<{isViewingStory?: boolean, storyActionsLength?: number, displayMode?: string}>({});
  
  useEffect(() => {
    const displayMode = isViewingStory ? 'story' : 'suggestions';
    const currentProps = {
      isViewingStory,
      storyActionsLength: storyActions.length,
      displayMode
    };
    
    const prevProps = prevPropsRef.current;
    if (
      prevProps.isViewingStory !== currentProps.isViewingStory ||
      prevProps.storyActionsLength !== currentProps.storyActionsLength ||
      prevProps.displayMode !== currentProps.displayMode
    ) {
      console.log('[SearchContainer] Props changed:', {
        isViewingStory,
        storyActions: storyActions.length,
        displayMode
      });
      prevPropsRef.current = currentProps;
    }
  }, [isViewingStory, storyActions.length]);
  const {
    settings,
    updateStoryStructure,
    updateGenre,
    updatePov,
    updateCharacterCount,
  } = useSettings()

  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [displayMode, setDisplayMode] = useState<'suggestions' | 'story'>(isViewingStory ? 'story' : 'suggestions')
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  // No internal scrolling; panel height grows with content. We keep this state only if future layout tweaks are needed.
  const [panelMaxHeightPx, setPanelMaxHeightPx] = useState<number | null>(null)
  const [isEditingPlayerName, setIsEditingPlayerName] = useState(false)
  const [tempPlayerName, setTempPlayerName] = useState(settings.playerName || '')
  const timeoutsRef = useRef<NodeJS.Timeout[]>([])
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout)
    }
  }, [])

  // Listen for top navigation custom page event → open inline custom panel
  useEffect(() => {
    const open = () => {
      if (!isExpanded) setIsExpanded(true)
      if (!isSearchFocused) setIsSearchFocused(true)
      try { switchMode('custom') } catch {}
      setOverlaySearchQuery(searchQuery)
    }
    window.addEventListener('openCustomPage', open as EventListener)
    return () => window.removeEventListener('openCustomPage', open as EventListener)
  }, [isExpanded, isSearchFocused, switchMode, setOverlaySearchQuery, searchQuery])
  
  // Update temp player name when settings change
  useEffect(() => {
    setTempPlayerName(settings.playerName || '')
  }, [settings.playerName])
  
  // Expose search bar height as CSS variable
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return

    const update = () =>
      document.documentElement
        .style
        .setProperty('--search-bar-h', `${el.offsetHeight}px`)

    update() // initial
    const ro = new ResizeObserver(update)
    ro.observe(el) // watch internal size changes
    window.addEventListener('resize', update)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  // Collapse inline panel/card
  const handleCollapse = () => {
    setIsExpanded(false)
    setIsSearchFocused(false)
    onSearchQueryChange('')
    try { closeOverlayMode() } catch {}
  }

  // Top nav trigger → open import panel
  useEffect(() => {
    const open = () => handleModeClick('import')
    window.addEventListener('openImportPicker', open as EventListener)
    return () => window.removeEventListener('openImportPicker', open as EventListener)
  }, [])

  // Outside click and outside scroll close when focused
  useEffect(() => {
    if (!isSearchFocused) return
    const isInsideExemptArea = (el: HTMLElement | null): boolean => {
      if (!el) return false
      if (cardRef.current && cardRef.current.contains(el)) return true
      // Exempt any clicks/scrolls that originate from portaled dialogs or settings dropdowns
      if (el.closest('[data-dialog-root="true"]')) return true
      if (el.closest('[data-settings-dropdown="true"]')) return true
      return false
    }

    const handleScroll = (ev: Event) => {
      const target = (ev.target as HTMLElement) || null
      if (isInsideExemptArea(target)) return
      handleCollapse()
    }
    window.addEventListener('wheel', handleScroll as EventListener, { passive: true } as AddEventListenerOptions)
    window.addEventListener('touchmove', handleScroll as EventListener, { passive: true } as AddEventListenerOptions)
    const handleDocClick = (e: Event) => {
      const target = e.target as HTMLElement | null
      if (isInsideExemptArea(target)) return
      handleCollapse()
    }
    document.addEventListener('mousedown', handleDocClick)
    document.addEventListener('touchstart', handleDocClick, { passive: true })
    return () => {
      window.removeEventListener('wheel', handleScroll as EventListener)
      window.removeEventListener('touchmove', handleScroll as EventListener)
      document.removeEventListener('mousedown', handleDocClick as EventListener)
      document.removeEventListener('touchstart', handleDocClick as EventListener)
    }
  }, [isSearchFocused])

  // Previously computed inline panel max-height; no longer needed since panel is not scrollable.
  useEffect(() => {
    setPanelMaxHeightPx(null)
  }, [isSearchFocused, overlayDetailExpanded, mode])

  // When minimized, restore inline settings by default (non-story, not custom)
  useEffect(() => {
    // no-op
  }, [isExpanded, isViewingStory])

  // ESC to collapse when focused inside the card
  useEffect(() => {
    if (!isSearchFocused) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCollapse()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isSearchFocused])
  const [transitionPhase, setTransitionPhase] = useState<'idle' | 'fade-out' | 'fade-in'>('idle')
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const handleDropdownToggle = (dropdown: string) => {
    setOpenDropdown(openDropdown === dropdown ? null : dropdown)
  }

  const handleClose = () => {
    setOpenDropdown(null)
  }

  // Immediate mode switch when viewing story changes
  useEffect(() => {
    const targetMode = isViewingStory ? 'story' : 'suggestions'
    if (displayMode !== targetMode) {
      setDisplayMode(targetMode)
    }
    // Reset search bar visibility when switching modes
    if (!isViewingStory) setIsExpanded(false)
  }, [isViewingStory])
  
  // Smooth transition between modes (for other cases)
  useEffect(() => {
    const targetMode = isViewingStory ? 'story' : 'suggestions'
    let timeoutId1: NodeJS.Timeout
    let timeoutId2: NodeJS.Timeout
    
    if (displayMode !== targetMode && false) { // Disabled for now - using immediate switch above
      setIsTransitioning(true)
      setTransitionPhase('fade-out')
      
      timeoutId1 = setTimeout(() => {
        setDisplayMode(targetMode)
        setTransitionPhase('fade-in')
        
        timeoutId2 = setTimeout(() => {
          setTransitionPhase('idle')
          setIsTransitioning(false)
        }, 150)
      }, 150)
    }
    
    return () => {
      if (timeoutId1) clearTimeout(timeoutId1)
      if (timeoutId2) clearTimeout(timeoutId2)
    }
  }, [isViewingStory, displayMode])

  const isChatRoute = isChatMode || pathname.startsWith('/c/')

  const getPlaceholderText = () => {
    if (isChatRoute) return 'Send a message...'
    if (isViewingStory) {
      return 'Continue your story...'
    }
    
    switch (mode) {
      case 'feed':
        return 'What ideas do you want?'
      case 'character':
        return 'Search any character...'
      case 'custom':
        return 'Describe a custom story prompt...'
      case 'settings':
        return 'What ideas do you want?'
      case 'import':
        return 'What ideas do you want?'
      default:
        return 'What ideas do you want?'
    }
  }

  // Trigger rainbow shimmer once on expand (with cleanup if user collapses early)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    if (isExpanded) {
      setShimmerActive(true)
      timeoutId = setTimeout(() => setShimmerActive(false), 700)
    } else {
      // If collapsed early, ensure shimmer is removed immediately
      setShimmerActive(false)
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId)
      setShimmerActive(false)
    }
  }, [isExpanded])

  // Gentle scale on grow when content height increases
  const lastHeightRef = useRef<number>(0)
  const [isGrowing, setIsGrowing] = useState(false)
  useLayoutEffect(() => {
    const el = cardRef.current
    if (!el) return
    const h = el.offsetHeight
    if (h > (lastHeightRef.current || 0) + 4) {
      setIsGrowing(true)
      const t = setTimeout(() => setIsGrowing(false), 180)
      return () => clearTimeout(t)
    }
    lastHeightRef.current = h
  })

  // Sidebar mode rendering
  if (isSidebarMode) {
    return (
      <div className="h-full flex flex-col">

        {/* Feed Settings (always visible in sidebar) */}
        <div className="p-4 border-b border-amber-100/20">
          <h3 className="text-white text-sm font-semibold mb-3">Feed Options</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-white/60 text-xs font-medium">I want to be a...</label>
              <StoryStructureDropdown
                value={settings.storyStructure}
                onChange={updateStoryStructure}
                isOpen={openDropdown === 'structure'}
                onToggle={() => handleDropdownToggle('structure')}
                onClose={handleClose}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-white/60 text-xs font-medium">Genre</label>
              <GenreDropdown
                value={settings.genre}
                onChange={updateGenre}
                isOpen={openDropdown === 'genre'}
                onToggle={() => handleDropdownToggle('genre')}
                onClose={handleClose}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-white/60 text-xs font-medium">Point of View</label>
              <POVDropdown
                value={settings.pov}
                onChange={updatePov}
                isOpen={openDropdown === 'pov'}
                onToggle={() => handleDropdownToggle('pov')}
                onClose={handleClose}
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-white/60 text-xs font-medium">No. of Characters</label>
              <CharactersDropdown
                value={settings.characterCount}
                onChange={updateCharacterCount}
                isOpen={openDropdown === 'characters'}
                onToggle={() => handleDropdownToggle('characters')}
                onClose={handleClose}
              />
            </div>
          </div>
        </div>

      </div>
    )
  }

  // Floating rounded search bar rendering
  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Unified Design System CSS */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Liquid animation system */
        @keyframes liquid-expand {
          0% { 
            transform: scale(1) translateY(0);
            border-radius: 4px;
          }
          100% { 
            transform: scale(1) translateY(0);
            border-radius: 4px;
          }
        }
        
        @keyframes content-reveal {
          0% { 
            opacity: 0;
            transform: translateY(4px);
          }
          100% { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes button-slide-up {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Rainbow shimmer ring around the container on expand */
        @property --shimmer-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
        @keyframes shimmer-sweep {
          0% { --shimmer-angle: 0deg; opacity: 1; }
          70% { opacity: 1; }
          100% { --shimmer-angle: 360deg; opacity: 0; }
        }
        .shimmer-border {
          box-sizing: border-box;
          padding: 1px; /* thickness of the ring */
          background: conic-gradient(from var(--shimmer-angle) at 50% 50%, #fca5a5, #facc15, #34d399, #60a5fa, #a78bfa, #f472b6, #fca5a5);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
        }

        /* Subtle glow for focus states */
        @keyframes gentle-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,255,255,0.05); }
          50% { box-shadow: 0 0 30px rgba(255,255,255,0.08); }
        }
        
        /* Unified color system matching StoryCard aesthetic */
        .glass-unified {
            background: 
            linear-gradient(to bottom right, 
              rgba(146, 64, 14, 0.08), 
              rgba(12, 74, 110, 0.06), 
              rgba(88, 28, 135, 0.04)
            ),
            rgba(41, 37, 36, 0.2);
          backdrop-filter: blur(16px) saturate(120%);
          -webkit-backdrop-filter: blur(16px) saturate(120%);
          /* Match TopNavigation border (border-amber-100/20) */
          border: 1px solid rgba(254, 243, 199, 0.20);
          box-shadow: 
            0 8px 32px rgba(0, 0, 0, 0.15);
        }
        
        .glass-unified.expanded {
          animation: liquid-expand 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          background: 
            linear-gradient(to bottom right, 
              rgba(146, 64, 14, 0.20), 
              rgba(12, 74, 110, 0.20), 
              rgba(88, 28, 135, 0.10)
            ),
            rgba(0, 0, 0, 0.3);
          /* Maintain same border color when expanded for consistency with TopNavigation */
          border-color: rgba(254, 243, 199, 0.20);
          box-shadow: 
            0 20px 40px rgba(0, 0, 0, 0.3),
            0 0 60px rgba(255, 255, 255, 0.03);
        }
        
        /* Clean button states - simplified and purposeful */
        button:focus {
          outline: none !important;
        }
        
        /* Remove focus ring flash on click */
        button:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
        
        button:active {
          outline: none !important;
          box-shadow: none !important;
        }
        
        /* Prevent any ring or border flash */
        button {
          -webkit-tap-highlight-color: transparent;
          outline: none !important;
        }


      ` }} />

      {/* Inline Assistant Panel */}
      {/* Rendered inside the card below, but we keep computed height here */}

      {/* Custom mode now renders inline; slide-in removed */}

      <div className="w-full">
          {(() => {
            // Dynamic rounding based on expansion state
            return null
          })()}
          <div
          ref={cardRef}
          className={`relative overflow-hidden glass-unified text-white ${
            isExpanded ? 'expanded' : ''
          }`}
          style={{ 
            transformOrigin: 'center bottom',
            borderRadius: '4px',
            // Avoid promoting the border to a separate layer to prevent subpixel thickening
          }}
          onClick={(e) => {
            if (isChatRoute) return
            if (!isExpanded) {
              setIsExpanded(true)
              // Default to feed when expanding
              try { switchMode('feed') } catch {}
              setIsSearchFocused(true)
              setOverlaySearchQuery(searchQuery)
            }
          }}
        >
          {/* Rainbow shimmer ring (one-shot) placed above content and not scaled */}
          {shimmerActive && (
            <div
              className="pointer-events-none absolute inset-0 shimmer-border z-30"
              style={{
                animation: 'shimmer-sweep 0.5s linear 1',
                animationFillMode: 'forwards',
                borderRadius: 'inherit'
              }}
            />
          )}

          <div className={isGrowing ? 'scale-[1.008]' : 'scale-100'} style={{ transformOrigin: 'center bottom', transition: 'transform 0.18s ease-out' }}>

          {/* Subtle expansion glow */}
          {isExpanded && (
            <div className="pointer-events-none absolute inset-0 rounded-lg opacity-50" 
                 style={{ animation: 'gentle-glow 2s ease-in-out infinite' }} />
          )}

          {/* Content with smooth transitions */}
          <div className={`transition-all ease-out ${
            isExpanded 
              ? 'pt-3 duration-600' 
              : 'py-2 md:py-1 duration-300'
          } ${!isViewingStory ? 'pb-0' : ''}`}
               style={{ 
                 transition: 'padding 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
               }}>
            {/* Story mode content */}
            {isChatRoute ? (
              <div className="px-2 md:px-4">
                <SearchInput
                  value={searchQuery}
                  onChange={onSearchQueryChange}
                  placeholder={getPlaceholderText()}
                  isStoryMode={false}
                  onSubmit={(text) => {
                    if (onSubmit) onSubmit(text)
                    onSearchQueryChange('')
                  }}
                  onFocus={() => {
                    setIsSearchFocused(true)
                  }}
                  showSubmitButton={true}
                />
              </div>
            ) : displayMode === 'story' ? (
              <>
                <div className="min-h-[32px] md:min-h-[36px] flex flex-nowrap items-center gap-1 py-0.5 md:py-1 px-2 md:px-4 overflow-x-auto no-scrollbar">
                  {storyActions.length > 0 ? (
                    storyActions.map(action => (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => {
                          if (onStoryAction) {
                            onStoryAction(action.text)
                          }
                        }}
                        className="px-3 py-1.5 text-xs md:text-sm transition-all rounded-2xl font-medium text-white/70 hover:text-white bg-gradient-to-br from-amber-900/10 via-sky-900/8 to-purple-900/6 hover:from-amber-900/14 hover:via-sky-900/11 hover:to-purple-900/9 whitespace-nowrap flex-shrink-0 shadow-inner"
                      >
                        {action.text}
                      </button>
                    ))
                  ) : (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={`skeleton-action-${i}`} className="px-4 py-2 h-7 md:h-8 w-24 md:w-28 bg-gradient-to-br from-amber-900/5 via-sky-900/3 to-purple-900/2 rounded-2xl animate-pulse" />
                    ))
                  )}
                </div>
                 <div className="px-2 md:px-4">
                  <SearchInput
                    value={searchQuery}
                    onChange={onSearchQueryChange}
                    placeholder={getPlaceholderText()}
                    isStoryMode={isViewingStory}
                    onGenerateNextPage={onGenerateNextPage}
                    onSubmit={onSubmit}
                    onFocus={() => {
                      setIsSearchFocused(true)
                      setOverlaySearchQuery(searchQuery)
                    }}
                    showSubmitButton={true}
                  />
                </div>
              </>
            ) : (
              // Suggestions mode: collapsed initial, expand shows buttons at bottom
               <div className="px-2 md:px-4 py-0.5 md:py-1">
                {/* Inline Panel with liquid reveal */}
                 {isExpanded && (mode === 'feed' || mode === 'character' || mode === 'settings' || mode === 'import' || mode === 'custom') && (
                                      <div 
                      className="px-0 pb-3 pt-2 animate-in fade-in slide-in-from-top-2"
                      style={{
                        animation: 'content-reveal 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                        animationDelay: '0.15s',
                        opacity: 0,
                        // Reserve space immediately for character mode so it matches skeleton height
                         minHeight: mode === 'character' 
                           ? (overlayDetailExpanded ? '220px' : '140px') 
                           : mode === 'settings' 
                           ? '160px' 
                           : mode === 'import' 
                           ? '280px' 
                           : mode === 'custom'
                           ? '80vh'
                           : undefined
                      }}
                    >
                    {mode === 'settings' ? (
                      <SettingsPanel onClose={handleCollapse} />
                    ) : mode === 'import' ? (
                      <ImportPanel 
                        authArgs={authArgs}
                        onAnalysisComplete={(markdown) => {
                          setAnalysisMarkdown(markdown)
                          setShowProfileDialog(true)
                          handleCollapse()
                        }}
                        onClose={handleCollapse}
                      />
                    ) : mode === 'custom' ? (
                      <SimpleBar className="px-1" style={{ maxHeight: '80vh' }}>
                        <CustomCreationWizard onClose={handleCollapse} authArgs={authArgs} />
                      </SimpleBar>
                    ) : (
                      <SearchAssistantPanel
                        selectedTags={selectedTags}
                        setSelectedTags={setSelectedTags}
                        authArgs={authArgs}
                        feedRules={feedRules}
                        setFeedRules={setFeedRules}
                        isExpanded={overlayDetailExpanded}
                        setIsExpanded={setOverlayDetailExpanded}
                        onClose={handleCollapse}
                      />
                    )}
                  </div>
                )}
                {(() => {
                  const isDirty = (() => {
                    // Feed mode changes
                    const t0 = initialTagsRef.current || []
                    const r0 = initialRulesRef.current || []
                    const tagsChanged = t0.length !== selectedTags.length || !t0.every(t => selectedTags.includes(t))
                    const rulesChanged = JSON.stringify(r0) !== JSON.stringify(feedRules)
                    const hasQuery = (searchQuery || '').trim().length > 0
                    
                    // Character mode changes
                    const currentIds = globalSelectedCharacters.map(c => `${c.fullName}|${c.source}`)
                    const initialIds = initialCharactersRef.current || []
                    const charactersChanged = currentIds.length !== initialIds.length || !currentIds.every(id => initialIds.includes(id))
                    const norm = (groups: string[][]) => groups.map(g => [...g].sort().join('#')).sort().join('|')
                    const groupsChanged = norm(characterGroups) !== norm(initialGroupsRef.current || [])
                    const rolesChanged = JSON.stringify(characterRoles) !== JSON.stringify(initialRolesRef.current || {})
                    
                    return tagsChanged || rulesChanged || hasQuery || charactersChanged || groupsChanged || rolesChanged
                  })()
                  if (mode === 'custom') {
                    return null
                  }
                  return (
                    <SearchInput
                      value={searchQuery}
                      onChange={(value) => {
                        onSearchQueryChange(value)
                        setOverlaySearchQuery(value)
                      }}
                      placeholder={getPlaceholderText()}
                      isStoryMode={false}
                      onSubmit={async (text) => {
                        const trimmed = (text || '').trim()
                        
                        // For chat routes, just send the message directly
                        if (isChatRoute) {
                          if (trimmed.length > 0 && onSubmit) {
                            onSubmit(text)
                            // Clear the input after sending
                            onSearchQueryChange('')
                            setOverlaySearchQuery('')
                          }
                          return
                        }
                        
                        // Non-chat routes: original logic
                        if (!isDirty) return
                        
                        // Handle feed mode
                        if (mode === 'feed') {
                          let rulesToSave = feedRules
                          if (trimmed.length > 0) {
                            // Prepare next rules to avoid race with state update
                            const nextRules = (feedRules.includes(trimmed) ? feedRules : [...feedRules, trimmed])
                            setFeedRules(nextRules)
                            rulesToSave = nextRules
                            // Clear the query and keep focus
                            onSearchQueryChange('')
                            setOverlaySearchQuery('')
                            // Keep panel minimized since we now have rules
                            setOverlayDetailExpanded(false)
                          }
                          
                          // Save preferences to backend
                          if (authArgs) {
                            const combinedRule = rulesToSave.map(r => r.trim()).filter(Boolean).join(' | ')
                            const searchRuleToSave = combinedRule.length === 0 ? null : combinedRule
                            await updateTagPreferences({
                              ...authArgs,
                              selectedTags,
                              searchRule: searchRuleToSave
                            })
                          }
                          
                          // Update snapshots to reflect the refreshed state after Update is clicked
                          initialRulesRef.current = rulesToSave
                          initialTagsRef.current = selectedTags
                        }
                        
                        // Handle character mode
                        if (mode === 'character') {
                          // Wait for character save to complete
                          await waitForCharacterSave()
                          // Update character snapshots
                          const ids = globalSelectedCharacters.map(c => `${c.fullName}|${c.source}`)
                          initialCharactersRef.current = ids
                          initialGroupsRef.current = characterGroups.map(g => [...g]).sort((a, b) => a.join('|').localeCompare(b.join('|')))
                          initialRolesRef.current = { ...characterRoles }
                        }
                        
                        // Refresh feed for any mode
                        try { requestFeedRefresh() } catch {}
                        
                        // Only forward to onSubmit if there's actual text (for search)
                        if (mode !== 'feed' && trimmed.length > 0 && onSubmit) {
                          onSubmit(text)
                        }
                      }}
                      onFocus={() => {
                        if (!isExpanded) setIsExpanded(true)
                        setIsSearchFocused(true)
                        setOverlaySearchQuery(searchQuery)
                        if (!mode) switchMode('feed')
                      }}
                      variant="plain"
                      showSubmitButton={isDirty && isExpanded}
                      submitLabel="Update"
                    />
                  )
                })()}
              </div>
            )}

            {/* Mode buttons with elegant positioning */}
            {!isViewingStory && !isChatRoute && (
              <div 
                className="relative left-0 right-0 flex items-center justify-between gap-3 px-1 md:px-4 pt-1 pb-0.5 border-t border-white/5"
                style={{
                  animation: 'button-slide-up 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
                  animationDelay: '0.2s',
                  opacity: 0
                }}
              >
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    tabIndex={-1}
                    onFocus={(e) => e.currentTarget.blur()}
                    onMouseUp={(e) => e.currentTarget.blur()}
                    onMouseDown={(e) => { e.preventDefault() }}
                    onClick={(e) => { e.stopPropagation(); handleModeClick('feed') }}
                    className={`flex items-center gap-1.5 px-3 py-1 md:px-3.5 md:py-1.5 rounded-t-lg text-sm md:text-base font-normal ${
                      mode === 'feed' 
                        ? 'bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 text-white shadow-sm border-t border-l border-r border-white/15 -mb-[1px]' 
                        : 'text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/14 hover:via-sky-900/11 hover:to-purple-900/8'
                    } focus:outline-none focus:ring-0 focus:border-transparent`}
                  >
                    <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span>Feed</span>
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onFocus={(e) => e.currentTarget.blur()}
                    onMouseUp={(e) => e.currentTarget.blur()}
                    onMouseDown={(e) => { e.preventDefault() }}
                    onClick={(e) => { e.stopPropagation(); handleModeClick('character') }}
                    className={`flex items-center gap-1.5 px-3 py-1 md:px-3.5 md:py-1.5 rounded-t-lg text-sm md:text-base font-normal ${
                      mode === 'character' 
                        ? 'bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 text-white shadow-sm border-t border-l border-r border-white/15 -mb-[1px]' 
                        : 'text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/14 hover:via-sky-900/11 hover:to-purple-900/8'
                    } focus:outline-none focus:ring-0 focus:border-transparent`}
                  >
                    <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span>Character</span>
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onFocus={(e) => e.currentTarget.blur()}
                    onMouseUp={(e) => e.currentTarget.blur()}
                    onMouseDown={(e) => { e.preventDefault() }}
                    onClick={(e) => { e.stopPropagation(); handleModeClick('custom') }}
                    className={`flex items-center gap-1.5 px-3 py-1 md:px-3.5 md:py-1.5 rounded-t-lg text-sm md:text-base font-normal ${
                      mode === 'custom' 
                        ? 'bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 text-white shadow-sm border-t border-l border-r border-white/15 -mb-[1px]' 
                        : 'text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/14 hover:via-sky-900/11 hover:to-purple-900/8'
                    } focus:outline-none focus:ring-0 focus:border-transparent`}
                  >
                    <Globe className="w-3.5 h-3.5 md:w-4 md:h-4" />
                    <span>Custom</span>
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    tabIndex={-1}
                    onFocus={(e) => e.currentTarget.blur()}
                    onMouseUp={(e) => e.currentTarget.blur()}
                    onMouseDown={(e) => { e.preventDefault() }}
                    onClick={(e) => { e.stopPropagation(); handleModeClick('settings') }}
                    className={`p-1 md:p-2 rounded-t-lg ${
                      mode === 'settings'
                        ? 'bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 text-white shadow-sm border-t border-l border-r border-white/15 -mb-[1px]'
                        : 'text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/14 hover:via-sky-900/11 hover:to-purple-900/8'
                    } focus:outline-none focus:ring-0 focus:border-transparent`}
                  >
                    <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    onFocus={(e) => e.currentTarget.blur()}
                    onMouseUp={(e) => e.currentTarget.blur()}
                    onMouseDown={(e) => { e.preventDefault() }}
                    onClick={(e) => { e.stopPropagation(); handleModeClick('import') }}
                    className={`p-1 md:p-2 rounded-t-lg ${
                      mode === 'import'
                        ? 'bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 text-white shadow-sm border-t border-l border-r border-white/15 -mb-[1px]'
                        : 'text-white/80 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/14 hover:via-sky-900/11 hover:to-purple-900/8'
                    } focus:outline-none focus:ring-0 focus:border-transparent`}
                  >
                    <Paperclip className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>


      {/* Imported Profile Dialog */}
      {showProfileDialog && analysisMarkdown && typeof window !== 'undefined' && createPortal(
        (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-auto">
            <div className="absolute inset-0 bg-transparent z-0" onClick={() => setShowProfileDialog(false)} />
            <div
              className="relative z-10 bg-stone-900/50 backdrop-blur-md border border-white/30 rounded-lg w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col text-white/80"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-3 md:p-4">
                <h3 className="text-white/90 text-base md:text-lg font-semibold">Imported Profile</h3>
                <button type="button" aria-label="Close" onClick={() => setShowProfileDialog(false)} className="text-white/70 hover:text-white">✕</button>
              </div>
              <div className="px-3 md:px-4 pb-3 md:pb-4 overflow-auto">
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{analysisMarkdown}</ReactMarkdown>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-3 md:p-4 border-t border-white/10">
                <UpdateSettingsButton markdown={analysisMarkdown} onDone={() => setShowProfileDialog(false)} />
                <StartStoryFromMarkdownButton markdown={analysisMarkdown} onDone={() => setShowProfileDialog(false)} />
              </div>
            </div>
          </div>
        ),
        document.getElementById('overlay-root') as HTMLElement
      )}
    </div>
  )
}

// ===== Inline buttons reused from previous import flow =====
function UpdateSettingsButton({ markdown, onDone }: { markdown: string; onDone: () => void }) {
  const { authArgs } = useAuthState()
  const updateSettings = useMutation(api.users.preferences.updateStorySettings)

  const parsed = useMemo(() => {
    const genreMatch = markdown.match(/^##\s*Genre[\s\S]*?\n([^#\n].*)/m)
    const genre = genreMatch ? genreMatch[1].trim().toLowerCase() : undefined
    const tagsSection = markdown.match(/^##\s*Tags[\s\S]*?\n([^#]+)/m)
    const tags = tagsSection ? tagsSection[1].split(/,|\n/).map(t => t.trim()).filter(Boolean).slice(0, 12) : undefined
    return { genre, tags }
  }, [markdown])

  const onClick = useCallback(async () => {
    if (!authArgs) return
    try {
      await updateSettings({ ...(authArgs as any), genre: parsed.genre, selectedTags: parsed.tags })
    } finally {
      onDone()
    }
  }, [updateSettings, authArgs, parsed, onDone])

  return (
    <button type="button" onClick={onClick} className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-md text-white text-sm">
      Update FromYou Settings
    </button>
  )
}

function StartStoryFromMarkdownButton({ markdown, onDone }: { markdown: string; onDone: () => void }) {
  const { authArgs } = useAuthState()
  const { settings } = useSettings()
  const saveSuggestion = useMutation(api.stories.mutations.saveSuggestion)
  const createStory = useMutation(api.stories.index.createStory)
  const router = useRouter()

  const extractCharacters = (md: string): { main: string[]; side: string[] } => {
    const sectionMatch = md.match(/^##\s*Characters[\s\S]*?(?=^##\s|\Z)/m)
    if (!sectionMatch) return { main: [], side: [] }
    const lines = sectionMatch[0].split('\n').slice(1).map(l => l.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
    return { main: lines.slice(0, 2).map(stripName), side: lines.slice(2).map(stripName) }
  }
  const stripName = (s: string) => s.replace(/^(\*\*|__)?([^:*—-]+)(\*\*|__)?[:—-]?.*$/u, '$2').trim()

  const extractGenre = (md: string) => {
    const m = md.match(/^##\s*Genre[\s\S]*?\n([^#\n].*)/m)
    return m ? m[1].trim().toLowerCase() : settings.genre.toLowerCase()
  }
  const extractTags = (md: string) => {
    const m = md.match(/^##\s*Tags[\s\S]*?\n([^#]+)/m)
    return m ? m[1].split(/,|\n/).map(t => t.trim()).filter(Boolean).slice(0, 12) : []
  }
  const extractPremise = (md: string) => {
    const pages = md.match(/^##\s*Story Pages[\s\S]*?(?=^##\s|\Z)/m)?.[0] || ''
    const first = pages.split('\n').slice(1).join(' ').trim()
    if (first) return first.slice(0, 400)
    const other = md.match(/^##\s*Other Notes[\s\S]*?(?=^##\s|\Z)/m)?.[0] || ''
    return other.slice(0, 400) || 'Imported story prompt'
  }

  const onClick = useCallback(async () => {
    if (!authArgs) return
    const chars = extractCharacters(markdown)
    const genre = extractGenre(markdown)
    const premise = extractPremise(markdown)
    const allCharacters = [...chars.main, ...chars.side]
    const suggestionId = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`

    try {
      await saveSuggestion({
        ...(authArgs as any),
        suggestionId,
        text: premise,
        characters: { main_characters: chars.main, side_characters: chars.side },
        metadata: {
          characters: allCharacters,
          sources: ['Custom'],
          primarySource: 'Custom',
          genre,
          storyType: 'custom',
          playerMode: settings.storyStructure === 'player',
          characterCount: settings.characterCount,
        },
      } as any)

      const storyId = await createStory({
        ...(authArgs as any),
        suggestionId,
        suggestion: {
          text: premise,
          characters: { main_characters: chars.main, side_characters: chars.side },
          metadata: {
            characters: allCharacters,
            sources: ['Custom'],
            primarySource: 'Custom',
            genre,
            storyType: 'custom',
            playerMode: settings.storyStructure === 'player',
            characterCount: settings.characterCount,
          },
        },
        selectedCharacters: allCharacters,
      } as any)

      router.push(`/s/${storyId}`)
    } finally {
      onDone()
    }
  }, [authArgs, markdown, settings, saveSuggestion, createStory, router])

  return (
    <button type="button" onClick={onClick} className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 rounded-md text-amber-100 text-sm">
      Start Story
    </button>
  )
}