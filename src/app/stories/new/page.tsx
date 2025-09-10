'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { StoryReader } from '@/components/storyReader/StoryReader'
import { StoryViewerSkeleton } from '@/components/storyReader/StoryViewerSkeleton'
import { useAuthState } from '@/hooks/useAuthState'
import { useSettings } from '@/hooks/useSettings'
import { AnonUserSignUpNotification } from '@/components/auth/AnonUserSignUpNotification'
import { Id } from '../../../../convex/_generated/dataModel'

export default function NewStoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const suggestionId = searchParams.get('suggestionId')
  const { authArgs, isAnonymous, isLoaded } = useAuthState()
  const { settings, characters: selectedCharacters } = useSettings()
  const createStory = useMutation(api.stories.index.createStory)
  const [storyId, setStoryId] = useState<Id<'stories'> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showSignUpNotification, setShowSignUpNotification] = useState(false)
  
  // Get the suggestion data
  const suggestion = useQuery(api.stories.queries.getSuggestionById, 
    suggestionId ? { suggestionId } : 'skip'
  )
  
  // Query the created story to ensure it's in cache before redirecting
  const createdStory = useQuery(
    api.queries.stories.getStoryById,
    storyId && authArgs ? { ...(authArgs as any), storyId } : 'skip'
  )

  // Create the story when we have all the data and Clerk has loaded
  useEffect(() => {
    async function create() {
      // Wait for Clerk to load to ensure proper auth state
      if (!isLoaded || !suggestionId || !authArgs || !suggestion || storyId) return
      
      // Build the exact character list from the suggestion itself
      const suggestionCharacters = [
        ...suggestion.characters.main_characters,
        ...suggestion.characters.side_characters,
      ]
      
      try {
        const newStoryId = await createStory({
          ...authArgs,
          suggestionId,
          suggestion: {
            text: suggestion.text,
            characters: suggestion.characters,
            metadata: suggestion.metadata,
          },
          playerName: settings.playerName,
          // Pass only the characters that belong to THIS suggestion
          selectedCharacters: suggestionCharacters,
        })
        
        setStoryId(newStoryId)
        
        // Show sign-up notification for anonymous users after story creation
        if (isAnonymous) {
          setTimeout(() => {
            setShowSignUpNotification(true)
          }, 1500)
        }
      } catch (err) {
        console.error('Failed to create story:', err)
        setError('Failed to create story. Please try again.')
      }
    }
    
    create()
  }, [isLoaded, suggestionId, authArgs, suggestion, settings.playerName, selectedCharacters, createStory, storyId, isAnonymous])
  
  // Only redirect once the story is queryable
  useEffect(() => {
    if (storyId && createdStory) {
      // Redirect to the proper story URL
      router.replace(`/s/${storyId}`)
    }
  }, [storyId, createdStory, router])

  // Handle back navigation
  const handleBack = () => {
    router.push('/')
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-rose-400 font-semibold mb-2">Error</div>
          <div className="text-amber-50/70 text-sm mb-4">{error}</div>
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 hover:bg-amber-100/20 text-amber-50 rounded-md"
          >
            Back to Stories
          </button>
        </div>
      </div>
    )
  }

  // Show loading while creating story
  if (!storyId) {
    return <StoryViewerSkeleton onBack={handleBack} />
  }

  // Once we have a story ID, render the story reader
  return (
    <>
      <StoryReader 
        storyId={storyId}
        isModal={false}
        onBackToSuggestions={handleBack}
      />
      
      {/* Sign-up notification for anonymous users */}
      <AnonUserSignUpNotification
        isOpen={showSignUpNotification}
        onClose={() => setShowSignUpNotification(false)}
        context="story-created"
      />
    </>
  )
}