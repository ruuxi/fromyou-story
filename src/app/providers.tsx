'use client'

import type { ReactNode } from 'react'
import { ClerkProvider, useAuth } from '@clerk/nextjs'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { ConvexReactClient } from 'convex/react'
import { clerkAppearance } from '@/lib/clerkAppearance'
import { DataMigrationWrapper } from '@/components/DataMigrationWrapper'
import { SuggestionsProvider } from '@/contexts/SuggestionsContext'
import { SubscriptionModalProvider } from '@/hooks/useSubscriptionModal'

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <DataMigrationWrapper>
          <SuggestionsProvider>
            <SubscriptionModalProvider>
              {children}
            </SubscriptionModalProvider>
          </SuggestionsProvider>
        </DataMigrationWrapper>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  )
}
