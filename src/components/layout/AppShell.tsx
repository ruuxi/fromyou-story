'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'

import { TopNavigation } from '@/components/navigation/TopNavigation'
import { SearchContainer } from '@/components/search/SearchContainer'

import { StoryActionsProvider, useStoryActionsContext } from '@/contexts/StoryActionsContext'
import { NavigationProvider, useNavigation } from '@/contexts/NavigationContext'
import { SearchOverlayProvider, useSearchOverlay } from '@/contexts/SearchOverlayContext'
import { ScrollProvider } from '@/contexts/ScrollContext'
import { ViewTransitionProvider } from '@/contexts/ViewTransitionContext'
import { BackdropProvider, useBackdrop } from '@/contexts/BackdropContext'
import { SubscriptionModal } from '@/components/subscription/SubscriptionModal'
import { useSubscriptionModal } from '@/hooks/useSubscriptionModal'
import { LeftSidebar } from '@/components/layout/LeftSidebar'
import { RightSidebarContent } from '@/components/layout/RightSidebarContent'
import SimpleBar from 'simplebar-react'
import 'simplebar-react/dist/simplebar.min.css'

interface AppShellProps {
  children: React.ReactNode
}

function AppShellContent({ children }: AppShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { searchQuery, setSearchQuery, searchHandlerRef, chatSendHandlerRef } = useNavigation()
  const characterSelectionDoneRef = useRef<(() => void) | null>(null)
  const { storyActions, generateNextPage } = useStoryActionsContext()
  const { isOpen, closeModal } = useSubscriptionModal()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const storyScrollRef = useRef<HTMLElement | null>(null)
  const { backdropOpacity, isMobile: isBackdropMobile } = useBackdrop()
  const { isOpen: isOverlayOpen } = useSearchOverlay()
  const [isStorySettingsOpen, setIsStorySettingsOpen] = useState(false)

  const isStoryView = pathname.startsWith('/s/') || pathname.startsWith('/stories/')
  const isChatView = pathname.startsWith('/c/')
  const isBlindTestView = pathname === '/blind_test'
  const isFeedView = pathname === '/'
  const isMainAppView = isFeedView || isStoryView || isChatView
  const isLegalView = pathname.startsWith('/privacy-policy') || pathname.startsWith('/terms-of-service')

  // Mobile-only chrome hide/show on scroll
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [hideChrome, setHideChrome] = useState<boolean>(false)
  const lastScrollTopRef = useRef<number>(0)
  const scrollVelocityRef = useRef<number>(0)
  const lastScrollTimeRef = useRef<number>(0)
  const tickingRef = useRef<boolean>(false)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Removed dynamic top chrome height collapsing to avoid layout shifts during hide

  useEffect(() => {
    const updateIsMobile = () => setIsMobile(window.innerWidth < 768)
    updateIsMobile()
    window.addEventListener('resize', updateIsMobile)
    return () => window.removeEventListener('resize', updateIsMobile)
  }, [])

  // Listen to story settings open/close events to hide footers/overlays while settings are open
  useEffect(() => {
    const handleOpen = () => setIsStorySettingsOpen(true)
    const handleClose = () => setIsStorySettingsOpen(false)
    // Support both legacy and current events
    const openLore = () => setIsStorySettingsOpen(true)
    const closeLore = () => setIsStorySettingsOpen(false)
    window.addEventListener('storySettings:open', handleOpen)
    window.addEventListener('storySettings:close', handleClose)
    window.addEventListener('openStoryLoreSettings', openLore)
    window.addEventListener('closeStoryLoreSettings', closeLore)
    return () => {
      window.removeEventListener('storySettings:open', handleOpen)
      window.removeEventListener('storySettings:close', handleClose)
      window.removeEventListener('openStoryLoreSettings', openLore)
      window.removeEventListener('closeStoryLoreSettings', closeLore)
    }
  }, [])

  // Previously measured header height; no longer needed since we don't collapse layout height

  useEffect(() => {
    if (!storyScrollRef.current) return
    if (isStoryView || !isMobile) return
    if (isOverlayOpen) {
      // Ensure chrome is visible while overlay is open
      setHideChrome(false)
      // Clear any pending hide timeout
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
      return
    }

    const el = storyScrollRef.current
    const handleScroll = () => {
      if (tickingRef.current) return
      tickingRef.current = true
      requestAnimationFrame(() => {
        const currentTime = Date.now()
        const currentTop = el.scrollTop || 0
        const delta = currentTop - (lastScrollTopRef.current || 0)
        const timeDelta = currentTime - (lastScrollTimeRef.current || currentTime)
        
        // Calculate scroll velocity (pixels per millisecond)
        const velocity = timeDelta > 0 ? Math.abs(delta) / timeDelta : 0
        scrollVelocityRef.current = velocity
        
        // Tuned for snappier response on mobile
        const minScrollThreshold = 10
        const minScrollPosition = 40 // Only hide after scrolling past this point
        const fastScrollThreshold = 0.5 // Fast scroll velocity threshold
        
        const absDelta = Math.abs(delta)
        
        if (absDelta > minScrollThreshold) {
          // Clear any pending timeout
          if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current)
            hideTimeoutRef.current = null
          }
          
          if (delta > 0 && currentTop > minScrollPosition) {
            // Scrolling down - hide with momentum consideration
            if (velocity > fastScrollThreshold) {
              // Fast scroll - hide immediately
              setHideChrome(true)
            } else {
              // Slower scroll - small delay
              hideTimeoutRef.current = setTimeout(() => {
                setHideChrome(true)
                hideTimeoutRef.current = null
              }, 50)
            }
          } else if (delta < 0) {
            // Scrolling up - show immediately for responsive feel
            setHideChrome(false)
          }
          
          lastScrollTopRef.current = currentTop
          lastScrollTimeRef.current = currentTime
        }
        tickingRef.current = false
      })
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll as EventListener)
      // Clean up timeout on unmount
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
      }
    }
  }, [isMobile, isStoryView, isOverlayOpen])

  // When overlay opens, force chrome visible
  useEffect(() => {
    if (isOverlayOpen) {
      setHideChrome(false)
    }
  }, [isOverlayOpen])

  return (
    <>
      {/* Custom SimpleBar Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .simplebar-scrollbar::before {
            background-color: rgba(147, 197, 253, 0.7) !important;
            border-radius: 4px !important;
          }
          
          .simplebar-scrollbar:hover::before {
            background-color: rgba(147, 197, 253, 0.9) !important;
          }
          
          .simplebar-track.simplebar-vertical {
            background: transparent !important;
          }
          
          .simplebar-track.simplebar-horizontal {
            background: transparent !important;
          }
        `
      }} />

      {/* Background moved to root layout for consistency */}
      
      {/* Global focus backdrop that persists across navigation */}
      <div
        className={`fixed inset-0 pointer-events-none z-10 transition-opacity duration-[2000ms] ease-out ${
          isBackdropMobile && (isStoryView || isChatView) ? 'bg-black/40' : 'bg-black/25'
        }`}
        style={{ opacity: backdropOpacity }}
      />

      {/* Main Layout Container */}
      <div className="fixed inset-0 z-20 flex flex-col md:flex-row h-full">
        {/* Left Sidebar - Desktop */}
        {isMainAppView && (
          <div data-app-chrome="true" className="hidden md:flex flex-1 justify-end relative overflow-hidden">
            {/* Ambient orbs */}
            <div className="pointer-events-none absolute -top-6 -left-10 h-36 w-36 rounded-full bg-sky-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -right-8 h-40 w-40 rounded-full bg-rose-400/30 blur-3xl" />
            <div className="pointer-events-none absolute top-1/2 -left-20 h-32 w-32 rounded-full bg-purple-500/25 blur-3xl" />
            
            {/* Background with glass effect */}
            <div className="absolute inset-0 backdrop-blur-xl border-r border-white/20">
              {/* Subtle diagonal stroke pattern */}
              <div
                className="
                  pointer-events-none absolute inset-0
                  [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_10px)]
                  opacity-20
                "
              />
            </div>
            
            <div className="w-80 flex-shrink-0 relative z-10">
              <LeftSidebar />
            </div>
          </div>
        )}

        {/* Left Sidebar - Mobile */}
        {isMainAppView && (
          <div data-app-chrome="true" className="md:hidden">
            <LeftSidebar 
              isOpen={isSidebarOpen}
              onClose={() => setIsSidebarOpen(false)}
              isMobile={true}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className={`flex-1 w-full relative min-h-0 overflow-x-hidden ${isMainAppView ? 'md:flex-initial md:w-min-w-3xl md:max-w-3xl' : ''}`}>
          <div 
            className={`h-full relative flex flex-col ${isMobile && !isStoryView ? 'transition-all' : ''}`}
          >
            {/* Top Navigation - Fixed to top (hidden on blind test) */}
            {!isBlindTestView && !isLegalView && (
              <div
                data-app-chrome="true"
                className={
                  `flex-shrink-0 z-30 overflow-hidden ` +
                  // Mobile-only animated collapse/expand with smooth easing
                  (isMobile && !isStoryView
                    ? `${(hideChrome && !isOverlayOpen) ? 'duration-300 ease-mobile-hide' : 'duration-150 ease-mobile-show'} transition-[opacity,transform] absolute top-0 left-0 right-0`
                    : '')
                }
                style={
                  isMobile && !isStoryView
                    ? {
                        opacity: (hideChrome && !isOverlayOpen) ? 0 : 1,
                        transform: (hideChrome && !isOverlayOpen) ? 'translateY(-8px) scale(0.98)' : 'translateY(0) scale(1)',
                        pointerEvents: (hideChrome && !isOverlayOpen) ? 'none' : 'auto'
                      }
                    : undefined
                }
                aria-hidden={isMobile && !isStoryView ? (hideChrome && !isOverlayOpen) : undefined}
              >
                <TopNavigation 
                  isStoryView={isStoryView}
                  isChatView={isChatView}
                  onBackToSuggestions={() => router.push('/')}
                  onToggleSidebar={() => setIsSidebarOpen(true)}
                />
              </div>
            )}

            {/* Main Content */}
            {/* Main Content */}
            {isMainAppView ? (
              <div className="flex-1 overflow-auto">
                <SimpleBar
                   className={`story-scroll h-full ${(isStoryView || isChatView) ? 'min-h-[60vh]' : ''}`}
                  scrollableNodeProps={{ ref: storyScrollRef }}
                >
                  <ScrollProvider scrollContainerRef={storyScrollRef}>
                    <div style={{ 
                      paddingTop: isMobile && !isStoryView && !isBlindTestView && !isLegalView ? '72px' : '0px',
                      paddingBottom: isLegalView ? 0 : (isMobile && !isStoryView && (hideChrome && !isOverlayOpen) ? '0px' : 'calc(var(--search-bar-h, 72px) + 24px)') 
                    }}>
                      {children}
                    </div>
                  </ScrollProvider>
                </SimpleBar>
              </div>
            ) : (
              <div className="flex-1 overflow-auto">
                <SimpleBar
                  className="h-full"
                  scrollableNodeProps={{ ref: storyScrollRef }}
                >
                  <ScrollProvider scrollContainerRef={storyScrollRef}>
                    <div style={{ 
                      paddingTop: isMobile && !isStoryView && !isBlindTestView && !isLegalView ? '72px' : '0px',
                      paddingBottom: isLegalView ? 0 : (isMobile && !isStoryView && (hideChrome && !isOverlayOpen) ? '0px' : 'calc(var(--search-bar-h, 72px) + 24px)') 
                    }}>
                      {children}
                    </div>
                  </ScrollProvider>
                </SimpleBar>
              </div>
            )}

          </div>
        </div>

        {/* Bottom search container - Floating bar centered above bottom */}
        {!isLegalView && (
          <div
            data-app-chrome="true"
            className={
              `fixed left-0 right-0 bottom-0 z-30 pointer-events-none ` +
              // Mobile-only animated collapse/expand with smooth fluid transitions
              (isMobile && !(isStoryView || isChatView)
                ? `${(hideChrome && !isOverlayOpen) ? 'translate-y-full opacity-0 scale-95 duration-300 ease-mobile-hide' : 'translate-y-0 opacity-100 scale-100 duration-150 ease-mobile-show'} transition-all`
                : '')
            }
          >
            <div className="mx-auto w-full px-0 flex justify-center pointer-events-none">
              <div className="pointer-events-auto w-full md:max-w-3xl">
                <SearchContainer
                  searchQuery={searchQuery}
                  onSearchQueryChange={setSearchQuery}
                  onCharacterSelectionDone={() => {
                    if (characterSelectionDoneRef.current) {
                      characterSelectionDoneRef.current()
                    }
                  }}
                  isViewingStory={isStoryView}
                  isChatMode={isChatView}
                  storyActions={storyActions}
                  onStoryAction={(action: string) => {
                    // Send action as message to generate next page
                    generateNextPage(action);
                  }}
                  onGenerateNextPage={() => {
                    // Generate next page without specific directive
                    generateNextPage();
                  }}
                  onSubmit={(text: string) => {
                    // Chat pages: never fall back to search; only send if handler is ready
                    if (isChatView) {
                      if (chatSendHandlerRef.current) {
                        chatSendHandlerRef.current(text)
                      }
                      return
                    }
                    
                    // Story pages: send to story generator
                    if (isStoryView) {
                      generateNextPage(text)
                      return
                    }
                    
                    // Feed/search fallback
                    if (searchHandlerRef.current) {
                      searchHandlerRef.current(text)
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Right Sidebar - Desktop Only */}
        {isMainAppView && (
          <div data-app-chrome="true" className="hidden md:flex flex-1 justify-start relative overflow-hidden">
            {/* Ambient orbs */}
            <div className="pointer-events-none absolute -top-6 -right-10 h-36 w-36 rounded-full bg-blue-500/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-8 h-40 w-40 rounded-full bg-green-400/30 blur-3xl" />
            <div className="pointer-events-none absolute top-1/3 -right-20 h-28 w-28 rounded-full bg-cyan-500/25 blur-3xl" />
            
            {/* Background with glass effect */}
            <div className="absolute inset-0 backdrop-blur-xl border-l border-white/20">
              {/* Subtle diagonal stroke pattern */}
              <div
                className="
                  pointer-events-none absolute inset-0
                  [background-image:repeating-linear-gradient(135deg,rgba(255,255,255,0.06)_0px,rgba(255,255,255,0.06)_1px,transparent_1px,transparent_10px)]
                  opacity-20
                "
              />
            </div>
            
            {/* Content with expanded width for import section */}
            <div className="relative w-full max-w-2xl h-full">
              <RightSidebarContent />
            </div>
          </div>
        )}
      </div>

      {/* Overlay root – dedicated stacking context for portals */}
      <div id="overlay-root" className="fixed inset-0 z-40 pointer-events-none" />

        {/* Removed bottom shadow overlay to allow content to reach bottom when floating bar is used */}

      {/* Subscription Modal */}
      <SubscriptionModal isOpen={isOpen} onClose={closeModal} />

    </>
  )
}

export function AppShell({ children }: AppShellProps) {
  return (
    <ViewTransitionProvider>
      <NavigationProvider>
        <SearchOverlayProvider>
          <BackdropProvider>
            <StoryActionsProvider>
              <AppShellContent>{children}</AppShellContent>
            </StoryActionsProvider>
          </BackdropProvider>
        </SearchOverlayProvider>
      </NavigationProvider>
    </ViewTransitionProvider>
  )
}