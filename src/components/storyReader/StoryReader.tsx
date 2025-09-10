'use client'

import { useEffect, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { StoryViewer } from './StoryViewer'
import { useAuthState } from '@/hooks/useAuthState'
import { useNavigation } from '@/contexts/NavigationContext'

interface StoryReaderProps {
  storyId: string
  isModal?: boolean
  onBackToSuggestions?: () => void
  isPublicView?: boolean
  shareToken?: string
  requestedPage?: number
}

export function StoryReader({ 
  storyId, 
  isModal = false, 
  onBackToSuggestions,
  isPublicView = false,
  shareToken,
  requestedPage
}: StoryReaderProps) {
  const { setStoryHeaderTitle } = useNavigation()
  const { authArgs } = useAuthState()
  
  // Fetch the story data - use public query if it's a public view
  const story = useQuery(
    isPublicView && shareToken 
      ? api.stories.index.getPublicStory
      : api.queries.stories.getStoryById,
    isPublicView && shareToken
      ? { shareToken, pageNumber: requestedPage }
      : authArgs ? { ...(authArgs as any), storyId: storyId as Id<'stories'> } : 'skip'
  )

  // Fetch the outline status (skip for public views)
  const outlineData = useQuery(
    api.queries.outlineStatus.getOutlineStatus,
    !isPublicView && authArgs ? { ...(authArgs as any), storyId: storyId as Id<'stories'> } : 'skip'
  )

  // Memoize story data - always return a story object, even if loading
  const storyData = useMemo(() => {
    if (!story) {
      // Return a placeholder story for loading state
      return {
        id: storyId as Id<'stories'>,
        sourceTitle: 'Loading...',
        pages: [],
        currentChapter: 1,
        currentAct: 1,
        storyStatus: 'ongoing' as const,
        outline: undefined,
        userMessages: [],
        isLoading: true,
        outlineStatus: 'pending' as const,
        hasError: false
      };
    }
    
    // Handle public story structure differently
    if (isPublicView) {
      const sourceTitle = story?.suggestion?.metadata?.storyType === 'inspired'
        ? `Inspired by ${story?.suggestion?.metadata?.primarySource}`
        : (story?.suggestion?.metadata?.primarySource || 'Shared Story')

      const suggestionCharacters = [
        ...(story?.suggestion?.characters?.main_characters || []),
        ...(story?.suggestion?.characters?.side_characters || []),
      ]
      const uniqueSuggestionCharacters = Array.from(new Set(suggestionCharacters))

      return {
        id: story._id,
        sourceTitle,
        // Public stories already have pages as content strings
        pages: story.pages ? (Array.isArray(story.pages) && typeof story.pages[0] === 'string' 
          ? story.pages 
          : story.pages.map((page: any) => page.content || page)) : [],
        currentChapter: story.currentChapter || 1,
        currentAct: story.currentAct || 1,
        storyStatus: story.storyStatus || 'ongoing' as const,
        outline: story.outline,
        selectedCharacters: uniqueSuggestionCharacters.length > 0 ? uniqueSuggestionCharacters : (story.selectedCharacters || []),
        primarySource: story?.suggestion?.metadata?.primarySource,
        userMessages: [],
        isLoading: false,
        outlineStatus: 'complete' as const,
        hasError: false
      };
    }
    
    // Original private story logic
    const outlineStatus = outlineData?.outlineStatus || (story as any).outlineStatus || 'pending'
    
    const sourceTitle = story?.suggestion?.metadata?.storyType === 'inspired'
      ? `Inspired by ${story?.suggestion?.metadata?.primarySource}`
      : (story?.suggestion?.metadata?.primarySource || (story as any)?.metadata?.primarySource || 'Story')

    // Prefer characters explicitly attached to this story's suggestion (main + side)
    // Fallback to the story's stored selectedCharacters if suggestion data is absent
    const suggestionCharacters = [
      ...(story?.suggestion?.characters?.main_characters || []),
      ...(story?.suggestion?.characters?.side_characters || []),
    ]
    const uniqueSuggestionCharacters = Array.from(new Set(suggestionCharacters))

    return {
      id: story._id,
      sourceTitle,
      // Extract content from pages objects
      pages: story.pages ? story.pages.map((page: any) => page.content) : [],
      // Progress information
      currentChapter: story.currentChapter,
      currentAct: story.currentAct,
      storyStatus: story.storyStatus,
      outline: outlineData?.outline || story.outline,
      selectedCharacters: uniqueSuggestionCharacters.length > 0 ? uniqueSuggestionCharacters : story.selectedCharacters,
      primarySource: story.suggestion.metadata.primarySource,
      // User messages for persistence
      userMessages: (story as any).userMessages || [],
      isLoading: false,
      outlineStatus,
      hasError: story.pages.length === 0 && outlineStatus === 'error'
    };
  }, [
    story,
    outlineData?.outline,
    storyId,
    isPublicView
  ])

  // Update header title after render to avoid setState during render warnings
  useEffect(() => {
    if (!storyData.isLoading && storyData.sourceTitle) {
      setStoryHeaderTitle(storyData.sourceTitle)
    }
  }, [storyData.isLoading, storyData.sourceTitle, setStoryHeaderTitle])

  // Always mount StoryViewer - it will handle its own loading states
  return (
    <StoryViewer
      story={storyData}
      onBack={onBackToSuggestions}
      isModal={isModal}
      isPublicView={isPublicView}
    />
  )
}