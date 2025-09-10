'use client'

interface CharacterGridSkeletonProps {
  title?: string
  showSource?: boolean
  count?: number
}

export function CharacterGridSkeleton({ 
  title, 
  showSource = false,
  count = 8 
}: CharacterGridSkeletonProps) {
  return (
    <div className="mb-4">
      {title && (
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-amber-50/90 text-xs font-semibold">{title}</h3>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 md:gap-2">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className={`px-1.5 py-1 md:px-3 md:py-2 bg-amber-100/5 border border-amber-100/10 rounded-lg flex-shrink-0 animate-pulse ${
              showSource ? 'flex flex-col items-start' : ''
            }`}
          >
            <div className="h-2.5 md:h-3 bg-amber-100/10 rounded w-16 md:w-20 mb-0.5 md:mb-1"></div>
            {showSource && (
              <div className="h-1.5 md:h-2 bg-amber-100/5 rounded w-12 md:w-16 mt-0.5"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}