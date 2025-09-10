'use client'

import { createContext, use, useState, ReactNode, useMemo } from 'react'
import { StorySuggestion } from '@/types/story'

interface SuggestionsContextType {
  suggestions: StorySuggestion[]
  setSuggestions: (suggestions: StorySuggestion[]) => void
  scrollPosition: number
  setScrollPosition: (position: number) => void
}

const SuggestionsContext = createContext<SuggestionsContextType | undefined>(undefined)

export function SuggestionsProvider({ children }: { children: ReactNode }) {
  const [suggestions, setSuggestions] = useState<StorySuggestion[]>([])
  const [scrollPosition, setScrollPosition] = useState(0)

  const value = useMemo(() => ({ 
    suggestions, 
    setSuggestions,
    scrollPosition,
    setScrollPosition
  }), [suggestions, scrollPosition])

  return (
    <SuggestionsContext value={value}>
      {children}
    </SuggestionsContext>
  )
}

export function useSuggestionsCache() {
  const context = use(SuggestionsContext)
  if (!context) {
    throw new Error('useSuggestionsCache must be used within SuggestionsProvider')
  }
  return context
}