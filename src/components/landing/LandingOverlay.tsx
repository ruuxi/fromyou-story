'use client'

import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })

import { useEffect, useRef, useState } from 'react'
import { useAuthState } from '@/hooks/useAuthState'
import { StreamingWords } from '@/components/storyReader/StreamingWords'
import { OnboardingResultsParser } from '@/components/onboarding/OnboardingResultsParser'
import { useUser, useAuth } from '@clerk/nextjs'
import { useAction, useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useSettings } from '@/hooks/useSettings'

export function LandingOverlay() {
  const [isHiding, setIsHiding] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [streamingText, setStreamingText] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [showStreamedText, setShowStreamedText] = useState(false)
  const [showAnalyzing, setShowAnalyzing] = useState(false)

  const [showGenreSelection, setShowGenreSelection] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)
  const [hasPlayedInitialAnimation, setHasPlayedInitialAnimation] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [dragMessage, setDragMessage] = useState('')
  const [isGeneratingFeed, setIsGeneratingFeed] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState<string>('')

  const [needsOnboarding, setNeedsOnboarding] = useState(false) // Start with false to avoid hydration mismatch
  const { authArgs } = useAuthState()
  const { isSignedIn } = useUser()
  const { getToken } = useAuth()
  const { settings } = useSettings()
  const getFeed = useAction(api.stories.feed.getFeed)
  const saveCharacters = useMutation(api.characters.index.saveSelectedCharacters)
  const updateStorySettings = useMutation(api.users.preferences.updateStorySettings)
  const updateTagPreferences = useMutation(api.users.preferences.updateTagPreferences)
  const createDefaultCharacters = useMutation(api.characters.defaults.createDefaultCharacters)
  
  // Set hydration state to prevent SSR/client mismatches
  useEffect(() => {
    setIsHydrated(true)
  }, [])
  
  // Check if user needs onboarding after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasCompleted = localStorage.getItem('hasCompletedOnboarding') === 'true'
      // Signed-in users should never see onboarding
      const needsOnboard = !isSignedIn && !hasCompleted
      setNeedsOnboarding(needsOnboard)
      // Automatically show onboarding options if needed
      if (needsOnboard) {
        setShowOnboarding(true)
        // Set animation flag after a delay to allow for initial animation
        setTimeout(() => setHasPlayedInitialAnimation(true), 2000)
      }
    }
  }, [isSignedIn])

  useEffect(() => {
    const videoElement = videoRef.current
    if (!videoElement) return

    const applyPlaybackRate = () => {
      // Slow down by 10%
      videoElement.playbackRate = 0.9
    }

    const handleEnded = () => {
      // Nudge to help prevent loop stutter
      try {
        videoElement.currentTime = 0.001
        void videoElement.play()
      } catch {}
    }

    // Apply immediately if possible and also on readiness events
    applyPlaybackRate()
    videoElement.addEventListener('loadedmetadata', applyPlaybackRate)
    videoElement.addEventListener('canplay', applyPlaybackRate)
    videoElement.addEventListener('ended', handleEnded)

    return () => {
      videoElement.removeEventListener('loadedmetadata', applyPlaybackRate)
      videoElement.removeEventListener('canplay', applyPlaybackRate)
      videoElement.removeEventListener('ended', handleEnded)
    }
  }, [])

  const handleDismiss = () => {
    // Skip onboarding for signed-in users or users who already completed it
    if (typeof window !== 'undefined') {
      localStorage.setItem('hasCompletedOnboarding', 'true')
    }
    setIsHiding(true)
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        ;(window as Window & { __onLandingDone?: () => void }).__onLandingDone?.()
      }
    }, 700)
  }

  const generateFeed = async () => {
    if (!authArgs) return
    
    setIsGeneratingFeed(true)
    
    try {
      // Convert settings to the format expected by the API
      const preferences = {
        genre: settings.genre.toLowerCase(),
        playerMode: settings.storyStructure === 'player',
        playerName: settings.playerName,
        characterCount: settings.characterCount
      }

      // Wait for feed generation to complete
      await getFeed({
        ...authArgs,
        preferences,
        limit: 12
      })
      
      console.log('Feed generation completed, transitioning to main app')
      
    } catch (e) {
      console.error('Feed generation error:', e)
      // Still transition even if feed generation fails
    } finally {
      setIsGeneratingFeed(false)
    }
    
    // Transition only after feed is ready
    setIsHiding(true)
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        ;(window as Window & { __onLandingDone?: () => void }).__onLandingDone?.()
      }
    }, 700)
  }

  const startStreaming = async (body: any) => {
    if (!process.env.NEXT_PUBLIC_CONVEX_SITE_URL) return
    
    // First show analyzing state
    setShowAnalyzing(true)
    setShowOnboarding(false)
    
    // Wait a moment for fade transition
    await new Promise(resolve => setTimeout(resolve, 800))
    
    setIsStreaming(true)
    setShowStreamedText(true)
    setShowAnalyzing(false)
    setStreamingText('')
    try {
      // Generate a session ID if no auth is available
      const sessionId = (authArgs && 'sessionId' in authArgs) ? authArgs.sessionId : `anon_${Date.now()}_${Math.random().toString(36).slice(2)}`
      const requestBody = authArgs ? { ...authArgs, ...body } : { sessionId, ...body }
      
      // Prepare headers with authorization if user is signed in
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      
      // Add Authorization header for authenticated users
      if (isSignedIn && getToken) {
        try {
          const token = await getToken({ template: 'convex' })
          if (token) {
            headers['Authorization'] = `Bearer ${token}`
          }
        } catch (error) {
          console.warn('Failed to get auth token:', error)
        }
      }
      
      const res = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/onboarding/analyze`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      })
      if (!res.body) throw new Error('No stream body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setStreamingText(prev => prev + chunk)
      }
    } catch (e) {
      console.error('Onboarding stream error:', e)
    } finally {
      setIsStreaming(false) // Stop streaming animation, but keep text visible
      // For testing: Keep the streamed text visible and don't transition
      console.log('Onboarding analysis completed - awaiting user confirmation')
    }
  }

  const handlePickGenre = (genre: string) => {
    setSelectedGenre(genre)
  }

  const handleStartWithGenre = async () => {
    if (!selectedGenre) return
    
    setShowGenreSelection(false)
    setIsGeneratingFeed(true)
    
    try {
      // Save default characters to database
      if (authArgs) {
        await createDefaultCharacters(authArgs)
        console.log('Saved default characters to database for genre selection')
      }
      
      // Save genre preference
      if (authArgs) {
        await updateStorySettings({
          ...authArgs,
          genre: selectedGenre.toLowerCase(),
          playerMode: settings.storyStructure === 'player',
          playerName: settings.playerName,
          characterCount: settings.characterCount
        })
        console.log('Saved genre:', selectedGenre)
      }
      
      // Mark onboarding as completed
      if (typeof window !== 'undefined') {
        localStorage.setItem('hasCompletedOnboarding', 'true')
      }
      
      // Small delay to ensure newly saved characters are visible to subsequent reads
      await new Promise(resolve => setTimeout(resolve, 400))
      
      // Generate feed and transition to main app
      await generateFeed()
    } catch (e) {
      console.error('Error in genre selection flow:', e)
      setIsGeneratingFeed(false)
    }
  }



  const handleShowGenres = () => {
    setShowGenreSelection(true)
  }

  const handleGenreCancel = () => {
    setShowGenreSelection(false)
    setSelectedGenre('')
  }

  // Helper function to detect mobile devices
  const isMobileDevice = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2)
  }

  // Image compression utility
  const compressImage = (file: File, maxSizeKB: number = 500, quality: number = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        const maxWidth = 1920
        const maxHeight = 1920
        let { width, height } = img
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width
            width = maxWidth
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height
            height = maxHeight
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height)
        
        // Try different quality levels until we get under the size limit
        let currentQuality = quality
        const tryCompress = () => {
          const dataUrl = canvas.toDataURL('image/jpeg', currentQuality)
          const sizeKB = (dataUrl.length * 3) / 4 / 1024 // Rough base64 size calculation
          
          if (sizeKB <= maxSizeKB || currentQuality <= 0.1) {
            resolve(dataUrl)
          } else {
            currentQuality -= 0.1
            tryCompress()
          }
        }
        
        tryCompress()
      }
      
      img.onerror = () => reject(new Error('Failed to load image for compression'))
      img.src = URL.createObjectURL(file)
    })
  }

  // Text truncation utility
  const truncateText = (text: string, maxLength: number = 5000): string => {
    if (text.length <= maxLength) return text
    
    // Try to truncate at sentence boundary
    const truncated = text.substring(0, maxLength)
    const lastSentence = truncated.lastIndexOf('.')
    const lastParagraph = truncated.lastIndexOf('\n')
    
    // Use sentence boundary if it's within the last 20% of the text
    if (lastSentence > maxLength * 0.8) {
      return truncated.substring(0, lastSentence + 1)
    }
    
    // Use paragraph boundary if it's within the last 30% of the text
    if (lastParagraph > maxLength * 0.7) {
      return truncated.substring(0, lastParagraph)
    }
    
    // Otherwise, truncate at word boundary
    const lastSpace = truncated.lastIndexOf(' ')
    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...'
  }

  // File processing utility
  const processDroppedFile = async (file: File) => {
    try {
      if (file.type.startsWith('image/')) {
        // Process image file
        const maxImageSize = 5 * 1024 * 1024 // 5MB original file limit
        
        if (file.size > maxImageSize) {
          alert('Image file is too large. Please select an image smaller than 5MB.')
          return
        }
        
        setShowAnalyzing(true)
        setShowOnboarding(false)
        setDragMessage('')
        
        try {
          // Compress the image
          const compressedBase64 = await compressImage(file, 500) // 500KB target
          await new Promise(resolve => setTimeout(resolve, 800))
          startStreaming({ mode: 'photo', imageData: compressedBase64 })
        } catch (compressionError) {
          console.error('Image compression failed:', compressionError)
          // Fallback to original image if compression fails
          const reader = new FileReader()
          reader.onload = () => {
            const base64 = reader.result as string
            startStreaming({ mode: 'photo', imageData: base64 })
          }
          reader.readAsDataURL(file)
        }
      } else {
        alert('Please drop an image file')
      }
    } catch (error) {
      console.error('Error processing dropped file:', error)
      alert('Failed to process the file. Please try again.')
    }
  }

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!isDragOver) {
      setIsDragOver(true)
      
      // Detect what's being dragged
      const items = Array.from(e.dataTransfer.items)
      const hasImage = items.some(item => item.type.startsWith('image/'))
      
      if (hasImage) {
        setDragMessage('Drop your image here')
      } else {
        setDragMessage('Drop an image file here')
      }
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only hide drag overlay if we're actually leaving the drop zone
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
      setDragMessage('')
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    
    if (files.length === 0) return
    if (files.length > 1) {
      alert('Please drop only one file at a time.')
      return
    }
    
    processDroppedFile(files[0])
  }

  const handleTakePhoto = async () => {
    try {
      // Show camera options on mobile, direct camera on desktop
      if (isMobileDevice()) {
        showMobilePhotoOptions()
      } else {
        openFileInput('environment')
      }
    } catch (e) {
      console.error('Photo capture failed:', e)
      // Fallback to basic file input
      openFileInput()
    }
  }

  const showMobilePhotoOptions = () => {
    const modal = document.createElement('div')
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-[100]'
    modal.innerHTML = `
      <div class="bg-white/10 backdrop-blur-sm border border-white/20 p-6 mx-4 rounded-lg max-w-sm w-full">
        <h3 class="text-white text-lg font-semibold mb-4 text-center">Choose Photo Source</h3>
        <div class="space-y-3">
          <button id="camera-btn" class="w-full p-3 bg-white/10 border border-white/20 text-white rounded hover:bg-white/15 transition-colors">
            📷 Take Photo (Rear Camera)
          </button>
          <button id="library-btn" class="w-full p-3 bg-white/10 border border-white/20 text-white rounded hover:bg-white/15 transition-colors">
            🖼️ Choose from Photos
          </button>
          <button id="cancel-btn" class="w-full p-3 border border-white/20 text-white/80 rounded hover:text-white hover:border-white/30 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    `
    
    document.body.appendChild(modal)
    
    // Add event listeners
    modal.querySelector('#camera-btn')?.addEventListener('click', () => {
      document.body.removeChild(modal)
      openFileInput('environment')
    })
    
    modal.querySelector('#library-btn')?.addEventListener('click', () => {
      document.body.removeChild(modal)
      openFileInput()
    })
    
    modal.querySelector('#cancel-btn')?.addEventListener('click', () => {
      document.body.removeChild(modal)
    })
    
    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal)
      }
    })
  }

  const openFileInput = (captureMode?: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    // For camera capture on mobile Safari, keep accept simple
    if (captureMode) {
      input.accept = 'image/*'
    } else {
      input.accept = 'image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,image/*'
    }
    
    // Set capture attribute for mobile camera access (ensure attribute is set, not just property)
    if (captureMode) {
      input.setAttribute('capture', captureMode) // 'environment' for rear camera, 'user' for front camera
    }
    
    // Some iOS versions require the input to be in the DOM for the picker to open
    input.style.position = 'fixed'
    input.style.left = '-9999px'
    input.style.width = '0'
    input.style.height = '0'
    input.style.opacity = '0'
    document.body.appendChild(input)
    
    const cleanup = () => {
      try {
        input.value = ''
        if (input.parentNode) {
          input.parentNode.removeChild(input)
        }
      } catch {}
    }
    
    input.addEventListener('change', async () => {
      try {
        const file = input.files?.[0]
        if (!file) { cleanup(); return }
        
        // Validate file type (allow unknown on iOS when coming from camera)
        const isProbablyImage = (file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name || '')
        if (!isProbablyImage) {
          alert('Please select a valid image file.')
          cleanup()
          return
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024
        if (file.size > maxSize) {
          alert('Image file is too large. Please select an image smaller than 10MB.')
          cleanup()
          return
        }
        
        try {
          // Compress the image
          const compressedBase64 = await compressImage(file, 500) // 500KB target
          startStreaming({ mode: 'photo', imageData: compressedBase64 })
        } catch (compressionError) {
          console.error('Image compression failed:', compressionError)
          // Fallback to original image if compression fails
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const result = reader.result as string
              resolve(result)
            }
            reader.onerror = () => reject(new Error('Failed to read file'))
            reader.readAsDataURL(file)
          })
          startStreaming({ mode: 'photo', imageData: base64 })
        }
      } catch (error) {
        console.error('Error processing image:', error)
        alert('Failed to process the image. Please try again.')
      } finally {
        cleanup()
      }
    }, { once: true })
    
    // Trigger file input
    input.click()
  }

  // If user is signed in, they should not see onboarding at all - immediately dismiss
  useEffect(() => {
    if (isSignedIn && isHydrated) {
      handleDismiss()
    }
  }, [isSignedIn, isHydrated])

  return (
    <section 
      id="landing-overlay"
      className={`fixed inset-0 w-full h-full flex flex-col overflow-hidden cursor-pointer z-50 transition-all duration-700 ${
        isHydrated && isHiding ? 'opacity-0 scale-110 blur-sm' : 'opacity-100 scale-100 blur-0'
      }`}
      onClick={!showOnboarding && !showStreamedText ? handleDismiss : undefined}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      <video
        ref={videoRef}
        src="/compatible.mp4"
        autoPlay
        loop
        muted
        playsInline
        webkit-playsinline="true"
        disableRemotePlayback
        preload="auto"
        poster="/2.webp"
        aria-hidden="true"
        style={{ transform: 'translateZ(0)', willChange: 'transform', backfaceVisibility: 'hidden', contain: 'layout paint size' }}
        className="absolute inset-0 w-full h-full object-cover blur-[8px] pointer-events-none select-none"
      />

      {/* Dimming overlay that fades in during analyzing */}
      <div 
        className={`absolute inset-0 w-full h-full bg-black/40 pointer-events-none transition-opacity ${
          isHiding ? 'duration-700' : 'duration-[2000ms]'
        } ${
          (showAnalyzing || showStreamedText) && !isHiding ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Drag and drop overlay */}
      {isDragOver && (
        <div className="absolute inset-0 w-full h-full bg-blue-500/20 border-4 border-dashed border-blue-400 pointer-events-none z-40 transition-all duration-200">
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl mb-4">📁</div>
              <div className="text-white text-2xl font-semibold mb-2">{dragMessage}</div>
              <div className="text-white/70 text-lg">Images will be compressed automatically</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 relative z-20 px-4 grid grid-rows-[auto_auto] min-h-full place-content-center justify-items-center gap-4">
        <div className="text-center row-start-1 row-end-2">
          <h1 className={`reveal-text text-5xl md:text-6xl lg:text-7xl font-bold mb-4 transition-all duration-700 text-white ${playfair.className} ${
            showAnalyzing || showStreamedText ? 'opacity-0' : ''
          }`}>
            fromyou
          </h1>
          
          {!showAnalyzing && !showStreamedText && (
            <p className="text-white/70 text-lg md:text-xl font-light opacity-0 animate-fadeIn" style={{ animationDelay: '1.4s', animationFillMode: 'forwards' }}>
              Create any story, with any character
            </p>
          )}
        </div>
        {/* Unified content slot with a fixed minimum height to avoid vertical shifts */}
        <div className="row-start-2 w-full max-w-3xl min-h-32 flex items-center justify-center">
          {showOnboarding && !showAnalyzing && !showStreamedText && !showGenreSelection && !isGeneratingFeed && (
            <div className="w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <OnboardCard 
                  label="Use an image" 
                  onClick={handleTakePhoto}
                  delay="1.7s"
                  subtext={
                    <>
                      <span className="hidden md:inline">Drag, drop, or upload</span>
                      <span className="md:hidden">Upload or take photo</span>
                    </>
                  }
                >
                  <CameraSVG />
                </OnboardCard>
                <OnboardCard 
                  label="Set up your feed" 
                  onClick={handleShowGenres}
                  delay="1.9s"
                  subtext="Start quick"
                >
                  <GenreSVG />
                                </OnboardCard>
              </div>
              
              {/* Skip button */}
              <div className="flex justify-center mt-6">
                <button
                  onClick={async (e) => { 
                    e.stopPropagation(); 
                    
                    try {
                      // Save default characters (Harry Potter, Hermione, Luke Skywalker) to database
                      if (authArgs) {
                        await createDefaultCharacters(authArgs)
                        console.log('Saved default characters to database for skip')
                      }
                    } catch (error) {
                      console.error('Error saving default characters:', error)
                    }
                    
                    // Mark onboarding as completed
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('hasCompletedOnboarding', 'true')
                    }

                    // If authenticated, persist baseline preferences and generate the feed before transitioning
                    if (authArgs) {
                      try {
                        await updateStorySettings({
                          ...authArgs,
                          genre: settings.genre.toLowerCase(),
                          playerMode: settings.storyStructure === 'player',
                          playerName: settings.playerName,
                          characterCount: settings.characterCount
                        })
                      } catch (e) {
                        console.warn('Failed to persist baseline preferences before feed generation (continuing):', e)
                      }
                      // Small delay to ensure newly saved characters are visible to subsequent reads
                      await new Promise(resolve => setTimeout(resolve, 400))
                      await generateFeed()
                    } else {
                      // Otherwise, transition immediately
                      setIsHiding(true)
                      setTimeout(() => {
                        if (typeof window !== 'undefined') {
                          ;(window as Window & { __onLandingDone?: () => void }).__onLandingDone?.()
                        }
                      }, 700)
                    }
                  }}
                  className="text-white/60 hover:text-white/80 text-sm opacity-0 animate-fadeIn transition-colors"
                  style={{ animationDelay: '2.3s', animationFillMode: 'forwards' }}
                >
                  skip
                </button>
              </div>
            </div>
          )}

 

          {showGenreSelection && !showAnalyzing && !isGeneratingFeed && (
            <div className="w-full max-w-2xl">
              <div className="border border-white/15 bg-white/3 p-6">
                <h3 className="text-white/90 font-semibold mb-3">Pick your favorite genre</h3>
                <p className="text-white/60 text-sm mb-4">Choose the genre that best matches your storytelling preferences</p>
                <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                  {['fantasy','romance','sci-fi','adventure','mystery','comedy','horror','goon-mode'].map(g => (
                    <button 
                      key={g} 
                      onClick={(e) => { e.stopPropagation(); handlePickGenre(g) }} 
                      className={`px-3 py-1.5 border text-sm hover:bg-white/5 transition-colors ${
                        selectedGenre === g 
                          ? 'border-white/60 text-white bg-white/10' 
                          : 'border-white/20 text-white/80 hover:text-white hover:border-white/40'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleGenreCancel}
                    className="px-4 py-2 border border-white/20 text-white/80 hover:text-white hover:border-white/30 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleStartWithGenre() }}
                    disabled={!selectedGenre}
                    className={`px-4 py-2 border transition-all duration-200 ${
                      selectedGenre 
                        ? 'border-white/40 text-white hover:border-white/60 hover:bg-white/10 opacity-0 animate-fadeIn' 
                        : 'border-white/10 text-white/40 cursor-not-allowed'
                    }`}
                    style={selectedGenre ? { animationDelay: '0.2s', animationFillMode: 'forwards' } : {}}
                  >
                    Start
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Feed Generation Loading State */}
          {isGeneratingFeed && (
            <div className="text-center opacity-0 animate-fadeIn" style={{ animationFillMode: 'forwards' }}>
              <div className="flex justify-center items-center space-x-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}

          {/* Analyzing State */}
          {(showAnalyzing || (showStreamedText && !streamingText.trim())) && (
            <div className="text-center opacity-0 animate-fadeIn" style={{ animationFillMode: 'forwards' }}>
              <p className="text-white text-xl font-light mb-2">Analyzing</p>
              <div className="flex justify-center items-center space-x-1">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
        </div>

        {showStreamedText && streamingText.trim() && (
          <div className="fixed inset-0 w-full h-full flex flex-col opacity-0 animate-fadeIn" style={{ animationFillMode: 'forwards' }}>
            <OnboardingResultsParser 
              streamingText={streamingText} 
              isStreaming={isStreaming}
              isGeneratingFeed={isGeneratingFeed}
              onBack={() => {
                // Go back to onboarding options
                setShowStreamedText(false)
                setStreamingText('')
                setShowOnboarding(true)
              }}
              onStart={async (characters, sourceName, similarWorks, tags, genre) => {
                // Save preferences and generate feed when user clicks Start
                setIsGeneratingFeed(true)
                
                try {
                  if (!authArgs) {
                    console.error('No auth args available for saving preferences')
                    return
                  }

                  // Save characters (need to add source back from sourceName)
                  if (characters.length > 0) {
                    await saveCharacters({
                      ...authArgs,
                      characters: characters.map(char => ({
                        fullName: char.name,
                        gender: char.gender,
                        source: sourceName,
                      }))
                    })
                    console.log('Saved characters:', characters)
                  }

                  // Save genre
                  if (genre) {
                    await updateStorySettings({
                      ...authArgs,
                      genre: genre.toLowerCase()
                    })
                    console.log('Saved genre:', genre)
                  }

                  // Save tags as search rule (combine them into a descriptive rule)
                  if (tags.length > 0) {
                    const tagsRule = `User prefers content with these themes and elements: ${tags.join(', ')}`
                    await updateTagPreferences({
                      ...authArgs,
                      searchRule: tagsRule
                    })
                    console.log('Saved tags as rule:', tagsRule)
                  }

                  // Log similar works for future use (could be saved to preferences later)
                  if (similarWorks.length > 0) {
                    console.log('Similar works identified:', similarWorks)
                  }

                  // Mark onboarding as completed only when user clicks Start
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('hasCompletedOnboarding', 'true')
                    // Dispatch custom event to notify other components
                    window.dispatchEvent(new CustomEvent('onboardingCompleted'))
                  }

                  await generateFeed()
                } catch (e) {
                  console.error('Error saving preferences:', e)
                  setIsGeneratingFeed(false)
                }
              }}
            />
          </div>
        )}
      </div>
    </section>
  )
} 

function OnboardCard({ label, onClick, children, subtext, delay }: { label: string; onClick: () => void; children: React.ReactNode; subtext: React.ReactNode; delay: string }) {
  return (
    <button 
      type="button" 
      onClick={(e) => { e.stopPropagation(); onClick() }} 
      className="group relative overflow-hidden border border-white/15 bg-white/3 hover:bg-white/6 p-4 text-left opacity-0 animate-fadeIn"
      style={{ animationDelay: delay, animationFillMode: 'forwards' }}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 border border-white/10 flex items-center justify-center">
          {children}
        </div>
        <div>
          <div className="text-white/90 font-semibold">{label}</div>
          <div className="text-white/60 text-sm">{subtext}</div>
        </div>
      </div>
    </button>
  )
}

function CameraSVG() {
  return (
    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 8h3l2-3h6l2 3h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z"/>
      <circle cx="12" cy="14" r="3.5"/>
    </svg>
  )
}



function GenreSVG() {
  return (
    <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 4h8v16H4z" />
      <path d="M12 8h8v12h-8z" />
    </svg>
  )
}