'use client'

import { useParams } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { ChatReader } from '@/components/characterChat/ChatReader'

export default function ChatReaderPage() {
  const params = useParams() as { chatId: string }
  const { authArgs } = useAuthState()
  const chat = useQuery(api.chats.index.getChat, authArgs && params?.chatId ? { ...(authArgs as any), chatId: params.chatId as any } : 'skip') as any

  if (!chat) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-unified p-6 rounded-lg">
          <div className="text-white/70">Loading chat...</div>
        </div>
      </div>
    )
  }

  return <ChatReader chat={chat} />
}


