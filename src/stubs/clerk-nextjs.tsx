'use client'

import React from 'react'

// Minimal stub of @clerk/nextjs to allow running the app without Clerk.
// Export only what the app currently imports/uses.

type ChildrenProp = { children?: React.ReactNode }

export function ClerkProvider({ children }: ChildrenProp & Record<string, unknown>) {
  return <>{children}</>
}

export function useAuth() {
  return {
    isSignedIn: false as const,
    userId: null as string | null,
    sessionId: null as string | null,
    getToken: async () => null as unknown as string | null,
    signOut: async () => {},
  }
}

export function useUser() {
  return {
    isSignedIn: false as const,
    isLoaded: true as const,
    user: null as unknown as { id: string } | null,
  }
}

export function useClerk() {
  return {
    openSignIn: () => {
      if (typeof window !== 'undefined') {
        // No-op when Clerk is disabled; log for visibility in dev
        // eslint-disable-next-line no-console
        console.info('[Clerk disabled] openSignIn called')
      }
    },
  }
}

export function SignedIn({ children }: ChildrenProp) {
  // With Clerk disabled, never render signed-in content
  return null
}

export function SignedOut({ children }: ChildrenProp) {
  return <>{children}</>
}

export function SignInButton({ children, ...props }: ChildrenProp & Record<string, unknown>) {
  // If custom children are provided (e.g., a styled button), render them directly
  // to avoid creating nested <button> elements which cause hydration issues.
  if (children) return <>{children}</>
  return <button type="button" {...props}>Sign in</button>
}

export function UserButton(_props: Record<string, unknown>) {
  // Render nothing when Clerk is disabled
  return null
}

// SignIn/SignUp components used on auth routes; render nothing when disabled
export function SignIn() {
  return null
}

export function SignUp() {
  return null
}



