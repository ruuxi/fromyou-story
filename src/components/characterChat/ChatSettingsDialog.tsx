'use client'

import React, { useState } from 'react'
import type { UIMessage } from 'ai'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'

type Props = {
  chat: any
  messages?: UIMessage[]
  onClose: () => void
}

export function ChatSettingsDialog({ chat, messages = [], onClose }: Props) {
  const { authArgs } = useAuthState()
  const updateSettings = useMutation(api.chats.index.updateChatSettings)
  
  const [title, setTitle] = useState<string>(chat.title || '')
  const [authorNote, setAuthorNote] = useState<string>(chat.authorNote || '')
  const [memory, setMemory] = useState<string>(chat.memory || '')
  const [formatMode, setFormatMode] = useState<'classic_rp' | 'chatml'>(chat.formatMode || 'classic_rp')
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [statusKind, setStatusKind] = useState<'success' | 'error'>('success')
  
  const showStatus = (msg: string, kind: 'success' | 'error' = 'success') => {
    setStatusKind(kind)
    setStatusMsg(msg)
    window.setTimeout(() => setStatusMsg(null), 2000)
  }

  async function handleSave() {
    try {
      await updateSettings({
        ...authArgs,
        chatId: chat._id,
        title: title.trim() || undefined,
        authorNote: authorNote.trim() || undefined,
        memory: memory.trim() || undefined,
        formatMode
      })
      showStatus('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
      showStatus('Failed to save settings', 'error')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="glass-unified max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Chat Settings</h2>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>

          {statusMsg && (
            <div className={`mb-4 px-3 py-2 rounded text-sm ${
              statusKind === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
            }`}>
              {statusMsg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Chat Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md p-3 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
                placeholder="Enter chat title..."
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Memory (Background context)</label>
              <textarea
                value={memory}
                onChange={(e) => setMemory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md p-3 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
                rows={3}
                placeholder="Background information about the conversation..."
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Author Note (Style guidance)</label>
              <textarea
                value={authorNote}
                onChange={(e) => setAuthorNote(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-md p-3 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
                rows={3}
                placeholder="Instructions for how the AI should respond..."
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Format Mode</label>
              <select
                value={formatMode}
                onChange={(e) => setFormatMode(e.target.value as 'classic_rp' | 'chatml')}
                className="w-full bg-white/5 border border-white/10 rounded-md p-3 text-white/90 text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
              >
                <option value="classic_rp">Classic Roleplay</option>
                <option value="chatml">ChatML</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/10 border border-white/15 text-white/80 rounded-md hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-amber-400/80 hover:bg-amber-400 text-black rounded-md transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}