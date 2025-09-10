'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { SearchContainer } from '@/components/search/SearchContainer'
import { useStoryActionsContext } from '@/contexts/StoryActionsContext'
import { useScrollContainer } from '@/contexts/ScrollContext'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { Id } from '../../../convex/_generated/dataModel'
import { StreamingWords } from './StreamingWords'
import { Share2 } from 'lucide-react'
import type React from 'react'

const DEFAULT_ACTION_DISPLAY_PAGES: string[] = []

interface StoryContentProps {
  pages: string[]
  currentPage: number
  actionDisplayPages?: string[]
  storyId?: string
  isGenerating?: boolean
  isLoading?: boolean
  loadingMessage?: string
  onDeletePage?: (pageIndex: number) => void
  onRetryPage?: (pageIndex: number) => void
  onDeleteActionMessage?: (actionIndex: number) => void
  onRetryActionMessage?: (actionIndex: number) => void
  // New: active page and change callback so parent can know which page is in view
  activePageIndex?: number
  onActivePageChange?: (index: number) => void
  onEditPage?: (pageIndex: number, newContent: string) => void
}

export function StoryContent({ 
  pages, 
  actionDisplayPages = DEFAULT_ACTION_DISPLAY_PAGES, 
  storyId, 
  isGenerating = false,
  isLoading = false,
  loadingMessage = 'Crafting your story...',
  onDeletePage,
  onRetryPage,
  onDeleteActionMessage,
  onRetryActionMessage,
  activePageIndex,
  onActivePageChange,
  onEditPage,
}: StoryContentProps) {
  const [editingPageIndex, setEditingPageIndex] = useState<number | null>(null)
  const [editedContent, setEditedContent] = useState<string>('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const textAreaRef = useRef<HTMLDivElement | HTMLTextAreaElement | null>(null)
  const savePageEdit = useMutation(api.stories.mutations.savePageEdit)
  // Removed auto-save timer; we only save on exit
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const pageContentRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const observerRef = useRef<IntersectionObserver | null>(null)
  const { storyActions, generateNextPage } = useStoryActionsContext()
  const scrollContainerRef = useScrollContainer()
  const [localSearchQuery, setLocalSearchQuery] = useState('')
  // Legacy floating/inline search removed
  const [isMobile, setIsMobile] = useState(false)
  const pageEndRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const endObserverRef = useRef<IntersectionObserver | null>(null)
  const [endVisiblePages, setEndVisiblePages] = useState<Record<number, boolean>>({})
  const [actionInitiatedPageIndex, setActionInitiatedPageIndex] = useState<number | null>(null)
  const [editCue, setEditCue] = useState<{ pageIndex: number | null; x: number; y: number; caretOffset: number | null; visible: boolean }>({ pageIndex: null, x: 0, y: 0, caretOffset: null, visible: false })
  const [pendingSelection, setPendingSelection] = useState<{ pageIndex: number; offset: number } | null>(null)

  const scrollToPageEnd = useCallback((pageIndex: number) => {
    try {
      const container = (scrollContainerRef && 'current' in scrollContainerRef) ? (scrollContainerRef.current as HTMLElement | null) : null
      const target = pageEndRefs.current[pageIndex]
      if (!container || !target) return
      const containerTop = container.getBoundingClientRect().top
      const targetTop = target.getBoundingClientRect().top
      const delta = targetTop - containerTop
      container.scrollTo({ top: container.scrollTop + delta, behavior: 'smooth' })
    } catch (e) {
      // fail-safe: ignore scroll errors
    }
  }, [scrollContainerRef])

  // Track mobile viewport for conditional sticky behavior
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 640)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  const [isStorySettingsOpen, setIsStorySettingsOpen] = useState(false)

  // Combine pages and action displays in order
  const allContent = useMemo(() => {
    const content: Array<{ type: 'page' | 'action', content: string, index: number }> = []
    

    
    // If no action displays, show pages; always include the first page (even if empty) to render skeleton initially
    if (actionDisplayPages.length === 0) {
      if (pages.length === 0) {
        // Ensure Page 1 skeleton renders even if there are no pages yet
        content.push({ type: 'page', content: '', index: 0 })
      } else {
        // Always include first page to allow skeleton when empty
        content.push({ type: 'page', content: pages[0] || '', index: 0 })
        // Subsequent pages only if they have content
        for (let index = 1; index < pages.length; index++) {
          const pageContent = pages[index]
          if (pageContent && pageContent.length > 0) {
            content.push({ type: 'page', content: pageContent, index })
          }
        }
      }
      
      return content
    }
    
    // With action displays, alternate between pages and actions
    // First page (before any actions)
    if (pages.length > 0) {
      // Always include first page, even if empty, so skeleton appears until content streams
      content.push({ type: 'page', content: pages[0] || '', index: 0 })
    } else {
      // No pages yet, still render an empty first page for skeleton
      content.push({ type: 'page', content: '', index: 0 })
    }
    
    // Then alternate: action -> page, action -> page, etc.
    actionDisplayPages.forEach((actionContent, actionIdx) => {
      // Add the action display
      content.push({ type: 'action', content: actionContent, index: actionIdx })
      
      // Add the corresponding page (always - use empty string if page doesn't exist yet)
      const pageIdx = actionIdx + 1 // +1 because we already added the first page
      const pageContent = pageIdx < pages.length ? pages[pageIdx] : ''
      content.push({ type: 'page', content: pageContent || '', index: pageIdx })
    })

    
    return content
  }, [pages, actionDisplayPages])

  // Initialize editor content on enter and set caret position if pending (contentEditable)
  useEffect(() => {
    const el = textAreaRef.current as HTMLDivElement | null
    if (editingPageIndex !== null && el) {
      // Initialize with current text once when entering edit
      // Only set content if element is empty to avoid duplication
      if (!el.innerText || el.innerText.length === 0) {
        el.innerText = editedContent || ''
      }
      el.focus()
      const applySelection = () => {
        if (!(pendingSelection && pendingSelection.pageIndex === editingPageIndex)) return
        const total = Math.max(0, pendingSelection.offset)
        // Walk text nodes to place caret
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
        let remaining = total
        let targetNode: Text | null = null
        let targetOffset = 0
        while (walker.nextNode()) {
          const node = walker.currentNode as Text
          const len = node.textContent?.length || 0
          if (remaining <= len) {
            targetNode = node
            targetOffset = remaining
            break
          }
          remaining -= len
        }
        try {
          const selection = window.getSelection()
          if (selection) {
            const range = document.createRange()
            if (targetNode) {
              range.setStart(targetNode, targetOffset)
            } else {
              // Fallback to end
              range.selectNodeContents(el)
              range.collapse(false)
            }
            range.collapse(true)
            selection.removeAllRanges()
            selection.addRange(range)
          }
        } catch {}
        setPendingSelection(null)
      }
      applySelection()
      requestAnimationFrame(applySelection)
      setTimeout(applySelection, 0)
    }
  }, [editingPageIndex, pendingSelection])

  // Set initial content only once when entering edit mode
  useEffect(() => {
    if (editingPageIndex !== null) {
      const content = pages[editingPageIndex]
      if (content !== undefined && content !== editedContent) {
        setEditedContent(content)
      }
    }
  }, [editingPageIndex, pages])

  // Cleanup observers on unmount
  useEffect(() => {
    return () => {
      // Cleanup intersection observer on unmount
      if (observerRef.current) {
        observerRef.current.disconnect()
        observerRef.current = null
      }
    }
  }, [])

  // Hide edit cue on scroll or outside click
  useEffect(() => {
    const hide = () => setEditCue(prev => (prev.visible ? { ...prev, visible: false } : prev))
    const rootEl = (scrollContainerRef && 'current' in scrollContainerRef) ? (scrollContainerRef.current as HTMLElement | null) : null
    window.addEventListener('scroll', hide, true)
    rootEl?.addEventListener('scroll', hide)
    // Use click instead of mousedown so cue button can handle mousedown first
    window.addEventListener('click', hide)
    return () => {
      window.removeEventListener('scroll', hide, true)
      rootEl?.removeEventListener('scroll', hide)
      window.removeEventListener('click', hide)
    }
  }, [scrollContainerRef])

  // Listen for settings open/close to hide per-page sticky actions bar
  useEffect(() => {
    const onOpen = () => setIsStorySettingsOpen(true)
    const onClose = () => setIsStorySettingsOpen(false)
    window.addEventListener('storySettings:open', onOpen)
    window.addEventListener('storySettings:close', onClose)
    return () => {
      window.removeEventListener('storySettings:open', onOpen)
      window.removeEventListener('storySettings:close', onClose)
    }
  }, [])

  // Setup IntersectionObserver to detect active page in view
  useEffect(() => {
    if (!onActivePageChange) return
    // Avoid recreating observer too often; disconnect previous first
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
    // Root is the nearest scrollable container; default to viewport
    const options: IntersectionObserverInit = {
      root: (scrollContainerRef && 'current' in scrollContainerRef) ? (scrollContainerRef.current as any) : null,
      rootMargin: '0px 0px -40% 0px', // prioritize elements with more than 60% visible
      threshold: [0.25, 0.5, 0.75],
    }
    const entriesVisibility: Record<number, number> = {}
    const observer = new IntersectionObserver((entries) => {
      let bestIndex: number | null = null
      let bestIntersection = 0
      for (const entry of entries) {
        const target = entry.target as HTMLElement
        const indexAttr = target.getAttribute('data-page-index')
        if (indexAttr == null) continue
        const idx = parseInt(indexAttr, 10)
        // Compute visible ratio within viewport
        const ratio = entry.intersectionRatio
        entriesVisibility[idx] = ratio
      }
      // Choose the page with highest visibility ratio
      for (const [idxStr, ratio] of Object.entries(entriesVisibility)) {
        const idx = Number(idxStr)
        if (ratio > bestIntersection) {
          bestIntersection = ratio
          bestIndex = idx
        }
      }
      if (bestIndex != null && bestIndex !== activePageIndex) {
        onActivePageChange(bestIndex)
      }
    }, options)
    observerRef.current = observer

    // Observe each page container
    pages.forEach((_, idx) => {
      const el = pageRefs.current[idx]
      if (el) observer.observe(el)
    })

    return () => {
      observer.disconnect()
      observerRef.current = null
    }
  }, [pages.length, onActivePageChange, scrollContainerRef?.current])

  // Observe end-of-page sentinels to only show actions at page end on mobile
  useEffect(() => {
    // Cleanup any previous observer
    if (endObserverRef.current) {
      endObserverRef.current.disconnect()
      endObserverRef.current = null
    }
    const rootEl = (scrollContainerRef && 'current' in scrollContainerRef) ? (scrollContainerRef.current as any) : null
    const options: IntersectionObserverInit = {
      root: rootEl,
      rootMargin: '0px 0px -5% 0px',
      threshold: [0.99], // near fully visible
    }
    const observer = new IntersectionObserver((entries) => {
      setEndVisiblePages((prev) => {
        const updated = { ...prev }
        for (const entry of entries) {
          const target = entry.target as HTMLElement
          const idxStr = target.getAttribute('data-page-end-index')
          if (!idxStr) continue
          const idx = parseInt(idxStr, 10)
          updated[idx] = entry.isIntersecting && entry.intersectionRatio >= 0.99
        }
        return updated
      })
    }, options)
    endObserverRef.current = observer
    // Observe all page end sentinels
    pages.forEach((_, idx) => {
      const el = pageEndRefs.current[idx]
      if (el) observer.observe(el)
    })
    return () => {
      observer.disconnect()
      endObserverRef.current = null
    }
  }, [pages.length, scrollContainerRef?.current])

  // Clear action-initiated marker when generation stops so footers can reappear
  useEffect(() => {
    if (!isGenerating) {
      setActionInitiatedPageIndex(null)
    }
  }, [isGenerating])

  // Inline collapsed/floating search logic removed

  // Show full skeleton when loading initially (after all hooks are declared)
 

  const handlePageClick = (index: number, content: string) => {
    // Replaced by in-text edit cue; keep no-op to preserve handler signature
    const canEdit = storyId && !isGenerating && !isLoading && content && content.length > 0
    if (!canEdit) return
    // Intentionally do not enter edit mode here
  }

  const handleContentChange = (newContent: string) => {
    setEditedContent(newContent)
    setSaveStatus('idle')
  }

  const handleSave = async (content: string) => {
    if (!storyId || !content || editingPageIndex === null) return
    
    const originalContent = pages[editingPageIndex]
    if (content === originalContent) return
    
    // Optimistically update the display immediately
    onEditPage?.(editingPageIndex, content)
    
    setSaveStatus('saving')
    try {
      await savePageEdit({
        storyId: storyId as Id<'stories'>,
        pageIndex: editingPageIndex,
        editedContent: content
      })
      setSaveStatus('saved')
      
      // Show saved status briefly
      setTimeout(() => {
        setSaveStatus('idle')
      }, 2000)
    } catch (error) {
      console.error('Failed to save page edit:', error)
      setSaveStatus('idle')
      // Revert the optimistic update on error
      onEditPage?.(editingPageIndex, originalContent)
    }
  }

  // Cancel editing on Escape without saving changes
  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      if (editingPageIndex !== null && pages[editingPageIndex] !== undefined) {
        setEditedContent(pages[editingPageIndex])
      }
      setSaveStatus('idle')
      
      // Clear the contentEditable to prevent stale content
      const el = textAreaRef.current as HTMLDivElement | null
      if (el) {
        el.innerText = ''
      }
      
      setEditingPageIndex(null)
    }
  }

  const handleBlur = () => {
    // Save on blur if there's unsaved content
    if (editingPageIndex !== null && editedContent !== pages[editingPageIndex]) {
      handleSave(editedContent)
    }
    
    // Clear the contentEditable to prevent stale content
    const el = textAreaRef.current as HTMLDivElement | null
    if (el) {
      el.innerText = ''
    }
    
    setEditingPageIndex(null)
  }

  // Compute caret offset within a content element given client coordinates
  const computeCaretOffset = useCallback((contentEl: HTMLElement, clientX: number, clientY: number): number | null => {
    let range: Range | null = null
    const anyDoc = document as any
    if (typeof (document as any).caretRangeFromPoint === 'function') {
      range = (document as any).caretRangeFromPoint(clientX, clientY)
    } else if (typeof anyDoc.caretPositionFromPoint === 'function') {
      const pos = anyDoc.caretPositionFromPoint(clientX, clientY)
      if (pos) {
        const r = document.createRange()
        r.setStart(pos.offsetNode, pos.offset)
        r.collapse(true)
        range = r
      }
    }
    if (!range) return null
    // Sum lengths of preceding text nodes inside contentEl
    let total = 0
    const walker = document.createTreeWalker(contentEl, NodeFilter.SHOW_TEXT)
    let found = false
    while (walker.nextNode()) {
      const node = walker.currentNode as Text
      if (node === range.startContainer) {
        total += range.startOffset
        found = true
        break
      } else {
        total += node.textContent?.length || 0
      }
    }
    return found ? total : null
  }, [])

  // Show edit icon at click point and capture caret offset
  const handleContentClick = useCallback((e: React.MouseEvent, pageIndex: number, content: string) => {
    if (!storyId || isGenerating || isLoading || !content) return
    const contentEl = pageContentRefs.current[pageIndex]
    if (!contentEl) return
    const rect = contentEl.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const caretOffset = computeCaretOffset(contentEl, e.clientX, e.clientY)
    setEditCue({ pageIndex, x, y, caretOffset: caretOffset ?? null, visible: true })
    e.stopPropagation()
  }, [storyId, isGenerating, isLoading, computeCaretOffset])

  // Enter edit mode using caret offset captured by edit cue
  const startEditAtCue = useCallback(() => {
    if (!editCue.visible || editCue.pageIndex == null) return
    const idx = editCue.pageIndex
    const content = pages[idx]
    if (typeof content !== 'string') return
    setEditingPageIndex(idx)
    setEditedContent(content)
    setSaveStatus('idle')
    const offset = typeof editCue.caretOffset === 'number' ? Math.max(0, Math.min(editCue.caretOffset, content.length)) : content.length
    setPendingSelection({ pageIndex: idx, offset })
    setEditCue({ pageIndex: null, x: 0, y: 0, caretOffset: null, visible: false })
  }, [editCue, pages])
  
  return (
    <div className="relative">
      <div className="relative z-10 mx-auto max-w-3xl py-0 md:py-4 space-y-6 md:space-y-8">
        {allContent.map((item) => {
          if (item.type === 'action') {
            // Render action display
            return (
              <div
                key={`action-${item.index}`}
                className={`
                  hover:bg-sky-800/5
                  p-3 md:p-5 mx-0 md:mx-4 rounded-lg shadow-inner
                  border border-white/20
                relative group`}
                data-action-index={item.index}
              >
                <p className="text-white/70 text-xs md:text-sm italic">
                  {item.content}
                </p>

                {/* Controls: bottom-right, non-intrusive */}
                {onDeleteActionMessage || onRetryActionMessage ? (
                  <div className="absolute bottom-2 right-3 z-10 flex items-center gap-2 select-none">
                    {onRetryActionMessage && !isGenerating && !isLoading && (
                      <button
                        type="button"
                        aria-label="Retry from this message"
                        className="text-amber-50/60 hover:text-amber-50 focus:outline-none"
                        onClick={(e) => { e.stopPropagation(); onRetryActionMessage?.(item.index); }}
                        title="Retry from this message"
                      >
                        {/* Retry icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                          <path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 0 1-9.584 2.001 1 1 0 1 0-1.832.998A7 7 0 0 0 19 13c0-3.86-3.141-7-7-7z" />
                        </svg>
                      </button>
                    )}
                    {onDeleteActionMessage && !isGenerating && !isLoading && (
                      <button
                        type="button"
                        aria-label="Delete this message"
                        className="text-amber-50/60 hover:text-amber-50 focus:outline-none"
                        onClick={(e) => { e.stopPropagation(); onDeleteActionMessage?.(item.index); }}
                        title="Delete this message"
                      >
                        {/* X icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                          <path d="M6.225 4.811a1 1 0 0 0-1.414 1.414L10.586 12 4.811 17.775a1 1 0 1 0 1.414 1.414L12 13.414l5.775 5.775a1 1 0 0 0 1.414-1.414L13.414 12l5.775-5.775a1 1 0 0 0-1.414-1.414L12 10.586 6.225 4.811z" />
                        </svg>
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            )
          }
          
          // Render story page
          const pageNumber = item.index + 1
          const isEditing = editingPageIndex === item.index
          const canEdit = storyId && !isGenerating && !isLoading && item.content && item.content.length > 0
          const isActive = activePageIndex === item.index
          
          // Footer visibility: show only for active page and hide if this page initiated a generation that's in-progress
          const footerVisible = isActive && !(isGenerating && actionInitiatedPageIndex === item.index)
          return (
            <div
              key={`page-${pageNumber}`}
              className={`
                glass-primary bg-gradient-to-br from-amber-900/10 via-sky-900/15 to-purple-900/5 p-6 md:p-16 mx-0 md:mx-4
                border border-amber-100/20
                ${canEdit ? 'cursor-text' : ''}
                relative group`}
              data-editing={isEditing ? 'true' : undefined}
              onClick={() => handlePageClick(item.index, item.content)}
              data-page-index={item.index}
              ref={(el) => { pageRefs.current[item.index] = el }}
              id={`story-page-${pageNumber}`}
              style={footerVisible ? { paddingBottom: 'calc(var(--search-bar-h, 128px) + 24px)' } : undefined}
            >
              <div className="page-title-row flex items-center justify-between mb-4">
                <h3 className="text-amber-50/50 text-sm font-medium">
                  Page {pageNumber}
                </h3>
                <div className="flex items-center gap-2">
                  {/* Share this page button */}
                  {storyId && item.content && item.content.length > 0 && (
                    <button
                      type="button"
                      aria-label={`Share page ${pageNumber}`}
                      title={`Share page ${pageNumber}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Dispatch custom event to open share dialog with this specific page
                        window.dispatchEvent(new CustomEvent('openStorySharePage', { 
                          detail: { pageNumber: pageNumber } 
                        }));
                      }}
                      className="text-amber-50/40 hover:text-amber-50/70 focus:outline-none transition-colors duration-200"
                    >
                      <Share2 className="w-4 h-4" strokeWidth={1.5} />
                    </button>
                  )}
                  {(isEditing || saveStatus !== 'idle') && (
                    <div className="flex items-center gap-2" aria-live="polite">
                      {isEditing && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 text-white/80 text-[10px] md:text-xs px-2 py-0.5">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 md:h-3.5 md:w-3.5">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.99-1.66z" />
                          </svg>
                          <span className="sr-only">Editing</span>
                          <span aria-hidden>Editing</span>
                        </span>
                      )}
                      {saveStatus === 'saving' && (
                        <span className="text-amber-50/70 text-[10px] md:text-xs">Saving...</span>
                      )}
                      {saveStatus === 'saved' && (
                        <span className="text-emerald-200/90 text-[10px] md:text-xs">✓ Saved</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="max-w-none min-h-[60vh]">
                {item.content ? (
                  isEditing ? (
                    <div
                      ref={(el) => { textAreaRef.current = el }}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={(e) => handleContentChange((e.target as HTMLElement).innerText)}
                      onBlur={handleBlur}
                      onKeyDown={(e) => {
                        if ((e as unknown as React.KeyboardEvent<HTMLTextAreaElement>).key === 'Escape') {
                          handleEditorKeyDown(e as unknown as React.KeyboardEvent<HTMLTextAreaElement>)
                        }
                      }}
                      className="w-full bg-transparent text-white/80 text-sm md:text-lg whitespace-pre-wrap break-words overflow-wrap-anywhere outline-none focus:ring-0 focus:ring-offset-0"
                      style={{ lineHeight: '1.625' }}
                      onClick={(e) => e.stopPropagation()}
                      // Do not bind innerHTML on each render to avoid caret jumps
                    />
                  ) : (
                    (() => {
                      // Check if this is the last page and we're currently generating
                      const isLastPage = item.index === pages.length - 1;
                      const shouldShowStreaming = isGenerating && isLastPage;
                      
                      // Always use the same wrapper to prevent blinking on transition
                      return (
                        <div 
                          className="relative text-white/80 text-sm md:text-lg whitespace-pre-wrap break-words overflow-wrap-anywhere"
                          style={{ lineHeight: '1.625' }}
                          ref={(el) => { pageContentRefs.current[item.index] = el }}
                          onClick={(e) => handleContentClick(e, item.index, item.content)}
                        >
                          {shouldShowStreaming ? (
                            <StreamingWords 
                              text={item.content}
                              baseDelay={0}
                              perWordDelay={0}
                            />
                          ) : (
                            item.content
                          )}
                          {editCue.visible && editCue.pageIndex === item.index && !isEditing && (
                            <button
                              type="button"
                              aria-label="Edit here"
                              title="Edit here"
                              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); startEditAtCue(); }}
                              onClick={(e) => { e.stopPropagation(); }}
                              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white/80 bg-gradient-to-br from-amber-900/25 via-sky-900/20 to-purple-900/15 hover:from-amber-900/35 hover:via-sky-900/30 hover:to-purple-900/25 border border-white/30 shadow-[inset_0_1px_2px_rgba(255,255,255,0.05),0_6px_16px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-0"
                              style={{ left: `${editCue.x}px`, top: `${editCue.y}px` }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 md:h-5 md:w-5">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm18.71-10.04a1.003 1.003 0 0 0 0-1.42l-2.5-2.5a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.99-1.66z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })()
                  )
                ) : (
                  // Skeleton loading state for empty pages
                  <div className="space-y-4 animate-pulse">
                    <div className="bg-white/10 rounded h-6 w-full"></div>
                    <div className="bg-white/10 rounded h-6 w-5/6"></div>
                    <div className="bg-white/10 rounded h-6 w-4/5"></div>
                    <div className="bg-white/10 rounded h-6 w-full"></div>
                    <div className="bg-white/10 rounded h-6 w-3/4"></div>
                    
                    <div className="pt-4">
                      <div className="bg-white/10 rounded h-6 w-5/6"></div>
                      <div className="bg-white/10 rounded h-6 w-4/5 mt-4"></div>
                      <div className="bg-white/10 rounded h-6 w-2/3 mt-4"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Controls: bottom-right, non-intrusive (hidden on active page to avoid overlap with sticky bar) */}
              {(onRetryPage || onDeletePage) && !isEditing && !isActive && (
                <div className="absolute bottom-3 right-4 z-10 flex items-center gap-2 select-none">
                  {onRetryPage && !isGenerating && !isLoading && (
                    <button
                      type="button"
                      aria-label="Retry this page"
                      className="text-amber-50/30 hover:text-amber-50/70 focus:outline-none"
                      onClick={(e) => { e.stopPropagation(); onRetryPage?.(item.index); }}
                      title="Retry this page"
                    >
                      {/* Retry icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 0 1-9.584 2.001 1 1 0 1 0-1.832.998A7 7 0 0 0 19 13c0-3.86-3.141-7-7-7z" />
                      </svg>
                    </button>
                  )}
                  {onDeletePage && !isGenerating && !isLoading && (
                    <button
                      type="button"
                      aria-label="Delete this page"
                      className="text-amber-50/30 hover:text-amber-50/70 focus:outline-none"
                      onClick={(e) => { e.stopPropagation(); onDeletePage?.(item.index); }}
                      title="Delete this page"
                    >
                      {/* X icon */}
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M6.225 4.811a1 1 0 0 0-1.414 1.414L10.586 12 4.811 17.775a1 1 0 1 0 1.414 1.414L12 13.414l5.775 5.775a1 1 0 0 0 1.414-1.414L13.414 12l5.775-5.775a1 1 0 0 0-1.414-1.414L12 10.586 6.225 4.811z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Controls row above footer actions/search (active page only) */}
              {(onRetryPage || onDeletePage) && !isEditing && isActive && (
                <div className="mt-4 -mx-6 md:-mx-16 px-6 md:px-16 flex items-center justify-end gap-3 relative z-40">
                  {onRetryPage && !isGenerating && !isLoading && (
                    <button
                      type="button"
                      aria-label="Retry this page"
                      className="text-amber-50/40 hover:text-amber-50/80 focus:outline-none"
                      onClick={(e) => { e.stopPropagation(); onRetryPage?.(item.index); }}
                      title="Regenerate this page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M12 6V3L8 7l4 4V8c2.757 0 5 2.243 5 5a5 5 0 0 1-9.584 2.001 1 1 0 1 0-1.832.998A7 7 0 0 0 19 13c0-3.86-3.141-7-7-7z" />
                      </svg>
                    </button>
                  )}
                  {onDeletePage && !isGenerating && !isLoading && (
                    <button
                      type="button"
                      aria-label="Delete this page"
                      className="text-amber-50/40 hover:text-amber-50/80 focus:outline-none"
                      onClick={(e) => { e.stopPropagation(); onDeletePage?.(item.index); }}
                      title="Delete this page"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                        <path d="M6.225 4.811a1 1 0 0 0-1.414 1.414L10.586 12 4.811 17.775a1 1 0 1 0 1.414 1.414L12 13.414l5.775 5.775a1 1 0 0 0 1.414-1.414L13.414 12l5.775-5.775a1 1 0 0 0-1.414-1.414L12 10.586 6.225 4.811z" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* End-of-page sentinel: used to gate actions bar on mobile */}
              <div
                ref={(el) => { pageEndRefs.current[item.index] = el }}
                data-page-end-index={item.index}
                className="h-px w-full pointer-events-none"
                aria-hidden
              />

              {/* Per-page footer bar: fixed to the bottom of the page container (not viewport-sticky) */}
              {footerVisible && (
                <div
                  className="absolute left-0 right-0 z-20 mt-2"
                  style={{ bottom: 0 }}
                  aria-live="polite"
                  aria-controls={`story-page-${pageNumber}`}
                >
                  <div
                    className="w-full"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <SearchContainer
                      searchQuery={localSearchQuery}
                      onSearchQueryChange={setLocalSearchQuery}
                      isViewingStory={true}
                      storyActions={storyActions}
                      onStoryAction={(action: string) => {
                        // Trigger generation from selected action without altering input value
                        setActionInitiatedPageIndex(item.index) // hide this page's footer during generation
                        // Smoothly scroll so the upcoming action card lands at the top of the viewport
                        scrollToPageEnd(item.index)
                        generateNextPage(action)
                      }}
                      onGenerateNextPage={() => generateNextPage()}
                      onSubmit={(text: string) => {
                        setActionInitiatedPageIndex(item.index) // hide this page's footer during generation
                        // Smoothly scroll so the upcoming action card lands at the top of the viewport
                        scrollToPageEnd(item.index)
                        generateNextPage(text)
                        setLocalSearchQuery('')
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}