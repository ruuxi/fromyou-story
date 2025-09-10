'use client'

import { createContext, useContext, RefObject } from 'react'

interface ScrollContextValue {
  scrollContainerRef: RefObject<HTMLElement | null> | null
}

const ScrollContext = createContext<ScrollContextValue>({
  scrollContainerRef: null
})

export function ScrollProvider({ 
  children, 
  scrollContainerRef 
}: { 
  children: React.ReactNode
  scrollContainerRef: RefObject<HTMLElement | null>
}) {
  return (
    <ScrollContext.Provider value={{ scrollContainerRef }}>
      {children}
    </ScrollContext.Provider>
  )
}

export function useScrollContainer() {
  const context = useContext(ScrollContext)
  return context.scrollContainerRef
}