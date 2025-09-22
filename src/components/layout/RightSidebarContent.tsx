'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { Upload } from 'lucide-react'
import { useAuthState } from '@/hooks/useAuthState'
import { SignInButton } from '@clerk/nextjs'

const DynamicRightSidebarMain = dynamic(
  () => import('./RightSidebarMain').then(m => m.RightSidebarMain),
  { ssr: false }
)

export function RightSidebarContent() {
  const [opened, setOpened] = useState(false)
  const { isAnonymous, isLoaded } = useAuthState()

  const handleOpen = () => {
    // Directly open the library without animation
    setOpened(true)
  }

  if (!opened) {
    return (
      <div className="h-full flex items-center">
        <div className="w-80 ml-6">
          <button onClick={handleOpen} className="w-full text-left">
            <div className="hover:bg-white/5 transition-all duration-200 p-5 border border-white/15 hover:border-white/25 flex items-center gap-4 min-h-28 hover:scale-[1.02]">
              <div className="w-10 h-10 flex items-center justify-center text-blue-300">
                <Upload className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-white/90 text-sm font-medium truncate">
                  Import with SillyTavern (beta)
                </div>
                <div className="text-white/60 text-xs mt-2 line-clamp-3">
                  Bring in characters, presets, and lorebooks. Click to open your Library & Create tabs and start organizing your content.
                </div>
              </div>
            </div>
          </button>
          {isLoaded && isAnonymous && (
            <div className="mt-2 text-xs text-white/60">
              <SignInButton mode="modal">
                <button className="underline hover:text-white">Sign in</button>
              </SignInButton>
              <span> for sharing and community features.</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full">
      <DynamicRightSidebarMain />
    </div>
  )
}