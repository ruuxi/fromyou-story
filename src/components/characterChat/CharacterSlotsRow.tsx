'use client'

import { MessageSquarePlus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { useSearchOverlay } from '@/contexts/SearchOverlayContext'
import { useCharacterSelection } from '@/hooks/useCharacterSelection'



export function CharacterSlotsRow({ groups }: { groups?: string[][] }) {
  const router = useRouter()
  const { authArgs } = useAuthState()
  const createChat = useMutation(api.chats.index.createChat)
  const { characterGroups } = useSearchOverlay()
  const { selectedCharacters } = useCharacterSelection()

  // Prefer provided groups, then overlay groups, then fallback to individual selected characters
  let finalGroups: string[][] = Array.isArray(groups) && groups.length > 0
    ? groups
    : (Array.isArray(characterGroups) && characterGroups.length > 0 ? characterGroups : [])

  if (!finalGroups || finalGroups.length === 0) {
    const names = (selectedCharacters || []).map(c => c.fullName)
    if (names.length > 0) {
      // Each character should be separate for chats, not paired; cap to 12 characters
      finalGroups = names.slice(0, 12).map(name => [name])
    } else {
      finalGroups = []
    }
  }

  const handleStart = async (names: string[]) => {
    if (!names || names.length === 0) return
    const chatId = await createChat({ ...(authArgs as any), participants: names, formatMode: 'classic_rp' as any })
    router.push(`/c/${chatId}`)
  }

  if (!finalGroups || finalGroups.length === 0) return null

  return (
    <>
      {/* Top divider to match StoryCard styling */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      
      <div className="relative z-0 bg-stone-800/20 backdrop-blur-xl hover:bg-white/5 transition-all p-4 md:px-8 md:py-4">
        <div className="flex flex-wrap gap-2">
          {finalGroups.slice(0, 8).map((group, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleStart(group)}
              className="flex items-center gap-2 px-2 py-1 rounded-md bg-white/10 hover:bg-white/15 text-white/80 text-xs border border-white/10"
              title={`Start chat with ${group.join(', ')}`}
            >
              <MessageSquarePlus className="w-3.5 h-3.5" />
              <span className="truncate max-w-[180px]">{group.join(' · ')}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}


