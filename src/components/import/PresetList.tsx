'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { FileText, Calendar, Eye, Trash2, Edit3, MoreVertical } from 'lucide-react'

interface Preset {
  _id: string
  name: string
  presetType: string
  importedAt: number
  lastUsed?: number
  isActive: boolean
}

interface PresetListProps {
  presets: Preset[]
  onPresetSelect: (presetId: string) => void
  selectedPresetId: string | null
}

const PRESET_TYPE_LABELS = {
  openai: 'OpenAI',
  textgen: 'TextGen',
  kobold: 'KoboldAI',
  novelai: 'NovelAI',
  instruct: 'Instruct',
  context: 'Context',
  sysprompt: 'System Prompt',
  reasoning: 'Reasoning',
}

const PRESET_TYPE_COLORS = {
  openai: 'bg-green-500/20 text-green-300',
  textgen: 'bg-blue-500/20 text-blue-300',
  kobold: 'bg-purple-500/20 text-purple-300',
  novelai: 'bg-orange-500/20 text-orange-300',
  instruct: 'bg-yellow-500/20 text-yellow-300',
  context: 'bg-cyan-500/20 text-cyan-300',
  sysprompt: 'bg-pink-500/20 text-pink-300',
  reasoning: 'bg-indigo-500/20 text-indigo-300',
}

export function PresetList({ presets, onPresetSelect, selectedPresetId }: PresetListProps) {
  const { authArgs } = useAuthState()
  const [showDropdown, setShowDropdown] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [newName, setNewName] = useState('')

  const deletePreset = useMutation(api.presets.storage.deletePreset)
  const updatePreset = useMutation(api.presets.storage.updatePreset)

  const handleDelete = async (presetId: string) => {
    if (!authArgs) return
    
    try {
      await deletePreset({
        presetId: presetId as any,
        ...authArgs,
      })
      setShowDropdown(null)
    } catch (error: any) {
      console.error('Failed to delete preset:', error)
      // TODO: Show error toast
    }
  }

  const handleRename = async (presetId: string) => {
    if (!authArgs || !newName.trim()) return

    try {
      await updatePreset({
        presetId: presetId as any,
        updates: { name: newName.trim() },
        ...authArgs,
      })
      setEditingName(null)
      setNewName('')
      setShowDropdown(null)
    } catch (error: any) {
      console.error('Failed to rename preset:', error)
      // TODO: Show error toast
    }
  }

  const startRename = (presetId: string, currentName: string) => {
    setEditingName(presetId)
    setNewName(currentName)
    setShowDropdown(null)
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (presets.length === 0) {
    return (
      <div className="p-8 text-center text-white/60">
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-lg font-medium mb-2">No presets imported yet</p>
        <p className="text-sm">Upload your first SillyTavern preset to get started</p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 max-h-full overflow-y-auto">
      {presets.map((preset) => (
        <div
          key={preset._id}
          className={`p-4 rounded-lg border transition-all cursor-pointer ${
            selectedPresetId === preset._id
              ? 'bg-blue-500/20 border-blue-400/50'
              : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
          }`}
          onClick={() => onPresetSelect(preset._id)}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {editingName === preset._id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleRename(preset._id)
                      } else if (e.key === 'Escape') {
                        setEditingName(null)
                        setNewName('')
                      }
                    }}
                    className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                    autoFocus
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRename(preset._id)
                    }}
                    className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingName(null)
                      setNewName('')
                    }}
                    className="px-2 py-1 bg-white/10 text-white text-xs rounded hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <h3 className="font-medium text-white truncate">
                  {preset.name}
                </h3>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  PRESET_TYPE_COLORS[preset.presetType as keyof typeof PRESET_TYPE_COLORS] || 
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {PRESET_TYPE_LABELS[preset.presetType as keyof typeof PRESET_TYPE_LABELS] || preset.presetType}
                </span>
                
                <div className="flex items-center gap-1 text-xs text-white/50">
                  <Calendar className="w-3 h-3" />
                  {formatDate(preset.importedAt)}
                </div>
              </div>

              {preset.lastUsed && (
                <div className="flex items-center gap-1 mt-1 text-xs text-white/40">
                  <span>Last used: {formatDate(preset.lastUsed)}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPresetSelect(preset._id)
                }}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                title="Preview preset"
              >
                <Eye className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDropdown(showDropdown === preset._id ? null : preset._id)
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showDropdown === preset._id && (
                  <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-white/20 rounded-lg shadow-xl z-10 min-w-[150px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        startRename(preset._id, preset.name)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/10 rounded-t-lg"
                    >
                      <Edit3 className="w-4 h-4" />
                      Rename
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (confirm(`Are you sure you want to delete "${preset.name}"?`)) {
                          handleDelete(preset._id)
                        }
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-b-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}