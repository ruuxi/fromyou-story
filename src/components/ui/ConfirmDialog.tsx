"use client"

import { useEffect } from "react"

interface ConfirmDialogProps {
  isOpen: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  destructive?: boolean
}

export function ConfirmDialog({
  isOpen,
  title = "Are you sure?",
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  destructive = true,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100]">
      <div
        className="absolute inset-0"
        onClick={onCancel}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-lg border border-white/15 text-white z-50 bg-stone-900/40 backdrop-blur-xl">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-base font-semibold text-white/90">{title}</h3>
          </div>
          {message && (
            <div className="px-4 pt-3 text-sm text-white/70">{message}</div>
          )}
          <div className="px-4 py-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/80"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={
                destructive
                  ? "px-3 py-1.5 rounded-md bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-400/30"
                  : "px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/90 border border-white/20"
              }
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


