'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, Sparkles, Check } from 'lucide-react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { useAuthState } from '@/hooks/useAuthState'
import { CustomCharacter } from './types'
import { CharacterEditor } from './CharacterEditor'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface CharacterLibraryProps {
  characters: CustomCharacter[]
  isLoading: boolean
}

export function CharacterLibrary({ characters, isLoading }: CharacterLibraryProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const { authArgs } = useAuthState()

  const deleteCharacter = useMutation(api.customContent.mutations.deleteCustomCharacter)
  const updateCharacter = useMutation(api.customContent.mutations.updateCustomCharacter)

  const handleDelete = async (characterId: string) => {
    if (!authArgs) return
    setConfirmingDeleteId(characterId)
  }

  const handleToggleActive = async (character: CustomCharacter) => {
    if (!authArgs) return
    await updateCharacter({
      ...authArgs,
      characterId: character._id,
      isActive: !character.isActive
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-stone-800/20 backdrop-blur-xl rounded-md p-3 md:p-6 animate-pulse">
            <div className="h-6 bg-white/10 rounded w-1/3 mb-3"></div>
            <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
            <div className="h-4 bg-white/10 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Create New Button */}
      {!isCreating && (
        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="w-full bg-stone-800/20 backdrop-blur-xl rounded-md p-3 md:p-6 border border-white/20 
                     hover:bg-white/10 transition-all flex items-center justify-center gap-3 group cursor-pointer"
        >
          <Plus className="w-5 h-5 text-white/60 group-hover:text-white/80" />
          <span className="text-white/70 font-medium group-hover:text-white/90">
            Create New Character
          </span>
        </button>
      )}

      {/* Character Editor (Create Mode) */}
      {isCreating && (
        <CharacterEditor
          onSave={() => setIsCreating(false)}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Characters List */}
      {characters.map(character => (
        <div key={character._id}>
          {editingId === character._id ? (
            <CharacterEditor
              character={character}
              onSave={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className={`bg-stone-800/20 backdrop-blur-xl p-3 md:p-6 border border-white/20 
                           ${!character.isActive ? 'opacity-60' : ''} hover:bg-white/10 transition-all cursor-pointer`}>
              <div className="flex items-start justify-between mb-3 md:mb-4">
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-white/90">{character.fullName}</h3>
                  <p className="text-white/60 text-xs md:text-sm">{character.gender}</p>
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(character)}
                    className={`p-1.5 md:p-2 rounded-md transition-all ${
                      character.isActive 
                        ? 'bg-sky-600/30 text-white/90' 
                        : 'bg-stone-700/30 text-white/40 hover:bg-stone-700/50'
                    }`}
                    title={character.isActive ? 'Active' : 'Inactive'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(character._id)}
                    className="p-2 rounded-md bg-white/10 text-white/60 
                             hover:bg-white/20 hover:text-white/80 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(character._id)}
                    className="p-2 rounded-md bg-red-500/10 text-red-400/60 
                             hover:bg-red-500/20 hover:text-red-400/80 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {character.characterLore && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-white/70 whitespace-pre-wrap text-sm md:text-base">{character.characterLore}</p>
                </div>
              )}

              <div className="mt-4 flex items-center gap-4 text-xs text-white/50">
                <span>Created {new Date(character._creationTime).toLocaleDateString()}</span>
                {character.updatedAt !== character._creationTime && (
                  <span>Updated {new Date(character.updatedAt).toLocaleDateString()}</span>
                )}
              </div>
              {confirmingDeleteId === character._id && (
                <ConfirmDialog
                  isOpen={true}
                  title="Delete this character?"
                  message="This will remove it from your custom characters."
                  confirmText="Delete"
                  cancelText="Cancel"
                  destructive
                  onCancel={() => setConfirmingDeleteId(null)}
                  onConfirm={async () => {
                    if (!authArgs) return
                    await deleteCharacter({ ...authArgs, characterId: character._id as Id<"customCharacters"> })
                    setConfirmingDeleteId(null)
                  }}
                />
              )}
            </div>
          )}
        </div>
      ))}

      {/* Empty State */}
      {characters.length === 0 && !isCreating && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white/70 mb-2">No characters yet</h3>
          <p className="text-white/50">Create your first custom character to get started!</p>
        </div>
      )}
    </div>
  )
}