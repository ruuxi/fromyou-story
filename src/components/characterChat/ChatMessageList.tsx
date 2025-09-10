'use client'

import React, { useEffect, useRef, useState, useMemo, useLayoutEffect, useCallback } from 'react'
import type { UIMessage } from 'ai'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import ReactMarkdown from 'react-markdown'
import { useAuth } from '@clerk/nextjs'
import { useSettings } from '@/hooks/useSettings'

export function ChatMessageList({ chatId, isTyping = false, pendingUserText, speaker, ooc }: { chatId?: string; isTyping?: boolean; pendingUserText?: string; speaker?: string; ooc?: boolean }) {
  const { authArgs } = useAuthState()
  const { sessionId } = useAuthState()
  const { getToken } = useAuth()
  const { settings } = useSettings()
  const [beforeIndex, setBeforeIndex] = useState<number | undefined>(undefined)
  const topSentinelRef = useRef<HTMLDivElement | null>(null)
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null)
  const isNearBottomRef = useRef<boolean>(true)
  const lastScrollHeightRef = useRef<number>(0)
  const scrollContainerRef = useRef<HTMLElement | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<string>('')
  const [retrying, setRetrying] = useState<boolean>(false)
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null)
  const editElementRef = useRef<HTMLDivElement | null>(null)
  const editSetupRef = useRef<boolean>(false)

  const updateMessage = useMutation(api.chats.index.updateMessage)
  const deleteMessage = useMutation(api.chats.index.deleteMessage)

  const getIsNearBottom = (parent: HTMLElement) => {
    const remaining = parent.scrollHeight - parent.scrollTop - parent.clientHeight
    return remaining <= 160 // px threshold considered "near" bottom
  }

  const scrollToBottom = (behavior: 'auto' | 'smooth' = 'smooth') => {
    const el = bottomSentinelRef.current
    if (el) {
      el.scrollIntoView({ behavior, block: 'end', inline: 'nearest' })
      return
    }
    const parent = scrollContainerRef.current
    if (parent) parent.scrollTo({ top: parent.scrollHeight, behavior })
  }

  const findScrollContainer = (start: HTMLElement | null): HTMLElement | null => {
    let node: HTMLElement | null = start
    const docElement = document.scrollingElement as HTMLElement | null
    while (node) {
      const style = window.getComputedStyle(node)
      const overflowY = style.overflowY
      const canScroll = (overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight
      if (canScroll) return node
      node = node.parentElement
    }
    return docElement
  }
  const page = useQuery(
    api.chats.index.getMessagesPage,
    authArgs && chatId
      ? ({ ...(authArgs as any), chatId: chatId as any, limit: 40, ...(beforeIndex !== undefined ? { beforeIndex } : {}) } as any)
      : 'skip'
  ) as any

  // Accumulate paginated results so older pages do not replace the list
  const [accumulated, setAccumulated] = useState<any[]>([])

  // Reset pagination and accumulation when chat changes
  useEffect(() => {
    setBeforeIndex(undefined)
    setAccumulated([])
  }, [chatId])

  useEffect(() => {
    if (!page || !Array.isArray(page.items)) return
    setAccumulated((prev) => {
      if (beforeIndex === undefined) {
        // Fresh/latest page replaces accumulated to avoid unbounded growth
        return page.items
      }
      // Merge older page at the front, de-dupe by _id, then sort by messageIndex
      const byId = new Map<string, any>()
      for (const m of prev) byId.set(String(m._id), m)
      for (const m of page.items) byId.set(String(m._id), m)
      const merged = Array.from(byId.values())
      merged.sort((a: any, b: any) => (a.messageIndex ?? 0) - (b.messageIndex ?? 0))
      return merged
    })
  }, [page, beforeIndex])

  // Use only server-persisted messages from the accumulated list for display
  const items: UIMessage[] = useMemo(() => {
    return Array.isArray(accumulated)
      ? accumulated.map((m: any) => ({ id: `${m._id}`, role: m.role, parts: [{ type: 'text', text: m.content }] }))
      : []
  }, [accumulated])

  const hasPendingAlready = useMemo(() => {
    if (!pendingUserText) return false
    const needle = pendingUserText.trim()
    return items.some((m) => {
      if (m.role !== 'user') return false
      const text = (m.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('').trim()
      return text === needle
    })
  }, [items, pendingUserText])

  // Determine scroll container and set initial near-bottom
  useLayoutEffect(() => {
    const el = topSentinelRef.current
    if (!el) return
    const container = findScrollContainer(el.parentElement as HTMLElement | null)
    scrollContainerRef.current = container
    if (container) {
      isNearBottomRef.current = getIsNearBottom(container)
      lastScrollHeightRef.current = container.scrollHeight
    }
  }, [])

  // Infinite scroll up: when reaching top, load older, and track near-bottom state
  useEffect(() => {
    const parent = scrollContainerRef.current
    if (!parent) return
    const handler = () => {
      if (parent.scrollTop <= 0 && page?.nextBeforeIndex !== undefined) {
        setBeforeIndex(page.nextBeforeIndex)
      }
      // Track whether user is near bottom to conditionally auto-scroll on new items
      isNearBottomRef.current = getIsNearBottom(parent)
      // When user returns near bottom, show latest page again
      if (isNearBottomRef.current && beforeIndex !== undefined) {
        setBeforeIndex(undefined)
      }
    }
    parent.addEventListener('scroll', handler)
    return () => parent.removeEventListener('scroll', handler)
  }, [page?.nextBeforeIndex, beforeIndex])

  // Keep anchored to bottom when content grows and user is near bottom (handles new messages and streaming updates)
  useLayoutEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const prevHeight = lastScrollHeightRef.current
    const nextHeight = container.scrollHeight
    lastScrollHeightRef.current = nextHeight
    const heightIncreased = nextHeight > prevHeight + 2
    if (heightIncreased && isNearBottomRef.current) {
      scrollToBottom('smooth')
    }
  }, [items, isTyping, pendingUserText, hasPendingAlready])

  // Hide action buttons when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMessageId && event.target instanceof Element) {
        const messageElement = event.target.closest(`[data-message-id="${activeMessageId}"]`)
        if (!messageElement) {
          setActiveMessageId(null)
        }
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [activeMessageId])

  // Setup contentEditable element when editing starts
  useEffect(() => {
    if (editingMessageId && editElementRef.current && !editSetupRef.current) {
      const el = editElementRef.current
      el.textContent = editDraft
      editSetupRef.current = true
      
      // Focus and set cursor to end
      setTimeout(() => {
        el.focus()
        const range = document.createRange()
        const sel = window.getSelection()
        range.selectNodeContents(el)
        range.collapse(false)
        sel?.removeAllRanges()
        sel?.addRange(range)
      }, 0)
    }
  }, [editingMessageId, editDraft])

  const latestItemId = items.length > 0 ? items[items.length - 1]?.id : undefined

  const handleStartEdit = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId)
    setEditDraft(currentText)
    setActiveMessageId(null) // Hide actions when editing
    editSetupRef.current = false // Reset setup flag
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditDraft('')
    editSetupRef.current = false
  }

  const handleMessageClick = (messageId: string) => {
    if (editingMessageId) return // Don't show actions when editing
    setActiveMessageId(activeMessageId === messageId ? null : messageId)
  }

  const handleSaveEdit = async (messageId: string) => {
    if (!chatId || !authArgs) return
    const content = editDraft
    await updateMessage({ ...(authArgs as any), messageId: messageId as any, content })
    setEditingMessageId(null)
    setEditDraft('')
    editSetupRef.current = false
  }

  const handleDelete = async (messageId: string) => {
    if (!chatId || !authArgs) return
    const ok = typeof window !== 'undefined' ? window.confirm('Delete this message?') : true
    if (!ok) return
    await deleteMessage({ ...(authArgs as any), messageId: messageId as any })
  }

  const handleRetryAssistant = async (messageId: string) => {
    if (!chatId || !authArgs) return
    try {
      setRetrying(true)
      // Delete the selected (and last) assistant message first
      await deleteMessage({ ...(authArgs as any), messageId: messageId as any })
      const apiBase = process.env.NEXT_PUBLIC_CONVEX_SITE_URL
      if (!apiBase) {
        console.error('Missing NEXT_PUBLIC_CONVEX_SITE_URL; cannot call character chat endpoint')
        return
      }
      let token: string | null = null
      try {
        token = await getToken({ template: 'convex' })
      } catch {
        token = null
      }
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      const body: any = { chatId, speaker, ooc, modelOverride: settings.openrouterModelOverride }
      if (!token && sessionId) body.sessionId = sessionId
      await fetch(`${apiBase}/api/character/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div ref={topSentinelRef} />
      {items.map((m) => {
        const text = (m.parts || []).filter((p: any) => p.type === 'text').map((p: any) => p.text).join('')
        const isAssistant = m.role === 'assistant'
        const alignment = isAssistant ? 'justify-start' : 'justify-end'
        const bubble = isAssistant ? 'bg-white/10 text-white/90' : 'bg-amber-400/20 text-amber-50'
        const isEditing = editingMessageId === m.id
        const canEdit = m.role !== 'system'
        const isLast = latestItemId === m.id
        const isActive = activeMessageId === m.id
        return (
          <div key={m.id} className={`flex ${alignment}`} data-message-id={m.id}>
            <div 
              className={`max-w-[80%] rounded-2xl px-3 py-2 border border-white/15 ${bubble} ${!isEditing ? 'cursor-pointer' : ''}`}
              onClick={() => handleMessageClick(m.id)}
            >
              <div className="text-sm leading-6 prose prose-sm prose-invert max-w-none prose-p:my-2 prose-p:first:mt-0 prose-p:last:mb-0 prose-headings:text-inherit prose-strong:text-inherit prose-em:text-inherit prose-code:text-inherit prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/10 prose-pre:border prose-pre:border-white/20">
                {isEditing ? (
                  <div
                    contentEditable
                    suppressContentEditableWarning
                    className="focus:outline-none whitespace-pre-wrap break-words min-h-[1.5rem]"
                    onClick={(e) => e.stopPropagation()}
                    onInput={(e) => setEditDraft(e.currentTarget.textContent || '')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault();
                        handleSaveEdit(m.id);
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        handleCancelEdit();
                      }
                    }}
                    style={{ caretColor: 'white' }}
                    ref={(el) => {
                      if (editingMessageId === m.id) {
                        editElementRef.current = el;
                      }
                    }}
                  />
                ) : (
                  <ReactMarkdown 
                    components={{
                      p: ({ children }) => <div className="whitespace-pre-wrap break-words">{children}</div>,
                      code: ({ children, className }) => 
                        className ? (
                          <pre className="bg-white/10 border border-white/20 rounded p-2 overflow-x-auto">
                            <code className={className}>{children}</code>
                          </pre>
                        ) : (
                          <code className="bg-white/10 px-1 py-0.5 rounded">{children}</code>
                        )
                    }}
                  >
                    {text}
                  </ReactMarkdown>
                )}
              </div>
              {(isActive && !isEditing) && (
                <div className="mt-2 flex gap-2 justify-end">
                  {canEdit && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleStartEdit(m.id, text); }}
                      className="p-1 text-white/60 hover:text-white transition-colors"
                      title="Edit message"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                  )}
                  {canEdit && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                      className="p-1 text-white/60 hover:text-red-400 transition-colors"
                      title="Delete message"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  )}
                  {isAssistant && isLast && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRetryAssistant(m.id); }}
                      className="p-1 text-white/60 hover:text-white transition-colors"
                      title="Retry assistant response"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
              {isEditing && (
                <div className="mt-2 flex gap-2 justify-end">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleCancelEdit(); }}
                    className="px-2 py-1 text-xs rounded bg-white/10 border border-white/20 text-white/70 hover:text-white/90"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleSaveEdit(m.id); }}
                    className="px-2 py-1 text-xs rounded bg-amber-400/20 border border-white/20 text-amber-50 hover:bg-amber-400/30"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
      {!!pendingUserText && !hasPendingAlready && (
        <div className="flex justify-end">
          <div className={`max-w-[80%] rounded-2xl px-3 py-2 border border-white/15 bg-amber-400/20 text-amber-50 animate-[fadeIn_150ms_ease-out]`}>
            <div className="text-sm leading-6 opacity-90 prose prose-sm prose-invert max-w-none prose-p:my-2 prose-p:first:mt-0 prose-p:last:mb-0 prose-headings:text-inherit prose-strong:text-inherit prose-em:text-inherit prose-code:text-inherit prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-white/10 prose-pre:border prose-pre:border-white/20">
              <ReactMarkdown 
                components={{
                  p: ({ children }) => <div className="whitespace-pre-wrap break-words">{children}</div>,
                  code: ({ children, className }) => 
                    className ? (
                      <pre className="bg-white/10 border border-white/20 rounded p-2 overflow-x-auto">
                        <code className={className}>{children}</code>
                      </pre>
                    ) : (
                      <code className="bg-white/10 px-1 py-0.5 rounded">{children}</code>
                    )
                }}
              >
                {pendingUserText}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}
      {(isTyping || retrying) && (
        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-2xl px-3 py-2 border border-white/15 bg-white/10 text-white/70">
            <div className="flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/60 animate-pulse" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/50 animate-pulse [animation-delay:120ms]" />
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse [animation-delay:240ms]" />
            </div>
          </div>
        </div>
      )}
      {/* Bottom spacer to prevent overlap with the floating search bar */}
      <div style={{ height: 'calc(var(--search-bar-h, 72px) + 32px)' }} />
      <div ref={bottomSentinelRef} />
    </div>
  )
}


