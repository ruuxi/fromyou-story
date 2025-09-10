'use client'

import React, { useState, useEffect, useRef } from 'react'
import { usePaginatedQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { ImportCard } from './ImportCard'
import { Search, Filter, TrendingUp, Clock, Heart, Users, ArrowRight } from 'lucide-react'
import SimpleBar from 'simplebar-react'

type SortOption = 'newest' | 'oldest' | 'most_liked' | 'most_used'
type ItemTypeFilter = 'all' | 'preset' | 'character' | 'lorebook'

export function PublicImportFeed() {
  const { authArgs } = useAuthState()
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [itemType, setItemType] = useState<ItemTypeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearchQuery, setActiveSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Use separate paginated queries for each type
  const presetsQuery = usePaginatedQuery(
    api.imports.discovery.getPublicPresets,
    itemType === 'all' || itemType === 'preset' ? {
      sortBy,
      searchQuery: activeSearchQuery || undefined,
      ...(authArgs || {}),
    } : 'skip',
    { initialNumItems: 20 }
  )

  const charactersQuery = usePaginatedQuery(
    api.imports.discovery.getPublicCharacters,
    itemType === 'all' || itemType === 'character' ? {
      sortBy,
      searchQuery: activeSearchQuery || undefined,
      ...(authArgs || {}),
    } : 'skip',
    { initialNumItems: 20 }
  )

  const lorebooksQuery = usePaginatedQuery(
    api.imports.discovery.getPublicLorebooks,
    itemType === 'all' || itemType === 'lorebook' ? {
      sortBy,
      searchQuery: activeSearchQuery || undefined,
      ...(authArgs || {}),
    } : 'skip',
    { initialNumItems: 20 }
  )

  // Combine results based on filter
  const feedItems = React.useMemo(() => {
    if (itemType === 'preset') return presetsQuery.results || []
    if (itemType === 'character') return charactersQuery.results || []
    if (itemType === 'lorebook') return lorebooksQuery.results || []
    
    // For 'all', combine all results and sort them
    const allItems = [
      ...(presetsQuery.results || []),
      ...(charactersQuery.results || []),
      ...(lorebooksQuery.results || [])
    ]
    
    // Sort combined results
    return allItems.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return (b.publishedAt || b.importedAt) - (a.publishedAt || a.importedAt)
        case 'oldest':
          return (a.publishedAt || a.importedAt) - (b.publishedAt || b.importedAt)
        case 'most_liked':
          return (b.likesCount || 0) - (a.likesCount || 0)
        case 'most_used':
          return (b.usesCount || 0) - (a.usesCount || 0)
        default:
          return 0
      }
    })
  }, [presetsQuery.results, charactersQuery.results, lorebooksQuery.results, itemType, sortBy])

  // Get status and loadMore from the active query
  const getActiveQuery = () => {
    if (itemType === 'preset') return presetsQuery
    if (itemType === 'character') return charactersQuery
    if (itemType === 'lorebook') return lorebooksQuery
    return presetsQuery // default for 'all'
  }

  const { status, loadMore } = getActiveQuery()

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
  }

  // Handle search execution
  const handleSearch = () => {
    setActiveSearchQuery(searchQuery.trim())
  }

  // Handle Enter key in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  // Intersection observer for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === 'CanLoadMore') {
          loadMore(10)
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [loadMore, status])

  const getSortIcon = (sort: SortOption) => {
    switch (sort) {
      case 'newest':
      case 'oldest':
        return <Clock className="w-4 h-4" />
      case 'most_liked':
        return <Heart className="w-4 h-4" />
      case 'most_used':
        return <Users className="w-4 h-4" />
      default:
        return <TrendingUp className="w-4 h-4" />
    }
  }

  const getSortLabel = (sort: SortOption) => {
    switch (sort) {
      case 'newest':
        return 'Newest'
      case 'oldest':
        return 'Oldest'
      case 'most_liked':
        return 'Most Liked'
      case 'most_used':
        return 'Most Used'
      default:
        return 'Trending'
    }
  }

  const getTypeLabel = (type: ItemTypeFilter) => {
    switch (type) {
      case 'all':
        return 'All Types'
      case 'preset':
        return 'Presets'
      case 'character':
        return 'Characters'
      case 'lorebook':
        return 'Lorebooks'
      default:
        return 'All'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search and Filters */}
      <div className="p-4 border-b border-white/10 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
          <input
            type="text"
            placeholder="Search imports..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="w-full pl-10 pr-12 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-500/50 text-sm"
          />
          <button
            onClick={handleSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Search"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded text-white/80 text-sm transition-colors"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          
          <div className="text-xs text-white/50">
            {feedItems?.length || 0} items
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="space-y-3 pt-2 border-t border-white/10">
            {/* Sort Options */}
            <div>
              <label className="block text-xs text-white/70 mb-2">Sort by</label>
              <div className="grid grid-cols-2 gap-2">
                {(['newest', 'most_liked', 'most_used', 'oldest'] as SortOption[]).map((sort) => (
                  <button
                    key={sort}
                    onClick={() => setSortBy(sort)}
                    className={`flex items-center gap-2 px-3 py-2 text-xs rounded transition-colors ${
                      sortBy === sort
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {getSortIcon(sort)}
                    {getSortLabel(sort)}
                  </button>
                ))}
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-xs text-white/70 mb-2">Content type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['all', 'preset', 'character', 'lorebook'] as ItemTypeFilter[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => setItemType(type)}
                    className={`px-3 py-2 text-xs rounded transition-colors ${
                      itemType === type
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/10'
                    }`}
                  >
                    {getTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feed Content */}
      <div className="flex-1">
        <SimpleBar className="h-full">
          <div className="p-4 space-y-4">
            {/* Loading State */}
            {status === 'LoadingFirstPage' && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full" />
              </div>
            )}

            {/* Loading First Page */}
            {status === 'LoadingFirstPage' && (
              <div className="space-y-4 p-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-32 bg-white/5 border border-white/10 animate-pulse"></div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {status !== 'LoadingFirstPage' && feedItems?.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-8 h-8 text-white/30" />
                </div>
                <h3 className="text-white/70 font-medium mb-2">No imports found</h3>
                <p className="text-white/50 text-sm">
                  {activeSearchQuery ? 'Try adjusting your search' : 'Be the first to share your imports!'}
                </p>
              </div>
            )}

            {/* Feed Items */}
            {feedItems?.map((item, index) => (
              <ImportCard 
                key={`${item.itemType}-${item._id}-${index}`} 
                item={item} 
                showAuthor={true}
              />
            ))}

            {/* Load More Trigger */}
            {status === 'CanLoadMore' && (
              <div ref={loadMoreRef} className="flex items-center justify-center py-6">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-white/20 border-t-blue-400 rounded-full" />
                  <span className="text-white/60 text-sm">Loading more imports...</span>
                </div>
              </div>
            )}

            {/* End of Feed */}
            {status === 'Exhausted' && feedItems && feedItems.length > 0 && (
              <div className="text-center py-6">
                <div className="text-white/50 text-sm">
                  🎉 You've reached the end of the feed
                </div>
                <div className="text-white/30 text-xs mt-1">
                  {feedItems.length} imports loaded
                </div>
              </div>
            )}
          </div>
        </SimpleBar>
      </div>
    </div>
  )
}