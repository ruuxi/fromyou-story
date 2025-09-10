'use client'

import { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { 
  User, 
  Settings, 
  Clock,
  Trash2,
  MessageCircle,
  BookOpen,
  Globe,
  Lock,
  MoreHorizontal,
  X
} from 'lucide-react'

interface ItemCardProps {
  item: any
  viewMode: 'grid' | 'list'
  onSelect: (item: any) => void
  onDelete?: (item: any) => void
  isActive?: boolean
  onToggleActive?: (item: any) => void
  onStartChat?: (params: { characterId?: string }) => void
}

export function ItemCard({ item, viewMode, onSelect, onDelete, isActive = false, onToggleActive, onStartChat }: ItemCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const { authArgs, displayName } = useAuthState()
  
  const deleteCharacter = useMutation(api.characters.storage.deleteCharacter)
  const deletePreset = useMutation(api.presets.storage.deletePreset)
  const deleteLorebook = useMutation(api.lorebooks.storage.deleteLorebook)
  const togglePublicStatus = useMutation(api.imports.social.togglePublicStatus)
  
  const isCharacter = item.type === 'character'
  const isLorebook = item.type === 'lorebook'
  const isPreset = item.type === 'preset'
  const lastUsed = item.lastUsed || item.importedAt
  const timeAgo = lastUsed ? getTimeAgo(lastUsed) : 'Never'

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on dropdown or action buttons
    if ((e.target as HTMLElement).closest('.dropdown-trigger') || 
        (e.target as HTMLElement).closest('.action-button')) {
      return
    }
    // Toggle active state when clicking on the card
    onToggleActive?.(item)
  }

  const handleAction = async (action: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    switch (action) {
      case 'view':
        // Open detail view
        onSelect(item)
        break
      case 'edit':
        // Handle edit action
        console.log('Edit', item.name)
        break
      case 'duplicate':
        // Handle duplicate action
        console.log('Duplicate', item.name)
        break
      case 'versions':
        // Handle versions action
        console.log('View versions', item.name)
        break
      case 'chat':
        // Start chat using this character (plus any active preset/lorebooks upstream)
        onStartChat?.({ characterId: isCharacter ? item._id : undefined })
        break
      case 'share':
        await handleToggleSharing()
        break
      case 'delete':
        if (showDeleteConfirm) {
          await handleDelete()
        } else {
          setShowDeleteConfirm(true)
        }
        break
      case 'cancel-delete':
        setShowDeleteConfirm(false)
        break
    }
  }

  const handleToggleSharing = async () => {
    if (!authArgs) return
    
    try {
      const newPublicStatus = !item.isPublic
      await togglePublicStatus({
        ...authArgs,
        itemType: item.type,
        itemId: item._id,
        isPublic: newPublicStatus,
        authorName: displayName || undefined
      })
    } catch (error) {
      console.error('Failed to toggle sharing status:', error)
      alert('Failed to update sharing status. Please try again.')
    }
  }

  const handleDelete = async () => {
    if (!authArgs || isDeleting) return

    setIsDeleting(true)
    setShowDeleteConfirm(false)
    
    try {
      if (isCharacter) {
        await deleteCharacter({
          characterId: item._id,
          ...authArgs
        })
      } else if (isLorebook) {
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

      // Call the onDelete callback if provided
      onDelete?.(item)
    } catch (error) {
      console.error('Failed to delete item:', error)
      // You could show a toast notification here instead of alert
    } finally {
      setIsDeleting(false)
    }
  }

  if (viewMode === 'list') {
    return (
      <div 
        onClick={handleCardClick}
        className={`group relative p-3 pl-2 pt-2 hover:bg-white/5 transition-all duration-200 cursor-pointer overflow-hidden ${
          isActive 
            ? isCharacter
              ? 'border-2 border-purple-400/60 bg-purple-500/5' 
              : isLorebook
              ? 'border-2 border-green-400/60 bg-green-500/5'
              : 'border-2 border-blue-400/60 bg-blue-500/5'
            : 'border border-white/10 hover:border-white/20'
        }`}
      >
        <div
          className={`pointer-events-none absolute top-0 left-0 rounded-br-2xl transition-all duration-200 ${
            isActive 
              ? isCharacter
                ? 'w-32 h-32 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.5)_0%,rgba(168,85,247,0.15)_40%,transparent_80%)]'
                : isLorebook
                ? 'w-32 h-32 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.5)_0%,rgba(34,197,94,0.15)_40%,transparent_80%)]'
                : 'w-32 h-32 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.5)_0%,rgba(59,130,246,0.15)_40%,transparent_80%)]'
              : isCharacter
              ? 'w-24 h-24 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.35)_0%,rgba(168,85,247,0.08)_30%,transparent_70%)]'
              : isLorebook
              ? 'w-24 h-24 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.35)_0%,rgba(34,197,94,0.08)_30%,transparent_70%)]'
              : 'w-24 h-24 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.35)_0%,rgba(59,130,246,0.08)_30%,transparent_70%)]'
          }`}
        />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 flex items-center justify-center text-white/80">
              {isCharacter ? (
                <User className="w-5 h-5" />
              ) : isLorebook ? (
                <BookOpen className="w-5 h-5" />
              ) : (
                <Settings className="w-5 h-5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-medium truncate">{item.name}</h3>
              </div>
              <div className="flex items-center gap-4 text-xs text-white/60">
                <span className="capitalize">{item.type}</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {timeAgo}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isCharacter && (
              <button
                onClick={(e) => handleAction('chat', e)}
                className="action-button flex items-center gap-1.5 px-3 py-1.5 text-sm border border-blue-400/30 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-blue-100 transition-colors"
                title="Start chat"
                aria-label="Start chat"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Chat
              </button>
            )}
            <button
              onClick={(e) => handleAction('share', e)}
              className={`action-button flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors ${
                item.isPublic 
                  ? 'border-green-400/30 bg-green-500/20 hover:bg-green-500/30 text-green-200 hover:text-green-100' 
                  : 'border-gray-400/30 bg-gray-500/20 hover:bg-gray-500/30 text-gray-200 hover:text-gray-100'
              }`}
              title={item.isPublic ? 'Make Private' : 'Make Public'}
              aria-label={item.isPublic ? 'Make Private' : 'Make Public'}
            >
              {item.isPublic ? (
                <>
                  <Globe className="w-3.5 h-3.5" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  Private
                </>
              )}
            </button>
            {showDeleteConfirm ? (
              <div className="flex items-center gap-1 ml-2">
                <button
                  onClick={(e) => handleAction('delete', e)}
                  disabled={isDeleting}
                  className="action-button flex items-center gap-1.5 px-2 py-1 text-xs border border-red-400/30 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Confirm deletion"
                  aria-label="Confirm deletion"
                >
                  <Trash2 className="w-3 h-3" />
                  Confirm
                </button>
                <button
                  onClick={(e) => handleAction('cancel-delete', e)}
                  className="action-button p-1 hover:bg-gray-500/10 text-gray-400 hover:text-gray-300 transition-colors"
                  title="Cancel deletion"
                  aria-label="Cancel deletion"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => handleAction('delete', e)}
                disabled={isDeleting}
                className={`action-button p-1.5 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed ml-2`}
                title={isDeleting ? 'Deleting…' : 'Delete'}
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4 text-red-300" />
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div 
      onClick={handleCardClick}
      className={`group relative p-3 pt-2 hover:bg-white/5 transition-all duration-200 cursor-pointer overflow-hidden ${
        isActive 
          ? isCharacter
            ? 'border-2 border-purple-400/60 bg-purple-500/5' 
            : isLorebook
            ? 'border-2 border-green-400/60 bg-green-500/5'
            : 'border-2 border-blue-400/60 bg-blue-500/5'
          : 'border border-white/10 hover:border-white/20'
      }`}
    >
      <div
        className={`pointer-events-none absolute top-0 left-0 rounded-br-2xl transition-all duration-200 ${
          isActive 
            ? isCharacter
              ? 'w-32 h-32 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.5)_0%,rgba(168,85,247,0.15)_40%,transparent_80%)]'
              : isLorebook
              ? 'w-32 h-32 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.5)_0%,rgba(34,197,94,0.15)_40%,transparent_80%)]'
              : 'w-32 h-32 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.5)_0%,rgba(59,130,246,0.15)_40%,transparent_80%)]'
            : isCharacter
            ? 'w-24 h-24 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.35)_0%,rgba(168,85,247,0.08)_30%,transparent_70%)]'
            : isLorebook
            ? 'w-24 h-24 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.35)_0%,rgba(34,197,94,0.08)_30%,transparent_70%)]'
            : 'w-24 h-24 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.35)_0%,rgba(59,130,246,0.08)_30%,transparent_70%)]'
        }`}
      />
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 flex items-center justify-center text-white/80">
          {isCharacter ? (
            <User className="w-6 h-6" />
          ) : isLorebook ? (
            <BookOpen className="w-6 h-6" />
          ) : (
            <Settings className="w-6 h-6" />
          )}
        </div>
        <button
          onClick={(e) => handleAction('view', e)}
          className="px-2 py-1 hover:bg-white/10 text-xs text-white/70 rounded"
          title="View details"
          aria-label="View details"
        >
          View
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-medium text-sm leading-tight truncate">{item.name}</h3>
        </div>
        
        {item.description && (
          <p className="text-white/60 text-xs line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-white/50">
          <span className="capitalize">{item.type}</span>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo}
          </div>
        </div>
      </div>

      {/* Compact actions bar */}
      <div className="mt-3 flex items-center gap-2">
        {isCharacter && (
          <button
            onClick={(e) => handleAction('chat', e)}
            className="action-button flex items-center gap-1.5 px-3 py-1.5 text-sm border border-blue-400/30 bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 hover:text-blue-100 transition-colors"
            title="Start chat"
            aria-label="Start chat"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            Chat
          </button>
        )}
        <button
          onClick={(e) => handleAction('share', e)}
          className={`action-button flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors ${
            item.isPublic 
              ? 'border-green-400/30 bg-green-500/20 hover:bg-green-500/30 text-green-200 hover:text-green-100' 
              : 'border-gray-400/30 bg-gray-500/20 hover:bg-gray-500/30 text-gray-200 hover:text-gray-100'
          }`}
          title={item.isPublic ? 'Make Private' : 'Make Public'}
          aria-label={item.isPublic ? 'Make Private' : 'Make Public'}
        >
          {item.isPublic ? (
            <>
              <Globe className="w-3.5 h-3.5" />
              Public
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              Private
            </>
          )}
        </button>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={(e) => handleAction('delete', e)}
              disabled={isDeleting}
              className="action-button flex items-center gap-1.5 px-2 py-1 text-xs border border-red-400/30 bg-red-500/20 hover:bg-red-500/30 text-red-200 hover:text-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Confirm deletion"
              aria-label="Confirm deletion"
            >
              <Trash2 className="w-3 h-3" />
              Confirm
            </button>
            <button
              onClick={(e) => handleAction('cancel-delete', e)}
              className="action-button p-1 hover:bg-gray-500/10 text-gray-400 hover:text-gray-300 transition-colors"
              title="Cancel deletion"
              aria-label="Cancel deletion"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => handleAction('delete', e)}
            disabled={isDeleting}
            className={`action-button p-1.5 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed ml-auto`}
            title={isDeleting ? 'Deleting…' : 'Delete'}
            aria-label="Delete"
          >
            <Trash2 className="w-4 h-4 text-red-300" />
          </button>
        )}
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