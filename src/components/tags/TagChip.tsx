'use client'

import { memo } from 'react'
import { X } from 'lucide-react'

interface TagChipProps {
  tag: string
  weight?: number
  selected?: boolean
  onSelect?: () => void
  onRemove?: () => void
  showWeight?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'suggested' | 'preference' | 'default'
}

export const TagChip = memo(function TagChip({ 
  tag, 
  weight, 
  selected = false,
  onSelect,
  onRemove,
  showWeight = false,
  size = 'md',
  variant = 'default'
}: TagChipProps) {
  const sizeClasses = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-2.5 py-2',
    lg: 'text-base px-2.5 py-2'
  }

  const baseClasses = `
    inline-flex items-center gap-2 rounded-lg border
    backdrop-blur-xl transition-all duration-300
    cursor-pointer font-medium
    ${sizeClasses[size]}
    hover:scale-105 active:scale-95
  `

  const colorClasses = selected
    ? 'border-white/70 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 text-white/90'
    : variant === 'suggested'
    ? 'border-white/20 bg-gradient-to-br from-amber-900/6 via-sky-900/4 to-purple-900/3 text-white/80 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4 hover:text-white hover:border-white/30'
    : variant === 'preference' || (weight && weight > 0)
    ? 'border-white/30 bg-gradient-to-br from-amber-900/12 via-sky-900/8 to-purple-900/6 text-white/90 hover:from-amber-900/18 hover:via-sky-900/12 hover:to-purple-900/8 hover:text-white'
    : weight && weight < 0
    ? 'border-white/20 bg-gradient-to-br from-amber-900/6 via-sky-900/4 to-purple-900/3 text-white/60 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4 hover:text-white/80'
    : 'border-white/20 bg-gradient-to-br from-amber-900/6 via-sky-900/4 to-purple-900/3 text-white/80 hover:from-amber-900/10 hover:via-sky-900/6 hover:to-purple-900/4 hover:text-white hover:border-white/30'

  const handleClick = () => {
    if (onSelect && !selected) {
      onSelect()
    }
  }

  // If there's a remove button, use a div instead of button
  const Component = onRemove ? 'div' : 'button'
  
  return (
    <Component
      onClick={onRemove ? undefined : handleClick}
      className={`${baseClasses} ${colorClasses} ${onRemove ? '' : 'cursor-pointer'}`}
      {...(Component === 'button' ? { type: 'button' } : {})}
    >
      <span 
        className="leading-none"
        onClick={onRemove ? handleClick : undefined}
        style={onRemove ? { cursor: 'pointer' } : {}}
      >
        {tag}
      </span>
      
      {showWeight && weight !== undefined && (
        <span className="text-[10px] opacity-60 font-normal">
          {weight > 0 ? '+' : ''}{weight.toFixed(2)}
        </span>
      )}
      
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 text-white/60 hover:text-white"
          type="button"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </Component>
  )
})