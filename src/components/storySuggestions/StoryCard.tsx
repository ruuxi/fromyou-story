'use client'

import { memo, useState, useMemo, useRef, useEffect } from 'react'
import { StorySuggestion } from '@/types/story'
import ReactMarkdown from 'react-markdown'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'

interface StoryCardProps {
  suggestion: StorySuggestion
  onSelect: (suggestion: StorySuggestion) => void
  authArgs: { userId: string } | { sessionId: string } | null
  showDivider?: boolean
  showTopDivider?: boolean
}

export const StoryCard = memo(function StoryCard({ 
  suggestion, 
  onSelect,
  authArgs,
  showDivider = true,
  showTopDivider = false
}: StoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const hasInteractedRef = useRef(false)
  const cardRef = useRef<HTMLDivElement>(null)
  
  // Optional prefetch: user settings when card is expanded to warm DB/cache
  const shouldPrefetch = isExpanded && !!authArgs
  const prefetchedSettings = useQuery(api.stories.settings.getCurrentSettings, shouldPrefetch ? authArgs! : 'skip')

  const handleClick = () => {
    const wasExpanded = isExpanded
    setIsExpanded(!isExpanded)
    hasInteractedRef.current = true
  }

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent triggering the card click
    hasInteractedRef.current = true
    onSelect(suggestion)
  }

  // Get all character names from the suggestion
  const characterNames = useMemo(() => {
    const names = new Set<string>()
    
    // Add main characters
    if (suggestion.characters.main_characters) {
      suggestion.characters.main_characters.forEach(name => names.add(name))
    }
    
    // Add side characters
    if (suggestion.characters.side_characters) {
      suggestion.characters.side_characters.forEach(name => names.add(name))
    }
    
    // Add metadata characters if different
    if (suggestion.metadata.characters) {
      suggestion.metadata.characters.forEach(name => names.add(name))
    }
    
    return Array.from(names)
  }, [suggestion])

  // Use tags from the suggestion
  const storyTags = useMemo(() => {
    // If suggestion has tags, use them
    if (suggestion.tags && suggestion.tags.length > 0) {
      return suggestion.tags
    }
    
    // Fallback: generate tags based on content (for older suggestions without tags)
    const tags = []
    const text = suggestion.text.toLowerCase()
    const genre = suggestion.metadata.genre.toLowerCase()
    
    // Genre-based tags
    if (genre.includes('action') || genre.includes('adventure')) {
      tags.push('action')
    }
    if (genre.includes('romance')) {
      tags.push('romance')
    }
    if (genre.includes('fantasy') || genre.includes('magic')) {
      tags.push('fantasy')
    }
    if (genre.includes('sci-fi') || genre.includes('science')) {
      tags.push('sci-fi')
    }
    if (genre.includes('mystery') || genre.includes('thriller')) {
      tags.push('mystery')
    }
    
    // Content-based tags
    if (text.includes('fight') || text.includes('battle') || text.includes('attack')) {
      tags.push('intense')
    }
    if (text.includes('quick') || text.includes('fast') || text.includes('rush')) {
      tags.push('fast-paced')
    }
    if (text.includes('dark') || text.includes('shadow') || text.includes('night')) {
      tags.push('dark')
    }
    if (text.includes('magic') || text.includes('spell') || text.includes('enchant')) {
      tags.push('magical')
    }
    if (text.includes('emotion') || text.includes('heart') || text.includes('feel')) {
      tags.push('emotional')
    }
    
    // Default tags if none match
    if (tags.length === 0) {
      tags.push('story', 'adventure')
    }
    
    // Limit to 3 tags for fallback
    return tags.slice(0, 3)
  }, [suggestion.tags, suggestion.text, suggestion.metadata.genre])

  // Process text to wrap character names in markers
  const processedText = useMemo(() => {
    let text = suggestion.text
    
    // Sort by length (longest first) to avoid partial matches
    const sortedNames = [...characterNames].sort((a, b) => b.length - a.length)
    
    sortedNames.forEach(name => {
      // Try full name first
      const fullNameRegex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (fullNameRegex.test(text)) {
        text = text.replace(fullNameRegex, `{{CHARACTER:${name}}}`)
      } else {
        // If full name not found, try just the first part (before space)
        const firstName = name.split(' ')[0]
        if (firstName && firstName !== name) {
          const firstNameRegex = new RegExp(`\\b${firstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
          text = text.replace(firstNameRegex, `{{CHARACTER:${name}}}`)
        }
      }
    })
    
    return text
  }, [suggestion.text, characterNames])

  return (
    <>
      <div 
        ref={cardRef}
        onClick={handleClick}
        className="relative z-0 bg-stone-800/20 backdrop-blur-xl hover:bg-white/5 transition-all cursor-pointer p-4 md:px-8 md:py-4"
      >
        {showTopDivider && (
          <div className="absolute inset-x-0 top-0">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>
        )}
      {/* Header with source */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-white/70 text-sm uppercase tracking-wider">
          {suggestion.metadata.storyType === 'inspired' 
            ? `Inspired by ${suggestion.metadata.primarySource}`
            : suggestion.metadata.primarySource
          }
        </span>
        <div className="flex items-center gap-2 text-white/60 text-[10px] md:text-xs">
          <span>{suggestion.metadata.genre.charAt(0).toUpperCase() + suggestion.metadata.genre.slice(1)}</span>
          <span>•</span>
          <span>{suggestion.metadata.playerMode ? 'Player' : 'Reader'}</span>
        </div>
      </div>

      {/* Story preview text with fade effect */}
      <div className={`relative text-white/90 text-sm md:text-[16px] leading-snug ${isExpanded ? 'mb-4' : 'mb-0'} transition-all duration-300 ${!isExpanded ? 'max-h-[4.5rem] overflow-hidden' : 'max-h-none'}`}>
        <div 
          className={!isExpanded ? 'line-clamp-3' : ''}
          style={!isExpanded ? {
            WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 95%)',
            maskImage: 'linear-gradient(to bottom, black 0%, black 60%, transparent 95%)'
          } : {}}
        >
          <ReactMarkdown
            components={{
              p: ({ children }) => {
                // Process children to replace character markers
                const processChildren = (children: React.ReactNode): React.ReactNode => {
                  if (typeof children === 'string') {
                    const parts = children.split(/(\{\{CHARACTER:[^}]+\}\})/g)
                    return parts.map((part, index) => {
                      const match = part.match(/\{\{CHARACTER:([^}]+)\}\}/)
                      if (match) {
                        const characterName = match[1]
                        return (
                          <span
                            key={index}
                            className="text-blue-200/80"
                          >
                            {characterName}
                          </span>
                        )
                      }
                      return part
                    })
                  }
                  if (Array.isArray(children)) {
                    return children.map((child) => processChildren(child))
                  }
                  return children
                }
                
                return <>{processChildren(children)}</>
              },
              strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
              em: ({ children }) => <em className="italic text-white/80">{children}</em>,
            }}
          >
            {processedText}
          </ReactMarkdown>
        </div>
      </div>

      {/* Tags when collapsed - show only first 3 */}
      {!isExpanded && (
        <div className="flex items-center justify-start mt-3">
          <span className="text-white/60 text-[10px] md:text-[13px] italic">
            {storyTags.slice(0, 3).join(' • ')}
            {storyTags.length > 3 && `...`}
          </span>
        </div>
      )}

      {/* Footer with tags and Start button when expanded */}
      {isExpanded && (
        <>
          {/* Tags and Start button on same row */}
          <div className="flex items-start justify-between mt-4 gap-4">
            <span className="text-white/60 text-[10px] md:text-[13px] italic flex-1 leading-relaxed">
              {storyTags.join(' • ')}
            </span>
            <button
              onClick={handleStart}
              className="px-4 py-2 hover:bg-sky-500/30 text-white/90 rounded-md transition-colors font-medium flex-shrink-0 border border-white/20"
            >
              Start
            </button>
          </div>
        </>
      )}
      </div>
      {/* Divider below the card */}
      {showDivider && (
        <div
          role="separator"
          aria-hidden="true"
          className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
        />
      )}
    </>
  )
})