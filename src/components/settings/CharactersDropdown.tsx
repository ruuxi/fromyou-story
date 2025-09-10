'use client'

import { useEffect, useRef } from 'react'
import { CharactersPerStory, CharactersPerStoryOption } from '@/types/settings'

interface CharactersDropdownProps {
  value: CharactersPerStory
  onChange: (value: CharactersPerStory) => void
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

const CHARACTERS_OPTIONS: CharactersPerStoryOption[] = [
  {
    value: 'solo',
    label: 'Solo',
    description: 'Single character story',
    icon: '👤'
  },
  {
    value: 'one-on-one',
    label: 'One on One',
    description: 'Two character interaction',
    icon: '👥'
  },
  {
    value: 'group',
    label: 'Group',
    description: 'Multiple characters',
    icon: '👫👬'
  }
]

export function CharactersDropdown({ value, onChange, isOpen, onToggle, onClose }: CharactersDropdownProps) {
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

  const handleSelect = (newValue: CharactersPerStory) => {
    onChange(newValue)
    onClose()
  }

  const currentOption = CHARACTERS_OPTIONS.find(c => c.value === value) || CHARACTERS_OPTIONS[1]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        className="w-24 md:w-32 px-2 py-1 md:px-4 md:py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-md hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-white/90 text-xs md:text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
      >
        <span className="drop-shadow-sm">{currentOption.label}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-3 right-0 w-56 bg-stone-800/20 backdrop-blur-xl border border-white/20 rounded-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="py-2">
            {CHARACTERS_OPTIONS.map((option, index) => (
              <div key={option.value}>
                {index > 0 && <div className="h-px bg-white/5 mx-2" />}
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-all ${
                    value === option.value ? 'bg-white/5' : ''
                  }`}
                >
                  <div>
                    <p className="text-white/90 text-sm font-medium drop-shadow-sm">{option.label}</p>
                    <p className="text-white/70 text-xs">{option.description}</p>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}