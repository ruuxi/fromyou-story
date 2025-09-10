'use client'

import { memo, useCallback } from 'react'
import { AlertTriangle, Shield } from 'lucide-react'

interface ContentSafetyToggleProps {
  value: boolean
  onChange: (value: boolean) => void
  label?: string
  description?: string
}

export const ContentSafetyToggle = memo(function ContentSafetyToggle({ 
  value, 
  onChange,
  label = "Goon Mode",
  description = "Enable adult content (18+ only)"
}: ContentSafetyToggleProps) {
  const handleToggle = useCallback(() => {
    onChange(!value)
  }, [value, onChange])

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 transition-all duration-300 hover:bg-white/[0.07]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
            value ? 'bg-rose-500/20' : 'bg-emerald-500/10'
          }`}>
            {value ? (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            ) : (
              <Shield className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <span className="text-white/90 text-sm font-medium">{label}</span>
        </div>
        
        <button
          type="button"
          role="switch"
          aria-checked={value}
          onClick={handleToggle}
          className={`
            relative inline-flex h-7 w-12 items-center rounded-full
            transition-all duration-300 focus:outline-none
            ${value ? 'bg-rose-500/30' : 'bg-white/10'}
          `}
        >
          <span className="sr-only">{label}</span>
          <span
            className={`
              inline-block h-5 w-5 transform rounded-full shadow-lg
              bg-white transition-all duration-300 ease-out
              ${value ? 'translate-x-6' : 'translate-x-1'}
            `}
          />
        </button>
      </div>
      
      {description && (
        <p className="text-xs text-white/50 ml-11">
          {description}
        </p>
      )}
      
      <div className={`overflow-hidden transition-all duration-500 ease-out ${
        value ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="pt-2">
          <p className="text-xs text-rose-300/70 ml-11">
            Adult content enabled. You must be 18+ to use this feature.
          </p>
        </div>
      </div>
    </div>
  )
})