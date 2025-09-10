'use client'

import { SuggestionsFeed } from '@/components/pages/SuggestionsFeed'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { useEffect, useState } from 'react'
import { useNavigation } from '@/contexts/NavigationContext'
import { SkeletonStoryCard } from '@/components/storySuggestions/SkeletonStoryCard'

interface MainContentProps {
  storyId?: string
  isPublicView?: boolean
  shareToken?: string
  requestedPage?: number
}

export function MainContent({ 
  storyId, 
  isPublicView = false, 
  shareToken, 
  requestedPage 
}: MainContentProps = {}) {
  const createDefaultPreferences = useMutation(api.users.preferences.createDefaultPreferences)
  const { authArgs, isTransitioning, isLoaded, isAnonymous } = useAuthState()
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false) // Start with false to prevent initial defaults creation
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false) // Track if we've checked localStorage yet
  
  // Check if anonymous user has completed onboarding after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // For public views, skip onboarding check entirely
      if (isPublicView) {
        setHasCompletedOnboarding(true)
        setHasCheckedOnboarding(true)
      } else {
        setHasCompletedOnboarding(localStorage.getItem('hasCompletedOnboarding') === 'true')
        setHasCheckedOnboarding(true)
      }
    }
  }, [isPublicView])

  // Remove landing attribute if it exists
  useEffect(() => {
    try {
      document.body.removeAttribute('data-landing')
    } catch {}
  }, [])

  // Create default preferences and characters for new users
  useEffect(() => {
    // Skip creating defaults for public views - they don't need preferences
    if (isPublicView) return
    
    if (authArgs && isLoaded && !isTransitioning) {
      // Skip creating defaults for anonymous users who haven't checked onboarding status yet OR haven't completed onboarding
      if (isAnonymous && (!hasCheckedOnboarding || !hasCompletedOnboarding)) return
      
      // Check if user needs default preferences (but not default characters)
      const createDefaults = async () => {
        try {
          // Only create default preferences, not default characters
          // Users should be able to start with 0 characters if they want
          await createDefaultPreferences(authArgs)
        } catch (error) {
          // Silently handle errors - preferences might already exist
          console.log('Defaults may already exist:', error)
        }
      }
      createDefaults()
    }
  }, [authArgs, isLoaded, isTransitioning, createDefaultPreferences, isAnonymous, hasCompletedOnboarding, hasCheckedOnboarding, isPublicView])

  // Show story view when storyId is provided
  if (storyId) {
    return (
      <SuggestionsFeed 
        storyId={storyId} 
        isPublicView={isPublicView}
        shareToken={shareToken}
        requestedPage={requestedPage}
      />
    )
  }

  // Show skeleton loading state during auth transitions
  if (!isLoaded || isTransitioning) {
    return (
      <div className="min-h-screen">
        <SkeletonStoryCard />
        <SkeletonStoryCard />
        <SkeletonStoryCard />
        <SkeletonStoryCard />
        <SkeletonStoryCard />
        <SkeletonStoryCard />
      </div>
    )
  }

  // Show the main feed
  return (
    <div data-app-feed="true">
      <SuggestionsFeed storyId={storyId} />
    </div>
  )
} 