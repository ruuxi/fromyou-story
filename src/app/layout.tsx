import type { Metadata } from 'next'
import { getSiteUrl } from '@/lib/site'
import { cookies } from 'next/headers'
import './globals.css'
import '@/styles/unified.css'
import { Providers } from './providers'
import { GeistSans } from 'geist/font/sans'
import { LandingOverlayWrapper } from '@/components/landing/LandingOverlayWrapper'
import { AppShell } from '@/components/layout/AppShell'
import Image from 'next/image'

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: 'From You - The Ai Story Creator',
  description: 'The best way to create stories with AI',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`h-full ${GeistSans.variable}`}>
      <head>
        {/* Always preload since we can't know client state on server */}
        <link rel="preload" as="image" href="/2.webp" />
        <link rel="preload" as="video" href="/compatible.mp4" type="video/mp4" crossOrigin="anonymous" />
      </head>
      <body className={`${GeistSans.className} h-full`}>
        {/* Global Background - Consistent across entire platform */}
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 scale-110">
            <Image
              src="/2.webp"
              alt="Background"
              fill
              className="object-cover"
              priority
            />
          </div>
          
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900/30 via-stone-800/8 to-rose-900/15" />
          <div className="absolute inset-0 bg-gradient-to-br from-amber-600/8 via-amber-800/3 to-rose-600/8" />
          <div className="absolute inset-0 bg-gradient-to-b from-amber-950/35 via-amber-900/5 to-stone-800/25" />
          {/* Mobile-only global dim to match desktop's overall shadow */}
          <div className="absolute inset-0 md:hidden bg-black/20" />
        </div>

        <Providers>
          <LandingOverlayWrapper>
            <AppShell>
              {children}
            </AppShell>
          </LandingOverlayWrapper>
        </Providers>
      </body>
    </html>
  )
}
