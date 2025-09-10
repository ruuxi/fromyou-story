'use client'

import React, { useEffect, useRef } from 'react'
import { ArrowUp } from 'lucide-react'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  isStoryMode?: boolean
  onGenerateNextPage?: () => void
  onSubmit?: (text: string) => void
  onFocus?: () => void
  onBlur?: () => void
  multiline?: boolean
  autoGrow?: boolean
  showSubmitButton?: boolean
  submitLabel?: string
  variant?: 'contained' | 'plain'
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  isStoryMode = false,
  onGenerateNextPage,
  onSubmit,
  onFocus,
  onBlur,
  multiline = true,
  autoGrow = true,
  showSubmitButton = true,
  submitLabel = 'Update',
  variant = 'contained',
}: SearchInputProps) {
  const isDisabled = false
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const rightPaddingClasses = showSubmitButton
    ? (isStoryMode ? 'pr-14 md:pr-16' : 'pr-14 md:pr-16')
    : (isStoryMode ? 'pr-8 md:pr-10' : 'pr-4 md:pr-6')

  const handleSubmit = () => {
    if (isStoryMode) {
      if (value.trim()) {
        if (onSubmit) {
          onSubmit(value.trim())
          onChange('')
        }
      } else if (onGenerateNextPage) {
        onGenerateNextPage()
      }
    } else {
      if (onSubmit) onSubmit(value.trim())
    }
  }

  useEffect(() => {
    if (!autoGrow || !multiline) return
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, autoGrow, multiline])

  return (
    <div className={`relative ${isStoryMode ? 'mt-0.5 md:mt-1 mb-0 md:mb-0.5' : 'mt-0.5 md:mt-1 mb-3 md:mb-2'}`}>
      <div
        className={`${
          variant === 'plain' || isStoryMode
            ? 'relative bg-transparent border-0 rounded-none'
            : `relative cursor-text rounded-2xl border ${
                isDisabled ? 'border-white/[0.06]' : 'border-white/[0.06]'
              } transition-all duration-200`
              + ' bg-gradient-to-br from-amber-900/15 via-sky-900/10 to-purple-900/8'
              + ' hover:from-amber-900/20 hover:via-sky-900/15 hover:to-purple-900/10'
        }`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <div className={`absolute inset-y-0 left-0 ${isStoryMode ? 'pl-1 md:pl-2' : 'pl-3 md:pl-4'} flex items-center pointer-events-none z-10`}>
          <svg className="h-4 md:h-5 w-4 md:w-5 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {multiline ? (
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isDisabled}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSubmit()
              }
            }}
            className={`w-full ${isStoryMode ? 'pl-6 md:pl-7' : 'pl-8 md:pl-10'} ${rightPaddingClasses} ${
              isStoryMode ? 'py-2.5 md:py-3' : 'pt-2.5 pb-2 md:pt-2.5 md:pb-3'
            } text-base bg-transparent text-white/90 placeholder-white/50 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus:ring-offset-0 focus:shadow-none ${
              isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-text'
            } ${variant === 'plain' || isStoryMode ? '' : 'rounded-2xl'} resize-none font-medium leading-none flex items-center`}
            style={{ WebkitTapHighlightColor: 'transparent', overflow: 'hidden' }}
          />
        ) : (
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={isDisabled}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSubmit()
              }
            }}
            className={`w-full ${isStoryMode ? 'pl-6 md:pl-7' : 'pl-8 md:pl-10'} ${rightPaddingClasses} ${
              isStoryMode ? 'py-2.5 md:py-3' : 'pt-3 pb-2 md:pt-2.5 md:pb-3'
            } text-base bg-transparent text-white/90 placeholder-white/50 outline-none focus:outline-none ring-0 focus:ring-0 focus-visible:ring-0 ring-offset-0 focus:ring-offset-0 focus:shadow-none ${
              isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-text'
            } ${variant === 'plain' || isStoryMode ? '' : 'rounded-2xl'} font-medium leading-none`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          />
        )}

        {showSubmitButton && (
          <button
            type="button"
            onClick={handleSubmit}
            aria-label={submitLabel || 'Submit'}
            className={`absolute ${isStoryMode ? 'right-1 md:right-2' : 'right-2 md:right-3'} top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white/90 bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 hover:from-amber-900/24 hover:via-sky-900/18 hover:to-purple-900/12 border border-white/20 transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-0`}
          >
            <ArrowUp className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        )}
      </div>
    </div>
  )
}