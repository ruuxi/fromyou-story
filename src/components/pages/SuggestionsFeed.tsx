'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { StorySuggestions } from '@/components/storySuggestions/StorySuggestions'
import { StoryReader } from '@/components/storyReader/StoryReader'
import { useCharacterSelection } from '@/hooks/useCharacterSelection'
import { useSearchOverlay } from '@/contexts/SearchOverlayContext'

interface SuggestionsFeedProps {
  storyId?: string
  isPublicView?: boolean
  shareToken?: string
  requestedPage?: number
}

export function SuggestionsFeed({ 
  storyId, 
  isPublicView = false, 
  shareToken, 
  requestedPage 
}: SuggestionsFeedProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { selectedCharacters } = useCharacterSelection()
  const { refreshToken } = useSearchOverlay()
  const [shouldLoadSuggestions] = useState(true)

  // Check if we're showing a story
  const isStoryRoute = Boolean(storyId)


  // Restore scroll position when returning from story
  useEffect(() => {
    // Skip scroll restoration when viewing a story
    if (isStoryRoute) return

    const scrollPosition = sessionStorage.getItem(`scroll-${pathname}`)
    if (scrollPosition) {
      window.scrollTo(0, parseInt(scrollPosition))
    }

    // Save scroll position before navigating away
    const handleScroll = () => {
      sessionStorage.setItem(`scroll-${pathname}`, window.scrollY.toString())
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [pathname, isStoryRoute])

  // If we're on a story route, render the story reader
  if (isStoryRoute && storyId) {
    return (
      <StoryReader 
        storyId={storyId} 
        isModal={false}
        isPublicView={isPublicView}
        shareToken={shareToken}
        requestedPage={requestedPage}
        onBackToSuggestions={() => {
          if (isPublicView) {
            // For public views, go to home page
            router.push('/')
          } else {
            router.back()
          }
        }}
      />
    )
  }

  return (
    <StorySuggestions 
      selectedCharacters={selectedCharacters}
      shouldLoadSuggestions={shouldLoadSuggestions}
      refreshToken={refreshToken}
    />
  )
}