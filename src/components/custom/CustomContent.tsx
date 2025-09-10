'use client'

import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { CharacterLibrary } from './CharacterLibrary'
import { WorldLoreLibrary } from './WorldLoreLibrary'
import { StoryStarter } from './StoryStarter'
import { TabType } from './types'

export function CustomContent() {
  const [activeTab, setActiveTab] = useState<TabType>('characters')
  const { authArgs } = useAuthState()

  const customCharacters = useQuery(
    api.customContent.queries.getCustomCharacters,
    authArgs || 'skip'
  )

  const customWorldLore = useQuery(
    api.customContent.queries.getCustomWorldLore,
    authArgs || 'skip'
  )

  const customSuggestions = useQuery(
    api.customContent.queries.getCustomStorySuggestions,
    authArgs || 'skip'
  )

  if (!authArgs) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="p-8 text-center">
          <p className="text-white/70">Please sign in to create custom content</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-800/20 backdrop-blur-xl rounded-md border border-white/20 p-4 md:p-8">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white/90 mb-4">Custom Content Studio</h2>
        <p className="text-white/70">
          Create your own characters, build unique worlds, and craft custom story ideas. 
          Your imagination is the only limit!
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-stone-800/10 backdrop-blur-md rounded-md mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('characters')}
          className={`flex-1 px-3 md:px-6 py-2 md:py-3 rounded-md font-medium transition-all text-sm md:text-base ${
            activeTab === 'characters'
              ? 'bg-white/10 text-white/90 backdrop-blur-sm'
              : 'text-white/60 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          Characters ({customCharacters?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('worldLore')}
          className={`flex-1 px-3 md:px-6 py-2 md:py-3 rounded-md font-medium transition-all text-sm md:text-base ${
            activeTab === 'worldLore'
              ? 'bg-white/10 text-white/90 backdrop-blur-sm'
              : 'text-white/60 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          World Lore ({customWorldLore?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('storyStarter')}
          className={`flex-1 px-3 md:px-6 py-2 md:py-3 rounded-md font-medium transition-all text-sm md:text-base ${
            activeTab === 'storyStarter'
              ? 'bg-white/10 text-white/90 backdrop-blur-sm'
              : 'text-white/60 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          Story Ideas ({customSuggestions?.length || 0})
        </button>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        {activeTab === 'characters' && (
          <CharacterLibrary 
            characters={customCharacters || []} 
            isLoading={customCharacters === undefined}
          />
        )}
        {activeTab === 'worldLore' && (
          <WorldLoreLibrary 
            worldLore={customWorldLore || []} 
            isLoading={customWorldLore === undefined}
          />
        )}
        {activeTab === 'storyStarter' && (
          <StoryStarter 
            suggestions={customSuggestions || []}
            characters={customCharacters || []}
            worldLore={customWorldLore || []}
            isLoading={customSuggestions === undefined}
          />
        )}
      </div>
    </div>
  )
}