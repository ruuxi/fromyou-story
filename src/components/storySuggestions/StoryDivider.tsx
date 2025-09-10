'use client'

export function StoryDivider() {
  return (
    <div className="relative w-full overflow-hidden" role="separator" aria-hidden="true">
      {/* Base thin line with soft edges */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      {/* Slightly stronger center to appear thicker */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 w-2/3 h-px bg-white/25" />
    </div>
  )
}