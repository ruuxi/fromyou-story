'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { 
  User, 
  MessageCircle, 
  Calendar, 
  MoreVertical, 
  Trash2, 
  Edit3, 
  Eye,
  Tag,
  Sparkles
} from 'lucide-react'
import { Id } from '../../../convex/_generated/dataModel'

interface Character {
  _id: Id<'importedCharacters'>
  name: string
  description: string
  personality: string
  creator?: string
  tags?: string[]
  avatar?: string
  spec: string
  importedAt: number
  lastUsed?: number
}

interface CharacterListProps {
  characters: Character[]
  onCharacterSelect: (characterId: string) => void
  selectedCharacterId: string | null
}

export function CharacterList({ characters, onCharacterSelect, selectedCharacterId }: CharacterListProps) {
  const { authArgs } = useAuthState()
  const [showActions, setShowActions] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'created'>('recent')

  const deleteCharacter = useMutation(api.characters.storage.deleteCharacter)

  // Filter and sort characters
  const filteredCharacters = characters
    .filter(char => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return (
        char.name.toLowerCase().includes(search) ||
        char.description.toLowerCase().includes(search) ||
        char.creator?.toLowerCase().includes(search) ||
        char.tags?.some(tag => tag.toLowerCase().includes(search))
      )
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created':
          return b.importedAt - a.importedAt
        case 'recent':
        default:
          return (b.lastUsed || b.importedAt) - (a.lastUsed || a.importedAt)
      }
    })

  const handleDeleteCharacter = async (characterId: string) => {
    if (!authArgs) return
    
    try {
      await deleteCharacter({
        characterId: characterId as Id<'importedCharacters'>,
        ...authArgs,
      })
      setShowActions(null)
    } catch (error) {
      console.error('Failed to delete character:', error)
    }
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

  if (characters.length === 0) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center">
          <User className="w-8 h-8 text-white/40" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-white">No Characters Imported</h3>
          <p className="text-white/60 text-sm">
            Upload your first SillyTavern character card to get started
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search and Sort */}
      <div className="p-4 border-b border-white/10 space-y-3">
        <input
          type="text"
          placeholder="Search characters..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:bg-white/10 transition-colors"
        />
        
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/60">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-400"
          >
            <option value="recent">Recently Used</option>
            <option value="name">Name</option>
            <option value="created">Date Imported</option>
          </select>
        </div>
      </div>

      {/* Character List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-2">
          {filteredCharacters.map((character) => (
            <div
              key={character._id}
              className={`relative group p-3 rounded-lg border cursor-pointer transition-all ${
                selectedCharacterId === character._id
                  ? 'bg-blue-500/20 border-blue-400/50'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
              onClick={() => onCharacterSelect(character._id)}
            >
              {/* Character Header */}
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {character.avatar ? (
                    <img
                      src={character.avatar}
                      alt={character.name}
                      className="w-10 h-10 rounded-lg object-cover bg-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-white/70" />
                    </div>
                  )}
                </div>

                {/* Character Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-white truncate">
                        {character.name}
                      </h3>
                      <p className="text-xs text-white/60 line-clamp-2 mt-1">
                        {character.description}
                      </p>
                    </div>

                    {/* Actions Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowActions(showActions === character._id ? null : character._id)
                        }}
                        className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <MoreVertical className="w-4 h-4 text-white/60" />
                      </button>

                      {showActions === character._id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-black/90 border border-white/20 rounded-lg shadow-xl z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onCharacterSelect(character._id)
                              setShowActions(null)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-white hover:bg-white/10 rounded-t-lg flex items-center gap-2"
                          >
                            <Eye className="w-3 h-3" />
                            View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteCharacter(character._id)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10 rounded-b-lg flex items-center gap-2"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Character Metadata */}
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    {/* Spec Version */}
                    <span className={`px-1.5 py-0.5 rounded border text-xs font-mono ${getSpecBadgeColor(character.spec)}`}>
                      {character.spec.replace('chara_card_', 'v')}
                    </span>

                    {/* Creator */}
                    {character.creator && (
                      <span className="text-white/50">
                        by {character.creator}
                      </span>
                    )}
                  </div>

                  {/* Tags */}
                  {character.tags && character.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      <Tag className="w-3 h-3 text-white/40" />
                      {character.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={index}
                          className="px-1.5 py-0.5 text-xs bg-white/5 text-white/60 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {character.tags.length > 3 && (
                        <span className="text-xs text-white/40">
                          +{character.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Last Used */}
                  <div className="flex items-center justify-between mt-2 text-xs text-white/40">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {character.lastUsed ? 
                          `Used ${formatDate(character.lastUsed)}` : 
                          `Imported ${formatDate(character.importedAt)}`
                        }
                      </span>
                    </div>
                    
                    {character.lastUsed && (
                      <div className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-blue-400" />
                        <span className="text-blue-400">Active</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results Info */}
      {searchTerm && (
        <div className="p-3 border-t border-white/10 text-center">
          <span className="text-xs text-white/60">
            {filteredCharacters.length} of {characters.length} characters
          </span>
        </div>
      )}
    </div>
  )
}