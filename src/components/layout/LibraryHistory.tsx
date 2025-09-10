'use client'

import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

type LibraryItem = {
  type: 'story' | 'chat'
  id: string
  title: string
  subtitle: string
  updatedAt?: number
  href: string
}

export function LibraryHistory() {
  const { authArgs } = useAuthState()
  const router = useRouter()
  const [limit, setLimit] = useState(10)
  const scrollContainerRef = useRef<any>(null)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const deleteStory = useMutation(api.stories.mutations.deleteStory)
  const deleteChat = useMutation(api.chats.index.deleteChat)

  const storyPage = useQuery(
    api.queries.stories.getStoryHistory,
    authArgs ? { ...(authArgs as any), limit } : 'skip'
  ) as { items: any[]; nextCursor?: any } | undefined
  const stories = storyPage?.items || []
  const chats = useQuery(api.chats.index.listChats, authArgs ? { ...(authArgs as any), limit } : 'skip') as any[] | undefined

  const items = useMemo<LibraryItem[]>(() => {
    const storyItems = (stories || []).map((s: any) => ({
      type: 'story' as const,
      id: s._id,
      title: s.title,
      subtitle: (s.characters || []).join(' · '),
      updatedAt: s.updatedAt,
      href: `/s/${s._id}`,
    }))
    const chatItems = (chats || [])
      .filter((c: any) => c.isActive !== false)
      .map((c: any) => ({
        type: 'chat' as const,
        id: c._id,
        title: c.title || (c.participants || []).join(' · ') || 'Untitled Chat',
        subtitle: c.lastPreview || '',
        updatedAt: c.updatedAt || c.lastMessageAt || c._creationTime,
        href: `/c/${c._id}`,
      }))
    return [...storyItems, ...chatItems].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
  }, [stories, chats])

  useEffect(() => {
    const rootEl = scrollContainerRef.current?.getScrollElement?.()
    const trigger = loadMoreRef.current
    if (!rootEl || !trigger) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLimit((l) => l + 12)
        }
      },
      { root: rootEl, rootMargin: '120px', threshold: 0 }
    )

    observer.observe(trigger)
    return () => observer.disconnect()
  }, [scrollContainerRef.current, loadMoreRef.current])

  const onDelete = useCallback(async (item: LibraryItem) => {
    if (!authArgs) return
    const key = `${item.type}-${item.id}`
    if (confirmDeleteId !== key) {
      setConfirmDeleteId(key)
      return
    }
    try {
      if (item.type === 'story') {
        await deleteStory({ ...(authArgs as any), storyId: item.id as any })
      } else {
        await deleteChat({ ...(authArgs as any), chatId: item.id as any })
      }
    } finally {
      setConfirmDeleteId(null)
    }
  }, [authArgs, confirmDeleteId, deleteStory, deleteChat])

  return (
    <div className="flex flex-col h-full">
      <style dangerouslySetInnerHTML={{ __html: `
        .simplebar-scrollbar::before { background-color: rgba(255,255,255,0.3) !important; border-radius: 4px !important; }
        .simplebar-scrollbar:hover::before { background-color: rgba(255,255,255,0.5) !important; }
        .simplebar-track.simplebar-vertical, .simplebar-track.simplebar-horizontal { background: transparent !important; }
      `}} />
      <div className="pl-2 pr-6 py-3">
        <h3 className="text-base font-semibold text-white/70">Library</h3>
      </div>
      <SimpleBar ref={scrollContainerRef} className="flex-1">
        <div className="px-2 pr-4 pb-8 space-y-2">
          {items.length === 0 ? (
            <div className="text-white/60 text-sm px-2">No history yet.</div>
          ) : (
            items.map((item) => {
              const key = `${item.type}-${item.id}`
              const isConfirming = confirmDeleteId === key
              return (
                <div
                  key={key}
                  className="w-full text-left"
                >
                  <div
                    className="hover:bg-white/5 transition p-3 border border-white/15 flex items-start justify-between gap-2"
                    onClick={() => router.push(item.href)}
                  >
                    <div className="min-w-0">
                      <div className="text-white/90 text-sm font-medium truncate">{item.title}</div>
                      <div className="text-white/50 text-xs mt-1 truncate">{item.subtitle}</div>
                    </div>
                    <div className="flex items-center gap-1 flex-none">
                      <button
                        type="button"
                        aria-label={isConfirming ? 'Confirm delete' : 'Delete'}
                        onClick={(e) => { e.stopPropagation(); onDelete(item) }}
                        className={
                          isConfirming
                            ? 'px-2 py-1 text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 border border-rose-400/30'
                            : 'px-2 py-1 text-white/70 hover:text-white hover:bg-white/10 border border-white/20'
                        }
                        title={isConfirming ? 'Click to confirm' : 'Delete'}
                      >
                        {isConfirming ? 'Confirm' : (
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
          {/* Infinite scroll trigger */}
          <div ref={loadMoreRef} className="h-6" />
        </div>
      </SimpleBar>
    </div>
  )
}


