'use client'

import { useEffect, useRef } from 'react'
import { POVOption } from '@/types/settings'

interface POVDropdownProps {
  value: 'first' | 'second' | 'third'
  onChange: (value: 'first' | 'second' | 'third') => void
  isOpen: boolean
  onToggle: () => void
  onClose: () => void
}

const POV_OPTIONS: POVOption[] = [
  { value: 'first', label: '1st Person', description: 'I walked...' },
  { value: 'second', label: '2nd Person', description: 'You walked...' },
  { value: 'third', label: '3rd Person', description: 'They walked...' }
]

export function POVDropdown({ value, onChange, isOpen, onToggle, onClose }: POVDropdownProps) {
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

  const handleSelect = (newValue: 'first' | 'second' | 'third') => {
    onChange(newValue)
    onClose()
  }

  const currentPOV = POV_OPTIONS.find(p => p.value === value) || POV_OPTIONS[2]

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={onToggle}
        className="w-24 md:w-32 px-2 py-1 md:px-4 md:py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-md hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-white/90 text-xs md:text-sm font-medium shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
      >
        <span className="drop-shadow-sm">{currentPOV.label}</span>
      </button>

      {isOpen && (
        <div className="absolute bottom-full mb-3 right-0 w-48 bg-stone-800/20 backdrop-blur-xl border border-white/20 rounded-md overflow-hidden shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
          <div className="py-2">
            {POV_OPTIONS.map((option, index) => (
              <div key={option.value}>
                {index > 0 && <div className="h-px bg-white/5 mx-2" />}
                <button
                  type="button"
                  onClick={() => handleSelect(option.value as 'first' | 'second' | 'third')}
                  className={`w-full px-4 py-3 text-left hover:bg-white/10 transition-all ${
                    value === option.value ? 'bg-white/5' : ''
                  }`}
                >
                  <span className="text-white/90 text-sm font-medium drop-shadow-sm">{option.label}</span>
                  <p className="text-white/70 text-xs italic mt-1">&quot;{option.description}&quot;</p>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}