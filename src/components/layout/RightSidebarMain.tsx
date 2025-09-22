'use client'

import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import debounce from 'lodash.debounce'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { useSettings } from '@/hooks/useSettings'
import { UnifiedUploader, UnifiedUploaderRef } from '@/components/import/UnifiedUploader'
import { ItemCard } from '@/components/import/ItemCard'
import { CreateCharacterForm } from '@/components/import/CreateCharacterForm'
import { CreatePresetForm } from '@/components/import/CreatePresetForm'
import { DetailView } from '@/components/import/DetailView'
import { PublicImportFeed } from '@/components/import/PublicImportFeed'
import { 
  Upload, 
  Search, 
  User, 
  Settings,
  Grid3X3,
  List,
  Plus,
  FileText,
  Sparkles,
  X,
  Play,
  Download,
  Globe,
  ChevronRight,
  Edit2,
  Check
} from 'lucide-react'
import SimpleBar from 'simplebar-react'
import { useRouter } from 'next/navigation'

// ExpandableSegment component for sort controls
interface ExpandableSegmentProps<T extends string = string> {
  value: T
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>
  onChange: (value: T) => void
  isExpanded: boolean
  onExpand: () => void
  onCollapse: () => void
}

function ExpandableSegment<T extends string>({ 
  value, 
  options, 
  onChange, 
  isExpanded, 
  onExpand,
  onCollapse
}: ExpandableSegmentProps<T>) {
  const selectedOption = options.find(opt => opt.value === value)
  const [isAnimating, setIsAnimating] = useState(false)
  const [measuredWidth, setMeasuredWidth] = useState<number>(0)
  const [collapsedWidth, setCollapsedWidth] = useState<number>(0)
  const [expandedWidth, setExpandedWidth] = useState<number>(0)
  const segmentRef = useRef<HTMLDivElement>(null)
  const collapsedRef = useRef<HTMLDivElement>(null)
  const expandedRef = useRef<HTMLDivElement>(null)
  
  // Measure both states once on mount and when options change
  useEffect(() => {
    const measureWidths = () => {
      // Measure collapsed width
      if (collapsedRef.current) {
        const width = collapsedRef.current.offsetWidth
        setCollapsedWidth(width)
        if (!isExpanded && width > 0) {
          setMeasuredWidth(width)
        }
      }
      
      // Measure expanded width
      if (expandedRef.current) {
        const width = expandedRef.current.scrollWidth
        setExpandedWidth(width)
      }
    }
    
    // Initial measurement
    measureWidths()
    
    // Re-measure on window resize
    window.addEventListener('resize', measureWidths)
    return () => window.removeEventListener('resize', measureWidths)
  }, [options, selectedOption, isExpanded])
  
  // Smooth width transition
  useEffect(() => {
    if (collapsedWidth === 0 || expandedWidth === 0) return
    
    if (isExpanded) {
      // Ensure we start from collapsed width
      if (measuredWidth !== collapsedWidth) {
        setMeasuredWidth(collapsedWidth)
      }
      
      // Trigger animation to expanded width
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setMeasuredWidth(expandedWidth)
          setIsAnimating(true)
        })
      })
      
      const timer = setTimeout(() => setIsAnimating(false), 1000)
      return () => clearTimeout(timer)
    } else {
      // Animate back to collapsed width
      setMeasuredWidth(collapsedWidth)
      setIsAnimating(false)
    }
  }, [isExpanded, collapsedWidth, expandedWidth])

  return (
    <div className="relative">
      {/* Hidden measurement divs */}
      <div className="absolute opacity-0 pointer-events-none">
        {/* Collapsed state measurement */}
        <div ref={collapsedRef} className="inline-flex">
          <button className="h-8 px-3 text-sm font-medium flex items-center gap-1 whitespace-nowrap">
            <span className="flex items-center gap-1">
              {selectedOption?.label}
              <ChevronRight className="w-3 h-3" />
            </span>
          </button>
        </div>
        
        {/* Expanded state measurement */}
        <div ref={expandedRef} className="inline-flex">
          {options.map((option) => (
            <button
              key={option.value}
              className="h-8 px-3 text-sm font-medium flex items-center gap-1 whitespace-nowrap"
            >
              <span className="flex items-center gap-1">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Visible animated container */}
      <div 
        ref={segmentRef}
        className={`
          inline-flex overflow-hidden
          ${measuredWidth > 0 ? 'transition-all duration-700' : ''}
          ${isExpanded 
            ? 'shadow-[0_8px_32px_rgba(255,255,255,0.08)]' 
            : 'hover:bg-white/[0.05] active:scale-[0.98]'
          }
        `}
        style={{
          width: measuredWidth > 0 ? `${measuredWidth}px` : 'auto',
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
          transitionProperty: 'width, background-color, box-shadow, transform',
        }}
      >
        {isExpanded ? (
          // Expanded state - show all options with staggered animation
          <div className="flex">
            {options.map((option, index) => (
              <button
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setTimeout(onCollapse, 200) // Slight delay for feedback
                }}
                className={`
                  relative h-8 px-3 text-sm font-medium
                  transition-all duration-400 ease-out
                  flex items-center gap-1 whitespace-nowrap
                  ${value === option.value
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80'
                  }
                  ${isAnimating ? 'animate-in fade-in slide-in-from-left-2' : ''}
                  ${index < options.length - 1 ? 'border-r border-white/10' : ''}
                `}
                style={{
                  animationDelay: `${index * 80}ms`,
                  animationDuration: '600ms',
                  animationTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {/* Selection indicator */}
                {value === option.value && (
                  <div 
                    className="absolute inset-0 bg-white/12 
                               animate-in fade-in zoom-in-95 duration-500"
                  />
                )}
                <span className="relative z-10 flex items-center gap-1">
                  {option.label}
                </span>
              </button>
            ))}
          </div>
        ) : (
          // Collapsed state - show only selected with hover effect
          <button
            onClick={onExpand}
            className="relative h-8 px-3 text-sm font-medium text-white/80 
                     hover:text-white transition-all duration-300 
                     flex items-center gap-1 whitespace-nowrap group
                     active:bg-white/5"
          >
            <span className="relative z-10 flex items-center gap-1">
              {selectedOption?.label}
              {/* Subtle expand indicator */}
              <ChevronRight 
                className="w-3 h-3 opacity-30 group-hover:opacity-50 transition-all duration-400
                         group-hover:translate-x-0.5"
              />
            </span>
          </button>
        )}
      </div>
    </div>
  )
}

type ViewMode = 'grid' | 'list'
type SortBy = 'newest' | 'oldest' | 'name' | 'recent'
type FilterType = 'all' | 'characters' | 'presets' | 'lorebooks'
type ItemType = 'character' | 'preset' | 'lorebook'
type MainTab = 'library' | 'public' | 'create'
type CreateView = 'options' | 'character' | 'preset'

interface SelectedItem {
  id: string
  type: ItemType
  name: string
}

export function RightSidebarMain() {
  const { authArgs, displayName, username, isAnonymous } = useAuthState()
  const router = useRouter()
  const { settings, updateOpenrouterModelOverride } = useSettings()
  const [modelOverride, setModelOverride] = useState<string>(settings.openrouterModelOverride || '')
  const debouncedUpdateModel = useRef(
    debounce((value: string) => {
      updateOpenrouterModelOverride(value.trim() ? value.trim() : undefined)
    }, 400)
  ).current

  useEffect(() => {
    setModelOverride(settings.openrouterModelOverride || '')
  }, [settings.openrouterModelOverride])

  useEffect(() => {
    return () => {
      debouncedUpdateModel.cancel()
    }
  }, [debouncedUpdateModel])
  
  // State management
  const [activeTab, setActiveTab] = useState<MainTab>('library')
  const [createView, setCreateView] = useState<CreateView>('options')
  const [selectedCharacterTemplateIndex, setSelectedCharacterTemplateIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null)
  const [activeCharacterId, setActiveCharacterId] = useState<string | null>(null)
  const [activePresetId, setActivePresetId] = useState<string | null>(null)
  const [activeLorebookIds, setActiveLorebookIds] = useState<string[]>([])
  const [detailCache, setDetailCache] = useState<Record<string, any>>({})
  const [expandedSort, setExpandedSort] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const hiddenUploaderRef = useRef<UnifiedUploaderRef | null>(null)

  // Data queries
  const presets = useQuery(
    api.presets.storage.getUserPresets,
    authArgs ? authArgs : 'skip'
  )

  const characters = useQuery(
    api.characters.storage.getUserCharacters,
    authArgs ? authArgs : 'skip'
  )

  const lorebooks = useQuery(
    api.lorebooks.storage.getUserLorebooks,
    authArgs ? authArgs : 'skip'
  )

  const selectedPreset = useQuery(
    api.presets.storage.getPresetWithUrl,
    selectedItem?.type === 'preset' && authArgs
      ? { presetId: selectedItem.id as any, ...authArgs }
      : 'skip'
  )

  const selectedCharacter = useQuery(
    api.characters.storage.getCharacter,
    selectedItem?.type === 'character' && authArgs
      ? { characterId: selectedItem.id as any, ...authArgs }
      : 'skip'
  )

  const selectedLorebook = useQuery(
    api.lorebooks.storage.getLorebook,
    selectedItem?.type === 'lorebook' && authArgs
      ? { lorebookId: selectedItem.id as any, ...authArgs }
      : 'skip'
  )

  // Mutations for creating chat and applying settings
  const createChatFromCharacter = useMutation(api.characters.chatIntegration.createChatFromCharacter)
  const applyLorebookToChat = useMutation(api.lorebooks.chatIntegration.applyLorebookToChat)

  // Get notifications for the public tab
  const notifications = useQuery(
    api.imports.social.getUserNotifications,
    authArgs ? { ...authArgs, limit: 100 } : 'skip'
  )

  const unreadNotifications = notifications?.filter(n => !n.isRead).length || 0

  // Combine and filter items
  const allItems = [
    ...(characters || []).map(char => ({ 
      ...char, 
      type: 'character' as const,
      lastModified: char.importedAt || 0,
      description: char.description
    })),
    ...(presets || []).map(preset => ({ 
      ...preset, 
      type: 'preset' as const,
      lastModified: preset.lastUsed || preset.importedAt || 0,
      description: `${preset.presetType} preset`
    })),
    ...(lorebooks || []).map(lorebook => ({ 
      ...lorebook, 
      type: 'lorebook' as const,
      lastModified: lorebook.lastUsed || lorebook.importedAt || 0,
      description: lorebook.description || `${lorebook.entryCount} entries`
    }))
  ]

  const filteredItems = allItems
    .filter(item => {
      if (filterType !== 'all' && item.type !== filterType.slice(0, -1)) return false
      if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return b.lastModified - a.lastModified
        case 'oldest': return a.lastModified - b.lastModified
        case 'name': return a.name.localeCompare(b.name)
        case 'recent': return (b.lastUsed || 0) - (a.lastUsed || 0)
        default: return 0
      }
    })

  // Quick lookup maps for active tray chip labels
  const allById = useMemo(() => {
    const map: Record<string, any> = {}
    for (const it of allItems) map[it._id] = it
    return map
  }, [allItems])

  const handleItemSelect = (item: any) => {
    setSelectedItem({
      id: item._id,
      type: item.type,
      name: item.name
    })
  }

  const handleItemDelete = (item: any) => {
    // If the deleted item was selected, clear the selection
    if (selectedItem && selectedItem.id === item._id) {
      setSelectedItem(null)
    }
    // The data will automatically refresh due to Convex reactivity
  }

  const handleUploadSuccess = () => {
    // Stay in library after upload
  }

  const handleBack = () => {
    setSelectedItem(null)
  }

  // Drag and drop handlers for library area
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      // Only set dragActive to false if we're actually leaving the drop zone
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX
      const y = e.clientY
      if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
        setDragActive(false)
      }
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && hiddenUploaderRef.current) {
      // Use the ref to directly call the handleFiles method
      hiddenUploaderRef.current.handleFiles(e.dataTransfer.files)
    }
  }, [])

  const handleCreateSuccess = () => {
    setActiveTab('library')
    setCreateView('options')
  }

  const handleCreateBack = () => {
    setCreateView('options')
  }

  const stats = {
    total: allItems.length,
    characters: characters?.length || 0,
    presets: presets?.length || 0,
    lorebooks: lorebooks?.length || 0
  }

  const handleToggleActive = (item: any) => {
    if (item.type === 'character') {
      setActiveCharacterId(prev => prev === item._id ? null : item._id)
    } else if (item.type === 'preset') {
      setActivePresetId(prev => prev === item._id ? null : item._id)
    } else if (item.type === 'lorebook') {
      setActiveLorebookIds(prev => prev.includes(item._id) ? prev.filter(id => id !== item._id) : [...prev, item._id])
    }
  }

  const clearActive = () => {
    setActiveCharacterId(null)
    setActivePresetId(null)
    setActiveLorebookIds([])
  }

  const handleStartChat = async (characterIdOverride?: string) => {
    if (!authArgs) return
    const characterId = characterIdOverride || activeCharacterId
    if (!characterId) return

    try {
      const chatId = await createChatFromCharacter({
        characterId: characterId as any,
        presetId: activePresetId ? (activePresetId as any) : undefined,
        selectedGreeting: 0,
        formatMode: 'classic_rp',
        ...authArgs,
      })

      // Apply selected lorebooks
      for (const lorebookId of activeLorebookIds) {
        try {
          await applyLorebookToChat({
            chatId: chatId as any,
            lorebookId: lorebookId as any,
            userId: (authArgs as any).userId,
            sessionId: (authArgs as any).sessionId,
          })
        } catch (e) {
          console.error('Failed to apply lorebook', lorebookId, e)
        }
      }

      router.push(`/c/${chatId}`)
    } catch (e) {
      console.error('Failed to start chat:', e)
    }
  }

  // Compute selected data and maintain cache (hooks must be top-level)
  const selectedData = selectedItem
    ? (selectedItem.type === 'character'
        ? selectedCharacter
        : selectedItem.type === 'lorebook'
        ? selectedLorebook
        : selectedPreset)
    : null
  const cacheKey = selectedItem ? `${selectedItem.type}:${selectedItem.id}` : null

  // Write-through cache: store freshly loaded data
  useEffect(() => {
    if (cacheKey && selectedData) {
      setDetailCache(prev => ({ ...prev, [cacheKey]: selectedData }))
    }
  }, [cacheKey, selectedData])

  // Detail view
  if (selectedItem) {
    // Read cache for instant display while query hydrates
    const dataForView = selectedData || (cacheKey ? detailCache[cacheKey] : undefined)
    const handleExportSelected = async () => {
      try {
        if (!selectedItem || !dataForView) return

        const safeName = (dataForView.name || selectedItem.name || 'export').replace(/[^a-z0-9\-_. ]/gi, '_')

        const downloadBlob = (blob: Blob, filename: string) => {
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = filename
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        }

        const downloadJson = (obj: any, filename: string) => {
          const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' })
          downloadBlob(blob, filename.endsWith('.json') ? filename : `${filename}.json`)
        }

        if (selectedItem.type === 'preset') {
          if ((dataForView as any).dataUrl) {
            const res = await fetch((dataForView as any).dataUrl)
            const blob = await res.blob()
            downloadBlob(blob, `${safeName}.json`)
            return
          }
          if ((dataForView as any).originalData) {
            downloadJson((dataForView as any).originalData, `${safeName}.json`)
            return
          }
          alert('No preset data available to export.')
          return
        }

        if (selectedItem.type === 'character') {
          const original = (dataForView as any).originalData
          if (original) {
            downloadJson(original, `${safeName}.json`)
            return
          }
          // Reconstruct a minimal SillyTavern V2 card if original missing
          const card = {
            spec: (dataForView as any).spec || 'chara_card_v2',
            spec_version: (dataForView as any).specVersion || '2.0',
            data: {
              name: (dataForView as any).name || selectedItem.name,
              description: (dataForView as any).description || '',
              personality: (dataForView as any).personality || '',
              scenario: (dataForView as any).scenario || '',
              first_mes: (dataForView as any).firstMessage || '',
              mes_example: (dataForView as any).messageExample || '',
              creator_notes: (dataForView as any).creatorNotes || '',
              system_prompt: (dataForView as any).systemPrompt || '',
              post_history_instructions: (dataForView as any).postHistoryInstructions || '',
              tags: (dataForView as any).tags || [],
              character_book: (dataForView as any).characterBook || undefined,
            }
          }
          downloadJson(card, `${safeName}.json`)
          return
        }

        if (selectedItem.type === 'lorebook') {
          const original = (dataForView as any).originalData
          if (original) {
            downloadJson(original, `${safeName}.json`)
            return
          }
          const lore = {
            entries: (dataForView as any).entries || {},
            settings: (dataForView as any).settings || {},
            format: (dataForView as any).format || 'sillytavern',
            name: (dataForView as any).name || selectedItem.name,
          }
          downloadJson(lore, `${safeName}.json`)
          return
        }
      } catch (err) {
        console.error('Export failed:', err)
        alert('Failed to export. Please try again.')
      }
    }
    return (
      <div className="relative w-full h-full flex flex-col">
        <style dangerouslySetInnerHTML={{
          __html: `
            .simplebar-scrollbar::before {
              background-color: rgba(147, 197, 253, 0.7) !important;
              border-radius: 4px !important;
            }
            
            .simplebar-scrollbar:hover::before {
              background-color: rgba(147, 197, 253, 0.9) !important;
            }
            
            .simplebar-track.simplebar-vertical {
              background: transparent !important;
            }
            
            .simplebar-track.simplebar-horizontal {
              background: transparent !important;
            }
          `
        }} />
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={handleExportSelected}
            className="flex items-center gap-2 px-3 py-1.5 text-sm border border-white/20 text-white bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 shadow-sm hover:from-amber-900/45 hover:via-sky-900/35 hover:to-purple-900/30"
            title="Export"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
        
        <DetailView
          item={dataForView}
          type={selectedItem.type}
          onBack={() => setSelectedItem(null)}
        />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full flex flex-col">
      <style dangerouslySetInnerHTML={{
        __html: `
          .simplebar-scrollbar::before {
            background-color: rgba(147, 197, 253, 0.7) !important;
            border-radius: 4px !important;
          }
          
          .simplebar-scrollbar:hover::before {
            background-color: rgba(147, 197, 253, 0.9) !important;
          }
          
          .simplebar-track.simplebar-vertical {
            background: transparent !important;
          }
          
          .simplebar-track.simplebar-horizontal {
            background: transparent !important;
          }
        `
      }} />

      {/* Main Tab Navigation */}
      <div className="flex-shrink-0 border-b border-white/10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
              activeTab === 'library'
                ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm border-t border-l border-r border-white/40'
                : 'text-white/70 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
            Library
            {stats.total > 0 && (
              <span className="ml-1 px-2 py-0.5 text-xs border border-blue-300/20 text-blue-300">
                {stats.total}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('public')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
              activeTab === 'public'
                ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm border-t border-l border-r border-white/40'
                : 'text-white/70 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
            }`}
          >
            <Globe className="w-4 h-4" />
            Public
            {unreadNotifications > 0 && (
              <div className="relative ml-1">
                <div className="bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </div>
              </div>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-colors ${
              activeTab === 'create'
                ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm border-t border-l border-r border-white/40'
                : 'text-white/70 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
            }`}
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>
      </div>

      {/* Content */}
      <div 
        className="flex-1 overflow-hidden min-h-0 flex flex-col"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Drag overlay for entire panel */}
        {dragActive && (
          <div className="absolute inset-0 border-2 border-dashed border-blue-400/50 bg-blue-500/10 flex items-center justify-center z-50">
            <div className="text-center">
              <Upload className="w-16 h-16 text-blue-400 mx-auto mb-4" />
              <p className="text-blue-200 font-medium text-lg mb-2">Drop files to import</p>
              <p className="text-blue-300/70">Character cards, presets, lorebooks (JSON, PNG)</p>
            </div>
          </div>
        )}
        
        {activeTab === 'library' && (
          <>
            {/* User Profile Section */}
            <div className="flex-shrink-0 p-4 border-b border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-white/80" />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-white/60 text-sm">Name:</span>
                  {isEditingName ? (
                    <>
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="bg-transparent border border-white/20 px-2 py-1 text-white text-sm flex-1 focus:outline-none focus:border-white/40"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            // TODO: Save name
                            setIsEditingName(false)
                          }
                          if (e.key === 'Escape') {
                            setIsEditingName(false)
                            setTempName('')
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          // TODO: Save name
                          setIsEditingName(false)
                        }}
                        className="p-1 hover:bg-white/10 text-green-400 hover:text-green-300"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setTempName(displayName || username || 'User')
                        setIsEditingName(true)
                      }}
                      className="text-white font-medium text-sm hover:text-white/80 transition-colors"
                    >
                      {displayName || username || 'User'}
                    </button>
                  )}
                </div>
              </div>

              {/* Model Override Input */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500/20 to-blue-500/20 border border-white/20 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-white/80" />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-white/60 text-sm">Model:</span>
                  <input
                    type="text"
                    placeholder="provider/model (e.g. openai/gpt-4)"
                    value={modelOverride}
                    onChange={(e) => {
                      const value = e.target.value
                      setModelOverride(value)
                      debouncedUpdateModel(value)
                    }}
                    className="bg-transparent border border-white/20 px-2 py-1 text-white text-sm flex-1 focus:outline-none focus:border-white/40 placeholder-white/40"
                  />
                </div>
              </div>
            </div>

            {/* Library Header */}
            <div className="flex-shrink-0 p-4 border-b border-white/10">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">My Library</h2>
                <button
                  onClick={() => {
                    // Trigger the hidden file input
                    const fileInput = document.createElement('input')
                    fileInput.type = 'file'
                    fileInput.multiple = true
                    fileInput.accept = '.json,.png'
                    fileInput.onchange = (e) => {
                      const target = e.target as HTMLInputElement
                      if (target.files && target.files.length > 0 && hiddenUploaderRef.current) {
                        hiddenUploaderRef.current.handleFiles(target.files)
                      }
                    }
                    fileInput.click()
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm border border-blue-400/30 hover:bg-blue-500/20 text-blue-200 hover:text-blue-100 transition-colors"
                  title="Import files"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </button>
              </div>

              {/* Search and View Controls */}
              <div className="flex items-center gap-3 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search library..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-transparent border border-white/20 text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                  />
                </div>
                
                {/* View mode controls */}
                <div className="inline-flex items-center h-10 border border-white/20 flex-shrink-0">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`h-10 px-2 border-r border-white/10 transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm' 
                        : 'text-white/60 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
                    }`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`h-10 px-2 transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm' 
                        : 'text-white/60 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center justify-between">
                <div className="flex border border-white/20">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1.5 text-sm font-medium border-r border-white/10 transition-colors ${
                      filterType === 'all'
                        ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('characters')}
                    className={`px-3 py-1.5 text-sm font-medium border-r border-white/10 transition-colors ${
                      filterType === 'characters'
                        ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
                    }`}
                  >
                    Characters
                  </button>
                  <button
                    onClick={() => setFilterType('presets')}
                    className={`px-3 py-1.5 text-sm font-medium border-r border-white/10 transition-colors ${
                      filterType === 'presets'
                        ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
                    }`}
                  >
                    Presets
                  </button>
                  <button
                    onClick={() => setFilterType('lorebooks')}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                      filterType === 'lorebooks'
                        ? 'bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 text-white shadow-sm'
                        : 'text-white/60 hover:text-white hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12'
                    }`}
                  >
                    Lorebooks
                  </button>
                </div>

                {/* Sort */}
                <ExpandableSegment
                  value={sortBy}
                  options={[
                    { value: 'newest', label: 'Newest' },
                    { value: 'oldest', label: 'Oldest' },
                    { value: 'name', label: 'Name' },
                    { value: 'recent', label: 'Recently Used' },
                  ]}
                  onChange={setSortBy}
                  isExpanded={expandedSort}
                  onExpand={() => setExpandedSort(true)}
                  onCollapse={() => setExpandedSort(false)}
                />
              </div>
            </div>

            {/* Library Content */}
            <div className="relative flex-1 overflow-hidden min-h-0">
              <SimpleBar className="h-full">
                <div className="p-4 relative">
                  
                  {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-16 h-16 mx-auto border-2 border-dashed border-white/30 flex items-center justify-center mb-4">
                        {searchQuery ? (
                          <Search className="w-8 h-8 text-white/40" />
                        ) : (
                          <Upload className="w-8 h-8 text-white/40" />
                        )}
                      </div>
                      <h3 className="text-white font-medium mb-2">
                        {searchQuery ? 'No results found' : ''}
                      </h3>
                      <p className="text-white/60 text-sm mb-4">
                        {searchQuery 
                          ? 'Try adjusting your search or filter'
                          : ''
                        }
                      </p>
                      {!searchQuery && (
                        <>
                          <div className="w-full max-w-md">
                            <UnifiedUploader onUploadSuccess={handleUploadSuccess} compact={false} />
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className={`grid gap-3 mb-4 ${
                        viewMode === 'grid' 
                          ? 'grid-cols-1 xl:grid-cols-2' 
                          : 'grid-cols-1'
                      }`}>
                        {filteredItems.map((item) => (
                          <ItemCard
                            key={item._id}
                            item={item}
                            viewMode={viewMode}
                            onSelect={handleItemSelect}
                            onDelete={handleItemDelete}
                            isActive={item.type === 'character' ? activeCharacterId === item._id : item.type === 'preset' ? activePresetId === item._id : activeLorebookIds.includes(item._id)}
                            onToggleActive={handleToggleActive}
                            onStartChat={({ characterId }) => handleStartChat(characterId)}
                          />
                        ))}
                      </div>
                      
                      {/* Drag and drop text at bottom when library has items */}
                      <div className="text-center py-4 border-t border-white/10">
                        <p className="text-white/40 text-xs">
                          Drag and drop to import more files
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </SimpleBar>
              
              {/* Hidden UnifiedUploader for drag/drop handling */}
              <div className="hidden">
                <UnifiedUploader ref={hiddenUploaderRef} onUploadSuccess={handleUploadSuccess} compact={true} />
              </div>
            </div>

            {/* Active selections tray - transparent background at bottom */}
            {(activeCharacterId || activePresetId || activeLorebookIds.length > 0) && (
              <div className="flex-shrink-0 p-4 border-t border-white/10 bg-transparent">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Character chip */}
                    {activeCharacterId ? (
                      <span className="inline-flex items-center gap-2 px-2 py-1 text-xs border border-purple-400/30 text-purple-200 bg-purple-500/10">
                        <User className="w-3 h-3" />
                        {allById[activeCharacterId]?.name || 'Character'}
                        <button
                          onClick={() => setActiveCharacterId(null)}
                          className="hover:text-white"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ) : (
                      <span className="text-xs text-white/50">Select a character</span>
                    )}

                    {/* Preset chip */}
                    {activePresetId && (
                      <span className="inline-flex items-center gap-2 px-2 py-1 text-xs border border-green-400/30 text-green-200 bg-green-500/10">
                        <Settings className="w-3 h-3" />
                        {allById[activePresetId]?.name || 'Preset'}
                        <button
                          onClick={() => setActivePresetId(null)}
                          className="hover:text-white"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}

                    {/* Lorebook chips */}
                    {activeLorebookIds.map(loreId => (
                      <span key={loreId} className="inline-flex items-center gap-2 px-2 py-1 text-xs border border-blue-400/30 text-blue-200 bg-blue-500/10">
                        <FileText className="w-3 h-3" />
                        {allById[loreId]?.name || 'Lorebook'}
                        <button
                          onClick={() => setActiveLorebookIds(prev => prev.filter(id => id !== loreId))}
                          className="hover:text-white"
                          title="Remove"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}

                    {(activeCharacterId || activePresetId || activeLorebookIds.length > 0) && (
                      <button
                        onClick={clearActive}
                        className="text-xs text-white/60 hover:text-white underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => handleStartChat()}
                    disabled={!activeCharacterId}
                    className={`flex items-center gap-2 px-3 py-2 text-sm border transition-colors ${
                      activeCharacterId
                        ? 'border-white/20 text-white bg-gradient-to-br from-amber-900/35 via-sky-900/25 to-purple-900/20 shadow-sm hover:from-amber-900/45 hover:via-sky-900/35 hover:to-purple-900/30'
                        : 'border-white/20 text-white/50 cursor-not-allowed'
                    }`}
                    title={activeCharacterId ? 'Start Chat' : 'Select a character to start chat'}
                  >
                    <Play className="w-4 h-4" />
                    Start Chat
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'public' && (
          <div className="h-full">
            <PublicImportFeed />
          </div>
        )}

        {activeTab === 'create' && (
          <div className="h-full flex flex-col min-h-0">
            {createView === 'options' ? (
              <>
                {/* Header */}
                <div className="flex-shrink-0 p-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Create New</h2>
                    <p className="text-sm text-white/60">Choose what you'd like to create</p>
                  </div>
                </div>

                {/* Creation Options */}
                <div className="flex-1 overflow-hidden">
                  <SimpleBar className="h-full">
                    <div className="p-4 space-y-4">
                      {/* Character Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 px-4 py-3 border border-white/10">
                          <User className="w-5 h-5 text-purple-300/80 flex-shrink-0" />
                          <div>
                            <h4 className="text-white font-medium">Create Character</h4>
                            <p className="text-white/60 text-sm leading-relaxed">
                              Choose a template to get started
                            </p>
                          </div>
                        </div>

                        {/* Character Templates */}
                        <div className="ml-6 space-y-2">
                          {[
                            { name: 'Blank Character', description: 'Start from scratch with an empty character template' },
                            { name: 'Fantasy Adventurer', description: 'A brave adventurer ready for quests and exploration' },
                            { name: 'Modern Assistant', description: 'A helpful AI assistant for everyday tasks and conversations' },
                          ].map((template, index) => (
                            <button
                              key={index}
                              onClick={() => { setSelectedCharacterTemplateIndex(index); setCreateView('character') }}
                              className="w-full p-3 border text-left transition-all border-white/10 hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12 hover:border-white/20"
                            >
                              <div className="flex items-start gap-3">
                                {index === 0 ? (
                                  <FileText className="w-4 h-4 text-white/60 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Sparkles className="w-4 h-4 text-yellow-400/80 flex-shrink-0 mt-0.5" />
                                )}
                                <div>
                                  <h4 className="text-white text-sm font-medium mb-0.5">{template.name}</h4>
                                  <p className="text-white/60 text-xs leading-relaxed">
                                    {template.description}
                                  </p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Preset Section */}
                      <div className="space-y-3">
                        <button
                          onClick={() => setCreateView('preset')}
                          className="w-full p-4 border border-white/10 text-left transition-all hover:bg-gradient-to-br hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/12 hover:border-white/20"
                        >
                          <div className="flex items-start gap-3">
                            <Settings className="w-5 h-5 text-green-300/80 flex-shrink-0 mt-1" />
                            <div>
                              <h4 className="text-white font-medium mb-1">Create Preset</h4>
                              <p className="text-white/60 text-sm leading-relaxed">
                                Create a new AI configuration preset with custom parameters and settings
                              </p>
                            </div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </SimpleBar>
                </div>
              </>
            ) : createView === 'character' ? (
              <CreateCharacterForm 
                onSuccess={handleCreateSuccess} 
                onBack={handleCreateBack}
                initialTemplateIndex={selectedCharacterTemplateIndex ?? 0}
              />
            ) : (
              <CreatePresetForm onSuccess={handleCreateSuccess} onBack={handleCreateBack} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}


