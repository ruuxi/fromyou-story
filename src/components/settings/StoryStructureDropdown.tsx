'use client'

import { useEffect, useRef } from 'react'
import { StoryStructure } from '@/types/settings'

interface StoryStructureDropdownProps {
  value: StoryStructure
  onChange: (value: StoryStructure) => void
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

export function StoryStructureDropdown({ value, onChange, isOpen, onToggle, onClose }: StoryStructureDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  const handleSelect = (newValue: StoryStructure) => {
    onChange(newValue)
    onClose()
  }

  const displayText = value === 'player' ? 'Player' : 'Reader'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        className="w-24 md:w-32 px-2 py-1 md:px-4 md:py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-md hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-white/90 text-xs md:text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
      >
        <span className="drop-shadow-sm">{displayText}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-3 right-0 w-48 bg-stone-800/20 glass-primary border border-white/20 rounded-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <button
            type="button"
            onClick={() => handleSelect('player')}
            className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-all ${
              value === 'player' ? 'bg-white/5' : ''
            }`}
          >
            <span className="text-white/90 text-sm font-medium drop-shadow-sm">Player</span>
            <p className="text-white/70 text-xs mt-1">You are the main character</p>
          </button>
          <div className="h-px bg-white/5 mx-2" />
          <button
            type="button"
            onClick={() => handleSelect('reader')}
            className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-all ${
              value === 'reader' ? 'bg-white/5' : ''
            }`}
          >
            <span className="text-white/90 text-sm font-medium drop-shadow-sm">Reader</span>
            <p className="text-white/70 text-xs mt-1">Experience as observer</p>
          </button>
        </div>
      )}
    </div>
  )
}