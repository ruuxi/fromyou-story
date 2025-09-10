'use client'

import React, { useCallback } from 'react'

export function ChatComposer({ inputRef, onSubmit, isStreaming, onStop, onRetry, onRegenerate, onEditLast }: {
  inputRef: React.RefObject<HTMLTextAreaElement | null>
  onSubmit: () => void
  isStreaming?: boolean
  onStop?: () => void
  onRetry?: () => void
  onRegenerate?: () => void
  onEditLast?: () => void
}) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }, [onSubmit])

  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={inputRef}
        onKeyDown={handleKeyDown}
        placeholder="Write your message..."
        className="flex-1 bg-white/5 border border-white/10 rounded-md p-3 text-white/90 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-white/30"
        rows={3}
      />
      <div className="flex items-center gap-2">
        {isStreaming ? (
          <button type="button" onClick={onStop} className="px-3 py-2 rounded-md bg-red-500/80 hover:bg-red-500 text-white text-sm">Stop</button>
        ) : (
          <button type="button" onClick={onSubmit} className="px-3 py-2 rounded-md bg-amber-400/80 hover:bg-amber-400 text-black text-sm">Send</button>
        )}
        {!isStreaming && (
          <>
            {onRetry && <button type="button" onClick={onRetry} className="px-2 py-2 rounded-md bg-white/10 border border-white/15 text-white/80 text-xs">Retry</button>}
            {onRegenerate && <button type="button" onClick={onRegenerate} className="px-2 py-2 rounded-md bg-white/10 border border-white/15 text-white/80 text-xs">Regenerate</button>}
            {onEditLast && <button type="button" onClick={onEditLast} className="px-2 py-2 rounded-md bg-white/10 border border-white/15 text-white/80 text-xs">Edit last</button>}
          </>
        )}
      </div>
    </div>
  )
}


