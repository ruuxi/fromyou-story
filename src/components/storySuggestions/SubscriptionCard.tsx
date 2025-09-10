'use client'

import { memo } from 'react'
import { Playfair_Display } from 'next/font/google'
const playfair = Playfair_Display({ subsets: ['latin'] })
import { useUser } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useSubscriptionModal } from '@/hooks/useSubscriptionModal'
import { SparklesIcon } from '@heroicons/react/24/solid'

interface SubscriptionCardProps {
  showDivider?: boolean
  showTopDivider?: boolean
  variant?: 'feed' | 'sidebar'
}

export const SubscriptionCard = memo(function SubscriptionCard({ 
  showDivider = true,
  showTopDivider = false,
  variant = 'feed',
}: SubscriptionCardProps) {
  const { isSignedIn } = useUser()
  const { openModal } = useSubscriptionModal()
  
  // Check current subscription
  const subscription = useQuery(
    api.subscriptions.index.getCurrentSubscription,
    isSignedIn ? {} : "skip"
  )
  
  // Don't show if user already has a subscription
  if (subscription) return null
  
  const handleClick = () => {
    openModal()
  }
  
  return (
    <>
      {variant === 'sidebar' ? (
        // Sidebar variant: only the inner container with all content
        <div 
          onClick={handleClick}
          className="relative overflow-hidden group cursor-pointer transition-all duration-300 p-3 md:p-5 bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 hover:from-amber-900/24 hover:via-sky-900/18 hover:to-purple-900/12 border border-white/20"
        >
          {/* Shimmer effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
          </div>
          
          <div className="relative z-10 md:text-center space-y-2 md:space-y-4">
            {/* Mobile View Plans button - thinner and higher */}
            <div className="md:hidden flex justify-center -mt-1 mb-1">
              <button
                className="px-3 py-0.5 text-white/90 text-sm transition-all font-bold whitespace-nowrap hover:text-white drop-shadow-sm"
              >
                View Plans
              </button>
            </div>
            
            {/* Desktop: View Plans only */}
            <div className="hidden md:flex justify-center mb-2">
              <button
                className="px-4 py-2 text-white/90 text-xl transition-all font-bold whitespace-nowrap hover:text-white drop-shadow-sm"
              >
                View Plans
              </button>
            </div>
            
            <p className="text-white/95 text-sm md:text-base leading-relaxed font-semibold">
              Unlock Premium Features
            </p>
            <div className="flex flex-wrap justify-start md:justify-center gap-x-4 md:gap-x-6 gap-y-1 md:gap-y-2 text-white/70 text-xs md:text-sm">
              <span>• Smarter AI</span>
              <span>• Increased Limits</span>
              <span>• Premium quality</span>
            </div>
            {/* Promo: Limited time Dawn pricing */}
            <div className="inline-flex items-center gap-2 md:gap-3 px-3 md:px-4 py-1.5 md:py-2.5 bg-black/20 border border-white/10">
              <span className="text-[10px] md:text-xs uppercase tracking-wider text-white/70 font-bold">Limited offer</span>
              <div className="flex items-center gap-1 md:gap-2">
                <span className="text-white/90 font-bold text-sm md:text-base">$1</span>
                <span className="text-white/50 line-through text-xs md:text-sm">$7.99</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Feed variant: keep original structure
        <div 
          onClick={handleClick}
          className="relative z-0 overflow-hidden group cursor-pointer transition-all duration-300 bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 hover:from-amber-900/24 hover:via-sky-900/18 hover:to-purple-900/12 border border-white/10 p-6 md:px-10 md:py-8"
        >
          {/* Shimmer effect on hover */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
          </div>
          
          <div className="relative z-10">
            {/* Feed variant: grid layout */}
            <div className="flex flex-col gap-4 md:grid md:grid-cols-[auto_1fr_auto] md:items-center md:gap-6">
              {/* Branding title (left, desktop only) */}
              <div className="hidden md:flex items-center justify-start md:px-2">
                <span className={`${playfair.className} text-white/95 text-base md:text-2xl font-bold drop-shadow-sm select-none`}>
                  FromYou
                </span>
              </div>

              {/* Description (center) */}
              <div className="w-full md:w-auto md:justify-self-center md:text-center">
                
                {/* Compact feature list */}
                <div className="flex flex-wrap justify-start md:justify-center gap-x-4 gap-y-1 text-white/75 text-xs md:text-sm">
                  <span>• Advanced AI</span>
                  <span>• Increased Limits</span>
                  <span>• Premium features</span>
                </div>
              </div>
              
              {/* CTA Button (right, desktop only) */}
              <button
                className="hidden md:inline-flex items-center px-5 py-2 text-sm bg-gradient-to-br from-amber-900/20 via-sky-900/15 to-purple-900/10 hover:from-amber-900/24 hover:via-sky-900/18 hover:to-purple-900/12 text-white/90 transition-all font-semibold flex-shrink-0 border border-white/20 md:justify-self-end">
                Upgrade
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})
