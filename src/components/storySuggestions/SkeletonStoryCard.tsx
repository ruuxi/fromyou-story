'use client'

import { memo } from 'react'

export const SkeletonStoryCard = memo(function SkeletonStoryCard() {
  return (
    <div className="bg-stone-800/25 backdrop-blur-xl p-8 w-full">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-32 bg-white/10 rounded overflow-hidden relative">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
          <div className="h-4 w-16 bg-white/10 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 animate-shimmer" />
          </div>
        </div>
      </div>

      {/* Story preview text skeleton - matches line-clamp-4 */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-white/10 rounded overflow-hidden relative">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
        <div className="h-4 bg-white/10 rounded overflow-hidden relative">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
        <div className="h-4 bg-white/10 rounded overflow-hidden relative">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
        <div className="h-4 bg-white/10 rounded overflow-hidden relative w-4/5">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
      </div>

      {/* Footer skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-3 w-40 bg-white/10 rounded overflow-hidden relative">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
        <div className="h-5 w-5 bg-white/10 rounded overflow-hidden relative">
          <div className="absolute inset-0 animate-shimmer" />
        </div>
      </div>
    </div>
  )
})