'use client'

import { useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { Settings, Check, X, Zap } from 'lucide-react'

interface PresetSelectorProps {
  chatId: string
  onPresetChanged?: (presetId: string | null) => void
  compact?: boolean
}

const PRESET_TYPE_COLORS = {
  openai: 'border-green-500/30 text-green-300',
  textgen: 'border-blue-500/30 text-blue-300',
  kobold: 'border-purple-500/30 text-purple-300',
  novelai: 'border-orange-500/30 text-orange-300',
  instruct: 'border-yellow-500/30 text-yellow-300',
  context: 'border-cyan-500/30 text-cyan-300',
  sysprompt: 'border-pink-500/30 text-pink-300',
  reasoning: 'border-indigo-500/30 text-indigo-300',
}

export function PresetSelector({ chatId, onPresetChanged, compact = false }: PresetSelectorProps) {
  const { authArgs } = useAuthState()
  const [isOpen, setIsOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // Load available presets
  const presets = useQuery(
    api.presets.storage.getUserPresets,
    authArgs ? authArgs : 'skip'
  )

  // Load active preset for this chat
  const activePreset = useQuery(
    api.presets.storage.getChatPreset,
    { chatId: chatId as any }
  )

  const applyChatPreset = useMutation(api.presets.storage.applyChatPreset)
  const removeChatPreset = useMutation(api.presets.storage.removeChatPreset)

  const handleApplyPreset = async (presetId: string) => {
    if (!authArgs || isApplying) return

    setIsApplying(true)
    try {
      await applyChatPreset({
        chatId: chatId as any,
        presetId: presetId as any,
        ...authArgs,
      })
      setIsOpen(false)
      onPresetChanged?.(presetId)
    } catch (error: any) {
      console.error('Failed to apply preset:', error)
      // TODO: Show error toast
    } finally {
      setIsApplying(false)
    }
  }

  const handleRemovePreset = async () => {
    if (!authArgs || isApplying) return

    setIsApplying(true)
    try {
      await removeChatPreset({
        chatId: chatId as any,
        ...authArgs,
      })
      setIsOpen(false)
      onPresetChanged?.(null)
    } catch (error: any) {
      console.error('Failed to remove preset:', error)
      // TODO: Show error toast
    } finally {
      setIsApplying(false)
    }
  }

  if (!presets || presets.length === 0) {
    return null // No presets available
  }

  const currentPreset = activePreset?.preset

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
            currentPreset
              ? `${PRESET_TYPE_COLORS[currentPreset.presetType as keyof typeof PRESET_TYPE_COLORS] || 'border-white/20 text-white/70'} bg-white/10`
              : 'border-white/20 text-white/70 hover:border-white/30 hover:bg-white/5'
          }`}
        >
          <Zap className="w-4 h-4" />
          {currentPreset ? (
            <span className="text-sm font-medium">{currentPreset.name}</span>
          ) : (
            <span className="text-sm">Select Preset</span>
          )}
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-800 border border-white/20 rounded-lg shadow-xl z-50">
              <div className="p-2 border-b border-white/10">
                <div className="text-sm font-medium text-white">Chat Preset</div>
                <div className="text-xs text-white/60">
                  Apply SillyTavern preset to this chat
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto">
                {currentPreset && (
                  <button
                    onClick={handleRemovePreset}
                    disabled={isApplying}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    Remove Current Preset
                  </button>
                )}

                {presets.map((preset) => (
                  <button
                    key={preset._id}
                    onClick={() => handleApplyPreset(preset._id)}
                    disabled={isApplying}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50 ${
                      currentPreset?._id === preset._id
                        ? 'text-green-300 bg-green-500/10'
                        : 'text-white/80'
                    }`}
                  >
                    {currentPreset?._id === preset._id ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <div className="w-4 h-4" />
                    )}
                    <div className="flex-1 text-left">
                      <div className="truncate">{preset.name}</div>
                      <div className="text-xs text-white/50 capitalize">
                        {preset.presetType}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Active Preset
        </h4>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-sm text-white/60 hover:text-white"
        >
          {isOpen ? 'Cancel' : 'Change'}
        </button>
      </div>

      {currentPreset ? (
        <div className={`p-3 rounded-lg border ${
          PRESET_TYPE_COLORS[currentPreset.presetType as keyof typeof PRESET_TYPE_COLORS] || 'border-white/20'
        } bg-white/5`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-white">{currentPreset.name}</div>
              <div className="text-sm text-white/60 capitalize">
                {currentPreset.presetType} preset
              </div>
            </div>
            <button
              onClick={handleRemovePreset}
              disabled={isApplying}
              className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 border border-dashed border-white/20 rounded-lg text-center">
          <div className="text-white/60 mb-2">No preset applied</div>
          <button
            onClick={() => setIsOpen(true)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            Select a preset
          </button>
        </div>
      )}

      {isOpen && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          <div className="text-sm text-white/60">Available Presets:</div>
          {presets.map((preset) => (
            <button
              key={preset._id}
              onClick={() => handleApplyPreset(preset._id)}
              disabled={isApplying || currentPreset?._id === preset._id}
              className={`w-full p-3 rounded-lg border text-left transition-all disabled:opacity-50 ${
                currentPreset?._id === preset._id
                  ? 'border-green-500/30 bg-green-500/10'
                  : 'border-white/20 hover:border-white/30 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{preset.name}</div>
                  <div className="text-sm text-white/60 capitalize">
                    {preset.presetType}
                  </div>
                </div>
                {currentPreset?._id === preset._id && (
                  <Check className="w-4 h-4 text-green-400" />
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}