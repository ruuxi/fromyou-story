'use client'

import { useState } from 'react'
import { Sparkles, Save, X } from 'lucide-react'
import { useMutation, useAction, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { CustomWorldLore } from './types'

interface WorldLoreEditorProps {
  worldLore?: CustomWorldLore
  onSave: () => void
  onCancel: () => void
}

export function WorldLoreEditor({ worldLore, onSave, onCancel }: WorldLoreEditorProps) {
  const [title, setTitle] = useState(worldLore?.title || '')
  const [lore, setLore] = useState(worldLore?.lore || '')
  const [theme, setTheme] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const { authArgs } = useAuthState()

  const createLore = useMutation(api.customContent.mutations.createCustomWorldLore)
  const updateLore = useMutation(api.customContent.mutations.updateCustomWorldLore)
  const generateWorldLore = useAction(api.customContent.actions.generateWorldLore)

  // Get existing world lore for context
  const existingLore = useQuery(
    api.customContent.queries.getCustomWorldLore,
    authArgs || 'skip'
  )

  const handleGenerateLore = async () => {
    if (!authArgs || !theme) return
    
    setIsGenerating(true)
    try {
      const result = await generateWorldLore({
        ...authArgs,
        theme: theme,
        existingLore: existingLore?.map(l => l.lore).slice(0, 3) // Use up to 3 existing lore for context
      })
      setTitle(result.title)
      setLore(result.lore)
      setTheme('') // Clear theme after generation
    } catch (error) {
      console.error('Failed to generate lore:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!authArgs || !title || !lore) return

    setIsSaving(true)
    try {
      if (worldLore) {
        await updateLore({
          ...authArgs,
          loreId: worldLore._id,
          title: title,
          lore: lore
        })
      } else {
        await createLore({
          ...authArgs,
          title: title,
          lore: lore
        })
      }
      onSave()
    } catch (error) {
      console.error('Failed to save world lore:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="bg-stone-800/20 backdrop-blur-xl rounded-md p-6 border border-white/20">
      <h3 className="text-lg font-semibold text-white mb-4">
        {worldLore ? 'Edit World Lore' : 'Create New World Lore'}
      </h3>

      <div className="space-y-4">
        {/* AI Generation Section */}
        {!worldLore && (
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Generate with AI (Optional)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 
                         text-white placeholder-white/40 focus:outline-none focus:ring-2 
                         focus:ring-white/30 focus:border-white/40 transition-all"
                placeholder="Enter a theme (e.g., 'cyberpunk megacity', 'ancient forest realm')..."
              />
              <button
                type="button"
                onClick={handleGenerateLore}
                disabled={!theme || isGenerating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 
                         text-white hover:bg-white/30 transition-all 
                         disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        )}

        {/* Title Input */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 
                     text-white placeholder-white/40 focus:outline-none focus:ring-2 
                     focus:ring-white/30 focus:border-white/40 transition-all"
            placeholder="Enter a descriptive title..."
          />
        </div>

        {/* Lore Textarea */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            World Lore
          </label>
          <textarea
            value={lore}
            onChange={(e) => setLore(e.target.value)}
            rows={10}
            className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 
                     text-white placeholder-white/40 focus:outline-none focus:ring-2 
                     focus:ring-white/30 focus:border-white/40 transition-all resize-none"
            placeholder="Describe the world, its history, culture, magic systems, technology..."
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
            disabled={!title || !lore || isSaving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 
                     text-white hover:bg-white/30 transition-all 
                     disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Lore'}
          </button>
        </div>
      </div>
    </div>
  )
}