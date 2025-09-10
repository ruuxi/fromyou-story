'use client'

import { MainContent } from '@/components/layout/MainContent'
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { useSubscriptionModal } from '@/hooks/useSubscriptionModal'
import { useUser, useClerk } from '@clerk/nextjs'

export default function HomePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { openModal } = useSubscriptionModal()
  const { isSignedIn } = useUser()
  const { openSignIn } = useClerk()
  const preserveFeedOnReturnRef = useRef<boolean>(false)

  // If the sign-in modal was open when the page was refreshed, reopen it
  useEffect(() => {
    // If returning from legal pages with preserve flag, store it and clear the storage flag once
    const preserve = typeof window !== 'undefined' && sessionStorage.getItem('preserveFeedOnReturn') === 'true'
    preserveFeedOnReturnRef.current = preserve
    if (preserve) {
      try { sessionStorage.removeItem('preserveFeedOnReturn') } catch {}
    }
    const shouldResumeSignIn = typeof window !== 'undefined' && sessionStorage.getItem('resumeSignInOnReload') === 'true'
    if (shouldResumeSignIn) {
      // Clear the flag immediately to avoid loops
      try {
        sessionStorage.removeItem('resumeSignInOnReload')
      } catch {}
      // Reopen Clerk sign-in modal
      openSignIn()
    }
  }, [openSignIn])

  useEffect(() => {
    // Open account menu from query param if present
    if (searchParams.get('openAccount') === 'true') {
      try {
        window.dispatchEvent(new Event('openUserMenu'))
      } catch {}
      // Remove the param from URL
      const params = new URLSearchParams(searchParams)
      params.delete('openAccount')
      const newUrl = params.toString() ? `/?${params.toString()}` : '/'
      router.replace(newUrl, { scroll: false })
    }

    // Check if we should show the subscription modal
    const shouldOpenFromQuery = !preserveFeedOnReturnRef.current && searchParams.get('showSubscription') === 'true'
    const shouldOpenFromSession = typeof window !== 'undefined' && sessionStorage.getItem('openSubscriptionAfterAuth') === 'true'

    // Only open subscription modal from session flag if the user is signed in (post-auth intent)
    const shouldOpenSubscription = shouldOpenFromQuery || (isSignedIn && shouldOpenFromSession)
    if (shouldOpenSubscription) {
      openModal()
      // Clean up trigger flags
      try {
        sessionStorage.removeItem('openSubscriptionAfterAuth')
      } catch {}
      if (shouldOpenFromQuery) {
        const params = new URLSearchParams(searchParams)
        params.delete('showSubscription')
        const newUrl = params.toString() ? `/?${params.toString()}` : '/'
        router.replace(newUrl, { scroll: false })
      }
    }
  }, [searchParams, router, openModal, isSignedIn])

  return <MainContent />
}