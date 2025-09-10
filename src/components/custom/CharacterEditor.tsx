'use client'

import { useState } from 'react'
import { Sparkles, Save, X } from 'lucide-react'
import { useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { CustomCharacter } from './types'

interface CharacterEditorProps {
  character?: CustomCharacter
  onSave: () => void
  onCancel: () => void
}

export function CharacterEditor({ character, onSave, onCancel }: CharacterEditorProps) {
  const [name, setName] = useState(character?.fullName || '')
  const [gender, setGender] = useState(character?.gender || '')
  const [lore, setLore] = useState(character?.characterLore || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { authArgs } = useAuthState()

  const createCharacter = useMutation(api.customContent.mutations.createCustomCharacter)
  const updateCharacter = useMutation(api.customContent.mutations.updateCustomCharacter)
  const generateLore = useAction(api.customContent.actions.generateCharacterLore)

  const handleGenerateLore = async () => {
    if (!authArgs || !name || !gender) return
    
    setIsGenerating(true)
    try {
      const generatedLore = await generateLore({
        ...authArgs,
        characterName: name,
        gender: gender,
        additionalContext: lore // Use existing lore as context if any
      })
      setLore(generatedLore)
    } catch (error) {
      console.error('Failed to generate lore:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!authArgs || !name || !gender) return

    setIsSaving(true)
    try {
      if (character) {
        await updateCharacter({
          ...authArgs,
          characterId: character._id,
          fullName: name,
          gender: gender,
          characterLore: lore
        })
      } else {
        await createCharacter({
          ...authArgs,
          fullName: name,
          gender: gender,
          characterLore: lore
        })
      }
      onSave()
    } catch (error) {
      console.error('Failed to save character:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-stone-800/20 backdrop-blur-xl rounded-md p-3 md:p-6 border border-white/20">
      <h3 className="text-base md:text-lg font-semibold text-white/90 mb-3 md:mb-4">
        {character ? 'Edit Character' : 'Create New Character'}
      </h3>

      <div className="space-y-3 md:space-y-4">
        {/* Name Input */}
        <div>
          <label className="block text-xs md:text-sm font-medium text-white/80 mb-1.5 md:mb-2">
            Character Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-1.5 md:px-4 md:py-2 rounded-md bg-white/10 border border-white/20 
                     text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 
                     focus:ring-white/30 focus:border-white/40 transition-all text-sm md:text-base"
            placeholder="Enter character name..."
          />
        </div>

        {/* Gender Input */}
        <div>
          <label className="block text-xs md:text-sm font-medium text-white/80 mb-1.5 md:mb-2">
            Gender
          </label>
          <input
            type="text"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-3 py-1.5 md:px-4 md:py-2 rounded-md bg-white/10 border border-white/20 
                     text-white/90 placeholder-white/40 focus:outline-none focus:ring-2 
                     focus:ring-white/30 focus:border-white/40 transition-all text-sm md:text-base"
            placeholder="Enter gender..."
          />
        </div>

        {/* Lore Textarea */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-amber-100/80">
              Character Lore
            </label>
            <button
              type="button"
              onClick={handleGenerateLore}
              disabled={!name || !gender || isGenerating}
              className="flex items-center gap-2 px-3 py-1 rounded-md bg-white/10 
                       text-white/70 hover:bg-white/20 hover:text-white/90 
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">
                {isGenerating ? 'Generating...' : 'Generate Lore'}
              </span>
            </button>
          </div>
          <textarea
            value={lore}
            onChange={(e) => setLore(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 rounded-lg bg-amber-100/10 border border-amber-100/20 
                     text-amber-50 placeholder-amber-100/40 focus:outline-none focus:ring-2 
                     focus:ring-amber-100/30 focus:border-amber-100/40 transition-all resize-none"
            placeholder="Write character backstory, personality, abilities..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-700/30 
                     text-white/70 hover:bg-stone-700/50 hover:text-white/90 transition-all"
          >
            <X className="w-4 h-4" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name || !gender || isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-sky-600/30 
                     text-white/90 hover:bg-sky-500/30 transition-all 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Character'}
          </button>
        </div>
      </div>
    </div>
  )
}