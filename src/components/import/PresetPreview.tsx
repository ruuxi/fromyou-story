'use client'

import { useState, useEffect, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { ArrowLeft, Settings, Thermometer, Hash, Zap, Target } from 'lucide-react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'

// Simple client-side preset parser for display purposes
function parsePreset(data: any) {
  const settings: any = {}
  
  if (data.temperature !== undefined) settings.temperature = data.temperature
  if (data.temp !== undefined) settings.temperature = data.temp
  if (data.openai_max_tokens !== undefined) settings.maxTokens = data.openai_max_tokens
  if (data.max_length !== undefined) settings.maxTokens = data.max_length
  if (data.top_p !== undefined) settings.topP = data.top_p
  if (data.top_k !== undefined) settings.topK = data.top_k
  if (data.frequency_penalty !== undefined) settings.frequencyPenalty = data.frequency_penalty
  if (data.presence_penalty !== undefined) settings.presencePenalty = data.presence_penalty
  if (data.prompts) settings.prompts = data.prompts
  if (data.content) settings.systemPrompt = data.content
  
  return { settings }
}

interface Preset {
  _id: string
  name: string
  presetType: string
  originalDataId: string
  importedAt: number
  lastUsed?: number
}

interface PresetPreviewProps {
  preset: Preset
  onClose: () => void
}

export function PresetPreview({ preset, onClose }: PresetPreviewProps) {
  const { authArgs } = useAuthState()
  const [presetData, setPresetData] = useState<any>(null)
  const [isLoadingPresetData, setIsLoadingPresetData] = useState(false)

  // Get preset with data URL
  const presetWithUrl = useQuery(
    api.presets.storage.getPresetWithUrl,
    preset?._id ? { 
      presetId: preset._id as any,
      ...authArgs 
    } : "skip"
  )

  // Parse preset settings on the client side
  const parsedSettings = useMemo(() => {
    if (presetData) {
      const parsed = parsePreset(presetData)
      return parsed?.settings || {}
    }
    return {}
  }, [presetData])

  // Fetch preset data when URL is available
  useEffect(() => {
    if (presetWithUrl?.dataUrl && !presetData && !isLoadingPresetData) {
      setIsLoadingPresetData(true)
      fetch(presetWithUrl.dataUrl)
        .then(response => response.json())
        .then(data => {
          setPresetData(data)
          setIsLoadingPresetData(false)
        })
        .catch(error => {
          console.error('Failed to fetch preset data:', error)
          setIsLoadingPresetData(false)
        })
    }
  }, [presetWithUrl?.dataUrl, presetData, isLoadingPresetData])

  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      return value.toString()
    }
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No'
    }
    if (Array.isArray(value)) {
      return `${value.length} items`
    }
    if (typeof value === 'object' && value !== null) {
      return 'Object'
    }
    return String(value || 'Not set')
  }

  const renderBasicSettings = () => {
    const settings = parsedSettings
    const basicSettings = [
      { key: 'temperature', label: 'Temperature', icon: Thermometer, value: settings.temperature },
      { key: 'maxTokens', label: 'Max Tokens', icon: Hash, value: settings.maxTokens },
      { key: 'topP', label: 'Top P', icon: Target, value: settings.topP },
      { key: 'topK', label: 'Top K', icon: Hash, value: settings.topK },
      { key: 'frequencyPenalty', label: 'Frequency Penalty', icon: Zap, value: settings.frequencyPenalty },
      { key: 'presencePenalty', label: 'Presence Penalty', icon: Zap, value: settings.presencePenalty },
    ]

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-white flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Basic Settings
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {basicSettings.map(({ key, label, icon: Icon, value }) => (
            value !== undefined && (
              <div key={key} className="p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-white/60 mb-1">
                  <Icon className="w-3 h-3" />
                  {label}
                </div>
                <div className="text-white font-medium">
                  {formatValue(value)}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    )
  }

  const renderPrompts = () => {
    const prompts = parsedSettings.prompts
    if (!prompts || prompts.length === 0) return null

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-white">Custom Prompts ({prompts.length})</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {prompts.map((prompt: any, index: number) => (
            <div key={index} className="p-3 bg-white/5 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white/80">
                  {prompt.name || prompt.identifier}
                </span>
                <div className="flex items-center gap-2">
                  {prompt.marker && (
                    <span className="px-2 py-0.5 text-xs rounded bg-blue-500/20 text-blue-300">
                      Marker
                    </span>
                  )}
                  <span className={`px-2 py-0.5 text-xs rounded ${
                    prompt.enabled ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
                  }`}>
                    {prompt.enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
              {prompt.role && (
                <div className="text-xs text-white/50 mb-1">
                  Role: {prompt.role}
                </div>
              )}
              <div className="text-xs text-white/60">
                {prompt.marker 
                  ? <em>Dynamic content placeholder</em>
                  : (prompt.content || 'No content')
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderAdvancedSettings = () => {
    const advanced = parsedSettings.samplingSettings
    if (!advanced) return null

    const advancedSettings = [
      { key: 'topA', label: 'Top A', value: advanced.topA },
      { key: 'minP', label: 'Min P', value: advanced.minP },
      { key: 'tfs', label: 'TFS', value: advanced.tfs },
      { key: 'typical', label: 'Typical P', value: advanced.typical },
      { key: 'mirostatMode', label: 'Mirostat Mode', value: advanced.mirostatMode },
      { key: 'mirostatTau', label: 'Mirostat Tau', value: advanced.mirostatTau },
      { key: 'mirostatEta', label: 'Mirostat Eta', value: advanced.mirostatEta },
      { key: 'repetitionPenalty', label: 'Rep Penalty', value: advanced.repetitionPenalty },
    ]

    const activeSettings = advancedSettings.filter(({ value }) => value !== undefined)
    if (activeSettings.length === 0) return null

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-white">Advanced Sampling</h4>
        <div className="grid grid-cols-2 gap-3">
          {activeSettings.map(({ key, label, value }) => (
            <div key={key} className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60 mb-1">{label}</div>
              <div className="text-white font-medium">
                {formatValue(value)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderInstructTemplate = () => {
    const instruct = parsedSettings.instructTemplate
    if (!instruct) return null

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-white">Instruct Template</h4>
        <div className="space-y-2">
          {instruct.inputSequence && (
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60 mb-1">Input Sequence</div>
              <div className="text-xs text-white/80 font-mono bg-black/20 p-2 rounded">
                {instruct.inputSequence}
              </div>
            </div>
          )}
          {instruct.outputSequence && (
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60 mb-1">Output Sequence</div>
              <div className="text-xs text-white/80 font-mono bg-black/20 p-2 rounded">
                {instruct.outputSequence}
              </div>
            </div>
          )}
          {instruct.systemSequence && (
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60 mb-1">System Sequence</div>
              <div className="text-xs text-white/80 font-mono bg-black/20 p-2 rounded">
                {instruct.systemSequence}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderContextTemplate = () => {
    const context = parsedSettings.contextTemplate
    if (!context) return null

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-white">Context Template</h4>
        <div className="space-y-2">
          {context.storyString && (
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60 mb-1">Story String</div>
              <div className="text-xs text-white/80 line-clamp-3">
                {context.storyString}
              </div>
            </div>
          )}
          {context.chatStart && (
            <div className="p-3 bg-white/5 rounded-lg">
              <div className="text-sm text-white/60 mb-1">Chat Start</div>
              <div className="text-xs text-white/80">
                {context.chatStart}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderSystemPrompt = () => {
    const systemPrompt = parsedSettings.systemPrompt
    if (!systemPrompt) return null

    return (
      <div className="space-y-3">
        <h4 className="font-medium text-white">System Prompt</h4>
        <div className="p-3 bg-white/5 rounded-lg">
          <div className="text-sm text-white/80 whitespace-pre-wrap line-clamp-6">
            {systemPrompt}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-white/70" />
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate">
            {preset.name}
          </h3>
          <p className="text-sm text-white/60 capitalize">
            {preset.presetType} Preset
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {renderBasicSettings()}
        {renderPrompts()}
        {renderAdvancedSettings()}
        {renderInstructTemplate()}
        {renderContextTemplate()}
        {renderSystemPrompt()}

        {/* Raw Data Section */}
        <div className="space-y-3">
          <h4 className="font-medium text-white">Import Information</h4>
          <div className="p-3 bg-white/5 rounded-lg text-sm">
            <div className="grid grid-cols-1 gap-2 text-white/60">
              <div>
                <span className="text-white/80">Imported:</span>{' '}
                {new Date(preset.importedAt).toLocaleString()}
              </div>
              {preset.lastUsed && (
                <div>
                  <span className="text-white/80">Last used:</span>{' '}
                  {new Date(preset.lastUsed).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}