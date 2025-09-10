'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { StoryCard } from './StoryCard'
import { SkeletonStoryCard } from './SkeletonStoryCard'
import debounce from 'lodash.debounce'
import { StoryDivider } from './StoryDivider'

import { useAuth } from '@clerk/nextjs'
import { useAuthState } from '@/hooks/useAuthState'
import { Character } from '@/types/character'
import { StorySuggestion } from '@/types/story'
import { useSettings } from '@/hooks/useSettings'
import { useSuggestionsCache } from '@/contexts/SuggestionsContext'
import { useNavigation } from '@/contexts/NavigationContext'
import { useSearchOverlay } from '@/contexts/SearchOverlayContext'
import { useQuery } from 'convex/react'
import { CharacterSlotsRow } from '@/components/characterChat/CharacterSlotsRow'
import { SubscriptionCard } from './SubscriptionCard'

interface StorySuggestionsProps {
  selectedCharacters: Character[]
  onScrollIndicatorsChange?: (indicators: {
    currentIndex: number
    totalSuggestions: number
    onScrollToIndex: (index: number) => void
  } | null) => void
  shouldLoadSuggestions?: boolean
  refreshToken?: number
}

export function StorySuggestions({ selectedCharacters, shouldLoadSuggestions = true, refreshToken }: StorySuggestionsProps) {
  const router = useRouter()
  const { userId } = useAuth()
  const { sessionId, authArgs, isLoaded: authLoaded, isAnonymous, isTransitioning } = useAuthState()
  const { settings } = useSettings()
  const { searchHandlerRef, setStoryHeaderTitle } = useNavigation()
  const { characterGroups, characterRoles } = useSearchOverlay()
  const getFeed = useAction(api.stories.feed.getFeed)
  const searchSuggestions = useAction(api.stories.searchSuggestions.searchStorySuggestions)
  const createStory = useMutation(api.stories.index.createStory)
  const { suggestions: cachedSuggestions, setSuggestions: setCachedSuggestions } = useSuggestionsCache()
  const [suggestions, setSuggestions] = useState<StorySuggestion[]>(cachedSuggestions)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  // Track where to render subscription cards. Skip first load, then use chance-based placement
  const [subscriptionCardPositions, setSubscriptionCardPositions] = useState<number[]>([])
  const [isFirstLoad, setIsFirstLoad] = useState(true)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false) // Start with false to prevent initial feed generation
  const [hasCheckedOnboarding, setHasCheckedOnboarding] = useState(false) // Track if we've checked localStorage yet
  
  // Check if anonymous user has completed onboarding after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHasCompletedOnboarding(localStorage.getItem('hasCompletedOnboarding') === 'true')
      setHasCheckedOnboarding(true)

      // Listen for custom event to detect when onboarding completes
      const handleOnboardingCompleted = () => {
        setHasCompletedOnboarding(true)
      }

      window.addEventListener('onboardingCompleted', handleOnboardingCompleted)
      return () => window.removeEventListener('onboardingCompleted', handleOnboardingCompleted)
    }
  }, [])

  const shouldSkipDbQueries = !authArgs || !authLoaded || isTransitioning
  const userPreferences = useQuery(
    api.users.preferences.getUserPreferences,
    shouldSkipDbQueries ? "skip" : authArgs
  )
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasInitiallyLoaded = useRef(false)
  const loadSuggestionsRef = useRef<((append?: boolean, count?: number, isSettingsChange?: boolean) => Promise<void>) | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)
  // Prevent duplicate fetches for the same settings key (e.g., React Strict Mode double effects)
  // Removed settings-change duplicate request guard; initial load is gated by auth readiness
  const lastRefreshTokenRef = useRef<number | undefined>(undefined)

  // Mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  // Initialize from cache; also persist scroll position
  useEffect(() => {
    if (cachedSuggestions.length > 0 && suggestions.length === 0) {
      setSuggestions(cachedSuggestions)
      hasInitiallyLoaded.current = true
    }
  }, [cachedSuggestions, suggestions.length])

  // Update cache when suggestions change
  useEffect(() => {
    if (suggestions.length > 0) {
      setCachedSuggestions(suggestions)
    }
  }, [suggestions, setCachedSuggestions])


  // Convert global settings to the format expected by the API
  const convertPreferences = useCallback(() => {
    const characterCount = settings.characterCount
    
    return {
      genre: settings.genre.toLowerCase(),
      playerMode: settings.storyStructure === 'player',
      playerName: settings.playerName,
      characterCount
    }
  }, [settings.genre, settings.storyStructure, settings.playerName, settings.characterCount])

  // Use characters from global selection (already hydrated via useSettings)
  const effectiveSelectedCharacters = selectedCharacters
  
  // Stable readiness flags for effects (avoid object deps)
  const isIdentifierReady = Boolean(userId || sessionId)
  const hasCharactersSelected = effectiveSelectedCharacters.length > 0
  const areDbQueriesReady = !userId || (userPreferences !== undefined)

  // Generate suggestions when settings or characters change
  const loadSuggestions = useCallback(async (append: boolean = false, count: number = 3, isSettingsChange: boolean = false) => {
    console.log('loadSuggestions called:', { append, count, userId, sessionId, selectedCharacters: effectiveSelectedCharacters.length, isSettingsChange })
    if ((!userId && !sessionId) || effectiveSelectedCharacters.length === 0) return

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    const currentController = (abortControllerRef.current = new AbortController())
    let didSetSuggestions = false

    // Use different loading states for initial load vs infinite scroll
    if (append) {
      setIsLoadingMore(true)
    } else {
      setIsLoading(true)
    }
    setError(null)

      try {
        const authArgs = userId ? { userId } : { sessionId: sessionId || '' }
        
        // Use feed API which handles distribution (custom/inspired/fanfiction)
        let newSuggestions: StorySuggestion[]
        try {
          const isSignedIn = Boolean(userId)
          const selectedTagsToUse = isSignedIn ? userPreferences?.selectedTags : settings.selectedTags
          const searchRuleToUse = isSignedIn ? userPreferences?.searchRule : undefined

          const baseArgs: any = {
            ...authArgs,
            limit: count,
            selectedTags: selectedTagsToUse,
            searchRule: searchRuleToUse,
            preferences: convertPreferences(),
          }
          if (characterGroups && characterGroups.length > 0) {
            baseArgs.characterGroups = characterGroups
          }
          const roleEntries = Object.entries(characterRoles)
          if (roleEntries.length > 0) {
            baseArgs.characterRoles = roleEntries.map(([id, role]) => ({ id, role }))
          }
          newSuggestions = await getFeed(baseArgs)
        } catch (e) {
          const message = (e as Error)?.message || ''
          // Backward compatibility: if backend doesn't accept extra fields yet, retry without them
          if (
            message.includes('extra field') &&
            (message.includes('characterGroups') || message.includes('characterRoles') || message.includes('preferences'))
          ) {
            const isSignedIn = Boolean(userId)
            const selectedTagsToUse = isSignedIn ? userPreferences?.selectedTags : settings.selectedTags
            const searchRuleToUse = isSignedIn ? userPreferences?.searchRule : undefined

            newSuggestions = await getFeed({
              ...authArgs,
              limit: count,
              selectedTags: selectedTagsToUse,
              searchRule: searchRuleToUse,
            })
          } else {
            throw e
          }
        }
      
      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || currentController.signal.aborted) {
        return
      }
      
      setSuggestions(prev => {
        const previousLength = prev.length
        const next = append ? [...prev, ...newSuggestions] : newSuggestions
        // Update subscription card positions
        if (!append) {
          // Fresh feed load
          if (isFirstLoad) {
            // First load: no subscription cards
            setSubscriptionCardPositions([])
            setIsFirstLoad(false)
          } else {
            // Subsequent loads: 50% chance to show subscription card at index 2 (4th item)
            const shouldShowSubscription = Math.random() < 0.3
            setSubscriptionCardPositions(shouldShowSubscription ? [2] : [])
          }
        } else {
          // 25% chance to add another subscription card for appended items
          const shouldInsertAnother = Math.random() < 0.15
          if (shouldInsertAnother) {
            // Place after the 3rd item of this appended batch when possible
            const candidate = previousLength + 2
            const maxIndex = next.length - 1
            if (newSuggestions.length >= 3 && candidate <= maxIndex) {
              setSubscriptionCardPositions((positions) => (
                positions.includes(candidate) ? positions : [...positions, candidate]
              ))
            }
          }
        }
        return next
      })
      didSetSuggestions = true
      
      // Mark as initially loaded after first successful load
      if (!hasInitiallyLoaded.current) {
        hasInitiallyLoaded.current = true
      }
    } catch (err: unknown) {
      // Don't show error if request was aborted
      if ((err as Error).name === 'AbortError' || !isMountedRef.current) {
        return
      }
      console.error('Error generating suggestions:', err)
      if (isMountedRef.current) {
        setError('Failed to generate story suggestions. Please try again.')
      }
    } finally {
      // Only clear loading flags if this request is still the active one
      // and was not aborted/superseded.
      if (!isMountedRef.current || currentController.signal.aborted) return

      if (append) {
        setIsLoadingMore(false)
      } else {
        setIsLoading(false)
      }
    }
  }, [userId, sessionId, selectedCharacters, getFeed, userPreferences, characterGroups, characterRoles, settings.selectedTags])

  // Store loadSuggestions in ref for use in keyboard handler
  useEffect(() => {
    loadSuggestionsRef.current = loadSuggestions
  }, [loadSuggestions])

  // Search handler
  const handleSearch = useCallback(async (searchQuery: string) => {
    console.log('handleSearch called:', { searchQuery, userId, sessionId, selectedCharacters: effectiveSelectedCharacters.length })
    if ((!userId && !sessionId) || effectiveSelectedCharacters.length === 0) return

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()
    const currentController = abortControllerRef.current

    setIsLoading(true)
    setError(null)
    setSuggestions([]) // Clear existing suggestions to show loading

    try {
      const authArgs = userId ? { userId } : { sessionId: sessionId || '' }
      let searchResults: StorySuggestion[]
      try {
        const baseArgs: any = {
          ...authArgs,
          searchQuery,
          preferences: convertPreferences(),
        }
        if (characterGroups && characterGroups.length > 0) {
          baseArgs.characterGroups = characterGroups
        }
        const roleEntries = Object.entries(characterRoles)
        if (roleEntries.length > 0) {
          baseArgs.characterRoles = roleEntries.map(([id, role]) => ({ id, role }))
        }
        searchResults = await searchSuggestions(baseArgs)
      } catch (e) {
        const message = (e as Error)?.message || ''
        if (message.includes('extra field') && (message.includes('characterGroups') || message.includes('characterRoles'))) {
          searchResults = await searchSuggestions({
            ...authArgs,
            searchQuery,
            preferences: convertPreferences(),
          })
        } else {
          throw e
        }
      }
      
      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || currentController.signal.aborted) {
        return
      }
      
      setSuggestions(searchResults)
      setCachedSuggestions([]) // Clear cache since these are search results
    } catch (err: unknown) {
      // Don't show error if request was aborted
      if ((err as Error).name === 'AbortError' || !isMountedRef.current) {
        return
      }
      console.error('Error searching suggestions:', err)
      if (isMountedRef.current) {
        setError('Failed to search story suggestions. Please try again.')
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [userId, sessionId, selectedCharacters, convertPreferences, searchSuggestions, setCachedSuggestions])

  // Expose search handler to parent
  useEffect(() => {
    if (searchHandlerRef) {
      searchHandlerRef.current = handleSearch
    }
  }, [searchHandlerRef, handleSearch])

  // Handle infinite scroll with debouncing
  const handleScroll = useCallback(() => {
    // Don't trigger if we're already loading more
    if (isLoadingMore || !loadSuggestionsRef.current) return

    const scrollableContainer = containerRef.current?.closest('.simplebar-content-wrapper')
    if (!scrollableContainer) return

    const { scrollTop, scrollHeight, clientHeight } = scrollableContainer

    // Load more when user is near the bottom (500px threshold for better UX)
    if (scrollTop + clientHeight >= scrollHeight - 500) {
      const invoke = loadSuggestionsRef.current
      if (invoke) invoke(true, 6)
    }
  }, [isLoadingMore])

  // Create debounced version of scroll handler with proper cleanup
  const debouncedHandleScroll = useRef<ReturnType<typeof debounce> | null>(null)
  
  useEffect(() => {
    debouncedHandleScroll.current = debounce(handleScroll, 100)
    return () => {
      debouncedHandleScroll.current?.cancel()
    }
  }, [handleScroll])

  // Gate initial load: wait until auth is decided (signed-in vs anon), and characters exist.
  useEffect(() => {
    if (!authLoaded) return
    if (!shouldLoadSuggestions) return
    if (!isIdentifierReady) return
    if (!hasCharactersSelected) return
    // If signed in, wait until DB-backed queries are loaded
    if (!areDbQueriesReady) return
    // For anonymous users, wait until we've checked onboarding status AND they've completed it
    // Note: Feed is now pre-generated during onboarding, so this mainly prevents initial empty loads
    if (isAnonymous && (!hasCheckedOnboarding || !hasCompletedOnboarding)) return
    // If we already have suggestions (from cache), treat as loaded and skip network fetch
    if (suggestions.length > 0) {
      hasInitiallyLoaded.current = true
      return
    }
    if (hasInitiallyLoaded.current) return

    const invoke = loadSuggestionsRef.current
    if (invoke) invoke(false, 12, false)
  }, [authLoaded, shouldLoadSuggestions, isIdentifierReady, hasCharactersSelected, areDbQueriesReady, suggestions.length, isAnonymous, hasCompletedOnboarding, hasCheckedOnboarding])

  // Removed settings-change-based refetch; explicit refresh happens via refreshToken effect below

  // Handle refresh token changes - clear cache and reload suggestions
  useEffect(() => {
    if (refreshToken !== undefined && refreshToken > 0) {
      // Avoid duplicate refresh-triggered loads (Strict Mode double effects)
      if (lastRefreshTokenRef.current === refreshToken) return
      lastRefreshTokenRef.current = refreshToken

      // Clear suggestions and cache synchronously
      setSuggestions([])
      setCachedSuggestions([])
      hasInitiallyLoaded.current = false
      setSubscriptionCardPositions([])
      setIsFirstLoad(true)

      // Immediately load a fresh batch if we have characters and should load
      if (effectiveSelectedCharacters.length > 0 && shouldLoadSuggestions) {
        const invoke = loadSuggestionsRef.current
        if (invoke) invoke(false, 12, true)
      }
    }
  }, [refreshToken, shouldLoadSuggestions, setCachedSuggestions, selectedCharacters.length])

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback(async (suggestion: StorySuggestion) => {
    // Always set the header title for continuity with card header logic
    const header = suggestion.metadata.storyType === 'inspired'
      ? `Inspired by ${suggestion.metadata.primarySource}`
      : suggestion.metadata.primarySource
    setStoryHeaderTitle(header)

    // If we have auth context, try creating the story directly for faster UX
    if (authArgs) {
      try {
        const suggestionCharacters = [
          ...suggestion.characters.main_characters,
          ...suggestion.characters.side_characters,
        ]

        const newStoryId = await createStory({
          ...authArgs,
          suggestionId: suggestion.id,
          suggestion: {
            text: suggestion.text,
            characters: suggestion.characters,
            metadata: suggestion.metadata,
          },
          playerName: settings.playerName,
          selectedCharacters: suggestionCharacters,
        })

        router.push(`/s/${newStoryId}`)
        return
      } catch (err) {
        console.error('Failed to create story from suggestion:', err)
        // Fall through to legacy navigation
      }
    }

    // Fallback: navigate to the creation page with the suggestion id
    router.push(`/stories/new?suggestionId=${suggestion.id}`)
  }, [authArgs, createStory, router, setStoryHeaderTitle, settings.playerName])

  // Add window scroll listener for infinite scroll
  useEffect(() => {
    const scrollableContainer = containerRef.current?.closest('.simplebar-content-wrapper')
    const currentDebouncedHandler = debouncedHandleScroll.current
    
    if (scrollableContainer && currentDebouncedHandler) {
      scrollableContainer.addEventListener('scroll', currentDebouncedHandler)
      return () => {
        scrollableContainer.removeEventListener('scroll', currentDebouncedHandler)
      }
    }
  }, [suggestions.length])



  if (effectiveSelectedCharacters.length === 0) {
    // Show skeleton cards if we should load suggestions (initial transition from landing)
    if (shouldLoadSuggestions) {
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
    
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-amber-50/70 text-center text-lg">
          Please select characters to generate story suggestions
        </p>
      </div>
    )
  }

  return (
    <div className="h-full relative">
      {error ? (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="text-rose-400 font-semibold mb-2">Error</div>
            <div className="text-amber-50/70 text-sm">{error}</div>
            <button
              type="button"
              onClick={() => loadSuggestions()}
              className="mt-4 px-4 py-2 hover:bg-amber-100/20 text-amber-50 rounded-md"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : suggestions.length === 0 && isLoading ? (
        <div className="min-h-screen">
          {/* Show skeleton cards during initial load */}
          <SkeletonStoryCard />
          <SkeletonStoryCard />
          <SkeletonStoryCard />
          <SkeletonStoryCard />
          <SkeletonStoryCard />
          <SkeletonStoryCard />
        </div>
      ) : suggestions.length > 0 ? (
        <div 
          ref={containerRef}
          className="min-h-screen"
        >
          {suggestions.map((suggestion, index) => {
            const elements = []
            
            // Add the story card
            elements.push(
              <div key={suggestion.id}>
              {/* Interleave thin character chat slots at positions: after 2nd, 5th, then every 6 */}
              {(index === 2 || index === 5 || (index > 5 && (index - 5) % 6 === 0)) && (
                <CharacterSlotsRow groups={(characterGroups || []).slice(0, 6)} />
              )}
                <StoryCard
                  suggestion={suggestion}
                  onSelect={handleSuggestionSelect}
                  authArgs={authArgs}
                  showDivider={false}
                  showTopDivider={index > 0}
                />
              </div>
            )
            
            // Insert subscription card at configured positions (e.g., 2 for 4th item)
            if (subscriptionCardPositions.includes(index)) {
              elements.push(
                <SubscriptionCard 
                  key={`subscription-card-${index}`}
                  showDivider={false}
                  showTopDivider={true}
                />
              )
            }
            
            return elements
          })}
          
          {/* Loading skeleton cards for infinite scroll */}
          {isLoadingMore && (
            <>
              <SkeletonStoryCard />
              <SkeletonStoryCard />
              <SkeletonStoryCard />
              <SkeletonStoryCard />
              <SkeletonStoryCard />
              <SkeletonStoryCard />
            </>
          )}
        </div>
      ) : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="text-amber-50/70 text-sm">No suggestions yet.</div>
            <button
              type="button"
              onClick={() => loadSuggestions()}
              className="mt-4 px-4 py-2 hover:bg-amber-100/20 text-amber-50 rounded-md"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}