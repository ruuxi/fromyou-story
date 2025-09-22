'use client'

import { useState } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { 
  Save,
  FileText,
  Sparkles,
  Settings
} from 'lucide-react'
import SimpleBar from 'simplebar-react'

interface PresetData {
  name: string
  presetType: string
  temperature: number
  maxTokens: number
  topP: number
  topK: number
  repetitionPenalty: number
  presencePenalty: number
  frequencyPenalty: number
}

interface CreatePresetFormProps {
  onSuccess: () => void
  onBack?: () => void
}

const PRESET_TEMPLATES = [
  {
    name: 'Blank Preset',
    description: 'Start with default settings and customize as needed',
    data: {
      name: '',
      presetType: 'openai',
      temperature: 1.0,
      maxTokens: 400,
      topP: 1.0,
      topK: 50,
      repetitionPenalty: 1.0,
      presencePenalty: 0.0,
      frequencyPenalty: 0.0
    }
  }
]

export function CreatePresetForm({ onSuccess, onBack }: CreatePresetFormProps) {
  const { authArgs } = useAuthState()
  const [isCreating, setIsCreating] = useState(false)

  const [presetData, setPresetData] = useState<PresetData>(
    PRESET_TEMPLATES[0].data
  )

  const createPreset = useAction(api.presets.storage.createPreset)

  const handleCreate = async () => {
    if (!authArgs) return

    setIsCreating(true)
    try {
      await createPreset({
        ...authArgs,
        presetData: presetData,
        name: 'Custom Preset'
      })
      onSuccess()
    } catch (error) {
      console.error('Failed to create preset:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border border-green-300/20 text-green-300 flex items-center justify-center">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Create Preset</h2>
            <p className="text-sm text-white/60">
              Customize your AI settings
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        <SimpleBar className="h-full">
          <div className="p-4 pb-28">
            <div className="space-y-6">
              {/* Preset Settings */}
              <div className="space-y-4">
                <h3 className="text-white font-medium">Preset Configuration</h3>
                
                <div className="grid gap-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Preset Name *
                    </label>
                    <input
                      type="text"
                      value={presetData.name}
                      onChange={(e) => setPresetData((prev: PresetData) => ({ ...prev, name: e.target.value }))}
                      className="w-full p-3 bg-transparent border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                      placeholder="Enter preset name"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Preset Type
                    </label>
                    <select
                      value={presetData.presetType}
                      onChange={(e) => setPresetData((prev: PresetData) => ({ ...prev, presetType: e.target.value }))}
                      className="w-full p-3 bg-transparent border border-white/20 text-white focus:outline-none focus:border-white/40"
                    >
                      <option value="openai">OpenAI</option>
                      <option value="textgen">Text Generation</option>
                      <option value="kobold">Kobold</option>
                      <option value="novelai">NovelAI</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Temperature ({presetData.temperature})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={presetData.temperature}
                      onChange={(e) => setPresetData((prev: PresetData) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-white/60 mt-1">
                      <span>Conservative</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Max Tokens
                    </label>
                    <input
                      type="number"
                      value={presetData.maxTokens}
                      onChange={(e) => setPresetData((prev: PresetData) => ({ ...prev, maxTokens: parseInt(e.target.value) }))}
                      className="w-full p-3 bg-transparent border border-white/20 text-white focus:outline-none focus:border-white/40"
                      min="50"
                      max="2000"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Top P ({presetData.topP})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={presetData.topP}
                      onChange={(e) => setPresetData((prev: PresetData) => ({ ...prev, topP: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Top K
                    </label>
                    <input
                      type="number"
                      value={presetData.topK}
                      onChange={(e) => setPresetData((prev: PresetData) => ({ ...prev, topK: parseInt(e.target.value) }))}
                      className="w-full p-3 bg-transparent border border-white/20 text-white focus:outline-none focus:border-white/40"
                      min="1"
                      max="200"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Repetition Penalty ({presetData.repetitionPenalty})
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="1.5"
                      step="0.05"
                      value={presetData.repetitionPenalty}
                      onChange={(e) => setPresetData((prev: PresetData) => ({ ...prev, repetitionPenalty: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Presence Penalty ({presetData.presencePenalty})
                    </label>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={presetData.presencePenalty}
                      onChange={(e) => setPresetData((prev: PresetData) => ({ ...prev, presencePenalty: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">
                      Frequency Penalty ({presetData.frequencyPenalty})
                    </label>
                    <input
                      type="range"
                      min="-2"
                      max="2"
                      step="0.1"
                      value={presetData.frequencyPenalty}
                      onChange={(e) => setPresetData((prev: PresetData) => ({ ...prev, frequencyPenalty: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SimpleBar>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 sticky bottom-0 z-10 p-4 border-t border-white/10 bg-transparent backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/60">
            Customize Settings
          </div>
          
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Back
              </button>
            )}
            
            <button
              onClick={handleCreate}
              disabled={isCreating || !presetData.name}
              className="px-6 py-2 bg-gradient-to-br from-green-900/35 via-emerald-900/25 to-teal-900/20 hover:from-green-900/45 hover:via-emerald-900/35 hover:to-teal-900/30 text-white border border-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {isCreating ? 'Creating...' : 'Create Preset'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
