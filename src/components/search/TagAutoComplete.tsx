'use client'

import { memo, useState, useEffect } from 'react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { TagChip } from '@/components/tags/TagChip'
import { Loader2 } from 'lucide-react'

interface TagAutoCompleteProps {
  query: string
  selectedTags: string[]
  selectedRule: string | null
  onTagSelect: (tag: string) => void
  onTagRemove: (tag: string) => void
  onRuleSelect: (rule: string) => void
  onRuleRemove: () => void
  onConfirm?: () => void
  onCancel?: () => void
  isConfirming?: boolean
  showActions?: boolean
  // When false, hide rule chip and the "Add rule" suggestion UI. Useful when the rule is managed elsewhere.
  showRuleControls?: boolean
}

export const TagAutoComplete = memo(function TagAutoComplete({
  query,
  selectedTags,
  selectedRule,
  onTagSelect,
  onTagRemove,
  onRuleSelect,
  onRuleRemove,
  onConfirm,
  onCancel,
  isConfirming = false,
  showActions = true,
  showRuleControls = true
}: TagAutoCompleteProps) {
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const getTagSuggestions = useAction(api.stories.tagSuggestions.getTagSuggestions)

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestedTags([])
      return
    }

    const fetchSuggestions = async () => {
      setIsLoading(true)
      try {
        const tags = await getTagSuggestions({ query, topN: 6 })
        setSuggestedTags(tags)
      } catch (error) {
        console.error('Error fetching tag suggestions:', error)
        setSuggestedTags([])
      } finally {
        setIsLoading(false)
      }
    }

    // Debounce the search
    const timer = setTimeout(fetchSuggestions, 800)
    return () => clearTimeout(timer)
  }, [query, getTagSuggestions])

  const availableTags = suggestedTags.filter(tag => !selectedTags.includes(tag))
  
  // Check if we should show "Add rule" option
  const trimmedQuery = query.trim()
  const showAddRule = showRuleControls &&
    trimmedQuery.length >= 2 &&
    trimmedQuery !== selectedRule &&
    !suggestedTags.includes(trimmedQuery)

  return (
    <div className="space-y-6">
      {/* Selected Rule (optional UI) */}
      {showRuleControls && selectedRule && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-500">
          <h4 className="text-xs text-white/50 font-medium uppercase tracking-widest">
            Rule
          </h4>
          <div className="flex flex-wrap gap-2">
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <TagChip
                tag={`"${selectedRule}"`}
                selected
                onRemove={onRuleRemove}
                size="sm"
                variant="preference"
              />
            </div>
          </div>
        </div>
      )}

      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-500">
          <h4 className="text-xs text-white/50 font-medium uppercase tracking-widest">
            Selected • {selectedTags.length}
          </h4>
          <div className="flex flex-wrap gap-2">
            {selectedTags.map((tag, index) => (
              <div
                key={`${tag}-${index}`}
                className="animate-in fade-in zoom-in-95 duration-300"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <TagChip
                  tag={tag}
                  selected
                  onRemove={() => onTagRemove(tag)}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested Tags */}
      {query.trim().length >= 2 && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <h4 className="text-xs text-white/50 font-medium uppercase tracking-widest">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Searching...
              </span>
            ) : (
              'Suggestions'
            )}
          </h4>
          
          {!isLoading && (showAddRule || availableTags.length > 0) && (
            <div className="flex flex-wrap gap-2">
              {showAddRule && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <TagChip
                    tag={`Add rule: "${trimmedQuery}"`}
                    onSelect={() => onRuleSelect(trimmedQuery)}
                    size="sm"
                    variant="suggested"
                  />
                </div>
              )}
              
              {availableTags.map((tag, index) => (
                <div
                  key={tag}
                  className="animate-in fade-in zoom-in-95 duration-300"
                  style={{ animationDelay: `${(showAddRule ? index + 1 : index) * 20}ms` }}
                >
                  <TagChip
                    tag={tag}
                    onSelect={() => onTagSelect(tag)}
                    size="sm"
                    variant="suggested"
                  />
                </div>
              ))}
            </div>
          )}
          
          {!isLoading && availableTags.length === 0 && suggestedTags.length === 0 && !showAddRule && (
            <p className="text-sm text-white/40 text-center py-4">No matches found</p>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {showActions && selectedTags.length > 0 && onConfirm && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 py-3 bg-white/10 hover:bg-white/15 
                     text-white rounded-2xl transition-all duration-300
                     text-sm font-medium backdrop-blur-xl
                     hover:scale-[1.02] active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isConfirming ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Updating Feed...
              </>
            ) : (
              <>Update Feed</>
            )}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-6 py-3 text-white/70 hover:text-white rounded-2xl transition-all duration-300 text-sm bg-gradient-to-br from-amber-900/5 via-sky-900/3 to-purple-900/2 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4"
            >
              Cancel
            </button>
          )}
        </div>
      )}
    </div>
  )
})