'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SignInButton as ClerkSignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs'
import { useSubscriptionModal } from '@/hooks/useSubscriptionModal'

export function SignInButton() {
  const [isContactOpen, setIsContactOpen] = useState(false)
  const [isContactAnimating, setIsContactAnimating] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { openModal } = useSubscriptionModal()
  const userButtonRootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Allow global event to open the user menu (account menu)
  useEffect(() => {
    const handler = () => {
      try {
        const root = userButtonRootRef.current
        if (!root) return
        const trigger = root.querySelector('button') as HTMLButtonElement | null
        trigger?.click()
      } catch {}
    }
    window.addEventListener('openUserMenu', handler)
    return () => window.removeEventListener('openUserMenu', handler)
  }, [])

  useEffect(() => {
    if (isContactOpen) {
      document.body.style.overflow = 'hidden'
      const id = setTimeout(() => setIsContactAnimating(true), 10)
      return () => clearTimeout(id)
    } else {
      setIsContactAnimating(false)
      document.body.style.overflow = 'unset'
    }
  }, [isContactOpen])

  const handleCloseContact = () => {
    setIsContactAnimating(false)
    setTimeout(() => {
      setIsContactOpen(false)
    }, 300)
  }

  return (
    <>
      <SignedOut>
        <ClerkSignInButton mode="modal">
          <button
            type="button"
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-stone-800/20 hover:bg-white/5 backdrop-blur-xl border border-white/20 rounded-md text-white/90 hover:text-white transition-all duration-300 text-sm font-medium"
          >
            Sign In
          </button>
        </ClerkSignInButton>
      </SignedOut>
      <SignedIn>
        <div ref={userButtonRootRef} className="flex items-center gap-4">
          <UserButton afterSignOutUrl="/">
            <UserButton.MenuItems>
              <UserButton.Action 
                label="Manage Subscription" 
                labelIcon={<span>💳</span>} 
                onClick={openModal}
              />
              <UserButton.Action label="Contact" labelIcon={<span>✉️</span>} onClick={() => setIsContactOpen(true)} />
            </UserButton.MenuItems>
          </UserButton>
        </div>
      </SignedIn>

      {isContactOpen && isMounted &&
        createPortal(
          <div
            className={`fixed inset-0 z-50 transition-opacity duration-300 bg-cover bg-center ${
              isContactAnimating ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ backgroundImage: "url('/onboarding-still-complete.png')" }}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-xl" onClick={handleCloseContact} />

            {/* Modal Content */}
            <div className="relative h-[100svh] overflow-auto simple-scrollbar">
              <div
                className={`min-h-screen min-h-[100svh] px-4 pt-[max(0.5rem,env(safe-area-inset-top))] md:pt-16 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-12 transition-opacity duration-300 grid place-items-center ${
                  isContactAnimating ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <div className="w-full max-w-md rounded-lg glass-primary p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Contact us</h3>
                    <button
                      type="button"
                      className="text-white/70 hover:text-white"
                      onClick={handleCloseContact}
                    >
                      ✕
                    </button>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      const form = e.currentTarget as HTMLFormElement
                      const formData = new FormData(form)
                      const subject = encodeURIComponent(String(formData.get('subject') || 'Contact'))
                      const body = encodeURIComponent(String(formData.get('message') || ''))
                      window.location.href = `mailto:contact@fromyou.ai?subject=${subject}&body=${body}`
                      handleCloseContact()
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm mb-1">Subject</label>
                      <input
                        name="subject"
                        type="text"
                        className="w-full rounded-md glass-secondary px-3 py-2 text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-amber-100/30"
                        placeholder="How can we help?"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Message</label>
                      <textarea
                        name="message"
                        className="w-full rounded-md glass-secondary px-3 py-2 h-28 resize-none text-white placeholder:text-white/50 outline-none focus:ring-2 focus:ring-amber-100/30"
                        placeholder="Write your message..."
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="px-3 py-2 rounded-md border border-white/20 bg-white/5 hover:bg-white/10 text-white/80"
                        onClick={handleCloseContact}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-2 rounded-md border border-white/20 bg-white/10 hover:bg-white/15 text-white transition"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  )
}