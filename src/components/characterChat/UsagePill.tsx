'use client'

import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'

export function UsagePill({ chatId }: { chatId: string }) {
  const { authArgs } = useAuthState()
  const page = useQuery(
    api.chats.index.getMessagesPage, 
    chatId && authArgs ? { ...(authArgs as any), chatId: chatId as any, limit: 1 } : 'skip'
  ) as any
  const last = Array.isArray(page?.items) && page.items.length > 0 ? page.items[page.items.length - 1] : undefined
  const usage = last?.usage
  if (!usage || (!usage.inputTokens && !usage.outputTokens)) return null
  return (
    <div className="text-[11px] text-white/70 bg-white/10 border border-white/15 rounded-full px-2 py-0.5">
      {usage.inputTokens ? `in ${usage.inputTokens}` : ''}{usage.outputTokens ? `${usage.inputTokens ? ' • ' : ''}out ${usage.outputTokens}` : ''}
    </div>
  )
}


