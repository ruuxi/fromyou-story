'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import Link from 'next/link'

export default function ChatListPage() {
  const { authArgs } = useAuthState()
  const chats = useQuery(api.chats.index.listChats, authArgs ? { ...(authArgs as any), limit: 50 } : 'skip') as any[] | undefined

  return (
    <div className="px-4 md:px-6 py-6">
      <h1 className="text-xl font-semibold text-white/80 mb-4">Chats</h1>
      <div className="space-y-2">
        {Array.isArray(chats) && chats.length > 0 ? chats.map((c: any) => (
          <Link key={c._id} href={`/c/${c._id}`} className="block">
            <div className="bg-white/5 hover:bg-white/10 transition rounded-md border border-white/15 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white/90 text-sm font-medium">{c.title || c.participants?.join(' · ') || 'Untitled Chat'}</div>
                  <div className="text-white/50 text-xs mt-1">{c.lastPreview || ''}</div>
                </div>
              </div>
            </div>
          </Link>
        )) : (
          <div className="text-white/60 text-sm">No chats yet.</div>
        )}
      </div>
    </div>
  )
}


