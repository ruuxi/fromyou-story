'use client'

import { useEffect, useRef } from 'react'
import { GenreOption } from '@/types/settings'

interface GenreDropdownProps {
  value: string
  onChange: (value: string) => void
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

const GENRE_OPTIONS: GenreOption[] = [
  { value: 'fantasy', label: 'Fantasy', icon: '🐉' },
  { value: 'romance', label: 'Romance', icon: '💕' },
  { value: 'sci-fi', label: 'Sci fi', icon: '🚀' },
  { value: 'adventure', label: 'Adventure', icon: '🗺️' },
  { value: 'mystery', label: 'Mystery', icon: '🔍' },
  { value: 'comedy', label: 'Comedy', icon: '😂' },
  { value: 'horror', label: 'Horror', icon: '👻' },
  { value: 'historical-fiction', label: 'Historical', icon: '🏛️' },
  { value: 'goon-mode', label: 'Goon Mode', icon: '🔥' }
]

export function GenreDropdown({ value, onChange, isOpen, onToggle, onClose }: GenreDropdownProps) {
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

  const handleSelect = (newValue: string) => {
    onChange(newValue)
    onClose()
  }

  const currentGenre = GENRE_OPTIONS.find(g => g.value === value) || GENRE_OPTIONS[0]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        className="w-24 md:w-32 px-2 py-1 md:px-4 md:py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-md hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-white/90 text-xs md:text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
      >
        <span className="drop-shadow-sm">{currentGenre.label}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-3 right-0 w-48 bg-stone-800/20 backdrop-blur-xl border border-white/20 rounded-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="max-h-64 overflow-y-auto py-2">
            {GENRE_OPTIONS.map((option, index) => (
              <div key={option.value}>
                {index > 0 && <div className="h-px bg-white/5 mx-2" />}
                <button
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-3 py-3 text-left hover:bg-white/10 transition-all ${
                    value === option.value ? 'bg-white/5' : ''
                  }`}
                >
                  <span className="text-white/90 text-sm drop-shadow-sm">{option.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}