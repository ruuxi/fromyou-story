import { useEffect, useRef } from 'react'

// How long (ms) we keep following once streaming starts
const DEFAULT_FOLLOW_MS = 1500
// “Near bottom” threshold
const SCROLL_THRESHOLD = 200
// Debounce period between scrollTo calls
const SCROLL_DEBOUNCE_MS = 100

export function useAutoScrollToBottom(
  containerRef: React.RefObject<HTMLElement | null>,
  triggerDeps: unknown[],
  isStreaming: boolean,
  followMs: number = DEFAULT_FOLLOW_MS,
  options?: {
    // Returns an absolute scrollTop value to align, relative to container
    getTargetTop?: (container: HTMLElement) => number | null
  }
) {
  // Are we currently allowed to auto-follow?
  const shouldFollowRef = useRef(false)
  // Has the user intentionally scrolled at least once? Used to avoid auto-follow on initial landing
  const hasUserScrolledRef = useRef(false)
  // Mirror of streaming state for use inside event handlers
  const isStreamingRef = useRef(isStreaming)
  // Timestamp until which we keep following
  const followUntil = useRef<number>(0)
  // Debounce marker
  const lastScroll = useRef<number>(0)

  /* Keep shouldFollowRef in sync with the user’s scroll position */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onScroll = (e?: Event) => {
      const diff = el.scrollHeight - (el.scrollTop + el.clientHeight)
      shouldFollowRef.current = diff < SCROLL_THRESHOLD
      // Only consider trusted events as user interaction (programmatic calls won't mark this)
      if (e?.isTrusted) {
        hasUserScrolledRef.current = true
        // If user scrolls near bottom while streaming, start following within the window
        if (isStreamingRef.current && shouldFollowRef.current) {
          followUntil.current = Date.now() + followMs
        }
      }
    }
    el.addEventListener('scroll', onScroll as EventListener)
    onScroll() // initialise (does not set hasUserScrolledRef)
    return () => el.removeEventListener('scroll', onScroll as EventListener)
  }, [containerRef])

  /* When a new streaming phase starts, extend the follow window */
  useEffect(() => {
    isStreamingRef.current = isStreaming
    // Only start following automatically if the user has scrolled at least once AND is near bottom
    if (isStreaming && hasUserScrolledRef.current && shouldFollowRef.current) {
      followUntil.current = Date.now() + followMs
    }
  }, [isStreaming, followMs])

  /* Scroll when new content arrives, but only while we’re still in the follow window */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const now = Date.now()
    const canFollow = now < followUntil.current && shouldFollowRef.current
    if (!canFollow) return

    // debounce to avoid jitter
    if (now - lastScroll.current < SCROLL_DEBOUNCE_MS) return
    lastScroll.current = now

    // Determine target scroll position.
    let targetTop: number | null = null
    if (options?.getTargetTop) {
      try {
        targetTop = options.getTargetTop(el)
      } catch {
        targetTop = null
      }
    }
    if (targetTop == null) {
      // Fallback to bottom of content (so content bottom aligns with viewport bottom)
      targetTop = Math.max(0, el.scrollHeight - el.clientHeight)
    }

    const distance = Math.abs(targetTop - el.scrollTop)
    el.scrollTo({ top: targetTop, behavior: distance < 40 ? 'auto' : 'smooth' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...triggerDeps])
}