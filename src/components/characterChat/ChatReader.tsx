'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { useChat } from '@ai-sdk/react'
import { useAuthedTransport } from '@/hooks/useAuthedTransport'
import { ChatMessageList } from './ChatMessageList'
import { ChatSettingsDialog } from './ChatSettingsDialog'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { UsagePill } from './UsagePill'
import { useNavigation } from '@/contexts/NavigationContext'
import { useSettings } from '@/hooks/useSettings'
import { useAuthState } from '@/hooks/useAuthState'

export function ChatReader({ chat }: { chat: any }) {
  const [activeSpeaker, setActiveSpeaker] = useState<string>(chat.participants?.[0] || '')
  const [isOOC, setIsOOC] = useState(false)
  const { settings } = useSettings()
  const { authArgs } = useAuthState()
  const transport = useAuthedTransport('/api/character/chat', { chatId: chat._id, speaker: activeSpeaker, ooc: isOOC, modelOverride: settings.openrouterModelOverride })
  const chatCtl = useChat({ id: `chat-${chat._id}`, transport })
  const { sendMessage, stop, status } = chatCtl
  const [pendingUserText, setPendingUserText] = useState<string>('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const seedGreeting = useMutation(api.chats.index.seedGreeting)

  const onSubmit = async () => {
    const val = inputRef.current?.value || ''
    if (!val.trim()) return
    
    await sendMessage({ text: val })
    if (inputRef.current) inputRef.current.value = ''
  }

  // Seed basic greeting if chat is empty
  useEffect(() => {
    const maybeSeed = async () => {
      if (!authArgs) return // Wait for auth to be ready
      
      try {
        const characterName = chat.participants?.[0] || 'Character'
        const fallbackGreetings = [
          `Hello! I'm ${characterName}. It's nice to meet you.`,
          `*${characterName} approaches with a friendly smile* Hey there!`,
          `Greetings! ${characterName} here. How can I help you today?`,
          `*${characterName} waves* Hello! What brings you here?`,
          `Hi! I'm ${characterName}. What would you like to talk about?`,
        ]
        const greeting = fallbackGreetings[Math.floor(Math.random() * fallbackGreetings.length)]
        
        await seedGreeting({ ...authArgs, chatId: chat._id, content: greeting, name: characterName })
      } catch (error) {
        console.error('Failed to seed greeting:', error)
      }
    }
    maybeSeed()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat._id, authArgs])

  // Set chat header title for navigation
  const { chatSendHandlerRef, setChatHeaderTitle } = useNavigation()
  useEffect(() => {
    // Get the first participant name (primary character) for the title
    const characterName = chat.participants?.[0] || 'Unknown'
    setChatHeaderTitle(`${characterName} - Chat`)
    
    // Clear title when component unmounts
    return () => setChatHeaderTitle(undefined)
  }, [chat.participants, setChatHeaderTitle])

  // Register chat send handler to bottom SearchContainer
  useEffect(() => {
    chatSendHandlerRef.current = async (text: string) => {
      if (!text || !text.trim()) return
      
      setPendingUserText(text)
      try {
        await sendMessage({ text })
      } finally {
        // Clear pending once server persistence will reflect via query shortly
        setPendingUserText('')
      }
    }
    return () => { chatSendHandlerRef.current = null }
  }, [chatSendHandlerRef, sendMessage, chat._id])

  return (
    <div className="min-h-screen -mb-7 pb-6 glass-primary bg-gradient-to-br from-amber-900/10 via-sky-900/15 to-purple-900/5 flex flex-col">
      <div className="px-4 md:px-6 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-white/80 text-lg font-semibold flex items-center gap-2">
            <span>{chat.title || chat.participants?.join(' · ') || 'Chat'}</span>
            <UsagePill chatId={chat._id} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/60 flex items-center gap-1">
              <input type="checkbox" className="accent-amber-400" checked={isOOC} onChange={(e) => setIsOOC(e.target.checked)} />
              OOC
            </label>
            {chat.isGroup && (
              <select value={activeSpeaker} onChange={(e) => setActiveSpeaker(e.target.value)} className="text-xs bg-white/10 border border-white/15 text-white/80 rounded px-2 py-1">
                {chat.participants?.map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
            <button onClick={() => setShowSettings(true)} className="md:hidden text-xs px-2 py-1 rounded-md bg-white/10 border border-white/15 text-white/80">Settings</button>
          </div>
        </div>
        {chat.participants?.length > 0 && (
          <div className="text-white/50 text-xs mt-1">Participants: {chat.participants.join(', ')}</div>
        )}
      </div>
      <div className="flex-1 min-h-0">
        <ChatMessageList chatId={chat._id} isTyping={status === 'submitted' || status === 'streaming'} pendingUserText={pendingUserText} speaker={activeSpeaker} ooc={isOOC} />
      </div>
      {showSettings && <ChatSettingsDialog chat={chat} onClose={() => setShowSettings(false)} />}
    </div>
  )
}


