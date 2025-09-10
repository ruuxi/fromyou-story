import { useEffect, useState, useRef } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Character } from '@/types/character'
import { areCharacterListsEqual } from '@/utils/characterComparison'
import { useAuthState } from '@/hooks/useAuthState'
import { SaveStatus } from '@/types/settings'
import { useSettings } from '@/hooks/useSettings'

// Default characters to use when none are saved
const DEFAULT_CHARACTERS: Character[] = [
  {
    fullName: "Harry Potter",
    gender: "Male",
    source: "Harry Potter"
  },
  {
    fullName: "Hermione Granger", 
    gender: "Female",
    source: "Harry Potter"
  },
  {
    fullName: "Luke Skywalker",
    gender: "Male",
    source: "Star Wars"
  }
]


let globalSelectedCharacters: Character[] = []
const characterListeners = new Set<(chars: Character[]) => void>()

function notifyCharacterListeners() {
  for (const listener of characterListeners) {
    listener(globalSelectedCharacters)
  }
}

// Helper to update the global store and notify subscribers.
function updateGlobalCharacters(update: Character[] | ((prev: Character[]) => Character[])) {
  const newValue = typeof update === 'function' ? (update as (prev: Character[]) => Character[])(globalSelectedCharacters) : update
  
  // Deduplicate characters to prevent duplicates
  const deduplicated = newValue.filter((char, index, arr) => {
    const key = `${char.fullName}|${char.source}`;
    return arr.findIndex(c => `${c.fullName}|${c.source}` === key) === index;
  });
  
  globalSelectedCharacters = deduplicated
  notifyCharacterListeners()
}

// Promise that resolves when the current save operation completes
let currentSavePromise: Promise<void> | null = null

// Function to wait for any pending save operation to complete
export async function waitForCharacterSave(): Promise<void> {
  if (currentSavePromise) {
    await currentSavePromise
    currentSavePromise = null
  }
}

export function useCharacterSelection() {
  const [selectedCharacters, setLocalSelectedCharacters] = useState<Character[]>(() => globalSelectedCharacters)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  // Setter that updates the shared store
  const setSelectedCharacters = updateGlobalCharacters
  const { authArgs, isTransitioning } = useAuthState()
  const { characters: savedCharacters } = useSettings()
  
  const saveCharacters = useMutation(api.characters.index.saveSelectedCharacters)

  // Track if we've loaded initial data from database and if we're currently hydrating
  const hasLoadedFromDb = useRef(false)
  const lastSavedCharactersRef = useRef<Character[]>([])
  
  useEffect(() => {
    // Wait for savedCharacters to be defined (not undefined = loading state)
    if (!isTransitioning && authArgs && savedCharacters !== undefined) {
      
      // Initial load case
      if (!hasLoadedFromDb.current) {
        hasLoadedFromDb.current = true
        
        // Use saved characters as-is, even if empty array (don't force default characters)
        const charactersToLoad = savedCharacters || []
        
        // Use promise to avoid direct setState in useEffect
        Promise.resolve().then(() => {
          setSelectedCharacters(charactersToLoad)
          
          // Set lastSavedCharactersRef to what's actually saved in database
          // This prevents auto-saving default characters immediately on load
          lastSavedCharactersRef.current = savedCharacters || []
        })
      } 
      // Database update case - check if characters have actually changed
      else if (savedCharacters && !areCharacterListsEqual(savedCharacters, lastSavedCharactersRef.current)) {
        console.log('Characters updated from database, refreshing global store')
        
        Promise.resolve().then(() => {
          setSelectedCharacters(savedCharacters)
          lastSavedCharactersRef.current = savedCharacters
        })
      }
    }
  }, [savedCharacters, authArgs, isTransitioning, setSelectedCharacters])



  // Auto-save selected characters with debounce
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  useEffect(() => {
    // Clear any existing save timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    // Don't save if we haven't loaded from DB yet or during auth transitions
    if (!hasLoadedFromDb.current || !authArgs || isTransitioning) {
      return
    }
    
    // Check if there are actual changes by comparing with our last known saved state
    const hasChanges = !areCharacterListsEqual(selectedCharacters, lastSavedCharactersRef.current)
    
    if (hasChanges) {
      // Create a promise that includes the debounce delay
      currentSavePromise = new Promise((resolve, reject) => {
        // Debounce the save operation by 500ms
        saveTimeoutRef.current = setTimeout(() => {
          setSaveStatus('saving')
          saveCharacters({ ...authArgs, characters: selectedCharacters })
            .then(() => {
              // Update our reference to the last saved state
              lastSavedCharactersRef.current = selectedCharacters
              setSaveStatus('saved')
              // Clear status after 2 seconds
              statusTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000)
              resolve()
            })
            .catch(error => {
              console.error('Failed to save characters:', error)
              setSaveStatus('idle')
              reject(error)
            })
        }, 500)
      })
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current)
      }
    }
  }, [selectedCharacters, saveCharacters, authArgs, isTransitioning])

    // Subscribe to global store updates so this hook instance stays in sync.
  useEffect(() => {
    const listener = (chars: Character[]) => {
      setLocalSelectedCharacters(chars)
    }
    characterListeners.add(listener)
    // On cleanup remove listener
    return () => {
      characterListeners.delete(listener)
    }
  }, [])

  return {
    selectedCharacters,
    setSelectedCharacters,
    saveStatus,
    savedCharacters
  }
}