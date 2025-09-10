'use client'

import { Character } from '@/types/character'
import { SaveStatus } from '@/types/settings'

interface SelectedCharactersProps {
  selectedCharacters: Character[]
  saveStatus: SaveStatus
  onRemoveCharacter: (index: number) => void
  advancedButton?: React.ReactNode
}

export function SelectedCharacters({
  selectedCharacters,
  saveStatus,
  onRemoveCharacter,
  advancedButton
}: SelectedCharactersProps) {
  // Deduplicate characters to prevent React key conflicts
  const uniqueCharacters = selectedCharacters.filter((char, index, arr) => {
    const key = `${char.fullName}|${char.source}`;
    return arr.findIndex(c => `${c.fullName}|${c.source}` === key) === index;
  });

  return (
    <div className="pt-2 mt-2">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-amber-50/90 text-xs md:text-sm font-semibold">Selected Characters</h3>
        {advancedButton}
      </div>
      {uniqueCharacters.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 md:gap-2">
          {selectedCharacters.map((char, index) => (
            <div
              key={`${char.fullName}|${char.source}`}
              className="inline-flex items-center gap-2 px-2.5 py-2 text-xs md:text-sm transition-all duration-300 border rounded-lg border-white/20 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 text-white/80"
            >
              <span className="leading-none">{char.fullName}</span>
              <button
                type="button"
                onClick={() => onRemoveCharacter(index)}
                className="text-white/70 hover:text-white transition-colors"
                title="Remove"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-white/50 text-xs">No characters selected yet</div>
      )}
    </div>
  )
}