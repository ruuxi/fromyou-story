'use client'

import { Playfair_Display } from 'next/font/google'
import { Menu, Settings, Share2 } from 'lucide-react'
import { SignInButton } from '@/components/auth/SignInButton'
import { useNavigation } from '@/contexts/NavigationContext'
import React from 'react'

const playfair = Playfair_Display({ subsets: ['latin'] })

interface TopNavigationProps {
  isStoryView?: boolean
  isChatView?: boolean
  isPublicView?: boolean
  onBackToSuggestions?: () => void
  onToggleSidebar?: () => void
}

export function TopNavigation({ 
  isStoryView = false, 
  isChatView = false, 
  isPublicView = false, 
  onBackToSuggestions, 
  onToggleSidebar 
}: TopNavigationProps) {
  const { storyHeaderTitle, chatHeaderTitle } = useNavigation()

  if (isStoryView) {
    return (
      <div data-app-header="true" className="relative glass-secondary border-b border-amber-100/20 px-4 sm:px-6 py-4 z-10 w-full">
        <div className="flex items-center justify-between max-w-none">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToSuggestions}
              className="py-2 flex items-center gap-1 text-white/80 hover:text-white/90"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm hidden sm:inline">Back to Suggestions</span>
            </button>
          </div>

          {/* Center title: full-width on mobile (in flow to let the header grow); absolute centering restored ≥sm. */}
          <div className="w-full px-4 sm:px-6 pointer-events-none flex-1 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:flex-none sm:w-auto">
            <div className="py-1.5 md:py-2">
              <h3 className="text-white/90 text-base md:text-lg lg:text-xl font-medium tracking-wider drop-shadow-sm text-center whitespace-normal break-words max-w-full">
                {storyHeaderTitle || 'Story'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {!isPublicView && (
              <>
                <button
                  type="button"
                  aria-label="Share story"
                  title="Share story"
                  onClick={() => {
                    // Open the story share overlay via custom event (handled by StoryViewer)
                    window.dispatchEvent(new Event('openStoryShare'))
                  }}
                  className="text-white/70 hover:text-white focus:outline-none mr-1"
                >
                  <Share2 className="w-6 h-6" strokeWidth={1} />
                </button>
                <button
                  type="button"
                  aria-label="Story settings"
                  title="Story settings"
                  onClick={() => {
                    // Open the story settings overlay via custom event (handled by StoryViewer)
                    window.dispatchEvent(new Event('openStoryLoreSettings'))
                  }}
                  className="text-white/70 hover:text-white focus:outline-none mr-1"
                >
                  <Settings className="w-6 h-6" strokeWidth={1} />
                </button>
              </>
            )}
            <SignInButton />
          </div>
        </div>
      </div>
    )
  }

  if (isChatView) {
    return (
      <div data-app-header="true" className="relative glass-secondary border-b border-amber-100/20 px-4 sm:px-6 py-4 z-10 w-full">
        <div className="flex items-center justify-between max-w-none">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToSuggestions}
              className="py-2 flex items-center gap-1 text-white/80 hover:text-white/90"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm hidden sm:inline">Back to Feed</span>
            </button>
          </div>

          {/* Center title: full-width on mobile (in flow to let the header grow); absolute centering restored ≥sm. */}
          <div className="w-full px-4 sm:px-6 pointer-events-none flex-1 sm:absolute sm:left-1/2 sm:-translate-x-1/2 sm:flex-none sm:w-auto">
            <div className="py-1.5 md:py-2">
              <h3 className="text-white/90 text-base md:text-lg lg:text-xl font-medium tracking-wider drop-shadow-sm text-center whitespace-normal break-words max-w-full">
                {chatHeaderTitle || 'Chat'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <SignInButton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div data-app-header="true" className="relative glass-secondary border-b border-amber-100/20 px-4 sm:px-6 py-4 z-10 w-full">
      <div className="flex items-center justify-between max-w-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="md:hidden p-2 text-white hover:text-white hover:bg-amber-100/10 rounded-lg transition-all"
            aria-label="Open menu"
            title="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="absolute left-1/2 transform -translate-x-1/2">
          <div className="px-3 py-1.5 md:px-4 md:py-2">
            <h2 className={`text-xl sm:text-xl md:text-2xl font-bold text-amber-50 ${playfair.className} drop-shadow-sm`}>
              Story Feed
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <SignInButton />
        </div>
      </div>
    </div>
  )
}