'use client'

import { useState } from 'react'
import { Plus, Edit2, Trash2, BookOpen, Play, Sparkles } from 'lucide-react'
import { useMutation } from 'convex/react'
import { useRouter } from 'next/navigation'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { useAuthState } from '@/hooks/useAuthState'
import { useSettings } from '@/hooks/useSettings'
import { CustomStorySuggestion, CustomCharacter, CustomWorldLore } from './types'
import { StorySuggestionEditor } from './StorySuggestionEditor'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface StoryStarterProps {
  suggestions: CustomStorySuggestion[]
  characters: CustomCharacter[]
  worldLore: CustomWorldLore[]
  isLoading: boolean
}

export function StoryStarter({ suggestions, characters, worldLore, isLoading }: StoryStarterProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [startingStoryId, setStartingStoryId] = useState<string | null>(null)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
  const { authArgs } = useAuthState()
  const { settings } = useSettings()

  const deleteSuggestion = useMutation(api.customContent.mutations.deleteCustomStorySuggestion)
  const createStory = useMutation(api.stories.index.createStory)

  const handleDelete = async (suggestionId: Id<'customStorySuggestions'>) => {
    if (!authArgs) return
    setConfirmingDeleteId(String(suggestionId))
  }

  const handleStartStory = async (suggestion: CustomStorySuggestion) => {
    if (!authArgs) return

    setStartingStoryId(suggestion._id)
    try {
      // Combine main & side characters from the custom suggestion
      const suggestionCharacters = [
        ...suggestion.characters.main_characters,
        ...suggestion.characters.side_characters,
      ]

      // Create a story from the custom suggestion
      const storyId = await createStory({
        ...authArgs,
        suggestionId: `custom_${suggestion._id}`,
        suggestion: {
          text: suggestion.text,
          characters: suggestion.characters,
          metadata: suggestion.metadata
        },
        selectedCharacters: suggestionCharacters
      })

      // Navigate to the story page
      router.push(`/s/${storyId}`)
    } catch (error) {
      console.error('Failed to start story:', error)
      setStartingStoryId(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-stone-800/20 backdrop-blur-xl rounded-md p-6 animate-pulse">
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
          className="w-full bg-stone-800/20 backdrop-blur-xl rounded-md p-6 border border-white/20 
                     hover:bg-white/10 transition-all flex items-center justify-center gap-3 group"
        >
          <Plus className="w-5 h-5 text-white/60 group-hover:text-white/80" />
          <span className="text-white/70 font-medium group-hover:text-white/90">
            Create New Story Idea
          </span>
        </button>
      )}

      {/* Story Suggestion Editor (Create Mode) */}
      {isCreating && (
        <StorySuggestionEditor
          characters={characters}
          worldLore={worldLore}
          settings={settings}
          onSave={() => setIsCreating(false)}
          onCancel={() => setIsCreating(false)}
        />
      )}

      {/* Suggestions List */}
      {suggestions.map(suggestion => (
        <div key={suggestion._id}>
          {editingId === suggestion._id ? (
            <StorySuggestionEditor
              suggestion={suggestion}
              characters={characters}
              worldLore={worldLore}
              settings={settings}
              onSave={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div className={`bg-stone-800/20 backdrop-blur-xl rounded-md p-6 border border-white/20 
                           hover:bg-white/10 transition-all ${!suggestion.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="w-5 h-5 text-white/60" />
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wide">
                      {suggestion.metadata.genre} • {suggestion.metadata.storyType}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStartStory(suggestion)}
                    disabled={startingStoryId === suggestion._id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-600/30 
                             text-white hover:bg-sky-600/40 transition-all 
                             disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Play className="w-4 h-4" />
                    {startingStoryId === suggestion._id ? 'Starting...' : 'Start Story'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(suggestion._id)}
                    className="p-2 rounded-lg bg-white/10 text-white/60 
                             hover:bg-white/20 hover:text-white/80 transition-all"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(suggestion._id)}
                    className="p-2 rounded-lg bg-red-500/10 text-red-400/60 
                             hover:bg-red-500/20 hover:text-red-400/80 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-white mb-4">{suggestion.text}</p>

              {/* Character Tags */}
              <div className="flex flex-wrap gap-2 mb-3">
                {suggestion.characters.main_characters.map(char => (
                  <span key={char} className="px-2 py-1 text-xs rounded-full bg-white/15 text-white/80">
                    {char} (Main)
                  </span>
                ))}
                {suggestion.characters.side_characters.map(char => (
                  <span key={char} className="px-2 py-1 text-xs rounded-full bg-white/10 text-white/60">
                    {char}
                  </span>
                ))}
              </div>

              <div className="text-xs text-white/50">
                Created {new Date(suggestion._creationTime).toLocaleDateString()}
              </div>
              {confirmingDeleteId === String(suggestion._id) && (
                <ConfirmDialog
                  isOpen={true}
                  title="Delete this story idea?"
                  message="This will permanently remove the idea."
                  confirmText="Delete"
                  cancelText="Cancel"
                  destructive
                  onCancel={() => setConfirmingDeleteId(null)}
                  onConfirm={async () => {
                    if (!authArgs) return
                    await deleteSuggestion({ ...authArgs, suggestionId: suggestion._id })
                    setConfirmingDeleteId(null)
                  }}
                />
              )}
            </div>
          )}
        </div>
      ))}

      {/* Empty State */}
      {suggestions.length === 0 && !isCreating && (
        <div className="text-center py-12">
          <Sparkles className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white/70 mb-2">No story ideas yet</h3>
          <p className="text-white/50">Create your first custom story idea to get started!</p>
        </div>
      )}
    </div>
  )
}