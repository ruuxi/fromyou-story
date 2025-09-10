'use client'

interface StoryProgressIndicatorProps {
  currentChapter: number
  currentAct: number
  totalChapters?: number
  totalActs?: number
  storyStatus?: 'ongoing' | 'act_complete' | 'chapter_complete' | 'story_complete'
}

export function StoryProgressIndicator({ 
  currentChapter, 
  currentAct, 
  totalChapters,
  totalActs = 3,
  storyStatus = 'ongoing'
}: StoryProgressIndicatorProps) {
  // Remove the floating chapter/act pill per request
  return null
}