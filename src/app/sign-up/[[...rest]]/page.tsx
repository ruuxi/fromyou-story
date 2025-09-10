'use client'

import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { Playfair_Display } from 'next/font/google'

const playfair = Playfair_Display({ subsets: ['latin'] })

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-[#1c1210] flex flex-col">
      <div className="glass-secondary border-b border-amber-100/20 px-4 sm:px-6 py-4">
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
            fromyou
          </h1>
          
          <div className="w-24" />
        </div>
      </div>
      
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-amber-100 mb-4">
              Start Creating Stories
            </h2>
            <p className="text-amber-100/70">
              Join thousands of storytellers using AI to bring their ideas to life
            </p>
          </div>
          
          <div className="bg-stone-800/25 backdrop-blur-xl rounded-2xl p-8 border border-amber-100/10">
            <SignUp 
              afterSignUpUrl="/"
              appearance={{
                elements: {
                  rootBox: 'w-full',
                  card: 'bg-transparent shadow-none',
                  headerTitle: 'text-amber-100',
                  headerSubtitle: 'text-amber-100/70',
                  socialButtonsBlockButton: 'bg-amber-100/10 border-amber-100/20 hover:bg-amber-100/20 text-amber-100',
                  formButtonPrimary: 'bg-amber-100/10 hover:bg-amber-100/20 border border-amber-100/20',
                  formFieldLabel: 'text-amber-100/70',
                  formFieldInput: 'bg-amber-50/5 border-amber-100/20 text-amber-100',
                  footerActionLink: 'text-amber-100 hover:text-amber-100/80',
                  identityPreviewText: 'text-amber-100/70',
                  identityPreviewEditButton: 'text-amber-100 hover:text-amber-100/80',
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}