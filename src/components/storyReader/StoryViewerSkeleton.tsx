'use client'

interface StoryViewerSkeletonProps {
  onBack: () => void
  sourceTitle?: string
  message?: string
}

export function StoryViewerSkeleton({ message }: StoryViewerSkeletonProps) {
  return (
    <div className="relative">
      {/* Backdrop will be handled by StoryContent for consistency */}
    </div>
  )
} 