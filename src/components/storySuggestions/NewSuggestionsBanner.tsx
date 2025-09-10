'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface NewSuggestionsBannerProps {
  show: boolean
  onDismiss: () => void
  onScrollToNew: () => void
  count: number
}

export function NewSuggestionsBanner({ show, onDismiss, onScrollToNew, count }: NewSuggestionsBannerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      // Small delay for animation
      const timer = setTimeout(() => setIsVisible(true), 100)
      return () => clearTimeout(timer)
    } else {
      setIsVisible(false)
    }
  }, [show])

  const handleClick = () => {
    onScrollToNew()
    // Dismiss after a short delay to allow scroll animation
    setTimeout(onDismiss, 500)
  }

  if (!show && !isVisible) return null

  return (
    <div 
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <button
        onClick={handleClick}
        className="group relative flex items-center gap-3 px-6 py-3 
                   bg-gradient-to-r from-amber-400/20 to-rose-400/20 
                   backdrop-blur-xl border border-amber-100/30 rounded-full
                   hover:from-amber-400/30 hover:to-rose-400/30
                   hover:border-amber-100/40 transition-all duration-300
                   shadow-lg shadow-amber-900/20"
      >
        <span className="text-amber-50 font-medium">
          {count} new {count === 1 ? 'suggestion' : 'suggestions'} available
        </span>
        <ChevronDown className="w-5 h-5 text-amber-100 animate-bounce" />
        
        {/* Shimmer effect */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full 
                          bg-gradient-to-r from-transparent via-amber-100/10 to-transparent 
                          transition-transform duration-1000" />
        </div>
      </button>
    </div>
  )
}