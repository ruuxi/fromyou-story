'use client'

import { useState, useEffect, ReactNode } from 'react'
import { LandingOverlay } from './LandingOverlay'

interface LandingOverlayWrapperProps {
  children: ReactNode
}

export function LandingOverlayWrapper({ children }: LandingOverlayWrapperProps) {
  const [showOverlay, setShowOverlay] = useState(false) // Start false to prevent flash
  const [isHydrated, setIsHydrated] = useState(false)
  const [shouldRenderMainContent, setShouldRenderMainContent] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
    
    // Skip overlay on special routes
    if (typeof window !== 'undefined') {
      const { pathname } = window.location
      
      // Skip overlay for blind_test route
      if (pathname.startsWith('/blind_test')) {
        setShowOverlay(false)
        setShouldRenderMainContent(true) // Allow main content to render immediately
        return
      }
      
      // Skip overlay for shared story routes (/s/[shareToken])
      if (pathname.startsWith('/s/')) {
        setShowOverlay(false)
        setShouldRenderMainContent(true) // Allow main content to render immediately
        return
      }

      // Check if onboarding was already completed
      const hasCompletedOnboarding = localStorage.getItem('hasCompletedOnboarding') === 'true'
      if (hasCompletedOnboarding) {
        setShowOverlay(false)
        setShouldRenderMainContent(true) // Allow main content to render immediately
        return
      }

      // Show overlay if onboarding not completed
      setShowOverlay(true)
      document.body.setAttribute('data-landing', 'true')
      // Don't render main content until onboarding is complete
      setShouldRenderMainContent(false)
    }

    // Set up the global handler for when landing is done
    if (typeof window !== 'undefined') {
      ;(window as Window & { __onLandingDone?: () => void }).__onLandingDone = () => {
        setShowOverlay(false)
        setShouldRenderMainContent(true) // Now allow main content to render
        try { document.body.removeAttribute('data-landing') } catch {}
      }
    }

    return () => {
      if (typeof window !== 'undefined') {
        ;(window as Window & { __onLandingDone?: () => void }).__onLandingDone = undefined
      }
    }
  }, [])

  // Don't render anything until hydrated to prevent flash
  if (!isHydrated) return null

  // If we need to show onboarding, only render the overlay
  if (showOverlay) {
    return <LandingOverlay />
  }

  // If we don't need onboarding but haven't set shouldRenderMainContent yet, don't render anything
  if (!shouldRenderMainContent) {
    return null
  }

  // Otherwise, render the main content
  return <>{children}</>
}