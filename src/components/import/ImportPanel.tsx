'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Paperclip } from 'lucide-react'
import SimpleBar from 'simplebar-react'
import { useAction } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useSettings } from '@/hooks/useSettings'

interface ImportPanelProps {
  authArgs: { userId: string } | { sessionId: string } | null
  onAnalysisComplete?: (markdown: string) => void
  onClose?: () => void
}

export function ImportPanel({ authArgs, onAnalysisComplete, onClose }: ImportPanelProps) {
  const { settings } = useSettings()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const editableRef = useRef<HTMLDivElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [importedText, setImportedText] = useState('')
  const analyzeImportedText = useAction(api.customContent.actions.analyzeImportedText)

  const MAX_IMPORT_BYTES = 200_000

  const readFileAsText = useCallback(async (file: File): Promise<string> => {
    const buf = await file.arrayBuffer()
    const bytes = new Uint8Array(buf)
    let truncated = bytes
    if (bytes.byteLength > MAX_IMPORT_BYTES) {
      truncated = bytes.slice(0, MAX_IMPORT_BYTES)
      setWarning(`Large file detected. Imported first ${(MAX_IMPORT_BYTES / 1000).toFixed(0)}KB of text.`)
    } else {
      setWarning(null)
    }
    const lower = file.name.toLowerCase()
    if (/(\\.pdf|\\.docx?)$/.test(lower)) {
      setWarning(prev => (prev ? `${prev} Also detected ${lower.endsWith('pdf') ? 'PDF' : 'Word'} file; best-effort text extraction in browser.` : `Detected ${lower.endsWith('pdf') ? 'PDF' : 'Word'} file; best-effort text extraction in browser.`))
    }
    const decoder = new TextDecoder()
    return decoder.decode(truncated)
  }, [])

  const normalizeText = useCallback((text: string): string => {
    const normalized = text.replace(/\\r\\n?/g, "\n")
    if (normalized.length > MAX_IMPORT_BYTES) {
      setWarning(`Input exceeded limit. Truncated to ${(MAX_IMPORT_BYTES / 1000).toFixed(0)}KB.`)
      return normalized.slice(0, MAX_IMPORT_BYTES)
    }
    return normalized
  }, [])

  const handleAnalyzeText = useCallback(async (raw: string) => {
    if (!authArgs) return
    const text = normalizeText(raw)
    setIsAnalyzing(true)
    try {
      const md = await analyzeImportedText({
        ...(authArgs as any),
        text,
        preferredGenre: settings.genre,
        playerMode: settings.storyStructure === 'player',
      })
      onAnalysisComplete?.(md)
      // Clear the form after successful analysis
      setImportedText('')
      setWarning(null)
    } catch (e) {
      setWarning('Failed to analyze imported text. Please try again.')
    } finally {
      setIsAnalyzing(false)
    }
  }, [analyzeImportedText, authArgs, normalizeText, settings.genre, settings.storyStructure, onAnalysisComplete])

  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const text = await readFileAsText(file)
    setImportedText(text)
  }, [readFileAsText])

  const onSelectFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await readFileAsText(file)
    setImportedText(text)
    e.target.value = ''
  }, [readFileAsText])

  const onPaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text/plain')
    if (text) {
      e.preventDefault()
      setImportedText(prev => (prev ? `${prev}\n${text}` : text))
    }
  }, [])

  // Keep contentEditable in sync with importedText state
  useEffect(() => {
    const el = editableRef.current
    if (!el) return
    if (el.innerText !== importedText) {
      el.innerText = importedText
    }
  }, [importedText])

  return (
    <div className="w-full relative">
      {/* Close button in header padding */}
      {onClose && (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-1 right-2 w-5 h-5 flex items-center justify-center text-white/60 hover:text-white z-10 pointer-events-auto"
          title="Close"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      )}
      <div className="space-y-2 animate-in fade-in duration-300">
        <div className="text-center px-4">
          <h3 className="text-lg md:text-xl font-semibold text-white mb-1 drop-shadow-lg flex items-center justify-center gap-2">
            <Paperclip className="w-4 h-4" />
            Import Stories
          </h3>
          <p className="text-xs md:text-sm text-white/80">Upload any text - We'll make you a settings profile or let you continue your story!</p>
        </div>
        
        <div className="px-4 space-y-3">
          <div
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 ${
              isDragging ? 'border-amber-300/70 bg-amber-50/10' : 'border-white/20 bg-white/5'
            } cursor-pointer transition-colors`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            aria-label="Upload or drop a text file"
          >
            <svg className="h-5 w-5 text-white/70 mb-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="text-[11px] font-medium text-white/80 mb-0.5">Drop files here</span>
            <span className="text-[10px] text-white/70">or tap/click to browse</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.doc,.docx,.rtf,.html,.pdf"
              className="hidden"
              onChange={onSelectFile}
            />
          </div>

          <div>
            <label className="block text-xs text-white/60 mb-1">Or paste text</label>
            <div className="bg-white/5 rounded-md border border-white/20">
              <SimpleBar style={{ maxHeight: 160 }} className="rounded-md">
                <div
                  ref={editableRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setImportedText((e.target as HTMLDivElement).innerText)}
                  onPaste={onPaste}
                  className="w-full min-h-[80px] text-white/90 p-3 outline-none whitespace-pre-wrap break-words text-sm relative before:content-[attr(data-placeholder)] before:text-white/40 before:absolute before:pointer-events-none before:opacity-0 empty:before:opacity-100"
                  data-placeholder="Paste your text here..."
                />
              </SimpleBar>
            </div>
          </div>

          {warning && (
            <div className="text-xs text-amber-300/90">{warning}</div>
          )}

          {importedText.trim().length > 0 && (
            <div className="flex justify-end">
              <button
                type="button"
                className="px-3.5 py-2 rounded-2xl text-[12px] md:text-[13px] font-medium bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 hover:from-amber-900/25 hover:via-sky-900/18 hover:to-purple-900/12 border border-white/35 text-white/90 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleAnalyzeText(importedText)}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyzing...' : 'Submit'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}