'use client'

import { useState } from 'react'
import { Sparkles, Save, X } from 'lucide-react'
import { useMutation, useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { CustomStorySuggestion, CustomCharacter, CustomWorldLore } from './types'

interface StorySuggestionEditorProps {
  suggestion?: CustomStorySuggestion
  characters: CustomCharacter[]
  worldLore: CustomWorldLore[]
  settings: {
    genre?: string
    storyStructure?: string
    storyType?: string
    characterCount?: string
  }
  onSave: () => void
  onCancel: () => void
}

export function StorySuggestionEditor({ 
  suggestion, 
  characters, 
  worldLore,
  settings,
  onSave, 
  onCancel 
}: StorySuggestionEditorProps) {
  const [text, setText] = useState(suggestion?.text || '')
  const [mainCharacters, setMainCharacters] = useState<string[]>(
    suggestion?.characters.main_characters || []
  )
  const [sideCharacters, setSideCharacters] = useState<string[]>(
    suggestion?.characters.side_characters || []
  )
  const [selectedCharacter, setSelectedCharacter] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { authArgs } = useAuthState()

  const createSuggestion = useMutation(api.customContent.mutations.createCustomStorySuggestion)
  const updateSuggestion = useMutation(api.customContent.mutations.updateCustomStorySuggestion)
  const generateSuggestion = useAction(api.customContent.actions.generateStorySuggestion)

  const availableCharacters = characters
    .filter(c => c.isActive)
    .filter(c => !mainCharacters.includes(c.fullName) && !sideCharacters.includes(c.fullName))

  const handleAddCharacter = (type: 'main' | 'side') => {
    if (!selectedCharacter) return
    
    if (type === 'main') {
      setMainCharacters([...mainCharacters, selectedCharacter])
    } else {
      setSideCharacters([...sideCharacters, selectedCharacter])
    }
    setSelectedCharacter('')
  }

  const handleRemoveCharacter = (char: string, type: 'main' | 'side') => {
    if (type === 'main') {
      setMainCharacters(mainCharacters.filter(c => c !== char))
    } else {
      setSideCharacters(sideCharacters.filter(c => c !== char))
    }
  }

  const handleGenerateSuggestion = async () => {
    if (!authArgs || (mainCharacters.length === 0 && sideCharacters.length === 0)) return
    
    setIsGenerating(true)
    try {
      const allCharacters = [...mainCharacters, ...sideCharacters]
      const characterData = characters
        .filter(c => allCharacters.includes(c.fullName))
        .map(c => ({ name: c.fullName, lore: c.characterLore }))

      const activeLore = worldLore
        .filter(l => l.isActive)
        .map(l => l.lore)

      const generatedText = await generateSuggestion({
        ...authArgs,
        characters: characterData,
        worldLore: activeLore,
        genre: settings.genre || 'Adventure',
        playerMode: settings.storyStructure === 'player',
        storyType: settings.storyType || 'inspired'
      })
      
      setText(generatedText)
    } catch (error) {
      console.error('Failed to generate suggestion:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!authArgs || !text || mainCharacters.length === 0) return

    setIsSaving(true)
    try {
      if (suggestion) {
        await updateSuggestion({
          ...authArgs,
          suggestionId: suggestion._id,
          text: text,
          mainCharacters: mainCharacters,
          sideCharacters: sideCharacters
        })
      } else {
        await createSuggestion({
          ...authArgs,
          text: text,
          mainCharacters: mainCharacters,
          sideCharacters: sideCharacters,
          genre: settings.genre || 'Adventure',
          storyType: settings.storyType || 'inspired',
          playerMode: settings.storyStructure === 'player',
          characterCount: settings.characterCount || 'group'
        })
      }
      onSave()
    } catch (error) {
      console.error('Failed to save suggestion:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-stone-800/20 backdrop-blur-xl rounded-md p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">
        {suggestion ? 'Edit Story Idea' : 'Create New Story Idea'}
      </h3>

      <div className="space-y-4">
        {/* Character Selection */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Characters
          </label>
          
          {/* Main Characters */}
          <div className="mb-3">
            <p className="text-xs text-white/60 mb-2">Main Characters</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {mainCharacters.map(char => (
                <span key={char} className="px-3 py-1 text-sm rounded-full bg-white/15 text-white/80 flex items-center gap-1">
                  {char}
                  <button
                    type="button"
                    onClick={() => handleRemoveCharacter(char, 'main')}
                    className="ml-1 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Side Characters */}
          <div className="mb-3">
            <p className="text-xs text-white/60 mb-2">Side Characters</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {sideCharacters.map(char => (
                <span key={char} className="px-3 py-1 text-sm rounded-full bg-white/10 text-white/60 flex items-center gap-1">
                  {char}
                  <button
                    type="button"
                    onClick={() => handleRemoveCharacter(char, 'side')}
                    className="ml-1 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Add Character */}
          {availableCharacters.length > 0 && (
            <div className="flex gap-2">
              <select
                value={selectedCharacter}
                onChange={(e) => setSelectedCharacter(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-white/20 
                         text-white focus:outline-none focus:ring-2 focus:ring-white/30"
              >
                <option value="">Select a character...</option>
                {availableCharacters.map(char => (
                  <option key={char._id} value={char.fullName}>
                    {char.fullName} ({char.gender})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAddCharacter('main')}
                disabled={!selectedCharacter}
                className="px-3 py-2 rounded-lg bg-white/20 text-white 
                         hover:bg-white/30 transition-all disabled:opacity-50"
              >
                Add Main
              </button>
              <button
                type="button"
                onClick={() => handleAddCharacter('side')}
                disabled={!selectedCharacter}
                className="px-3 py-2 rounded-lg bg-white/10 text-white/70 
                         hover:bg-white/20 transition-all disabled:opacity-50"
              >
                Add Side
              </button>
            </div>
          )}
        </div>

        {/* Story Text */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-white/80">
              Story Idea
            </label>
            <button
              type="button"
              onClick={handleGenerateSuggestion}
              disabled={mainCharacters.length === 0 || isGenerating}
              className="flex items-center gap-2 px-3 py-1 rounded-lg bg-white/10 
                       text-white/70 hover:bg-white/20 hover:text-white/90 
                       transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">
                {isGenerating ? 'Generating...' : 'Generate Idea'}
              </span>
            </button>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 
                     text-white placeholder-white/40 focus:outline-none focus:ring-2 
                     focus:ring-white/30 focus:border-white/40 transition-all resize-none"
            placeholder="Write your story premise here..."
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
            disabled={!text || mainCharacters.length === 0 || isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 
                     text-white hover:bg-white/30 transition-all 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Story Idea'}
          </button>
        </div>
      </div>
    </div>
  )
}