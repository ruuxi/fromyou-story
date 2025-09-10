'use client'

import { Character } from '@/types/character'
import { getAnimationStyle } from '@/lib/animations'

interface CharacterGridProps {
  characters: Character[]
  selectedCharacters: Character[]
  onCharacterToggle: (character: Character) => void
  title?: string
  onLoadMore?: () => void
  isLoadingMore?: boolean
  showLoadMore?: boolean
  showSource?: boolean
  animate?: boolean
  animationDelay?: number
}

export function CharacterGrid({
  characters,
  selectedCharacters,
  onCharacterToggle,
  title,
  onLoadMore,
  isLoadingMore,
  showLoadMore,
  showSource,
  animate = false,
  animationDelay = 120
}: CharacterGridProps) {
  if (characters.length === 0) return null

  // Deduplicate characters to prevent React key conflicts
  const uniqueCharacters = characters.filter((char, index, arr) => {
    const key = `${char.fullName}|${char.source}`;
    return arr.findIndex(c => `${c.fullName}|${c.source}` === key) === index;
  });

  // Warn if duplicates were found
  if (uniqueCharacters.length !== characters.length) {
    console.warn(`Found ${characters.length - uniqueCharacters.length} duplicate characters in ${title || 'CharacterGrid'}:`, 
      characters.filter((char, index, arr) => {
        const key = `${char.fullName}|${char.source}`;
        return arr.findIndex(c => `${c.fullName}|${c.source}` === key) !== index;
      })
    );
  }

  return (
    <div className="mb-4">
      {title && (
        <div className="flex items-center justify-between mb-2 bg">
          <h3 className="text-amber-50/90 text-xs font-semibold">{title}</h3>
          {showLoadMore && onLoadMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="px-2.5 py-1.5 text-xs border border-white/20 bg-gradient-to-br from-amber-900/6 via-sky-900/4 to-purple-900/3 text-white/70 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4 hover:text-white transition-all duration-300 rounded-lg flex items-center gap-1 font-medium"
              title="Load more characters"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span>more</span>
            </button>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {uniqueCharacters.map((char, index) => (
          <div
            key={`${char.fullName}|${char.source}`}
            className={animate ? 'animate-character-in' : ''}
            style={getAnimationStyle(index, animate, animationDelay)}
          >
                        <button
              type="button"
              onClick={() => onCharacterToggle(char)}
              className={`px-2.5 py-2 text-xs md:text-sm transition-all duration-300 border rounded-lg flex-shrink-0 ${
                showSource ? 'flex flex-col items-start' : 'truncate'
              } ${
                selectedCharacters.some(sc => sc.fullName === char.fullName && sc.source === char.source) 
                  ? 'border-white/70 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 text-white/90' 
                  : 'border-white/20 bg-gradient-to-br from-amber-900/6 via-sky-900/4 to-purple-900/3 text-white/70 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4 hover:text-white hover:border-white/30'
              }`}
            >
              <span className="leading-none">{char.fullName}</span>
              {showSource && (
                <span className="text-white/60 text-[10px] md:text-xs mt-0.5 leading-none">{char.source}</span>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}