'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

export type OverlayMode = 'feed' | 'character' | 'custom' | 'settings' | 'import' | null

interface SearchOverlayContextType {
  mode: OverlayMode
  isOpen: boolean
  searchQuery: string
  setSearchQuery: (query: string) => void
  open: (mode: Exclude<OverlayMode, null>) => void
  close: () => void
  switchMode: (mode: Exclude<OverlayMode, null>) => void
  toggle: (mode: Exclude<OverlayMode, null>) => void
  refreshToken: number
  requestFeedRefresh: () => void
  // Ephemeral character grouping and roles used for suggestion generation
  characterGroups: string[][]
  setCharacterGroups: (groups: string[][]) => void
  characterRoles: Record<string, 'main' | 'side'>
  setCharacterRole: (id: string, role: 'main' | 'side') => void
  clearCharacterGrouping: () => void
}

const SearchOverlayContext = createContext<SearchOverlayContextType | undefined>(undefined)

interface SearchOverlayProviderProps {
  children: ReactNode
}

export function SearchOverlayProvider({ children }: SearchOverlayProviderProps) {
  const [mode, setMode] = useState<OverlayMode>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  // Store character grouping and roles client-side only
  const [characterGroups, setCharacterGroups] = useState<string[][]>([])
  const [characterRoles, setCharacterRoles] = useState<Record<string, 'main' | 'side'>>({})

  const open = useCallback((newMode: Exclude<OverlayMode, null>) => {
    setMode(newMode)
  }, [])

  const close = useCallback(() => {
    setMode(null)
  }, [])

  const switchMode = useCallback((newMode: Exclude<OverlayMode, null>) => {
    setMode(newMode)
  }, [])

  const toggle = useCallback((newMode: Exclude<OverlayMode, null>) => {
    if (mode === newMode) {
      setMode(null) // Close if the same mode is clicked
    } else {
      setMode(newMode) // Switch to the new mode
    }
  }, [mode])

  const requestFeedRefresh = useCallback(() => {
    setRefreshToken(token => token + 1)
  }, [])

  const setCharacterRole = useCallback((id: string, role: 'main' | 'side') => {
    setCharacterRoles(prev => ({ ...prev, [id]: role }))
  }, [])

  const clearCharacterGrouping = useCallback(() => {
    setCharacterGroups([])
    setCharacterRoles({})
  }, [])

  const value: SearchOverlayContextType = {
    mode,
    isOpen: mode !== null,
    searchQuery,
    setSearchQuery,
    open,
    close,
    switchMode,
    toggle,
    refreshToken,
    requestFeedRefresh,
    characterGroups,
    setCharacterGroups,
    characterRoles,
    setCharacterRole,
    clearCharacterGrouping,
  }

  return (
    <SearchOverlayContext.Provider value={value}>
      {children}
    </SearchOverlayContext.Provider>
  )
}

export function useSearchOverlay() {
  const context = useContext(SearchOverlayContext)
  if (context === undefined) {
    throw new Error('useSearchOverlay must be used within a SearchOverlayProvider')
  }
  return context
}