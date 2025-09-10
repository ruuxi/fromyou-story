'use client'

import { useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { useRouter } from 'next/navigation'
import { 
  MessageCircle, 
  Settings, 
  Play, 
  X,
  ChevronDown,
  Sparkles,
  FileText
} from 'lucide-react'
import { Id } from '../../../convex/_generated/dataModel'

interface ChatLauncherProps {
  characterId: string
  characterName: string
  selectedGreeting?: number
  onClose: () => void
}

interface Preset {
  _id: Id<'importedPresets'>
  name: string
  presetType: string
}

export function ChatLauncher({ characterId, characterName, selectedGreeting = 0, onClose }: ChatLauncherProps) {
  const { authArgs } = useAuthState()
  const router = useRouter()
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [formatMode, setFormatMode] = useState<'classic_rp' | 'chatml'>('classic_rp')
  const [customTitle, setCustomTitle] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const createChatFromCharacter = useMutation(api.characters.chatIntegration.createChatFromCharacter)
  
  // Load available presets
  const presets = useQuery(
    api.presets.storage.getUserPresets,
    authArgs ? authArgs : 'skip'
  )

  const handleCreateChat = async () => {
    if (!authArgs) return

    setIsCreating(true)
    try {
      const chatId = await createChatFromCharacter({
        characterId: characterId as Id<'importedCharacters'>,
        presetId: selectedPresetId ? selectedPresetId as Id<'importedPresets'> : undefined,
        selectedGreeting,
        formatMode,
        title: customTitle || undefined,
        ...authArgs,
      })

      // Navigate to the new chat using existing /c/ route
      router.push(`/c/${chatId}`)
      onClose()
    } catch (error) {
      console.error('Failed to create chat:', error)
      setIsCreating(false)
    }
  }

  const activePresets = presets?.filter(preset => preset.isActive) || []

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <MessageCircle className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Start New Chat</h2>
              <p className="text-sm text-white/60">with {characterName}</p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Chat Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Chat Title (optional)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={`Chat with ${characterName}`}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/10 transition-colors"
            />
          </div>

          {/* Format Mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              Chat Format
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormatMode('classic_rp')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  formatMode === 'classic_rp'
                    ? 'bg-blue-500/20 border-blue-400/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="font-medium">Classic RP</div>
                <div className="text-xs opacity-70">Traditional roleplay format</div>
              </button>
              
              <button
                onClick={() => setFormatMode('chatml')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  formatMode === 'chatml'
                    ? 'bg-blue-500/20 border-blue-400/50 text-white'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                }`}
              >
                <div className="font-medium">ChatML</div>
                <div className="text-xs opacity-70">Structured message format</div>
              </button>
            </div>
          </div>

          {/* Preset Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-white">
              AI Preset (optional)
            </label>
            <div className="relative">
              <select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-400 appearance-none cursor-pointer"
              >
                <option value="">No preset (use defaults)</option>
                {activePresets.map((preset) => (
                  <option key={preset._id} value={preset._id}>
                    {preset.name} ({preset.presetType})
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
            </div>
            
            {selectedPresetId && (
              <div className="flex items-center gap-2 text-xs text-blue-300">
                <Sparkles className="w-3 h-3" />
                <span>Character will use this preset's AI settings</span>
              </div>
            )}
          </div>

          {/* Greeting Selection Info */}
          {selectedGreeting > 0 && (
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-white">
                <FileText className="w-4 h-4 text-blue-300" />
                <span>Using alternate greeting #{selectedGreeting}</span>
              </div>
            </div>
          )}

          {/* Preset Count Info */}
          {activePresets.length === 0 && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <p className="text-sm text-amber-300">
                No AI presets imported yet. The character will use default settings.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/20 text-white/70 rounded-lg hover:bg-white/5 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            
            <button
              onClick={handleCreateChat}
              disabled={isCreating}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Start Chat
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}