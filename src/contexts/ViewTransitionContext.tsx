'use client'

import { createContext, useContext, useCallback, useState } from 'react'

interface ViewTransitionContextType {
  startViewTransition: (callback: () => void | Promise<void>) => Promise<void>
  isTransitioning: boolean
}

const ViewTransitionContext = createContext<ViewTransitionContextType>({
  startViewTransition: async (callback) => { await callback() },
  isTransitioning: false
})

export function ViewTransitionProvider({ children }: { children: React.ReactNode }) {
  const [isTransitioning, setIsTransitioning] = useState(false)

  const startViewTransition = useCallback(async (callback: () => void | Promise<void>) => {
    setIsTransitioning(true)
    
    // Check if browser supports View Transitions API
    if ('startViewTransition' in document && typeof document.startViewTransition === 'function') {
      try {
        const transition = document.startViewTransition(async () => {
          await callback()
        })
        await transition.finished
      } catch (err) {
        // Fallback if View Transitions API fails
        await callback()
      }
    } else {
      // Fallback for browsers without View Transitions API
      await callback()
    }
    
    setIsTransitioning(false)
  }, [])

  return (
    <ViewTransitionContext.Provider value={{ startViewTransition, isTransitioning }}>
      {children}
    </ViewTransitionContext.Provider>
  )
}

export const useViewTransition = () => useContext(ViewTransitionContext)