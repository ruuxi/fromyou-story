'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuthState } from '@/hooks/useAuthState'
import { Share2, Copy, Check, Twitter, Facebook, MessageCircle, Instagram, Hash } from 'lucide-react'
import { Id } from '../../../convex/_generated/dataModel'

interface StoryShareDialogProps {
  storyId: string
  currentPage?: number
  totalPages?: number
  onClose: () => void
  inline?: boolean
  isOverlayFadingOut?: boolean
}

export function StoryShareDialog({ 
  storyId, 
  currentPage = 1, 
  totalPages = 1, 
  onClose, 
  inline = false, 
  isOverlayFadingOut = false 
}: StoryShareDialogProps) {
  const [activeTab, setActiveTab] = useState<'entire' | 'page'>('entire')
  const [isInlineClosing, setIsInlineClosing] = useState<boolean>(false)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [isSharing, setIsSharing] = useState<boolean>(false)
  const { authArgs } = useAuthState()
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [headerOffset, setHeaderOffset] = useState<number>(0)
  const [isMobile, setIsMobile] = useState<boolean>(false)

  // Get current sharing info
  const shareInfo = useQuery(
    api.stories.index.getStoryShareInfo,
    authArgs ? { ...(authArgs as any), storyId: storyId as Id<'stories'> } : 'skip'
  )

  // Mutations
  const toggleSharing = useMutation(api.stories.index.toggleStorySharing)
  const updateSettings = useMutation(api.stories.index.updateShareSettings)

  // Match StoryLoreSettingsDialog's animation system
  const animationStyle = (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          /* Liquid animation system */
          @keyframes liquid-expand {
            0% { 
              transform: scale(0.95) translateY(8px);
              border-radius: 28px;
              opacity: 0;
            }
            100% { 
              transform: scale(1) translateY(0);
              border-radius: 20px;
              opacity: 1;
            }
          }
          
          @keyframes content-reveal {
            0% { 
              opacity: 0;
              transform: translateY(8px);
            }
            100% { 
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes button-slide-up {
            0% {
              opacity: 0;
              transform: translateY(16px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          /* Button states matching StoryLoreSettingsDialog */
          .mode-button {
            background: transparent;
            border: 1px solid transparent;
            color: rgba(255, 255, 255, 0.7);
            transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            border-radius: 0;
          }
          
          .mode-button:hover:not(.active) {
            background: 
              linear-gradient(to bottom right, 
                rgba(146, 64, 14, 0.14), 
                rgba(12, 74, 110, 0.11), 
                rgba(88, 28, 135, 0.08)
              ),
              rgba(0, 0, 0, 0.12);
            border-color: rgba(255, 255, 255, 0.10);
            color: rgba(255, 255, 255, 0.8);
            transform: translateY(-0.5px);
          }
          
          .mode-button.active {
            background: 
              linear-gradient(to bottom right, 
                rgba(146, 64, 14, 0.2), 
                rgba(12, 74, 110, 0.15), 
                rgba(88, 28, 135, 0.1)
              ),
              rgba(255, 255, 255, 0.05);
            border-color: rgba(255, 255, 255, 0.15);
            color: rgba(255, 255, 255, 0.9);
            box-shadow: none;
          }

        `,
      }}
    />
  )

  // Calculate share URLs
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrls = useMemo(() => {
    if (!shareInfo?.shareToken) return { entire: '', page: '' }
    
    const baseShareUrl = `${baseUrl}/s/${shareInfo.shareToken}`
    return {
      entire: baseShareUrl,
      page: `${baseShareUrl}?page=${currentPage}`
    }
  }, [shareInfo?.shareToken, baseUrl, currentPage])

  // Handle enabling sharing
  const handleEnableSharing = async () => {
    if (!authArgs) return
    
    setIsSharing(true)
    try {
      await toggleSharing({
        ...(authArgs as any),
        storyId: storyId as Id<'stories'>,
        isPublic: true,
        shareSettings: {
          allowEntireStory: true,
          allowSpecificPages: true,
        }
      })
    } catch (error) {
      console.error('Failed to enable sharing:', error)
    } finally {
      setIsSharing(false)
    }
  }

  // Handle disabling sharing
  const handleDisableSharing = async () => {
    if (!authArgs) return
    
    setIsSharing(true)
    try {
      await toggleSharing({
        ...(authArgs as any),
        storyId: storyId as Id<'stories'>,
        isPublic: false,
      })
    } catch (error) {
      console.error('Failed to disable sharing:', error)
    } finally {
      setIsSharing(false)
    }
  }

  // Copy URL to clipboard
  const copyToClipboard = async (url: string, type: 'entire' | 'page') => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(type)
      setTimeout(() => setCopiedUrl(null), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  // Social sharing functions
  const shareToX = (url: string) => {
    const text = activeTab === 'entire' 
      ? 'Check out this amazing AI-generated story!' 
      : `Check out page ${currentPage} of this AI-generated story!`
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    window.open(xUrl, '_blank', 'width=550,height=420')
  }

  const shareToFacebook = (url: string) => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    window.open(facebookUrl, '_blank', 'width=550,height=420')
  }

  const shareToInstagram = (url: string) => {
    // Instagram doesn't have direct URL sharing, so copy to clipboard
    const text = `${activeTab === 'entire' 
      ? 'Check out this amazing AI-generated story!' 
      : `Check out page ${currentPage} of this AI-generated story!`} ${url}`
    
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for older browsers
      console.error('Could not copy to clipboard')
    })
  }

  const shareToDiscord = (url: string) => {
    // Discord doesn't have direct sharing, so copy to clipboard
    const text = `${activeTab === 'entire' 
      ? 'Check out this amazing AI-generated story!' 
      : `Check out page ${currentPage} of this AI-generated story!`} ${url}`
    
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for older browsers
      console.error('Could not copy to clipboard')
    })
  }

  const shareToTikTok = (url: string) => {
    // TikTok doesn't have direct URL sharing, so copy to clipboard
    const text = `${activeTab === 'entire' 
      ? 'Check out this amazing AI-generated story!' 
      : `Check out page ${currentPage} of this AI-generated story!`} ${url}`
    
    navigator.clipboard.writeText(text).catch(() => {
      // Fallback for older browsers
      console.error('Could not copy to clipboard')
    })
  }

  const shareToReddit = (url: string) => {
    const title = activeTab === 'entire' 
      ? 'Amazing AI-generated story' 
      : `Page ${currentPage} of an AI-generated story`
    const redditUrl = `https://reddit.com/submit?title=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    window.open(redditUrl, '_blank', 'width=550,height=420')
  }

  // UI setup (similar to StoryLoreSettingsDialog)
  useEffect(() => {
    if (inline) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const measureHeader = () => {
      const headerEl = document.querySelector('[data-app-header="true"]') as HTMLElement | null
      const h = headerEl ? headerEl.offsetHeight : 0
      setHeaderOffset(h)
    }
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    
    measureHeader()
    checkMobile()
    window.addEventListener('resize', measureHeader)
    window.addEventListener('resize', checkMobile)
    window.addEventListener('orientationchange', measureHeader)
    window.addEventListener('orientationchange', checkMobile)

    if (panelRef.current) panelRef.current.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    panelRef.current?.focus()
    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('resize', measureHeader)
      window.removeEventListener('resize', checkMobile)
      window.removeEventListener('orientationchange', measureHeader)
      window.removeEventListener('orientationchange', checkMobile)
    }
  }, [inline])

  useEffect(() => {
    if (!inline) return
    document.body.classList.add('simple-scrollbar')
    return () => {
      document.body.classList.remove('simple-scrollbar')
    }
  }, [inline])

  useEffect(() => {
    if (!inline) return
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const root = containerRef.current
      const target = event.target as Node | null
      if (!root || !target) return
      if (!root.contains(target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handlePointerDown, true)
    document.addEventListener('touchstart', handlePointerDown, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown, true)
      document.removeEventListener('touchstart', handlePointerDown, true)
    }
  }, [inline, onClose])

  const handleInlineClose = () => {
    setIsInlineClosing(true)
    window.setTimeout(() => {
      onClose()
    }, 400)
  }

  const handleTabChange = (tab: 'entire' | 'page') => {
    if (tab === activeTab) return
    setActiveTab(tab)
  }

  const currentUrl = activeTab === 'entire' ? shareUrls.entire : shareUrls.page
  const isPublic = shareInfo?.isPublic || false

  // Content component
  const ShareContent = () => (
    <div className="px-4 sm:px-5 pb-4 relative flex-1 overflow-hidden" style={{ minHeight: '200px' }}>
      {!isPublic ? (
        // Enable sharing section
        <div className="text-center py-8">
          <Share2 className="w-12 h-12 text-white/40 mx-auto mb-4" />
          <h3 className="text-white/90 text-lg font-medium mb-2">Share Your Story</h3>
          <p className="text-white/60 text-sm mb-6 max-w-sm mx-auto">
            Make your story public so others can read and enjoy it. You can disable sharing at any time.
          </p>
          <button
            type="button"
            onClick={handleEnableSharing}
            disabled={isSharing}
            className="px-6 py-3 text-sm text-white/90 bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 hover:from-amber-900/24 hover:via-sky-900/18 hover:to-purple-900/12 border border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSharing ? 'Enabling...' : 'Enable Sharing'}
          </button>
        </div>
      ) : (
        // Sharing options
        <>
          {/* Tab Navigation */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex gap-1.5">
              <button
                type="button"
                onClick={() => handleTabChange('entire')}
                className={`mode-button ${activeTab === 'entire' ? 'active' : ''} px-3 py-1.5 rounded-lg text-sm font-medium focus:outline-none`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Entire Story
              </button>
              <button
                type="button"
                onClick={() => handleTabChange('page')}
                className={`mode-button ${activeTab === 'page' ? 'active' : ''} px-3 py-1.5 rounded-lg text-sm font-medium focus:outline-none`}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Current Page ({currentPage})
              </button>
            </div>
          </div>

          {/* Share URL with smooth transition */}
          <div className="mb-6 relative" style={{ minHeight: '70px' }}>
            {/* Entire Story URL */}
            <div 
              className={`absolute inset-0 transition-all duration-200 ease-in-out ${
                activeTab === 'entire' ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-1 z-0 pointer-events-none'
              }`}
            >
              <label className="block text-white/70 text-sm mb-2">Share entire story URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrls.entire}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white/10 text-white/90 text-sm rounded-lg border border-white/15 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(shareUrls.entire, 'entire')}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white/90 rounded-lg border border-white/15 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  {copiedUrl === 'entire' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Current Page URL */}
            <div 
              className={`absolute inset-0 transition-all duration-200 ease-in-out ${
                activeTab === 'page' ? 'opacity-100 translate-y-0 z-10' : 'opacity-0 translate-y-1 z-0 pointer-events-none'
              }`}
            >
              <label className="block text-white/70 text-sm mb-2">Share page {currentPage} URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrls.page}
                  readOnly
                  className="flex-1 px-3 py-2 bg-white/10 text-white/90 text-sm rounded-lg border border-white/15 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-300"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(shareUrls.page, 'page')}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white/90 rounded-lg border border-white/15 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sky-300"
                >
                  {copiedUrl === 'page' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Social sharing */}
          <div className="mb-6">
            <label className="block text-white/70 text-sm mb-3">Share to social media</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => shareToX(currentUrl)}
                className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white rounded-lg border border-white/20 hover:border-white/30 transition-all duration-300 text-sm"
              >
                <Twitter className="w-4 h-4" />
                X
              </button>
              <button
                type="button"
                onClick={() => shareToFacebook(currentUrl)}
                className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white rounded-lg border border-white/20 hover:border-white/30 transition-all duration-300 text-sm"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </button>
              <button
                type="button"
                onClick={() => shareToInstagram(currentUrl)}
                className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white rounded-lg border border-white/20 hover:border-white/30 transition-all duration-300 text-sm"
              >
                <Instagram className="w-4 h-4" />
                Instagram
              </button>
              <button
                type="button"
                onClick={() => shareToDiscord(currentUrl)}
                className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white rounded-lg border border-white/20 hover:border-white/30 transition-all duration-300 text-sm"
              >
                <Hash className="w-4 h-4" />
                Discord
              </button>
              <button
                type="button"
                onClick={() => shareToTikTok(currentUrl)}
                className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white rounded-lg border border-white/20 hover:border-white/30 transition-all duration-300 text-sm"
              >
                <Hash className="w-4 h-4" />
                TikTok
              </button>
              <button
                type="button"
                onClick={() => shareToReddit(currentUrl)}
                className="flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white rounded-lg border border-white/20 hover:border-white/30 transition-all duration-300 text-sm"
              >
                <MessageCircle className="w-4 h-4" />
                Reddit
              </button>
            </div>
          </div>

          {/* Disable sharing */}
          <div className="text-center">
            <button
              type="button"
              onClick={handleDisableSharing}
              disabled={isSharing}
              className="text-red-400 hover:text-red-300 text-sm transition-colors duration-300 disabled:opacity-50"
            >
              {isSharing ? 'Disabling...' : 'Disable Sharing'}
            </button>
          </div>
        </>
      )}
    </div>
  )

  // Inline rendering variant
  if (inline) {
    return (
      <div ref={containerRef} className={`relative z-10 mx-auto w-full max-w-3xl px-3 sm:px-4 md:px-0 my-3 ${isInlineClosing ? 'animate-fade-out-soft' : 'animate-fade-in-soft'}`}>
        <div className="relative text-white  border border-slate-600" style={{ background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(250, 204, 21, 0.12), rgba(34, 197, 94, 0.08), rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.15)), rgb(25, 35, 50)', animation: 'liquid-expand 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both', transformOrigin: 'center top' }}>
          {animationStyle}
          
          <button type="button" aria-label="Close" onClick={handleInlineClose} className="absolute right-6 top-3 z-30 text-white/70 hover:text-white text-xl leading-none rounded-md focus:outline-none transition-all duration-300 hover:scale-110">✕</button>
          
          <div className="pt-4">
            <div className="text-center mb-4">
              <h3 className="text-white/90 text-lg font-medium">Share Story</h3>
            </div>
            <ShareContent />
          </div>
        </div>
      </div>
    )
  }

  // Overlay rendering
  const overlay = (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-[1000] flex items-start justify-center overflow-hidden ${isOverlayFadingOut ? 'animate-fade-out-soft' : 'animate-fade-in-soft'}`}
      style={{ paddingTop: headerOffset ? `${headerOffset}px` : undefined }}
    >
      <div
        className="fixed inset-0 z-0 backdrop-blur-3xl"
        style={{ backdropFilter: 'blur(64px) saturate(180%)', WebkitBackdropFilter: 'blur(64px) saturate(180%)' }}
        onClick={onClose}
      />
      <div
        className={`relative z-10 text-white  border border-slate-600 w-full max-w-3xl mx-0 sm:mx-4 my-0 p-0 focus:outline-none flex flex-col ${isOverlayFadingOut ? 'animate-fade-out-soft' : 'animate-fade-in-soft'}`}
        style={{ 
          background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(250, 204, 21, 0.12), rgba(34, 197, 94, 0.08), rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.15)), rgb(25, 35, 50)',
          height: headerOffset ? `calc(100vh - ${headerOffset}px)` : '100vh',
          maxHeight: headerOffset ? `calc(100vh - ${headerOffset}px)` : '100vh'
        }}
        ref={panelRef}
        tabIndex={-1}
      >
        {animationStyle}
        
        <button type="button" aria-label="Close" onClick={onClose} className="hidden sm:block absolute right-6 top-3 z-30 text-white/70 hover:text-white text-xl leading-none rounded-md focus:outline-none transition-all duration-300 hover:scale-110">✕</button>
        
        <div className="px-4 sm:px-5 pt-4 pb-2 text-center"
          style={{ animation: 'content-reveal 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.2s both' }}
        >
          <h3 className="text-white/90 text-lg font-medium">Share Story</h3>
        </div>

        <ShareContent />

        <div className="bg-white/10 supports-[backdrop-filter]:bg-white/5 backdrop-blur border-t border-white/15 px-4 sm:px-5 pt-3 pb-6  relative" style={{ animation: 'button-slide-up 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.4s both' }}>
          <button type="button" aria-label="Close" onClick={onClose} className="sm:hidden absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 text-white/70 hover:text-white text-lg leading-none rounded-full hover:bg-white/10 focus:outline-none transition-all duration-300 hover:scale-110">✕</button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(overlay, document.body) : null
}