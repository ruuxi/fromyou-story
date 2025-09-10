'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { 
  User, 
  MessageCircle, 
  ArrowLeft, 
  Calendar,
  Tag,
  Book,
  Sparkles,
  Settings,
  Play,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react'
import { Id } from '../../../convex/_generated/dataModel'

interface Character {
  _id: Id<'importedCharacters'>
  name: string
  description: string
  personality: string
  scenario: string
  firstMessage: string
  messageExample: string
  creatorNotes?: string
  systemPrompt?: string
  postHistoryInstructions?: string
  alternateGreetings?: string[]
  tags?: string[]
  creator?: string
  characterVersion?: string
  avatar?: string
  spec: string
  specVersion: string
  characterBook?: any
  extensions?: any
  originalData: any
  importedAt: number
  lastUsed?: number
}

interface CharacterPreviewProps {
  character: Character
  onClose: () => void
  onStartChat: (characterId: string, greeting?: number) => void
}

export function CharacterPreview({ character, onClose, onStartChat }: CharacterPreviewProps) {
  const { authArgs } = useAuthState()
  const [selectedGreeting, setSelectedGreeting] = useState(0)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']))
  const [showRawData, setShowRawData] = useState(false)

  const updateCharacterUsage = useMutation(api.characters.storage.updateCharacterUsage)

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const handleStartChat = async () => {
    if (!authArgs) return
    
    try {
      await updateCharacterUsage({
        characterId: character._id,
        ...authArgs,
      })
      onStartChat(character._id, selectedGreeting)
    } catch (error) {
      console.error('Failed to update character usage:', error)
      // Still proceed with chat creation
      onStartChat(character._id, selectedGreeting)
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getSpecBadgeColor = (spec: string) => {
    switch (spec) {
      case 'chara_card_v3':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'chara_card_v2':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'chara_card_v1':
        return 'bg-green-500/20 text-green-300 border-green-500/30'
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const availableGreetings = [
    { index: 0, content: character.firstMessage, isDefault: true },
    ...(character.alternateGreetings || []).map((greeting, index) => ({
      index: index + 1,
      content: greeting,
      isDefault: false
    }))
  ]

  const renderSection = (title: string, key: string, content: React.ReactNode, hasContent: boolean = true) => {
    if (!hasContent) return null

    const isExpanded = expandedSections.has(key)
    
    return (
      <div className="border border-white/10 rounded-lg">
        <button
          onClick={() => toggleSection(key)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/5 transition-colors rounded-lg"
        >
          <span className="font-medium text-white">{title}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-white/60" />
          ) : (
            <ChevronDown className="w-4 h-4 text-white/60" />
          )}
        </button>
        
        {isExpanded && (
          <div className="px-4 pb-4">
            {content}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10">
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white/70" />
        </button>
        
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-white truncate">
            {character.name}
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <span className={`px-2 py-0.5 rounded border text-xs font-mono ${getSpecBadgeColor(character.spec)}`}>
              {character.spec.replace('chara_card_', 'v')}
            </span>
            {character.creator && (
              <span className="text-xs text-white/60">
                by {character.creator}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowRawData(!showRawData)}
          className="p-2 rounded hover:bg-white/10 transition-colors"
          title="Toggle raw data view"
        >
          {showRawData ? (
            <EyeOff className="w-4 h-4 text-white/60" />
          ) : (
            <Eye className="w-4 h-4 text-white/60" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showRawData ? (
          // Raw Data View
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-white/70">
                <FileText className="w-4 h-4" />
                <span>Raw Character Data</span>
              </div>
              <pre className="text-xs bg-black/40 p-4 rounded-lg overflow-auto text-white/80 font-mono">
                {JSON.stringify(character.originalData, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          // Normal Preview
          <div className="p-4 space-y-4">
            {/* Character Avatar and Basic Info */}
            <div className="text-center space-y-3">
              {character.avatar ? (
                <img
                  src={character.avatar}
                  alt={character.name}
                  className="w-24 h-24 rounded-xl object-cover mx-auto bg-white/10"
                />
              ) : (
                <div className="w-24 h-24 mx-auto rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                  <User className="w-12 h-12 text-white/70" />
                </div>
              )}
              
              <div className="space-y-1">
                <h3 className="text-xl font-semibold text-white">{character.name}</h3>
                {character.characterVersion && (
                  <p className="text-sm text-white/60">Version {character.characterVersion}</p>
                )}
              </div>
            </div>

            {/* Tags */}
            {character.tags && character.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {character.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 text-xs bg-white/10 text-white/70 rounded-full flex items-center gap-1"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Metadata */}
            <div className="flex items-center justify-center gap-4 text-xs text-white/60">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>Imported {formatDate(character.importedAt)}</span>
              </div>
              {character.lastUsed && (
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-blue-400" />
                  <span className="text-blue-400">Last used {formatDate(character.lastUsed)}</span>
                </div>
              )}
            </div>

            {/* Character Sections */}
            <div className="space-y-3">
              {/* Basic Information */}
              {renderSection(
                'Basic Information',
                'basic',
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-white/70 font-medium">Description:</span>
                    <p className="text-white mt-1">{character.description}</p>
                  </div>
                  <div>
                    <span className="text-white/70 font-medium">Personality:</span>
                    <p className="text-white mt-1">{character.personality}</p>
                  </div>
                  <div>
                    <span className="text-white/70 font-medium">Scenario:</span>
                    <p className="text-white mt-1">{character.scenario}</p>
                  </div>
                </div>
              )}

              {/* Greetings */}
              {renderSection(
                `Greetings (${availableGreetings.length})`,
                'greetings',
                <div className="space-y-3">
                  {availableGreetings.map((greeting) => (
                    <div
                      key={greeting.index}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedGreeting === greeting.index
                          ? 'bg-blue-500/20 border-blue-400/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                      onClick={() => setSelectedGreeting(greeting.index)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white/70">
                          {greeting.isDefault ? 'Default Greeting' : `Alternate ${greeting.index}`}
                        </span>
                        {selectedGreeting === greeting.index && (
                          <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-white">{greeting.content}</p>
                    </div>
                  ))}
                </div>,
                availableGreetings.length > 0
              )}

              {/* Message Example */}
              {renderSection(
                'Message Example',
                'example',
                <div className="text-sm">
                  <p className="text-white bg-white/5 p-3 rounded-lg font-mono">
                    {character.messageExample}
                  </p>
                </div>,
                !!character.messageExample
              )}

              {/* Advanced Settings */}
              {renderSection(
                'Advanced Settings',
                'advanced',
                <div className="space-y-3 text-sm">
                  {character.systemPrompt && (
                    <div>
                      <span className="text-white/70 font-medium">System Prompt:</span>
                      <p className="text-white mt-1 bg-white/5 p-3 rounded-lg font-mono">
                        {character.systemPrompt}
                      </p>
                    </div>
                  )}
                  {character.postHistoryInstructions && (
                    <div>
                      <span className="text-white/70 font-medium">Post-History Instructions:</span>
                      <p className="text-white mt-1 bg-white/5 p-3 rounded-lg font-mono">
                        {character.postHistoryInstructions}
                      </p>
                    </div>
                  )}
                </div>,
                !!(character.systemPrompt || character.postHistoryInstructions)
              )}

              {/* Character Book */}
              {renderSection(
                `Character Book (${character.characterBook?.entries?.length || 0} entries)`,
                'book',
                <div className="space-y-2">
                  {character.characterBook?.entries?.map((entry: any, index: number) => (
                    <div key={index} className="p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-white/70">
                          {entry.name || `Entry ${index + 1}`}
                        </span>
                        <div className="flex items-center gap-2">
                          {entry.enabled !== false && (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                              Enabled
                            </span>
                          )}
                          <span className="text-xs text-white/50">
                            Order: {entry.insertion_order || 0}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-white/60 mb-2">
                        Keys: {entry.keys?.join(', ') || 'None'}
                      </p>
                      <p className="text-sm text-white">{entry.content}</p>
                    </div>
                  ))}
                </div>,
                !!(character.characterBook?.entries?.length)
              )}

              {/* Creator Notes */}
              {renderSection(
                'Creator Notes',
                'notes',
                <div className="text-sm">
                  <p className="text-white bg-white/5 p-3 rounded-lg">
                    {character.creatorNotes}
                  </p>
                </div>,
                !!character.creatorNotes
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer - Start Chat Button */}
      {!showRawData && (
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleStartChat}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Chat with {character.name}
          </button>
          
          {selectedGreeting > 0 && (
            <p className="text-xs text-white/60 text-center mt-2">
              Using alternate greeting #{selectedGreeting}
            </p>
          )}
        </div>
      )}
    </div>
  )
}