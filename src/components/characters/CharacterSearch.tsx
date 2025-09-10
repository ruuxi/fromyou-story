'use client'

import { useEffect, useState, useCallback, useRef, useMemo, useTransition } from 'react'
import { Character } from '@/types/character'

import { CharacterGrid } from './CharacterGrid'
import { CharacterGridSkeleton } from './CharacterGridSkeleton'
import { SelectedCharacters } from './SelectedCharacters'
import { useCharacterSearch } from '@/hooks/useCharacterSearch'
import { useCharacterSelection } from '@/hooks/useCharacterSelection'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

interface CharacterSearchProps {
  searchQuery: string
  // When these two props are provided, the component runs in "controlled" mode and
  // does NOT touch the global character selection store. This is used by the
  // SearchAssistantOverlay to stage edits until the user confirms. If they are
  // omitted, the component falls back to the global shared selection via the
  // useCharacterSelection hook.
  selectedCharacters?: Character[]
  setSelectedCharacters?: (chars: Character[] | ((prev: Character[]) => Character[])) => void
  onCharacterSelectionDone?: () => void
  showSelectedList?: boolean
  advancedButton?: React.ReactNode
}

// Module-level cache so suggestions persist across component unmounts.
const globalSuggestionsCache: Record<string, {
  sourceCharacters: Character[]
  similarCharacters: Character[]
  hasMoreSource: boolean
  hasMoreSimilar: boolean
}> = {}

export function CharacterSearch({
  searchQuery,
  selectedCharacters: propSelectedCharacters,
  setSelectedCharacters: propSetSelectedCharacters,
  onCharacterSelectionDone,
  showSelectedList = true,
  advancedButton
}: CharacterSearchProps) {
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 700)
  
  const {
    characterSearchResults,
    isSearchingCharacters,
    searchCharacters,
    loadCharacterSuggestions,
    setCharacterSearchResults
  } = useCharacterSearch(debouncedSearchQuery)

  // If the component is controlled via props, use those. Otherwise fall back to the
  // shared selection hook.
  const hookData = useCharacterSelection()

  const selectedCharacters = propSelectedCharacters ?? hookData.selectedCharacters
  const setSelectedCharacters = propSetSelectedCharacters ?? hookData.setSelectedCharacters
  const saveStatus = propSelectedCharacters ? 'idle' : hookData.saveStatus

  // Cache key derived from entire selectedCharacters array so new/removed selections bust cache.
  const selectionKey = selectedCharacters.length > 0 ? selectedCharacters.map(c => `${c.fullName}|${c.source}`).sort().join('|') : ''
  const initialSuggestions = selectionKey ? globalSuggestionsCache[selectionKey] : undefined

  const [sourceCharacters, setSourceCharacters] = useState<Character[]>(() => initialSuggestions?.sourceCharacters ?? [])
  const [similarCharacters, setSimilarCharacters] = useState<Character[]>(() => initialSuggestions?.similarCharacters ?? [])
  const [isLoadingMoreSource, setIsLoadingMoreSource] = useState(false)
  const [isLoadingMoreSimilar, setIsLoadingMoreSimilar] = useState(false)
  const [hasMoreSource, setHasMoreSource] = useState(() => initialSuggestions?.hasMoreSource ?? false)
  const [hasMoreSimilar, setHasMoreSimilar] = useState(() => initialSuggestions?.hasMoreSimilar ?? false)
  const [sourceOffset, setSourceOffset] = useState(() => initialSuggestions?.sourceCharacters.length ?? 0)
  const [similarOffset, setSimilarOffset] = useState(() => initialSuggestions?.similarCharacters.length ?? 0)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [popularCharacters, setPopularCharacters] = useState<Character[]>([])
  const [isLoadingPopular, setIsLoadingPopular] = useState(false)
  const [isPending, startTransition] = useTransition()
  
  // When entering with selected characters and no cached suggestions, show skeleton immediately
  const shouldShowInitialSuggestionsSkeleton = useMemo(() => {
    return selectedCharacters.length > 0 && !initialSuggestions
  }, [selectedCharacters.length, initialSuggestions])
  
  // Animation tracking using refs to avoid re-renders
  const animationStateRef = useRef({
    searchResults: false,
    sourceResults: false,
    similarResults: false
  })

  const handleCharacterToggle = useCallback((character: Character) => {
    startTransition(() => {
      const isSelected = selectedCharacters.some(sc => sc.fullName === character.fullName && sc.source === character.source)
      if (isSelected) {
        setSelectedCharacters(prev => prev.filter(sc => !(sc.fullName === character.fullName && sc.source === character.source)))
      } else {
        setSelectedCharacters(prev => [...prev, character])
      }
    })
  }, [selectedCharacters, setSelectedCharacters])

  const loadMoreCharacters = useCallback(async (type: 'source' | 'similar') => {
    if (selectedCharacters.length === 0) return

    const setLoading = type === 'source' ? setIsLoadingMoreSource : setIsLoadingMoreSimilar
    const offset = type === 'source' ? sourceOffset : similarOffset

    // Helper to merge new characters without introducing duplicates (by fullName).
    const mergeUnique = (prev: Character[], incoming: Character[] = []) => {
      const seen = new Set(prev.map(c => `${c.fullName}|${c.source}`))
      return [...prev, ...incoming.filter(c => !seen.has(`${c.fullName}|${c.source}`))]
    }

    setLoading(true)
    const latestSelected = selectedCharacters[selectedCharacters.length - 1]
    const excludeList = selectedCharacters.map(c => `${c.fullName}|${c.source}`)
    try {
      const data = await loadCharacterSuggestions(latestSelected, offset, excludeList)
      if (data && data.type === 'suggestions') {
        if (type === 'source') {
          setSourceCharacters(prev => {
            const updated = mergeUnique(prev, data.sourceCharacters)
            globalSuggestionsCache[selectionKey] = {
              ...(globalSuggestionsCache[selectionKey] || { similarCharacters: [], hasMoreSimilar: false, hasMoreSource: false, sourceCharacters: [] }),
              sourceCharacters: updated,
              hasMoreSource: data.hasMoreSource || false,
              similarCharacters: globalSuggestionsCache[selectionKey]?.similarCharacters || [],
            }
            return updated
          })
          setHasMoreSource(data.hasMoreSource || false)
          setSourceOffset(prev => prev + 5)
        } else {
          setSimilarCharacters(prev => {
            const updated = mergeUnique(prev, data.similarCharacters)
            globalSuggestionsCache[selectionKey] = {
              ...(globalSuggestionsCache[selectionKey] || { sourceCharacters: [], hasMoreSource: false, hasMoreSimilar: false, similarCharacters: [] }),
              similarCharacters: updated,
              hasMoreSimilar: data.hasMoreSimilar || false,
              sourceCharacters: globalSuggestionsCache[selectionKey]?.sourceCharacters || [],
            }
            return updated
          })
          setHasMoreSimilar(data.hasMoreSimilar || false)
          setSimilarOffset(prev => prev + 5)
        }
      }
    } catch (error) {
      console.error('Error loading more characters:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedCharacters, sourceOffset, similarOffset, loadCharacterSuggestions, selectionKey])

  // Search characters when query changes
  // Load popular characters when no search query
  useEffect(() => {
    if (!debouncedSearchQuery && popularCharacters.length === 0 && !isLoadingPopular) {
      setIsLoadingPopular(true)
      ;(async () => {
        const results = await searchCharacters('popular')
        if (results.length > 0) {
          setPopularCharacters(results.slice(0, 20)) // Show top 20 popular characters
        }
        setIsLoadingPopular(false)
      })()
    }
  }, [debouncedSearchQuery, popularCharacters.length, isLoadingPopular, searchCharacters])

  useEffect(() => {
    // Only search when there's a query - don't clear results when query is empty
    if (!debouncedSearchQuery) {
      return
    }

    // Search with already debounced query
    searchCharacters(debouncedSearchQuery)
  }, [debouncedSearchQuery, searchCharacters])

  // Memoize animation states based on data changes
  const shouldAnimateSearchResults = useMemo(() => {
    return characterSearchResults.length > 0 && debouncedSearchQuery.length > 0
  }, [characterSearchResults.length, debouncedSearchQuery])
  
  const shouldAnimateSourceResults = useMemo(() => {
    return sourceCharacters.length > 0
  }, [sourceCharacters.length])
  
  const shouldAnimateSimilarResults = useMemo(() => {
    return similarCharacters.length > 0
  }, [similarCharacters.length])

  // Show popular skeleton on first paint before effect flips loading flag
  const shouldShowInitialPopularSkeleton = useMemo(() => {
    return !debouncedSearchQuery && selectedCharacters.length === 0 && popularCharacters.length === 0
  }, [debouncedSearchQuery, selectedCharacters.length, popularCharacters.length])

  // Load suggestions based on the currently selected characters (with caching), debounced
  const suggestionsDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const suggestionsRequestSeqRef = useRef(0)
  const latestSelectionKeyRef = useRef(selectionKey)
  useEffect(() => {
    latestSelectionKeyRef.current = selectionKey
  }, [selectionKey])

  useEffect(() => {
    // Clear any pending debounce on change
    if (suggestionsDebounceRef.current) {
      clearTimeout(suggestionsDebounceRef.current)
    }

    // Early exit when nothing is selected – clear state asynchronously
    if (selectedCharacters.length === 0) {
      suggestionsDebounceRef.current = setTimeout(() => {
        Promise.resolve().then(() => {
          setSourceCharacters([])
          setSimilarCharacters([])
          setHasMoreSource(false)
          setHasMoreSimilar(false)
          setSourceOffset(0)
          setSimilarOffset(0)
        })
      }, 0)
      return () => {
        if (suggestionsDebounceRef.current) clearTimeout(suggestionsDebounceRef.current)
      }
    }

    const cached = globalSuggestionsCache[selectionKey]
    if (cached) {
      // Populate from cache asynchronously to satisfy the linter rule.
      suggestionsDebounceRef.current = setTimeout(() => {
        Promise.resolve().then(() => {
          // Only apply if selectionKey hasn't changed since scheduling
          if (latestSelectionKeyRef.current !== selectionKey) return
          setSourceCharacters(cached.sourceCharacters)
          setSimilarCharacters(cached.similarCharacters)
          setHasMoreSource(cached.hasMoreSource)
          setHasMoreSimilar(cached.hasMoreSimilar)
          setSourceOffset(cached.sourceCharacters.length)
          setSimilarOffset(cached.similarCharacters.length)
        })
      }, 0)
      return () => {
        if (suggestionsDebounceRef.current) clearTimeout(suggestionsDebounceRef.current)
      }
    }

    // Debounce network call to avoid queueing multiple requests on rapid selection changes
    const seq = ++suggestionsRequestSeqRef.current
    suggestionsDebounceRef.current = setTimeout(() => {
      const latestSelected = selectedCharacters[selectedCharacters.length - 1]
      const excludeList = selectedCharacters.map(c => `${c.fullName}|${c.source}`)
      setIsLoadingSuggestions(true)
      loadCharacterSuggestions(latestSelected, 0, excludeList)
        .then(data => {
          // Ignore if a newer request started
          if (suggestionsRequestSeqRef.current !== seq) return
          if (data && data.type === 'suggestions') {
            const cacheEntry = {
              sourceCharacters: data.sourceCharacters || [],
              similarCharacters: data.similarCharacters || [],
              hasMoreSource: data.hasMoreSource || false,
              hasMoreSimilar: data.hasMoreSimilar || false,
            }
            Promise.resolve().then(() => {
              if (latestSelectionKeyRef.current !== selectionKey) return
              setSourceCharacters(cacheEntry.sourceCharacters)
              setSimilarCharacters(cacheEntry.similarCharacters)
              setHasMoreSource(cacheEntry.hasMoreSource)
              setHasMoreSimilar(cacheEntry.hasMoreSimilar)
              setSourceOffset(cacheEntry.sourceCharacters.length)
              setSimilarOffset(cacheEntry.similarCharacters.length)
              setIsLoadingSuggestions(false)
            })
            globalSuggestionsCache[selectionKey] = cacheEntry
          } else {
            setIsLoadingSuggestions(false)
          }
        })
        .catch(() => {
          if (suggestionsRequestSeqRef.current !== seq) return
          setIsLoadingSuggestions(false)
        })
    }, 500)

    return () => {
      if (suggestionsDebounceRef.current) {
        clearTimeout(suggestionsDebounceRef.current)
      }
      // Bump seq to invalidate any in-flight handlers
      suggestionsRequestSeqRef.current++
    }
  }, [selectionKey, selectedCharacters, loadCharacterSuggestions])

  return (
    <div>
      <div className="md:max-h-[50vh] md:overflow-y-auto">
        {/* Search Results */}
        {debouncedSearchQuery && (
          <div className="mb-4">
            <h3 className="text-white/90 text-xs md:text-sm font-semibold mb-2">Search Results</h3>
            {isSearchingCharacters ? (
              <div className="text-center py-3">
                <div className="text-white/70 text-xs md:text-sm">Searching...</div>
              </div>
            ) : characterSearchResults.length > 0 ? (
              <CharacterGrid
                characters={characterSearchResults}
                selectedCharacters={selectedCharacters}
                onCharacterToggle={handleCharacterToggle}
                showSource={true}
                animate={shouldAnimateSearchResults}
                animationDelay={100}
              />
            ) : (
              <div className="text-center py-3">
                <div className="text-white/70 text-xs md:text-sm">No characters found</div>
              </div>
            )}
          </div>
        )}
        
        {/* Character Suggestions from Same Source */}
        {(isLoadingSuggestions || shouldShowInitialSuggestionsSkeleton) && selectedCharacters.length > 0 && sourceCharacters.length === 0 ? (
          <CharacterGridSkeleton 
            title={`From ${selectedCharacters[selectedCharacters.length - 1]?.source || 'Source'}`}
            count={5}
          />
        ) : (
          <CharacterGrid
            characters={sourceCharacters}
            selectedCharacters={selectedCharacters}
            onCharacterToggle={handleCharacterToggle}
            title={sourceCharacters.length > 0 ? `From ${sourceCharacters[0]?.source || 'Source'}` : undefined}
            onLoadMore={() => loadMoreCharacters('source')}
            isLoadingMore={isLoadingMoreSource}
            showLoadMore={hasMoreSource}
            animate={shouldAnimateSourceResults}
            animationDelay={120}
          />
        )}
        
        {/* Similar Characters */}
        {(isLoadingSuggestions || shouldShowInitialSuggestionsSkeleton) && selectedCharacters.length > 0 && similarCharacters.length === 0 ? (
          <CharacterGridSkeleton 
            title="Similar Characters"
            showSource={true}
            count={8}
          />
        ) : (
          <CharacterGrid
            characters={similarCharacters}
            selectedCharacters={selectedCharacters}
            onCharacterToggle={handleCharacterToggle}
            title="Similar Characters"
            onLoadMore={() => loadMoreCharacters('similar')}
            isLoadingMore={isLoadingMoreSimilar}
            showLoadMore={hasMoreSimilar}
            showSource={true}
            animate={shouldAnimateSimilarResults}
            animationDelay={120}
          />
        )}
        
        {/* Popular Characters - show when no search and no selections */}
        {!debouncedSearchQuery && selectedCharacters.length === 0 && (
          <div className="mb-4">
            <h3 className="text-white/90 text-xs md:text-sm font-semibold mb-2">Popular Characters</h3>
            {isLoadingPopular || shouldShowInitialPopularSkeleton ? (
              <CharacterGridSkeleton count={8} />
            ) : popularCharacters.length > 0 ? (
              <CharacterGrid
                characters={popularCharacters}
                selectedCharacters={selectedCharacters}
                onCharacterToggle={handleCharacterToggle}
                showSource={true}
              />
            ) : (
              <div className="text-center py-3">
                <div className="text-white/70 text-xs md:text-sm">Loading characters...</div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Selected Characters */}
      {showSelectedList && selectedCharacters.length > 0 && (
        <SelectedCharacters
          selectedCharacters={selectedCharacters}
          saveStatus={saveStatus}
          onRemoveCharacter={(index) => setSelectedCharacters(prev => prev.filter((_, i) => i !== index))}
          advancedButton={advancedButton}
        />
      )}
    </div>
  )
}