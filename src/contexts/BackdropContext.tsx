'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface BackdropContextType {
  backdropOpacity: number
  setBackdropOpacity: (opacity: number) => void
  isMobile: boolean
}

const BackdropContext = createContext<BackdropContextType>({
  backdropOpacity: 0,
  setBackdropOpacity: () => {},
  isMobile: false
})

export function BackdropProvider({ children }: { children: ReactNode }) {
  const [backdropOpacity, setBackdropOpacity] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  
  // Detect mobile screen size
  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768)
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])
  
  // Handle backdrop based on route
  useEffect(() => {
    const isStoryPage = pathname.startsWith('/s/') || pathname.startsWith('/stories/')
    const isChatPage = pathname.startsWith('/c/')
    
    if (isStoryPage || isChatPage) {
      // Fade in when entering story or chat page
      const timer = setTimeout(() => {
        setBackdropOpacity(1)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      // Fade out when leaving story or chat page
      setBackdropOpacity(0)
    }
  }, [pathname])
  
  return (
    <BackdropContext.Provider value={{ backdropOpacity, setBackdropOpacity, isMobile }}>
      {children}
    </BackdropContext.Provider>
  )
}

export const useBackdrop = () => useContext(BackdropContext)