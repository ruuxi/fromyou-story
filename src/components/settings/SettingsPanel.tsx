'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { ChevronDown, ChevronUp, Edit2 } from 'lucide-react'
import { PlayerNameEditDialog } from './PlayerNameEditDialog'
import { createPortal } from 'react-dom'

interface ExpandableSegmentProps<T extends string = string> {
  value: T
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>
  onChange: (value: T) => void
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
  isMobileDropdown?: boolean
  trailing?: React.ReactNode
}

function ExpandableSegment<T extends string>({ 
  value, 
  options, 
  onChange, 
  isExpanded, 
  onExpand,
  onCollapse,
  isMobileDropdown = false,
  trailing
}: ExpandableSegmentProps<T>) {
  const selectedOption = options.find(opt => opt.value === value)
  const [isAnimating, setIsAnimating] = useState(false)
  const [measuredWidth, setMeasuredWidth] = useState<number>(0)
  const [collapsedWidth, setCollapsedWidth] = useState<number>(0)
  const [expandedWidth, setExpandedWidth] = useState<number>(0)
  const segmentRef = useRef<HTMLDivElement>(null)
  const collapsedRef = useRef<HTMLDivElement>(null)
  const expandedRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<{ top?: number; bottom?: number; left: number; width: number } | null>(null)
  
  // Measure both states once on mount and when options change
  useEffect(() => {
    const measureWidths = () => {
      // Measure collapsed width
      if (collapsedRef.current) {
        const width = collapsedRef.current.offsetWidth
        setCollapsedWidth(width)
        if (!isExpanded && width > 0) {
          setMeasuredWidth(width)
        }
      }
      
      // Measure expanded width
      if (expandedRef.current) {
        const width = expandedRef.current.scrollWidth
        setExpandedWidth(width)
      }
    }
    
    // Initial measurement
    measureWidths()
    
    // Re-measure on window resize
    window.addEventListener('resize', measureWidths)
    return () => window.removeEventListener('resize', measureWidths)
  }, [options, selectedOption, isExpanded])
  
  // Smooth width transition
  useEffect(() => {
    if (collapsedWidth === 0 || expandedWidth === 0) return
    
    if (isExpanded) {
      // Ensure we start from collapsed width
      if (measuredWidth !== collapsedWidth) {
        setMeasuredWidth(collapsedWidth)
      }
      
      // Trigger animation to expanded width
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMeasuredWidth(expandedWidth)
          setIsAnimating(true)
        })
      })
      
      const timer = setTimeout(() => setIsAnimating(false), 1000)
      return () => clearTimeout(timer)
    } else {
      // Animate back to collapsed width
      setMeasuredWidth(collapsedWidth)
      setIsAnimating(false)
    }
  }, [isExpanded, collapsedWidth, expandedWidth])
  
  // Mobile dropdown render
  if (isMobileDropdown) {
    // Position the dropdown using a portal so it can overflow outside the header container on mobile
    useEffect(() => {
      if (!isExpanded) {
        setDropdownStyle(null)
        return
      }
      // Only render/position dropdown on small screens
      const isSmallScreen = () => window.matchMedia('(max-width: 639px)').matches

      const updatePosition = () => {
        if (!isSmallScreen()) {
          setDropdownStyle(null)
          return
        }
        const triggerEl = triggerRef.current
        const rect = triggerEl?.getBoundingClientRect()
        // Skip if the trigger is hidden (e.g., display: none on desktop)
        if (!triggerEl || triggerEl.getClientRects().length === 0 || !rect) {
          setDropdownStyle(null)
          return
        }
        // Position the dropdown ABOVE the trigger on mobile
        setDropdownStyle({
          bottom: Math.round(window.innerHeight - rect.top + 4),
          left: Math.round(rect.left),
          width: Math.round(rect.width)
        })
      }
      updatePosition()
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      return () => {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }, [isExpanded])

    return (
      <div className="relative sm:hidden">
        <button
          ref={triggerRef}
          onClick={isExpanded ? onCollapse : onExpand}
          className="inline-flex items-center gap-1 px-3 py-1 text-[11px] font-medium text-white/80 
                   bg-white/[0.03] backdrop-blur-2xl rounded-lg border border-white/[0.06]
                   active:bg-white/[0.05]"
        >
          <span className="flex items-center gap-1">
            {selectedOption?.icon}
            {selectedOption?.label}
          </span>
          <ChevronUp className="w-3 h-3" />
        </button>
        
        {/* Dropdown menu (portal) */}
        {isExpanded && dropdownStyle && createPortal(
          <div
            data-settings-dropdown="true"
            className="fixed z-[60] bg-stone-800/20 backdrop-blur-xl rounded-md border border-white/20 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              top: dropdownStyle.top,
              bottom: dropdownStyle.bottom,
              left: dropdownStyle.left,
              width: dropdownStyle.width
            }}
          >
            {options.map((option, index) => (
              <div key={option.value}>
                {index > 0 && <div className="h-px bg-white/5 mx-2" />}
                <button
                  onClick={() => {
                    onChange(option.value)
                    onCollapse()
                  }}
                  className={`
                    w-full px-3 py-2 text-[12px] text-left
                    flex items-center gap-1.5
                    hover:bg-white/10 transition-all
                    ${value === option.value ? 'bg-white/5' : ''}
                  `}
                >
                  {option.icon}
                  <span className="text-white/90">{option.label}</span>
                </button>
              </div>
            ))}
          </div>,
          document.body
        )}
      </div>
    )
  }

  // Desktop expandable segment render
  return (
    <div className="relative">
      {/* Hidden measurement divs */}
      <div className="absolute opacity-0 pointer-events-none">
        {/* Collapsed state measurement */}
        <div ref={collapsedRef} className="inline-flex">
          <div className="flex items-stretch">
            {trailing && (
              <>
                <div className="px-2 sm:px-2.5 py-1 sm:py-2 flex items-center">
                  {trailing}
                </div>
                <div className="self-center h-3 sm:h-4 w-px bg-white/10" />
              </>
            )}
            <button className="px-3 sm:px-4 py-1 sm:py-2 text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <span className="flex items-center gap-1.5">
                {selectedOption?.icon}
                {selectedOption?.label}
                <svg className="w-2 h-2 sm:w-2.5 sm:h-2.5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        </div>
        
        {/* Expanded state measurement */}
        <div ref={expandedRef} className="inline-flex">
          {options.map((option) => (
            <button
              key={option.value}
              className="px-1.5 sm:px-3 py-1 sm:py-2 text-[11px] sm:text-xs font-medium flex items-center gap-1 sm:gap-1.5 whitespace-nowrap"
            >
              <span className="flex items-center gap-1.5">
                {option.icon}
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Visible animated container */}
      <div 
        ref={segmentRef}
        className={`
          inline-flex bg-white/[0.03] backdrop-blur-2xl rounded-lg sm:rounded-xl
          border border-white/[0.06] overflow-hidden
          ${measuredWidth > 0 ? 'transition-all duration-700' : ''}
          ${isExpanded 
            ? 'shadow-[0_8px_32px_rgba(255,255,255,0.08)] bg-white/[0.06]' 
            : 'hover:bg-white/[0.05] active:scale-[0.98]'
          }
        `}
        style={{
          width: measuredWidth > 0 ? `${measuredWidth}px` : 'auto',
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
          transitionProperty: 'width, background-color, box-shadow, transform',
        }}
      >
        {isExpanded ? (
          // Expanded state - show all options with staggered animation
          <div className="flex">
            {options.map((option, index) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setTimeout(onCollapse, 200) // Slight delay for feedback
                }}
                className={`
                  relative px-1.5 sm:px-3 py-1 sm:py-2 text-[11px] sm:text-xs font-medium
                  transition-all duration-400 ease-out
                  flex items-center gap-1 sm:gap-1.5 whitespace-nowrap
                  ${value === option.value
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80'
                  }
                  ${isAnimating ? 'animate-in fade-in slide-in-from-left-2' : ''}
                `}
                style={{
                  animationDelay: `${index * 80}ms`,
                  animationDuration: '600ms',
                  animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* Selection indicator matches active feed button (color/border/shadow only) */}
                {value === option.value && (
                  <div 
                    className="absolute inset-0 rounded-lg bg-white/12 border border-white/20 
                               shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1),_0_4px_12px_rgba(255,255,255,0.05)]
                               animate-in fade-in zoom-in-95 duration-500"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {option.icon}
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          // Collapsed state - show only selected with hover effect
          <div className="relative flex items-stretch">
            {trailing && (
              <>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    ;(e.currentTarget.querySelector('[data-trailing-activate]') as HTMLElement | null)?.click?.()
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      ;(e.currentTarget.querySelector('[data-trailing-activate]') as HTMLElement | null)?.click?.()
                    }
                  }}
                  className="px-2 sm:px-2.5 py-1 sm:py-2 cursor-pointer hover:bg-white/10 flex items-center flex-1 justify-center"
                >
                  {trailing}
                </span>
                <div className="self-center h-3 sm:h-4 w-px bg-white/10" />
              </>
            )}
            <button
              onClick={onExpand}
              className="relative px-3 sm:px-4 py-1 sm:py-2 text-[11px] sm:text-xs font-medium text-white/80 
                       hover:text-white transition-all duration-300 
                       flex items-center gap-1 sm:gap-1.5 whitespace-nowrap group
                       active:bg-white/5 sm:active:bg-transparent"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                {selectedOption?.icon}
                {selectedOption?.label}
                {/* Subtle expand indicator */}
                <svg 
                  className="w-2 h-2 sm:w-2.5 sm:h-2.5 ml-0.5 opacity-30 group-hover:opacity-50 transition-all duration-400
                           group-hover:translate-x-0.5"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface SettingsPanelProps {
  onClose?: () => void
}

export function SettingsPanel({ onClose }: SettingsPanelProps = {}) {
  const {
    settings,
    updateStoryStructure,
    updateGenre,
    updateCharacterCount,
    updateGoonMode,
    updatePlayerName
  } = useSettings()
  
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [isPlayerNameDialogOpen, setIsPlayerNameDialogOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Click outside to close with slight delay
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const targetEl = event.target as HTMLElement
      // Treat clicks inside the portaled dropdown as inside as well
      if (targetEl && targetEl.closest('[data-settings-dropdown="true"]')) {
        return
      }
      if (containerRef.current && !containerRef.current.contains(targetEl)) {
        // Add slight delay to allow for click feedback
        setTimeout(() => setExpandedSection(null), 100)
      }
    }
    
    if (expandedSection) {
      // Delay adding listener to prevent immediate close
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [expandedSection])
  
  // Auto-open player name dialog if user is in player mode but has no player name
  useEffect(() => {
    if (settings.storyStructure === 'player' && !settings.playerName && !isPlayerNameDialogOpen) {
      setIsPlayerNameDialogOpen(true)
    }
  }, [settings.storyStructure, settings.playerName, isPlayerNameDialogOpen])
  
  // Memoized options to avoid re-creating arrays on each render
  const storyRoleOptions = useMemo(() => ([
    { value: 'player' as const, label: 'Player' },
    { value: 'reader' as const, label: 'Reader' }
  ]), [])

  const characterCountOptions = useMemo(() => ([
    { value: 'solo' as const, label: 'Solo' },
    { value: 'one-on-one' as const, label: 'Duo' },
    { value: 'group' as const, label: 'Group' }
  ]), [])

  const genreOptions = useMemo(() => ([
    { value: 'fantasy', label: 'Fantasy' },
    { value: 'romance', label: 'Romance' },
    { value: 'sci-fi', label: 'Sci fi' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'mystery', label: 'Mystery' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'horror', label: 'Horror' },
    { value: 'historical-fiction', label: 'Historical' },
    { value: 'goon-mode', label: 'Goon Mode' }
  ]), [])
  
  const handleGenreChange = (value: string) => {
    // Selecting goon-mode sets the genre; goonMode is derived from genre
    if (value === 'goon-mode') updateGoonMode(true)
    else updateGenre(value)
  }
  
  const currentGenreValue = settings.genre
  
  const handlePlayerNameSave = (name: string) => {
    updatePlayerName(name)
    setIsPlayerNameDialogOpen(false)
  }
  
  const handlePlayerNameCancel = () => {
    setIsPlayerNameDialogOpen(false)
  }
  
  const handleEditPlayerName = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsPlayerNameDialogOpen(true)
  }
  
  return (
    <div className="w-full relative">
      {/* Close button in header padding */}
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
      <div className="space-y-2 animate-in fade-in duration-300">
        <div className="text-center px-4">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-1 drop-shadow-lg">Settings</h3>
          <p className="text-xs md:text-sm text-white/80">Customize your story preferences</p>
        </div>
        
        <div
          className="px-4 space-y-3"
          ref={containerRef}
        >
          {/* First row: Story Role and Character Count */}
          <div className="flex items-center gap-2 sm:gap-3 justify-center">
            {/* Story Role */}
            <ExpandableSegment
              value={settings.storyStructure}
              options={storyRoleOptions}
              onChange={updateStoryStructure}
              isExpanded={expandedSection === 'role'}
              onExpand={() => setExpandedSection('role')}
              onCollapse={() => setExpandedSection(null)}
              trailing={settings.storyStructure === 'player' ? (
                <button
                  type="button"
                  data-trailing-activate
                  onClick={(e) => {
                    e.stopPropagation()
                    handleEditPlayerName(e as any)
                  }}
                  className="w-full inline-flex items-center justify-center gap-1 text-white/60 hover:text-white/80 min-w-0"
                  title={`Edit player name${settings.playerName ? `: ${settings.playerName}` : ''}`}
                  aria-label="Edit player name"
                >
                  <Edit2 className="w-3 h-3 flex-shrink-0" />
                  <span className="text-[11px] min-w-0 flex-1">
                    {settings.playerName ? (
                      <span 
                        className="block truncate max-w-[50px] sm:max-w-[60px]" 
                        title={settings.playerName}
                      >
                        {settings.playerName}
                      </span>
                    ) : (
                      <span className="hidden sm:inline">Edit</span>
                    )}
                  </span>
                </button>
              ) : undefined}
            />
            
            {/* Separator with fade animation */}
            <div className={`h-3 w-px bg-white/10 transition-all duration-700 ${
              expandedSection ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
            }`} />
            
            {/* Character Count */}
            <ExpandableSegment
              value={settings.characterCount}
              options={characterCountOptions}
              onChange={updateCharacterCount}
              isExpanded={expandedSection === 'characters'}
              onExpand={() => setExpandedSection('characters')}
              onCollapse={() => setExpandedSection(null)}
            />
          </div>
          
          {/* Second row: Genre Selection */}
          <div className="flex items-center justify-center">
            {/* Genre Selection - Mobile */}
            <div className="sm:hidden">
              <ExpandableSegment
                value={currentGenreValue}
                options={genreOptions}
                onChange={handleGenreChange}
                isExpanded={expandedSection === 'genre'}
                onExpand={() => setExpandedSection('genre')}
                onCollapse={() => setExpandedSection(null)}
                isMobileDropdown={true}
              />
            </div>
            
            {/* Genre Selection - Desktop */}
            <div className="hidden sm:block">
              <ExpandableSegment
                value={currentGenreValue}
                options={genreOptions}
                onChange={handleGenreChange}
                isExpanded={expandedSection === 'genre'}
                onExpand={() => setExpandedSection('genre')}
                onCollapse={() => setExpandedSection(null)}
              />
            </div>
          </div>
        </div>
      </div>
      
      <PlayerNameEditDialog
        isOpen={isPlayerNameDialogOpen}
        currentName={settings.playerName}
        onSave={handlePlayerNameSave}
        onCancel={handlePlayerNameCancel}
      />
    </div>
  )
}