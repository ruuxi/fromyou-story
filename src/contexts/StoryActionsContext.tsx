'use client'

import { createContext, use, useState, ReactNode, useMemo } from 'react'

interface StoryAction {
  id: string
  text: string
  type: string
}

interface StoryActionsContextType {
  storyActions: StoryAction[]
  setStoryActions: (actions: StoryAction[]) => void
  generateNextPage: (message?: string) => void
}

const StoryActionsContext = createContext<StoryActionsContextType | null>(null)

export function StoryActionsProvider({ children }: { children: ReactNode }) {
  const [storyActions, setStoryActions] = useState<StoryAction[]>([])

  const generateNextPage = (message?: string) => {
    // Trigger next page generation via custom event
    const prompt = message || 'Continue the story from the previous point.'
    const event = new CustomEvent('storyViewerSendMessage', {
      detail: { text: prompt }
    })
    window.dispatchEvent(event)
  }

  const value = useMemo(() => ({ storyActions, setStoryActions, generateNextPage }), [storyActions])

  return (
    <StoryActionsContext value={value}>
      {children}
    </StoryActionsContext>
  )
}

export function useStoryActionsContext() {
  const context = use(StoryActionsContext)
  if (!context) {
    throw new Error('useStoryActionsContext must be used within StoryActionsProvider')
  }
  return context
}