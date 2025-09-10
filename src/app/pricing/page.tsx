'use client'

import { SubscriptionPlans } from '@/components/subscription/SubscriptionPlans'
import Link from 'next/link'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })

export default function PricingPage() {
  return (
    <div className="min-h-screen min-h-[100svh] bg-[#1c1210]">
      <div className="glass-secondary border-b border-amber-100/20 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-amber-100/70 hover:text-amber-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Back to Home</span>
          </Link>
          
          <h1 className={`text-2xl md:text-3xl font-bold text-amber-50 ${playfair.className}`}>
            Pricing Plans
          </h1>
          
          <div className="w-24" />
        </div>
      </div>
      
      <div className="container mx-auto px-4 pt-8 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-amber-100 mb-4">
            Choose Your Plan
          </h2>
          <p className="text-amber-100/70 text-lg">
            Start creating amazing stories with our flexible pricing options
          </p>
        </div>
        
        <SubscriptionPlans />
      </div>
    </div>
  )
}