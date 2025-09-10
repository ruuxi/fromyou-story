'use client'

import { createContext, use, useState, ReactNode, useMemo, useRef } from 'react'

interface NavigationContextType {
  searchQuery: string
  setSearchQuery: (query: string) => void
  isSearching: boolean
  setIsSearching: (searching: boolean) => void
  searchHandlerRef: React.MutableRefObject<((query: string) => void) | null>
  chatSendHandlerRef: React.MutableRefObject<((text: string) => void) | null>
  storyHeaderTitle?: string
  setStoryHeaderTitle: (title?: string) => void
  chatHeaderTitle?: string
  setChatHeaderTitle: (title?: string) => void
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [storyHeaderTitle, setStoryHeaderTitle] = useState<string | undefined>(undefined)
  const [chatHeaderTitle, setChatHeaderTitle] = useState<string | undefined>(undefined)
  const searchHandlerRef = useRef<((query: string) => void) | null>(null)
  const chatSendHandlerRef = useRef<((text: string) => void) | null>(null)

  const value = useMemo(() => ({ 
    searchQuery,
    setSearchQuery,
    isSearching,
    setIsSearching,
    searchHandlerRef,
    chatSendHandlerRef,
    storyHeaderTitle,
    setStoryHeaderTitle,
    chatHeaderTitle,
    setChatHeaderTitle
  }), [searchQuery, isSearching, storyHeaderTitle, chatHeaderTitle])

  return (
    <NavigationContext value={value}>
      {children}
    </NavigationContext>
  )
}

export function useNavigation() {
  const context = use(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}