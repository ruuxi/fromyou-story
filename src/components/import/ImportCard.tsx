'use client'

import React, { useState } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { Heart, Download, User, Settings, BookOpen, Clock, Eye, Share2, MoreHorizontal } from 'lucide-react'

interface ImportCardProps {
  item: any // The import item with all fields
  showAuthor?: boolean // Whether to show author info
  onSelect?: (item: any) => void // Callback when item is selected for details
  compact?: boolean // Compact display mode
}

export function ImportCard({ item, showAuthor = true, onSelect, compact = false }: ImportCardProps) {
  const { authArgs } = useAuthState()
  const [isLiking, setIsLiking] = useState(false)
  const [isUsing, setIsUsing] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const toggleLike = useMutation(api.imports.social.toggleLike)
  const recordUsage = useMutation(api.imports.social.recordUsage)

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!authArgs || isLiking) return

    setIsLiking(true)
    try {
      await toggleLike({
        ...authArgs,
        itemType: item.itemType,
        itemId: item._id,
      })
    } catch (error) {
      console.error('Failed to toggle like:', error)
    } finally {
      setIsLiking(false)
    }
  }

  const handleUse = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!authArgs || isUsing) return

    setIsUsing(true)
    try {
      await recordUsage({
        ...authArgs,
        itemType: item.itemType,
        itemId: item._id,
      })
      // TODO: Actually apply the import to the current chat
      // This would integrate with the existing chat system
    } catch (error) {
      console.error('Failed to record usage:', error)
    } finally {
      setIsUsing(false)
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    // Copy item link to clipboard
    const url = `${window.location.origin}/imports/${item.itemType}/${item._id}`
    try {
      await navigator.clipboard.writeText(url)
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const getItemIcon = () => {
    switch (item.itemType) {
      case 'preset':
        return <Settings className="w-4 h-4" />
      case 'character':
        return <User className="w-4 h-4" />
      case 'lorebook':
        return <BookOpen className="w-4 h-4" />
      default:
        return <Settings className="w-4 h-4" />
    }
  }

  const getItemTypeColor = () => {
    switch (item.itemType) {
      case 'preset':
        return 'text-blue-300 bg-blue-500/20'
      case 'character':
        return 'text-purple-300 bg-purple-500/20'
      case 'lorebook':
        return 'text-green-300 bg-green-500/20'
      default:
        return 'text-gray-300 bg-gray-500/20'
    }
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.slice(0, maxLength) + '...'
  }

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`
    }
    return num.toString()
  }

  return (
    <div 
      className={`relative group bg-gradient-to-br from-white/5 to-white/2 border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all duration-200 ${
        onSelect ? 'cursor-pointer hover:bg-white/5' : ''
      } ${compact ? 'p-3' : 'p-4'}`}
      onClick={() => onSelect?.(item)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Item Type Icon */}
          <div className={`p-2 rounded-lg ${getItemTypeColor()}`}>
            {getItemIcon()}
          </div>
          
          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">
              {item.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full ${getItemTypeColor()}`}>
                {item.itemType}
              </span>
              {item.version && (
                <span className="text-xs text-white/50">
                  v{item.version || item.versionNumber}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Menu Button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(!showMenu)
          }}
          className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreHorizontal className="w-4 h-4 text-white/60" />
        </button>

        {/* Menu Dropdown */}
        {showMenu && (
          <div className="absolute top-8 right-4 bg-zinc-800 border border-white/20 rounded-lg shadow-xl z-10 py-1 min-w-[120px]">
            <button
              onClick={handleShare}
              className="w-full px-3 py-2 text-left text-white/80 hover:bg-white/10 flex items-center gap-2 text-sm"
            >
              <Share2 className="w-3 h-3" />
              Share
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.(item)
              }}
              className="w-full px-3 py-2 text-left text-white/80 hover:bg-white/10 flex items-center gap-2 text-sm"
            >
              <Eye className="w-3 h-3" />
              View Details
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      {item.description && !compact && (
        <p className="text-white/70 text-sm mb-3 line-clamp-2">
          {truncateText(item.description, 120)}
        </p>
      )}

      {/* Author Info */}
      {showAuthor && item.authorName && (
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-medium">
              {item.authorName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="text-white/60 text-sm">
            by {item.authorName}
          </span>
          <div className="flex items-center gap-1 text-white/50 text-xs">
            <Clock className="w-3 h-3" />
            {item.timeAgo}
          </div>
        </div>
      )}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && !compact && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map((tag: string, index: number) => (
            <span
              key={index}
              className="text-xs px-2 py-0.5 bg-white/10 text-white/70 rounded"
            >
              {tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="text-xs text-white/50">
              +{item.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Stats and Actions */}
      <div className="flex items-center justify-between">
        {/* Stats */}
        <div className="flex items-center gap-4 text-white/60 text-sm">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{formatNumber(item.likesCount || 0)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="w-4 h-4" />
            <span>{formatNumber(item.usesCount || 0)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Like Button */}
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              item.userLiked
                ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
            } ${isLiking ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Heart className={`w-3 h-3 ${item.userLiked ? 'fill-current' : ''}`} />
            {item.userLiked ? 'Liked' : 'Like'}
          </button>

          {/* Use Button */}
          <button
            onClick={handleUse}
            disabled={isUsing}
            className={`flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition-all ${
              isUsing ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Download className="w-3 h-3" />
            {isUsing ? 'Using...' : 'Use'}
          </button>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={(e) => {
            e.stopPropagation()
            setShowMenu(false)
          }}
        />
      )}
    </div>
  )
}