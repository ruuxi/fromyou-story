'use client'

import { useState, useEffect } from 'react'

// Add custom CSS animations for the loading button
const loadingAnimationStyles = `
  @keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    14% { transform: scale(1.1); }
    28% { transform: scale(1); }
    42% { transform: scale(1.15); }
    70% { transform: scale(1); }
  }
  
  @keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 5px rgba(255, 255, 255, 0.3); }
    50% { box-shadow: 0 0 20px rgba(255, 255, 255, 0.6), 0 0 30px rgba(59, 130, 246, 0.4); }
  }
  
  .loading-button {
    animation: heartbeat 1.2s ease-in-out infinite, pulse-glow 4s ease-in-out infinite;
  }
`

interface Character {
  name: string
  gender: string
}

interface ParsedResults {
  sourceName: string | null
  characters: Character[]
  similarWorks: string[]
  tags: string[]
  genre: string | null
  isComplete: boolean
}

interface OnboardingResultsParserProps {
  streamingText: string
  isStreaming: boolean
  isGeneratingFeed?: boolean
  onStart?: (characters: Character[], sourceName: string, similarWorks: string[], tags: string[], genre: string) => void
  onBack?: () => void
}

export function OnboardingResultsParser({ streamingText, isStreaming, isGeneratingFeed = false, onStart, onBack }: OnboardingResultsParserProps) {
  const [parsedResults, setParsedResults] = useState<ParsedResults>({
    sourceName: null,
    characters: [],
    similarWorks: [],
    tags: [],
    genre: null,
    isComplete: false
  })

  useEffect(() => {
    const parseStreamingText = (text: string): ParsedResults => {
      const results: ParsedResults = {
        sourceName: null,
        characters: [],
        similarWorks: [],
        tags: [],
        genre: null,
        isComplete: !isStreaming
      }

      // Parse source name
      const sourceNameMatch = text.match(/# SOURCE_NAME\s*\n?(.+)/i)
      if (sourceNameMatch) {
        results.sourceName = sourceNameMatch[1].trim()
      }

      // Parse characters section
      const characterMatch = text.match(/# SOURCE_CHARACTERS\s*([\s\S]*?)(?=# |$)/i)
      if (characterMatch) {
        const characterSection = characterMatch[1]
        const lines = characterSection.split('\n')
        let currentCharacter: Partial<Character> = {}
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          
          if (trimmedLine.startsWith('- ')) {
            // Save previous character if complete
            if (currentCharacter.name && currentCharacter.gender) {
              results.characters.push(currentCharacter as Character)
            }
            // Start new character
            currentCharacter = {
              name: trimmedLine.substring(2).trim(),
              gender: ''
            }
          } else if (trimmedLine.match(/Gender:\s*(.+)$/i)) {
            const genderMatch = trimmedLine.match(/Gender:\s*(.+)$/i)
            if (genderMatch && currentCharacter.name) {
              currentCharacter.gender = genderMatch[1].trim()
            }
          }
        }
        
        // Don't forget the last character
        if (currentCharacter.name && currentCharacter.gender) {
          results.characters.push(currentCharacter as Character)
        }
      }

      // Parse similar works
      const similarWorksMatch = text.match(/# SIMILAR_WORKS\s*([\s\S]*?)(?=# |$)/i)
      if (similarWorksMatch) {
        const similarWorksSection = similarWorksMatch[1]
        const lines = similarWorksSection.split('\n')
        
        for (const line of lines) {
          const trimmedLine = line.trim()
          if (trimmedLine.startsWith('- ')) {
            const work = trimmedLine.substring(2).trim()
            if (work) {
              results.similarWorks.push(work)
            }
          }
        }
      }

      // Parse tags
      const tagsMatch = text.match(/# TAGS\s*\n?(.+)/i)
      if (tagsMatch) {
        const tagsString = tagsMatch[1].trim()
        results.tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      }

      // Parse genre
      const genreMatch = text.match(/# GENRE\s*\n?(.+)/i)
      if (genreMatch) {
        results.genre = genreMatch[1].trim()
      }

      return results
    }

    setParsedResults(parseStreamingText(streamingText))
  }, [streamingText, isStreaming])

  const [selectedCharacterIndices, setSelectedCharacterIndices] = useState<Set<number>>(new Set())
  const [selectedSimilarWorks, setSelectedSimilarWorks] = useState<Set<number>>(new Set())
  const [selectedTags, setSelectedTags] = useState<Set<number>>(new Set())

  // Update local state when parsing completes - select all items by default except similar works
  useEffect(() => {
    if (parsedResults.isComplete) {
      setSelectedCharacterIndices(new Set(Array.from({ length: Math.min(parsedResults.characters.length, 3) }, (_, i) => i)))
      setSelectedSimilarWorks(new Set()) // Start with none selected
      setSelectedTags(new Set(Array.from({ length: Math.min(parsedResults.tags.length, 6) }, (_, i) => i)))
    }
  }, [parsedResults.isComplete])

  const handleCharacterToggle = (index: number) => {
    setSelectedCharacterIndices(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const handleSimilarWorkToggle = (index: number) => {
    setSelectedSimilarWorks(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const handleTagToggle = (index: number) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev)
      if (newSet.has(index)) {
        newSet.delete(index)
      } else {
        newSet.add(index)
      }
      return newSet
    })
  }

  const handleStart = () => {
    if (onStart) {
      const selectedCharacters = parsedResults.characters.filter((_, index) => selectedCharacterIndices.has(index))
      const selectedWorksArray = parsedResults.similarWorks.filter((_, index) => selectedSimilarWorks.has(index))
      const selectedTagsArray = parsedResults.tags.filter((_, index) => selectedTags.has(index))
      onStart(selectedCharacters, parsedResults.sourceName || '', selectedWorksArray, selectedTagsArray, parsedResults.genre || '')
    }
  }

  // Inject styles for loading animations
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.textContent = loadingAnimationStyles
    document.head.appendChild(styleElement)
    
    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  return (
    <div className="w-full h-full flex flex-col p-3 md:p-4 overflow-y-auto md:overflow-visible min-h-0 touch-pan-y overscroll-y-contain">
      {/* Fun text at the top - positioned higher on mobile */}
      {parsedResults.sourceName && (
        <div className="text-center mb-6 md:mb-8 mt-4 md:mt-0">
          <p className="text-white/70 text-lg md:text-xl opacity-0 animate-fadeIn" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
            🤩 We found your vibe! Here are some characters from...
          </p>
        </div>
      )}
      
      <div className="w-full max-w-4xl mx-auto space-y-5 md:space-y-8 flex-1 md:flex md:flex-col md:justify-center">
        {/* Source Name Section */}
        {parsedResults.sourceName && (
          <div className="space-y-3">
            <h3 className="text-white text-base md:text-lg font-semibold text-left">
              {parsedResults.sourceName} <span className="text-white/50 text-sm font-normal">({selectedCharacterIndices.size} selected)</span>
            </h3>
            <div className="overflow-hidden md:overflow-visible">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 p-2 sm:p-3 max-h-[34dvh] md:max-h-none overflow-y-auto pr-1">
                {parsedResults.characters.map((character, index) => (
                  <SelectableCharacterBubble
                    key={`${character.name}-${index}`}
                    character={character}
                    isSelected={selectedCharacterIndices.has(index)}
                    onToggle={() => handleCharacterToggle(index)}
                    canEdit={!isStreaming}
                    animationDelay={120 + (index * 80)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Similar Works Section */}
        {parsedResults.similarWorks.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-white text-base md:text-lg font-semibold text-left">
              Similar works <span className="text-white/50 text-sm font-normal">({selectedSimilarWorks.size} selected)</span>
            </h3>
            <div className="overflow-hidden md:overflow-visible">
              <div className="flex flex-wrap gap-2 sm:gap-3 p-2 sm:p-3 max-h-[28dvh] md:max-h-none overflow-y-auto pr-1">
                {parsedResults.similarWorks.map((work, index) => (
                  <SelectableWorkBubble
                    key={`${work}-${index}`}
                    work={work}
                    isSelected={selectedSimilarWorks.has(index)}
                    onToggle={() => handleSimilarWorkToggle(index)}
                    canEdit={!isStreaming}
                    animationDelay={120 + (index * 80)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tags Section */}
        {parsedResults.tags.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-white text-base md:text-lg font-semibold text-left">
              Tags <span className="text-white/50 text-sm font-normal">({selectedTags.size} selected)</span>
            </h3>
            <div className="overflow-hidden md:overflow-visible">
              <div className="flex flex-wrap gap-2 p-2 sm:p-3 max-h-[28dvh] md:max-h-none overflow-y-auto pr-1">
                {parsedResults.tags.map((tag, index) => (
                  <SelectableTagBubble
                    key={`${tag}-${index}`}
                    tag={tag}
                    isSelected={selectedTags.has(index)}
                    onToggle={() => handleTagToggle(index)}
                    canEdit={!isStreaming}
                    animationDelay={120 + (index * 80)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Spacer to avoid content being obscured by the fixed mobile bottom bar */}
        <div className="md:hidden" style={{ height: 'calc(env(safe-area-inset-bottom) + 92px)' }} />

        {/* Bottom Bar with Control Buttons */}
        <div className="border-t border-white/20 pt-6 mt-8 sm:pt-4 sm:mt-6 md:block hidden">
          <div className={`flex items-center justify-center ${(!isStreaming && parsedResults.isComplete) ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
            <button
              onClick={handleStart}
              disabled={isGeneratingFeed}
              className={`px-3 md:px-4 p-2 md:p-3 text-base sm:text-lg border-2 border-white/70 bg-black/30 bg-gradient-to-br from-amber-900/20 via-sky-900/45 to-purple-900/20 text-white font-bold w-full max-w-xs transition-all duration-200 ${
                isGeneratingFeed 
                  ? 'loading-button cursor-not-allowed opacity-90' 
                  : 'hover:border-white/60 hover:from-amber-900/25 hover:via-sky-900/20 hover:to-purple-900/15'
              }`}
            >
              {isGeneratingFeed ? (
                'Emerging...'
              ) : (
                'Start'
              )}
            </button>
          </div>
        </div>

        {/* Mobile Fixed Bottom Bar */}
        <div className={`fixed bottom-0 left-0 right-0 md:hidden ${(!isStreaming && parsedResults.isComplete) ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity duration-300`}>
          <div className="p-4 backdrop-blur-sm bg-black/20" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
            <div className="max-w-4xl mx-auto">
              <button
                onClick={handleStart}
                disabled={isGeneratingFeed}
                className={`w-full p-3 text-lg border-2 border-white/70 bg-black/30 bg-gradient-to-br from-amber-900/20 via-sky-900/45 to-purple-900/20 text-white font-bold transition-all duration-200 rounded ${
                  isGeneratingFeed 
                    ? 'loading-button cursor-not-allowed opacity-90' 
                    : 'hover:border-white/60 hover:from-amber-900/25 hover:via-sky-900/20 hover:to-purple-900/15'
                }`}
              >
                {isGeneratingFeed ? (
                  'Emerging...'
                ) : (
                  'Start'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function SelectableCharacterBubble({ character, isSelected, onToggle, canEdit, animationDelay }: { character: Character; isSelected: boolean; onToggle: () => void; canEdit: boolean; animationDelay?: number }) {
  return (
    <button 
      onClick={canEdit ? onToggle : undefined}
      disabled={!canEdit}
      className={`relative w-full p-2 md:p-3 transition-all duration-200 group opacity-0 animate-fadeIn h-[72px] md:h-[80px] flex items-center justify-center max-w-full ${
        isSelected 
          ? 'border border-white/50 bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10' 
          : 'border border-white/20 hover:border-white/40'
      } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ 
        animationDelay: `${animationDelay || 0}ms`,
        animationFillMode: 'forwards'
      }}
    >
      <div className={`font-semibold text-xs md:text-sm text-center leading-tight break-words px-1 ${
        isSelected ? 'text-white' : 'text-white/90'
      }`}>
        {character.name}
      </div>
    </button>
  )
}

function SelectableWorkBubble({ work, isSelected, onToggle, canEdit, animationDelay }: { work: string; isSelected: boolean; onToggle: () => void; canEdit: boolean; animationDelay?: number }) {
  return (
    <button 
      onClick={canEdit ? onToggle : undefined}
      disabled={!canEdit}
      className={`relative px-3 py-2 transition-all duration-200 group opacity-0 animate-fadeIn text-left max-w-full ${
        isSelected 
          ? 'border border-white/50 bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10' 
          : 'border border-white/20 hover:border-white/40'
      } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ 
        animationDelay: `${animationDelay || 0}ms`,
        animationFillMode: 'forwards'
      }}
    >
      <div className={`font-semibold text-xs md:text-sm leading-tight break-words ${
        isSelected ? 'text-white' : 'text-white/90'
      }`}>
        {work}
      </div>
    </button>
  )
}

function SelectableTagBubble({ tag, isSelected, onToggle, canEdit, animationDelay }: { tag: string; isSelected: boolean; onToggle: () => void; canEdit: boolean; animationDelay?: number }) {
  return (
    <button 
      onClick={canEdit ? onToggle : undefined}
      disabled={!canEdit}
      className={`relative px-3 py-2 transition-all duration-200 group opacity-0 animate-fadeIn text-left max-w-full ${
        isSelected 
          ? 'border border-white/50 bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10' 
          : 'border border-white/20 hover:border-white/40'
      } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
      style={{ 
        animationDelay: `${animationDelay || 0}ms`,
        animationFillMode: 'forwards'
      }}
    >
      <div className={`font-medium text-xs md:text-sm leading-tight break-words ${
        isSelected ? 'text-white' : 'text-white/90'
      }`}>
        {tag}
      </div>
    </button>
  )
}

