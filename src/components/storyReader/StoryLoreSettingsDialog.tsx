'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAction, useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'

interface StoryLoreSettingsDialogProps {
  storyId: string
  primarySource?: string
  selectedCharacters: string[]
  onSave: (data: { worldLore?: string; characterLore?: Record<string, string> }) => void
  onClose: () => void
  inline?: boolean
  isOverlayFadingOut?: boolean
}

export function StoryLoreSettingsDialog({ storyId, primarySource, selectedCharacters, onSave, onClose, inline = false, isOverlayFadingOut = false }: StoryLoreSettingsDialogProps) {
  const [worldLoreDraft, setWorldLoreDraft] = useState<string>('')
  const [characterLoreDraft, setCharacterLoreDraft] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState<'world' | 'characters'>('world')
  const [isInlineClosing, setIsInlineClosing] = useState<boolean>(false)
  const [isTabTransitioning, setIsTabTransitioning] = useState<boolean>(false)
  const [expandedCharacters, setExpandedCharacters] = useState<Set<string>>(new Set())
  const { authArgs } = useAuthState()
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [headerOffset, setHeaderOffset] = useState<number>(0)
  const [isMobile, setIsMobile] = useState<boolean>(false)

  // Match SearchContainer's unified design system
  const animationStyle = (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          /* Liquid animation system */
          @keyframes liquid-expand {
            0% { 
              transform: scale(0.95) translateY(8px);
              border-radius: 28px;
              opacity: 0;
            }
            100% { 
              transform: scale(1) translateY(0);
              border-radius: 20px;
              opacity: 1;
            }
          }
          
          @keyframes content-reveal {
            0% { 
              opacity: 0;
              transform: translateY(8px);
            }
            100% { 
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes button-slide-up {
            0% {
              opacity: 0;
              transform: translateY(16px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Button states matching SearchContainer */
          .mode-button {
            background: transparent;
            border: 1px solid transparent;
            color: rgba(255, 255, 255, 0.7);
            transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            border-radius: 0;
          }
          
          .mode-button:hover:not(.active) {
            background: 
              linear-gradient(to bottom right, 
                rgba(146, 64, 14, 0.14), 
                rgba(12, 74, 110, 0.11), 
                rgba(88, 28, 135, 0.08)
              ),
              rgba(0, 0, 0, 0.12);
            border-color: rgba(255, 255, 255, 0.10);
            color: rgba(255, 255, 255, 0.8);
            transform: translateY(-0.5px);
          }
          
          .mode-button.active {
            background: 
              linear-gradient(to bottom right, 
                rgba(146, 64, 14, 0.2), 
                rgba(12, 74, 110, 0.15), 
                rgba(88, 28, 135, 0.1)
              ),
              rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.9);
            box-shadow: none;
          }

        `,
      }}
    />
  )

  // Load defaults
  const worldLore = useQuery(api.characters.loreHelpers.getWorldLore, primarySource ? { source: primarySource } : 'skip') as string | null | undefined
  const characterLore = useQuery(api.characters.loreHelpers.getCharacterLoreForStory,
    primarySource ? { characterNames: selectedCharacters, source: primarySource } : 'skip'
  ) as Record<string, string> | undefined

  // Load user/session customized lore
  const customWorldLoreList = useQuery(api.customContent.queries.getCustomWorldLore, authArgs || 'skip')
  const activeCustomCharacters = useQuery(api.customContent.queries.getActiveCustomCharacters, authArgs || 'skip')

  const customizedWorldLoreForSource = useMemo(() => {
    if (!customWorldLoreList || !primarySource) return undefined
    
    return customWorldLoreList.find((l: any) => l.isActive && l.isCustomized && (l.originalSource === primarySource))
  }, [customWorldLoreList, primarySource])

  // Filter to characters that actually have lore for this source (canonical or customized)
  const displayCharacterNames = useMemo(() => {
    if (!selectedCharacters || selectedCharacters.length === 0) return []
    return selectedCharacters.filter((name) => {
      const canonicalExists = Boolean(characterLore?.[name])
      const customizedExists = !!activeCustomCharacters?.some((c: any) =>
        c.isCustomized &&
        c.originalCharacter?.source === primarySource &&
        c.fullName?.toLowerCase() === name.toLowerCase() &&
        c.characterLore
      )
      return canonicalExists || customizedExists
    })
  }, [selectedCharacters, characterLore, activeCustomCharacters, primarySource])

  const isCharacterLoreCustomized = useMemo(() => {
    return displayCharacterNames.some((name) => characterLoreDraft[name] !== (characterLore?.[name] || ''))
  }, [displayCharacterNames, characterLoreDraft, characterLore])

  useEffect(() => {
    if (customizedWorldLoreForSource && customizedWorldLoreForSource.lore) {
      setWorldLoreDraft(customizedWorldLoreForSource.lore)
      return
    }
    if (worldLore !== undefined && worldLoreDraft === '') {
      setWorldLoreDraft(worldLore || '')
    }
  }, [customizedWorldLoreForSource, worldLore])

  useEffect(() => {
    // Overlay customized characters over canonical lore for displayed names only
    if (activeCustomCharacters && displayCharacterNames.length > 0) {
      setCharacterLoreDraft(prev => {
        let changed = false
        const next: Record<string, string> = { ...prev }
        for (const name of displayCharacterNames) {
          const custom = activeCustomCharacters.find((c: any) => c.isCustomized && c.originalCharacter?.source === primarySource && c.fullName?.toLowerCase() === name.toLowerCase())
          if (custom?.characterLore) {
            if (next[name] !== custom.characterLore) {
              next[name] = custom.characterLore
              changed = true
            }
          } else if (!next[name] && characterLore?.[name]) {
            next[name] = characterLore[name]
            changed = true
          }
        }
        return changed ? next : prev
      })
      return
    }
    if (characterLore && Object.keys(characterLoreDraft).length === 0) {
      setCharacterLoreDraft(characterLore)
    }
  }, [activeCustomCharacters, displayCharacterNames, characterLore])

  const saveCustomLore = useMutation(api.customContent.mutations.saveStoryCustomLore)

  // Save only currently displayed characters to avoid persisting unrelated entries
  const characterLoreToSave = useMemo(() => {
    const result: Record<string, string> = {}
    for (const name of displayCharacterNames) {
      if (Object.prototype.hasOwnProperty.call(characterLoreDraft, name)) {
        result[name] = characterLoreDraft[name]
      }
    }
    return result
  }, [displayCharacterNames, characterLoreDraft])

  const handleSave = async () => {
    try {
      await saveCustomLore({
        ...(authArgs || {}),
        primarySource: primarySource || 'Custom',
        worldLore: worldLoreDraft?.trim() ? worldLoreDraft : undefined,
        characterLore: Object.keys(characterLoreToSave).length ? characterLoreToSave : undefined,
      } as any)
    } catch (e) {
      console.error('Failed to save custom lore', e)
    }
    onSave({
      worldLore: worldLoreDraft || undefined,
      characterLore: Object.keys(characterLoreToSave).length ? characterLoreToSave : undefined,
    })
  }

  // Ensure background doesn't scroll and dialog starts at the top (overlay only)
  useEffect(() => {
    if (inline) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const measureHeader = () => {
      const headerEl = document.querySelector('[data-app-header="true"]') as HTMLElement | null
      const h = headerEl ? headerEl.offsetHeight : 0
      setHeaderOffset(h)
    }
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    measureHeader()
    checkMobile()
    window.addEventListener('resize', measureHeader)
    window.addEventListener('resize', checkMobile)
    window.addEventListener('orientationchange', measureHeader)
    window.addEventListener('orientationchange', checkMobile)

    // Scroll panel to top on open
    if (panelRef.current) panelRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    // Focus panel for better iOS behavior
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('resize', measureHeader)
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('orientationchange', measureHeader)
      window.removeEventListener('orientationchange', checkMobile)
    }
  }, [inline])

  // When using inline variant, ensure the page (main) scrollbar is a simple bar
  useEffect(() => {
    if (!inline) return
    document.body.classList.add('simple-scrollbar')
    return () => {
      document.body.classList.remove('simple-scrollbar')
    }
  }, [inline])

  // Close when clicking outside the inline dialog container
  useEffect(() => {
    if (!inline) return
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const root = containerRef.current
      const target = event.target as Node | null
      if (!root || !target) return
      if (!root.contains(target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handlePointerDown, true)
    document.addEventListener('touchstart', handlePointerDown, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true)
      document.removeEventListener('touchstart', handlePointerDown, true)
    }
  }, [inline, onClose])

  // Smooth close helpers
  const handleInlineClose = () => {
    setIsInlineClosing(true)
    window.setTimeout(() => {
      onClose()
    }, 400)
  }

  // Handle tab changes with smooth cross-fade transition
  const handleTabChange = (tab: 'world' | 'characters') => {
    if (tab === activeTab || isTabTransitioning) return
    setIsTabTransitioning(true)
    
    // Faster transition - reduced from 350ms to 200ms
    setTimeout(() => {
      setActiveTab(tab)
      
      // Allow fade in to complete
      setTimeout(() => {
        setIsTabTransitioning(false)
      }, 30)
    }, 200)
  }

  // Inline rendering variant (not an overlay)
  if (inline) {
    return (
      <div ref={containerRef} className={`relative z-10 mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-0 my-3 ${isInlineClosing ? 'animate-fade-out-soft' : 'animate-fade-in-soft'}`}>
        <div className="relative text-white  border border-slate-600" style={{ background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(250, 204, 21, 0.12), rgba(34, 197, 94, 0.08), rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.15)), rgb(25, 35, 50)', animation: 'liquid-expand 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both', transformOrigin: 'center top' }}>
          {animationStyle}
            
          {/* Close button */}
          <button type="button" aria-label="Close" onClick={handleInlineClose} className="absolute right-6 top-3 z-30 text-white/70 hover:text-white text-xl leading-none rounded-md focus:outline-none transition-all duration-300 hover:scale-110">✕</button>
          
          {/* Tab Navigation */}
          <div className="px-4 sm:px-5 pt-4 flex justify-center"
            style={{ animation: 'content-reveal 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both' }}
          >
            <div className="inline-flex gap-1.5">
              <button
                type="button"
                onClick={() => handleTabChange('world')}
                className={`mode-button ${activeTab === 'world' ? 'active' : ''} px-3 py-1.5  text-base font-medium transition-all focus:outline-none`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-pressed={activeTab === 'world'}
              >
                <span>World Lore</span>
                {worldLoreDraft && worldLoreDraft !== (worldLore || '') && (
                  <span className="ml-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full inline-block align-middle relative z-10"></span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('characters')}
                className={`mode-button ${activeTab === 'characters' ? 'active' : ''} px-3 py-1.5  text-base font-medium transition-all focus:outline-none`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-pressed={activeTab === 'characters'}
              >
                <span>Character Lore</span>
                {isCharacterLoreCustomized && (
                  <span className="ml-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full inline-block align-middle relative z-10"></span>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content with smooth cross-fade transitions */}
          <div className="px-4 sm:px-5 pt-4 relative" style={{ minHeight: '250px' }}>
            {/* World Lore Tab */}
            <div 
              className={`absolute inset-0 px-4 sm:px-5 pt-4 transition-all duration-[200ms] ease-in-out ${
                activeTab === 'world' ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-1 z-0 pointer-events-none'
              }`}
            >
              <div className="tab-panel h-full" key="world">
                <textarea
                  className="w-full h-full p-3 sm:p-3 pt-2 bg-slate-800 text-white placeholder-slate-400 rounded-md text-base border border-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 leading-7 md:leading-8 resize-none overflow-auto simple-scrollbar"
                  value={worldLoreDraft}
                  onChange={(e) => setWorldLoreDraft(e.target.value)}
                  placeholder="Describe the world, setting, rules, and tone..."
                />
              </div>
            </div>
            
            {/* Character Lore Tab */}
            <div 
              className={`absolute inset-0 px-4 sm:px-5 pt-4 transition-all duration-[200ms] ease-in-out ${
                activeTab === 'characters' ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-1 z-0 pointer-events-none'
              }`}
            >
              <div className="tab-panel" key="characters">
                <div className="flex flex-col gap-2">
                  {displayCharacterNames.map((name) => (
                    <div key={name} className="border border-white/20  overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedCharacters(prev => {
                          const next = new Set(prev)
                          if (next.has(name)) {
                            next.delete(name)
                          } else {
                            next.add(name)
                          }
                          return next
                        })}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/20 transition-all duration-300 text-left"
                      >
                        <span className="text-white/90 text-sm sm:text-base font-medium">{name}</span>
                        <svg
                          className={`w-5 h-5 text-white/60 transition-transform duration-300 ${
                            expandedCharacters.has(name) ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedCharacters.has(name) && (
                        <div className="bg-white/5 border-t border-white/10 animate-fade-in-soft h-48 md:h-56">
                          <textarea
                            className="w-full h-full p-2.5 sm:p-3 pt-2 bg-white/10 text-white/90 placeholder-white/40 text-sm sm:text-base border-0 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/25 leading-7 md:leading-8 resize-none overflow-auto simple-scrollbar"
                            value={characterLoreDraft[name] || ''}
                            onChange={(e) => setCharacterLoreDraft(prev => ({ ...prev, [name]: e.target.value }))}
                            placeholder={`Lore for ${name}...`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {displayCharacterNames.length === 0 && (
                    <div className="text-white/60 text-base">No characters with lore for this source.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 supports-[backdrop-filter]:bg-white/5 backdrop-blur border-t border-white/15 px-4 sm:px-5 pt-2 pb-3 " style={{ animation: 'button-slide-up 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s both' }}>
            <div className="flex items-center justify-center">
              <button type="button" onClick={handleSave} className="px-5 py-2 text-sm text-white/90 bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 hover:from-amber-900/24 hover:via-sky-900/18 hover:to-purple-900/12 border border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const overlay = (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[1000] flex items-start justify-center overflow-hidden ${isOverlayFadingOut ? 'animate-fade-out-soft' : 'animate-fade-in-soft'}`}
      style={{ paddingTop: headerOffset ? `${headerOffset}px` : undefined }}
    >
      <div
        className="fixed inset-0 z-0 backdrop-blur-3xl"
        style={{ backdropFilter: 'blur(64px) saturate(180%)', WebkitBackdropFilter: 'blur(64px) saturate(180%)' }}
        onClick={onClose}
      />
      <div
        className={`relative z-10 text-white  border border-slate-600 w-full max-w-3xl mx-0 sm:mx-4 my-0 p-0 focus:outline-none flex flex-col ${isOverlayFadingOut ? 'animate-fade-out-soft' : 'animate-fade-in-soft'}`}
        style={{ 
          background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(250, 204, 21, 0.12), rgba(34, 197, 94, 0.08), rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.15)), rgb(25, 35, 50)',
          height: headerOffset ? `calc(100vh - ${headerOffset}px)` : '100vh',
          maxHeight: headerOffset ? `calc(100vh - ${headerOffset}px)` : '100vh'
        }}
        ref={panelRef}
        tabIndex={-1}
      >
        {animationStyle}
        {/* Close button */}
          <button type="button" aria-label="Close" onClick={onClose} className="hidden sm:block absolute right-6 top-3 z-30 text-white/70 hover:text-white text-xl leading-none rounded-md focus:outline-none transition-all duration-300 hover:scale-110">✕</button>
          
          {/* Tab Navigation */}
          <div className="px-4 sm:px-5 pt-4 pb-2 flex justify-center"
            style={{ animation: 'content-reveal 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both' }}
          >
            <div className="inline-flex gap-1.5">
              <button
                type="button"
                onClick={() => handleTabChange('world')}
                className={`mode-button ${activeTab === 'world' ? 'active' : ''} px-3 py-1.5  text-base font-medium transition-all focus:outline-none`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-pressed={activeTab === 'world'}
              >
                <span>World Lore</span>
                {worldLoreDraft && worldLoreDraft !== (worldLore || '') && (
                  <span className="ml-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full inline-block align-middle relative z-10"></span>
                )}
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('characters')}
                className={`mode-button ${activeTab === 'characters' ? 'active' : ''} px-3 py-1.5  text-base font-medium transition-all focus:outline-none`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                aria-pressed={activeTab === 'characters'}
              >
                <span>Character Lore</span>
                {isCharacterLoreCustomized && (
                  <span className="ml-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full inline-block align-middle relative z-10"></span>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content with smooth cross-fade transitions */}
          <div className="px-4 sm:px-5 pb-4 relative flex-1 overflow-hidden" style={{ minHeight: '250px' }}>
            {/* World Lore Tab */}
            <div 
              className={`absolute inset-0 px-4 sm:px-5 pb-4 transition-all duration-[200ms] ease-in-out overflow-auto simple-scrollbar ${
                activeTab === 'world' ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-1 z-0 pointer-events-none'
              }`}
            >
              <div className="tab-panel h-full" key="world">
                <textarea
                  className="w-full h-full p-3 sm:p-3 pt-2 bg-white/10 text-white/90 placeholder-white/40 rounded-md text-base border border-white/15 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 leading-7 md:leading-8 resize-none overflow-auto simple-scrollbar"
                  value={worldLoreDraft}
                  onChange={(e) => setWorldLoreDraft(e.target.value)}
                  placeholder="Describe the world, setting, rules, and tone..."
                />
              </div>
            </div>
            
            {/* Character Lore Tab */}
            <div 
              className={`absolute inset-0 px-4 sm:px-5 pb-4 transition-all duration-[200ms] ease-in-out overflow-auto simple-scrollbar ${
                activeTab === 'characters' ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-1 z-0 pointer-events-none'
              }`}
            >
              <div className="tab-panel" key="characters">
                <div className="flex flex-col gap-2">
                  {displayCharacterNames.map((name) => (
                    <div key={name} className="border border-white/20  overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedCharacters(prev => {
                          const next = new Set(prev)
                          if (next.has(name)) {
                            next.delete(name)
                          } else {
                            next.add(name)
                          }
                          return next
                        })}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white/10 hover:bg-white/20 transition-all duration-300 text-left"
                      >
                        <span className="text-white/90 text-sm sm:text-base font-medium">{name}</span>
                        <svg
                          className={`w-5 h-5 text-white/60 transition-transform duration-300 ${
                            expandedCharacters.has(name) ? 'rotate-180' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedCharacters.has(name) && (
                        <div className="bg-white/5 border-t border-white/10 animate-fade-in-soft h-64 sm:h-48 md:h-56">
                          <textarea
                            className="w-full h-full p-2.5 sm:p-3 pt-2 bg-black/30 text-white/90 placeholder-white/40 text-sm sm:text-base border-0 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300 leading-7 md:leading-8 resize-none overflow-auto simple-scrollbar"
                            value={characterLoreDraft[name] || ''}
                            onChange={(e) => setCharacterLoreDraft(prev => ({ ...prev, [name]: e.target.value }))}
                            placeholder={`Lore for ${name}...`}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  {displayCharacterNames.length === 0 && (
                    <div className="text-white/60 text-base">No characters with lore for this source.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/10 supports-[backdrop-filter]:bg-white/5 backdrop-blur border-t border-white/15 px-4 sm:px-5 pt-3 pb-6  relative" style={{ animation: 'button-slide-up 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s both' }}>
            <div className="flex items-center justify-center">
              <button type="button" onClick={handleSave} className="px-5 py-2.5 text-sm text-white/90 bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 hover:from-amber-900/24 hover:via-sky-900/18 hover:to-purple-900/12 border border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed">Save</button>
            </div>
            <button type="button" aria-label="Close" onClick={onClose} className="sm:hidden absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 text-white/70 hover:text-white text-lg leading-none rounded-full hover:bg-white/10 focus:outline-none transition-all duration-300 hover:scale-110">✕</button>
          </div>
      </div>
    </div>
  );

  // Use portal to escape parent stacking contexts and ensure topmost z layering
  return typeof window !== 'undefined' ? createPortal(overlay, document.body) : null
}
