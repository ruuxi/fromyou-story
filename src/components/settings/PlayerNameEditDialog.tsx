"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

interface PlayerNameEditDialogProps {
  isOpen: boolean
  currentName?: string
  onSave: (name: string) => void
  onCancel: () => void
}

export function PlayerNameEditDialog({
  isOpen,
  currentName,
  onSave,
  onCancel,
}: PlayerNameEditDialogProps) {
  const [name, setName] = useState(currentName || "")

  useEffect(() => {
    if (isOpen) {
      setName(currentName || "")
    }
  }, [isOpen, currentName])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
      if (e.key === "Enter" && name.trim()) {
        handleSave()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isOpen, onCancel, name])

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim())
    }
  }

  if (!isOpen) return null

  const dialogContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" data-dialog-root="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="relative z-10 w-full max-w-sm mx-4 glass-secondary border border-white/20 text-white shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200"
           style={{ borderRadius: 'var(--fy-radius-expanded, 20px)' }}>
        {/* Prevent outside-close handlers from seeing dialog interactions */}
        <div className="absolute inset-0 pointer-events-none" />
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-base font-semibold" style={{ color: 'var(--fy-text-strong, rgba(255, 255, 255, 0.90))' }}>
            Edit Player Name
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-white/50 hover:text-white/80 transition-all duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your player name"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white placeholder-white/50 
                     focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 
                     transition-all duration-300"
            style={{ 
              borderRadius: 'var(--fy-radius-button, 16px)',
              color: 'var(--fy-text-strong, rgba(255, 255, 255, 0.90))'
            }}
            autoFocus
          />
        </div>
        
        <div className="px-4 py-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 transition-all duration-300"
            style={{ 
              borderRadius: 'var(--fy-radius-button, 16px)',
              color: 'var(--fy-text-muted, rgba(255, 255, 255, 0.70))'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
            style={{ 
              borderRadius: 'var(--fy-radius-button, 16px)',
              color: 'var(--fy-text-strong, rgba(255, 255, 255, 0.90))'
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )

  // Use portal to render outside the component tree
  return createPortal(dialogContent, document.body)
}
