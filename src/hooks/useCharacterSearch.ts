import { useCallback, useState, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useAction } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Character, CharacterSearchResult } from '@/types/character'
import { useAuthState } from '@/hooks/useAuthState'

// Persist last searched query across hook instances to avoid refetching when component remounts (e.g., tab switches)
let globalLastSearchedQuery = ''

// Cache to persist search results between hook instances (keyed by trimmed query)
const characterSearchCache: Record<string, CharacterSearchResult[]> = {}

export function useCharacterSearch(initialQuery: string = '') {
  const { userId } = useAuth()
  const { userId: authUserId, sessionId, authArgs: authArgsFromHook } = useAuthState()
  
  const searchCharactersAction = useAction(api.characters.search.searchCharacters)
  const getCharacterSuggestionsAction = useAction(api.characters.search.getCharacterSuggestions)
  
  const [characterSearchResults, setCharacterSearchResults] = useState<CharacterSearchResult[]>(() => {
    const trimmed = initialQuery.trim()
    return trimmed && characterSearchCache[trimmed] ? characterSearchCache[trimmed] : []
  })
  const [isSearchingCharacters, setIsSearchingCharacters] = useState(false)
  
  // Keep track of the most recent successful query to avoid unnecessary network requests.
  // Initialize from module-level cache so it survives component unmounts.
  const lastQueryRef = useRef(globalLastSearchedQuery)

  const searchCharacters = useCallback(async (query: string): Promise<CharacterSearchResult[]> => {
    const trimmed = query.trim()
    // Skip if the query hasn't changed — return cached results to keep return type consistent.
    if (trimmed === lastQueryRef.current) {
      return characterSearchCache[trimmed] ?? []
    }
    
    if (!trimmed) {
      // Don't clear results when query is empty - keep them displayed
      // But reset the tracking variables so we can search again
      lastQueryRef.current = ''
      globalLastSearchedQuery = ''
      if (characterSearchCache['']) delete characterSearchCache['']
      return characterSearchResults // Return current results instead of empty array
    }

    // Use auth args from useAuthState hook - it should provide proper authArgs
    if (!authArgsFromHook) {
      console.error('No authentication available from useAuthState')
      return []
    }

    // Update the last searched query before firing the request to avoid race conditions.
    lastQueryRef.current = trimmed
    globalLastSearchedQuery = trimmed

    setIsSearchingCharacters(true)
    try {
      const result = await searchCharactersAction({ ...authArgsFromHook, query: trimmed })
      if (result.type === 'search') {
        const characters = result.characters || []
        setCharacterSearchResults(characters)
        // Persist in cache for future mounts
        characterSearchCache[trimmed] = characters
        return characters
      }
      return []
    } catch (error) {
      console.error('Error searching characters:', error)
      setCharacterSearchResults([])
      return []
    } finally {
      setIsSearchingCharacters(false)
    }
  }, [authArgsFromHook, searchCharactersAction, characterSearchResults])

  const loadCharacterSuggestions = useCallback(async (
    character: Character,
    offset: number = 0,
    excludeList: string[] = []
  ) => {
    // Use auth args from useAuthState hook - it should provide proper authArgs
    if (!authArgsFromHook) {
      console.error('No authentication available from useAuthState')
      return null
    }

    try {
      const result = await getCharacterSuggestionsAction({
        ...authArgsFromHook,
        selectedCharacter: character,
        offset,
        excludeList
      })
      
      if (result?.type === 'suggestions') {
        return result
      }
    } catch (error) {
      console.error('Error loading character suggestions:', error)
    }
    return null
  }, [authArgsFromHook, getCharacterSuggestionsAction])

  return {
    characterSearchResults,
    isSearchingCharacters,
    searchCharacters,
    loadCharacterSuggestions,
    setCharacterSearchResults
  }
}