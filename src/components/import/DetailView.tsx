'use client'

import { useState, useMemo, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { 
  ChevronLeft,
  Edit3,
  Save,
  X,
  Copy,
  MessageCircle,
  History,
  Trash2,
  User,
  Settings,
  Clock,
  FileText,
  Eye,
  EyeOff,
  Plus,
  Minus,
  BookOpen,
  Search,
  Key,
  Globe,
  Lock,
  Heart,
  Download,
  Share2,
  Users
} from 'lucide-react'
import SimpleBar from 'simplebar-react'
import { VersionHistory } from './VersionHistory'

// Simple module-level cache to avoid re-fetching preset JSON across mounts
const presetJsonCache: Record<string, any> = {}

// Simple client-side preset parser for display purposes
function parsePreset(data: any) {
  // Basic parsing - just extract common settings for display
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

interface DetailViewProps {
  item: any
  type: 'character' | 'preset' | 'lorebook'
  onBack: () => void
}

export function DetailView({ item, type, onBack }: DetailViewProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [editData, setEditData] = useState(item || {})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    personality: false,
    scenario: false,
    examples: false,
    settings: false,
    entries: true,
    lorebookSettings: false
  })
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [editingPromptId, setEditingPromptId] = useState<string | null>(null)
  const [tempPromptChanges, setTempPromptChanges] = useState<Record<string, any>>({})
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null)

  const [editingFields, setEditingFields] = useState<Record<string, boolean>>({})
  const [fieldHeights, setFieldHeights] = useState<Record<string, number>>({})

  // Social features state
  const [isTogglingPublic, setIsTogglingPublic] = useState(false)
  const [authorName, setAuthorName] = useState('')
  
  const { authArgs } = useAuthState()
  const deleteCharacter = useMutation(api.characters.storage.deleteCharacter)
  const deletePreset = useMutation(api.presets.storage.deletePreset)
  const deleteLorebook = useMutation(api.lorebooks.storage.deleteLorebook)
  
  // Social mutations
  const togglePublicStatus = useMutation(api.imports.social.togglePublicStatus)

  // For presets, fetch data URL and parse settings
  const [presetData, setPresetData] = useState<any>(null)
  const [isLoadingPresetData, setIsLoadingPresetData] = useState(false)

  // Get preset with data URL if it's a preset
  const presetWithUrl = useQuery(
    api.presets.storage.getPresetWithUrl,
    type === 'preset' && item?._id ? { 
      presetId: item._id,
      ...authArgs 
    } : "skip"
  )

  // Seed local state from cache immediately when opening a preset
  useEffect(() => {
    if (type === 'preset' && item?._id && !presetData) {
      const cached = presetJsonCache[item._id]
      if (cached) {
        setPresetData(cached)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, item?._id])

  // Parse preset settings on the client side
  const parsedSettings = useMemo(() => {
    if (type === 'preset' && presetData) {
      const parsed = parsePreset(presetData)
      return parsed?.settings || null
    }
    return null
  }, [type, presetData])

  // Sync editData when item changes
  useEffect(() => {
    if (item) {
      setEditData(item)
      setHasUnsavedChanges(false)
      setEditingFields({})
      setAuthorName(item.authorName || '')
    }
  }, [item])

  // Helper to update editData and track changes
  const updateEditData = (newData: any) => {
    setEditData(newData)
    setHasUnsavedChanges(true)
  }

  // Fetch preset data when URL is available
  useEffect(() => {
    if (type === 'preset' && presetWithUrl?.dataUrl && !presetData && !isLoadingPresetData) {
      setIsLoadingPresetData(true)
      fetch(presetWithUrl.dataUrl)
        .then(response => response.json())
        .then(data => {
          setPresetData(data)
          if (item?._id) {
            presetJsonCache[item._id] = data
          }
          setIsLoadingPresetData(false)
        })
        .catch(error => {
          console.error('Failed to fetch preset data:', error)
          setIsLoadingPresetData(false)
        })
    }
  }, [type, presetWithUrl?.dataUrl, presetData, isLoadingPresetData, item?._id])

  if (!item) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto bg-white/10 rounded-xl flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-white/40" />
          </div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    )
  }

  const isCharacter = type === 'character'
  const isLorebook = type === 'lorebook'
  const isPreset = type === 'preset'
  const lastUsed = item.lastUsed || item.importedAt
  const timeAgo = lastUsed ? getTimeAgo(lastUsed) : 'Never'

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const handleSave = async () => {
    // TODO: Implement save functionality
    console.log('Saving changes:', editData)
    setHasUnsavedChanges(false)
    setEditingFields({})
  }

  const handleCancel = () => {
    setEditData(item || {})
    setHasUnsavedChanges(false)
    setEditingFields({})
  }

  const handleDuplicate = () => {
    // TODO: Implement duplicate functionality
    console.log('Duplicating item:', item.name)
  }

  const handlePromptToggle = (promptIndex: number, currentEnabled: boolean) => {
    if (!presetData?.prompts) return
    
    const updatedPrompts = [...presetData.prompts]
    // If enabled is undefined, treat it as true by default
    const isCurrentlyEnabled = currentEnabled ?? true
    updatedPrompts[promptIndex] = {
      ...updatedPrompts[promptIndex],
      enabled: !isCurrentlyEnabled
    }
    
    setPresetData({
      ...presetData,
      prompts: updatedPrompts
    })
  }

  const handlePromptEdit = (promptIndex: number, field: string, value: any) => {
    if (!presetData?.prompts) return
    
    const updatedPrompts = [...presetData.prompts]
    updatedPrompts[promptIndex] = {
      ...updatedPrompts[promptIndex],
      [field]: value
    }
    
    setPresetData({
      ...presetData,
      prompts: updatedPrompts
    })
  }

  const handleSettingChange = (key: string, value: any) => {
    if (!presetData) return
    
    setPresetData({
      ...presetData,
      [key]: value
    })
  }

  const handleEntryEdit = (entryId: string, field: string, value: any) => {
    if (!editData.entries) return
    
    updateEditData({
      ...editData,
      entries: {
        ...editData.entries,
        [entryId]: {
          ...editData.entries[entryId],
          [field]: value
        }
      }
    })
  }

  const handleEntryKeyEdit = (entryId: string, keyIndex: number, value: string) => {
    if (!editData.entries?.[entryId]?.key) return
    
    const updatedKeys = [...editData.entries[entryId].key]
    updatedKeys[keyIndex] = value
    
    handleEntryEdit(entryId, 'key', updatedKeys)
  }

  const addNewKey = (entryId: string) => {
    if (!editData.entries?.[entryId]) return
    
    const currentKeys = editData.entries[entryId].key || []
    handleEntryEdit(entryId, 'key', [...currentKeys, ''])
  }

  const removeKey = (entryId: string, keyIndex: number) => {
    if (!editData.entries?.[entryId]?.key) return
    
    const updatedKeys = editData.entries[entryId].key.filter((_: any, idx: number) => idx !== keyIndex)
    handleEntryEdit(entryId, 'key', updatedKeys)
  }

  const handleDelete = async () => {
    if (!authArgs || isDeleting) return

    if (!confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      if (type === 'character') {
        await deleteCharacter({
          characterId: item._id,
          ...authArgs
        })
      } else if (type === 'lorebook') {
        await deleteLorebook({
          lorebookId: item._id,
          ...authArgs
        })
      } else {
        await deletePreset({
          presetId: item._id,
          ...authArgs
        })
      }

      // Go back to the main view after successful deletion
      onBack()
    } catch (error) {
      console.error('Failed to delete item:', error)
      alert('Failed to delete item. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleStartChat = () => {
    // TODO: Implement start chat functionality
    console.log('Starting chat with:', item.name)
  }

  const handleViewVersions = () => {
    setShowVersionHistory(true)
  }

  const handleTogglePublic = async () => {
    if (!authArgs || isTogglingPublic) return

    setIsTogglingPublic(true)
    try {
      await togglePublicStatus({
        ...authArgs,
        itemType: type,
        itemId: item._id,
        isPublic: !item.isPublic,
        authorName: authorName || undefined,
      })
    } catch (error) {
      console.error('Failed to toggle public status:', error)
      alert('Failed to update privacy settings. Please try again.')
    } finally {
      setIsTogglingPublic(false)
    }
  }

  const handleShare = async () => {
    if (!item.isPublic) {
      alert('This import must be public to share it.')
      return
    }
    
    const url = `${window.location.origin}/imports/${type}/${item._id}`
    try {
      await navigator.clipboard.writeText(url)
      alert('Link copied to clipboard!')
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      alert('Failed to copy link. Please try again.')
    }
  }

  const renderField = (key: string, label: string, value: any, type: 'text' | 'textarea' = 'text') => {
    // Handle special case for lorebook entry fields
    let currentValue = value || ''
    if (key.startsWith('entry_')) {
      const [, entryId, field] = key.split('_')
      currentValue = editData.entries?.[entryId]?.[field] || value || ''
    } else {
      currentValue = editData[key] || value || ''
    }
    
    const isEditing = editingFields[key] || false

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
      setFieldHeights(prev => ({ ...prev, [key]: Math.ceil(rect.height) }))
      setEditingFields(prev => ({ ...prev, [key]: true }))
    }

    const handleBlur = () => {
      setEditingFields(prev => ({ ...prev, [key]: false }))
    }

    const handleChange = (newValue: string) => {
      // Handle special case for lorebook entry fields
      if (key.startsWith('entry_')) {
        const [, entryId, field] = key.split('_')
        handleEntryEdit(entryId, field, newValue)
      } else {
        updateEditData({ ...editData, [key]: newValue })
      }
    }

    if (isEditing) {
      if (type === 'textarea') {
        return (
          <textarea
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            style={{ height: fieldHeights[key] ?? undefined }}
            className="w-full p-3 bg-white/10 border-2 border-blue-500/50 rounded-lg text-white placeholder-white/40 focus:outline-none resize-none text-sm leading-relaxed"
          />
        )
      } else {
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleChange(e.target.value)}
            onBlur={handleBlur}
            autoFocus
            style={{ height: fieldHeights[key] ?? undefined }}
            className="w-full p-3 bg-white/10 border-2 border-blue-500/50 rounded-lg text-white placeholder-white/40 focus:outline-none text-sm leading-relaxed"
          />
        )
      }
    }

    return (
      <div 
        onClick={(e) => handleClick(e)}
        className={`w-full p-3 rounded-lg cursor-text text-white/80 text-sm leading-relaxed whitespace-pre-wrap hover:bg-white/5 transition-colors border-2 border-transparent ${
          type === 'textarea' ? 'min-h-[96px]' : 'min-h-[52px]'
        }`}
      >
        {currentValue || <span className="text-white/40 italic">Click to edit {label.toLowerCase()}</span>}
      </div>
    )
  }

  const renderSection = (
    key: string, 
    title: string, 
    content: React.ReactNode,
    defaultExpanded: boolean = false
  ) => {
    const isExpanded = expandedSections[key] ?? defaultExpanded

    return (
      <div className="border border-white/10 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(key)}
          className="w-full p-4 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between"
        >
          <h3 className="text-white font-medium">{title}</h3>
          {isExpanded ? (
            <Minus className="w-4 h-4 text-white/60" />
          ) : (
            <Plus className="w-4 h-4 text-white/60" />
          )}
        </button>
        
        {isExpanded && (
          <div className="p-4 bg-white/2 border-t border-white/10">
            {content}
          </div>
        )}
      </div>
    )
  }

  // Show version history view
  if (showVersionHistory && type !== 'lorebook') {
    return (
      <VersionHistory
        itemId={item._id}
        itemName={item.name}
        itemType={type as 'character' | 'preset'}
        onBack={() => setShowVersionHistory(false)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white/70" />
            </button>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isCharacter 
                ? 'bg-purple-500/20 text-purple-300' 
                : isLorebook
                ? 'bg-green-500/20 text-green-300'
                : 'bg-blue-500/20 text-blue-300'
            }`}>
              {isCharacter ? (
                <User className="w-5 h-5" />
              ) : isLorebook ? (
                <BookOpen className="w-5 h-5" />
              ) : (
                <Settings className="w-5 h-5" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">{item.name}</h1>
              <div className="flex items-center gap-3 text-sm text-white/60">
                <span className="capitalize">{type}</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo}
                </div>
                {item.isPublic && (
                  <>
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      {item.likesCount || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {item.usesCount || 0}
                    </div>
                  </>
                )}
                <div className="flex items-center gap-1">
                  {item.isPublic ? (
                    <>
                      <Globe className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Public</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 text-yellow-400" />
                      <span className="text-yellow-400">Private</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges ? (
              <>
                <button
                  onClick={handleCancel}
                  className="px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleDuplicate}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  title="Duplicate"
                >
                  <Copy className="w-4 h-4 text-white/70" />
                </button>
                {isCharacter && (
                  <button
                    onClick={handleStartChat}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Start chat"
                  >
                    <MessageCircle className="w-4 h-4 text-white/70" />
                  </button>
                )}
                {type !== 'lorebook' && (
                  <button
                    onClick={handleViewVersions}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="View versions"
                  >
                    <History className="w-4 h-4 text-white/70" />
                  </button>
                )}
                {/* Privacy Toggle */}
                <button
                  onClick={handleTogglePublic}
                  disabled={isTogglingPublic}
                  className={`p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50 ${
                    item.isPublic ? 'text-green-400' : 'text-yellow-400'
                  }`}
                  title={item.isPublic ? 'Make private' : 'Make public'}
                >
                  {item.isPublic ? <Globe className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </button>
                {/* Share Button */}
                {item.isPublic && (
                  <button
                    onClick={handleShare}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    title="Share"
                  >
                    <Share2 className="w-4 h-4 text-white/70" />
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="p-2 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-400/70 hover:text-red-300" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <SimpleBar className="h-full">
          <div className="p-4 space-y-4">
            {isCharacter ? (
              <>
                {/* Basic Info */}
                {renderSection('basic', 'Basic Information', (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Name</label>
                      {renderField('name', 'Name', item.name)}
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
                      {renderField('description', 'Description', item.description, 'textarea')}
                    </div>
                  </div>
                ), true)}

                {/* Personality */}
                {renderSection('personality', 'Personality', (
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Personality</label>
                    {renderField('personality', 'Personality', item.personality, 'textarea')}
                  </div>
                ))}

                {/* Scenario */}
                {renderSection('scenario', 'Scenario & Setting', (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Scenario</label>
                      {renderField('scenario', 'Scenario', item.scenario, 'textarea')}
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">First Message</label>
                      {renderField('firstMessage', 'First Message', item.firstMessage, 'textarea')}
                    </div>
                  </div>
                ))}

                {/* Examples */}
                {renderSection('examples', 'Example Messages', (
                  <div>
                    <label className="block text-white/80 text-sm font-medium mb-2">Example Dialogues</label>
                    {renderField('exampleDialogues', 'Example Dialogues', item.exampleDialogues, 'textarea')}
                  </div>
                ))}
              </>
            ) : isLorebook ? (
              <>
                {/* Lorebook Basic Info */}
                {renderSection('basic', 'Basic Information', (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Name</label>
                      {renderField('name', 'Name', item.name)}
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Description</label>
                      {renderField('description', 'Description', item.description || `${item.entryCount} entries`, 'textarea')}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Format</label>
                        <div className="text-white/80 text-sm capitalize">{item.format}</div>
                      </div>
                      <div>
                        <label className="block text-white/80 text-sm font-medium mb-2">Total Entries</label>
                        <div className="text-white/80 text-sm">{item.entryCount}</div>
                      </div>
                    </div>
                  </div>
                ), true)}

                {/* Lorebook Entries */}
                {renderSection('entries', 'World Info Entries', (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-white/70">
                        {item.entryCount} total entries
                      </span>
                    </div>
                    
                    {(editData.entries || item.entries) && Object.entries(editData.entries || item.entries)
                      .map(([uid, entry]: [string, any]) => (
                      <div key={uid} className="border border-white/10 rounded-lg overflow-hidden">
                        <div className="p-3 bg-white/5">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2 flex-1">
                              <Key className="w-4 h-4 text-green-300/70" />
                              <div className="flex-1">
                                {renderField(`entry_${uid}_comment`, 'entry name', entry.comment || `Entry ${uid}`, 'text')}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 text-xs">
                                <input
                                  type="checkbox"
                                  checked={entry.constant || false}
                                  onChange={(e) => handleEntryEdit(uid, 'constant', e.target.checked)}
                                  className="rounded"
                                />
                                <span className="text-white/70">Constant</span>
                              </label>
                            </div>
                          </div>
                          
                          {/* Keys Section */}
                          <div className="space-y-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-white/60">Keys:</span>
                              <button
                                onClick={() => addNewKey(uid)}
                                className="text-green-300 hover:text-green-200 text-xs"
                              >
                                + Add Key
                              </button>
                            </div>
                            
                            {entry.key && entry.key.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {entry.key.map((k: string, i: number) => (
                                  <div key={i} className="flex items-center gap-1 bg-green-500/20 rounded px-2 py-0.5">
                                    <input
                                      type="text"
                                      value={k}
                                      onChange={(e) => handleEntryKeyEdit(uid, i, e.target.value)}
                                      className="bg-transparent border-none text-green-300 text-xs w-20 focus:outline-none"
                                    />
                                    <button
                                      onClick={() => removeKey(uid, i)}
                                      className="text-red-400 hover:text-red-300 ml-1"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-white/40 text-xs">Click + Add Key to add trigger words</span>
                            )}
                          </div>
                          
                          {/* Content Section */}
                          <div className="mt-3">
                            <span className="text-white/60 text-xs block mb-1">Content:</span>
                            {renderField(`entry_${uid}_content`, 'content', entry.content || '', 'textarea')}
                          </div>
                          
                          {/* Additional Entry Settings */}
                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div>
                              <label className="block text-white/60 mb-1">Position</label>
                              <div className="inline-flex items-center border border-white/20">
                                {([
                                  { key: 'before_char', label: 'Before Character' },
                                  { key: 'after_char', label: 'After Character' },
                                ] as { key: string; label: string }[]).map((opt, idx, arr) => (
                                  <button
                                    key={opt.key}
                                    onClick={() => handleEntryEdit(uid, 'position', opt.key)}
                                    className={`px-2 py-1 text-xs transition-colors ${idx < arr.length - 1 ? 'border-r border-white/10' : ''} ${
                                      (entry.position || 'before_char') === opt.key
                                        ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm'
                                        : 'text-white/60 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-white/60 mb-1">Priority</label>
                              <input
                                type="number"
                                value={entry.priority || 100}
                                onChange={(e) => handleEntryEdit(uid, 'priority', parseInt(e.target.value))}
                                className="w-full bg-white/10 border border-white/20 rounded px-2 py-1 text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                  </div>
                ))}

                {/* Lorebook Settings */}
                {renderSection('lorebookSettings', 'Lorebook Settings', (
                  <div className="space-y-3">
                    {item.settings && Object.entries(item.settings).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center">
                        <span className="text-white/70 text-sm">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str: string) => str.toUpperCase()).trim()}
                        </span>
                        <span className="text-white text-sm font-mono">
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
                           typeof value === 'number' ? value : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </>
            ) : (
              <>
                {/* Preset Basic Info */}
                {renderSection('basic', 'Basic Information', (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Name</label>
                      {renderField('name', 'Name', item.name)}
                    </div>
                    <div>
                      <label className="block text-white/80 text-sm font-medium mb-2">Preset Type</label>
                      <div className="text-white/80 text-sm capitalize">{item.presetType}</div>
                    </div>
                  </div>
                ), true)}

                {/* Preset Settings */}
                {renderSection('settings', 'Settings', (
                  <div className="space-y-6">
                    {isLoadingPresetData ? (
                      <div className="text-center py-4">
                        <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full mx-auto mb-2" />
                        <p className="text-white/60 text-sm">Loading preset data...</p>
                      </div>
                    ) : presetData ? (
                      <>
                        {/* Basic Settings */}
                        {parsedSettings && Object.keys(parsedSettings).length > 0 && (
                          <div className="space-y-3">
                            <h4 className="text-white font-medium text-sm">Basic Settings</h4>
                            <div className="grid grid-cols-1 gap-3">
                              {Object.entries(parsedSettings).filter(([key]) => key !== 'prompts').map(([key, value]) => {
                                const displayKey = key.replace(/([A-Z])/g, ' $1').trim()
                                  .split(' ')
                                  .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
                                  .join(' ')

                                return (
                                  <div key={key} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                    <span className="text-white/70 text-sm">{displayKey}</span>
                                    <div className="text-white text-sm">
                                      <input
                                        type="number"
                                        step="any"
                                        value={presetData[key] || value || ''}
                                        onChange={(e) => handleSettingChange(key, parseFloat(e.target.value) || e.target.value)}
                                        className="w-20 px-2 py-1 bg-transparent border border-transparent hover:border-white/20 focus:border-blue-500/50 focus:bg-white/10 rounded text-sm text-white text-right"
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Prompts Section */}
                        {presetData.prompts && Array.isArray(presetData.prompts) && presetData.prompts.length > 0 && (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h4 className="text-white font-medium text-sm">
                                Prompts ({presetData.prompts.length})
                              </h4>
                            </div>
                            
                            <div className="space-y-2">
                              {presetData.prompts.map((prompt: any, idx: number) => (
                                <div key={idx} className="border border-white/10 rounded-lg overflow-hidden">
                                  <div className="p-3 bg-white/5">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white text-sm font-medium">
                                          {prompt.name || prompt.identifier || `Prompt ${idx + 1}`}
                                        </span>
                                        {prompt.role && (
                                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded">
                                            {prompt.role}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handlePromptToggle(idx, prompt.enabled ?? true)}
                                          className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                            (prompt.enabled ?? true)
                                              ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30' 
                                              : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                                          }`}
                                        >
                                          {(prompt.enabled ?? true) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                          {(prompt.enabled ?? true) ? 'Enabled' : 'Disabled'}
                                        </button>
                                        
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                      <div>
                                        <label className="block text-xs text-white/60 mb-1">Name</label>
                                        <input
                                          type="text"
                                          value={prompt.name || ''}
                                          onChange={(e) => handlePromptEdit(idx, 'name', e.target.value)}
                                          className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-white/20 focus:border-blue-500/50 focus:bg-white/10 rounded text-sm text-white"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs text-white/60 mb-1">Content</label>
                                        {prompt.marker ? (
                                          <div className="text-yellow-300 text-xs italic">Dynamic content placeholder</div>
                                        ) : (
                                          <textarea
                                            value={prompt.content || ''}
                                            onChange={(e) => handlePromptEdit(idx, 'content', e.target.value)}
                                            rows={3}
                                            placeholder="Click to edit prompt content..."
                                            className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-white/20 focus:border-blue-500/50 focus:bg-white/10 rounded text-sm text-white resize-none"
                                          />
                                        )}
                                      </div>
                                      {prompt.role !== undefined && (
                                        <div>
                                          <label className="block text-xs text-white/60 mb-1">Role</label>
                                          <div className="inline-flex items-center border border-white/20">
                                            {([
                                              { key: '', label: 'No role' },
                                              { key: 'system', label: 'System' },
                                              { key: 'user', label: 'User' },
                                              { key: 'assistant', label: 'Assistant' },
                                            ] as { key: string; label: string }[]).map((opt, jdx, arr) => (
                                              <button
                                                key={opt.key || 'none'}
                                                onClick={() => handlePromptEdit(idx, 'role', opt.key)}
                                                className={`px-2 py-1 text-xs transition-colors ${jdx < arr.length - 1 ? 'border-r border-white/10' : ''} ${
                                                  (prompt.role || '') === opt.key
                                                    ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm'
                                                    : 'text-white/60 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
                                                }`}
                                              >
                                                {opt.label}
                                              </button>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                              
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4">
                        <p className="text-white/60 text-sm">No settings available</p>
                      </div>
                    )}
                  </div>
                ), true)}
              </>
            )}

            {/* Social Settings */}
            <div className="pt-6 border-t border-white/10">
              <h3 className="text-white/80 font-medium mb-3">Sharing & Privacy</h3>
              <div className="space-y-4">
                {/* Privacy Toggle */}
                <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    {item.isPublic ? (
                      <Globe className="w-5 h-5 text-green-400" />
                    ) : (
                      <Lock className="w-5 h-5 text-yellow-400" />
                    )}
                    <div>
                      <h4 className="text-white font-medium">
                        {item.isPublic ? 'Public' : 'Private'}
                      </h4>
                      <p className="text-white/60 text-sm">
                        {item.isPublic 
                          ? 'Anyone can discover and use this import'
                          : 'Only you can see and use this import'
                        }
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleTogglePublic}
                    disabled={isTogglingPublic}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      item.isPublic ? 'bg-green-500' : 'bg-gray-600'
                    } ${isTogglingPublic ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        item.isPublic ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Author Name (only show when making public or already public) */}
                {(item.isPublic || isTogglingPublic) && (
                  <div className="space-y-2">
                    <label className="block text-white/80 text-sm font-medium">
                      Author Name
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Your display name"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500/50"
                    />
                    <p className="text-white/50 text-xs">
                      This name will be shown as the author of this import
                    </p>
                  </div>
                )}

                {/* Social Stats (only show if public) */}
                {item.isPublic && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-red-300 mb-1">
                        <Heart className="w-4 h-4" />
                        <span className="font-semibold">{item.likesCount || 0}</span>
                      </div>
                      <p className="text-white/60 text-xs">Likes</p>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-center gap-2 text-blue-300 mb-1">
                        <Download className="w-4 h-4" />
                        <span className="font-semibold">{item.usesCount || 0}</span>
                      </div>
                      <p className="text-white/60 text-xs">Uses</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="pt-6 border-t border-white/10">
              <h3 className="text-white/80 font-medium mb-3">Metadata</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-white/60">Imported</span>
                  <div className="text-white">
                    {new Date(item.importedAt).toLocaleDateString()}
                  </div>
                </div>
                {item.lastUsed && (
                  <div>
                    <span className="text-white/60">Last Used</span>
                    <div className="text-white">
                      {new Date(item.lastUsed).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SimpleBar>
      </div>
    </div>
  )
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 30) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}