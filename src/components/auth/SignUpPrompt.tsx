'use client';

import { useAuthState } from '@/hooks/useAuthState';
import { SignInButton } from '@clerk/nextjs';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';

interface SignUpPromptProps {
  trigger?: 'character-limit' | 'story-created' | 'time-based';
  onDismiss?: () => void;
}

export function SignUpPrompt({ trigger = 'time-based', onDismiss }: SignUpPromptProps) {
  const { isAnonymous } = useAuthState();
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (isAnonymous && !isDismissed) {
      // Show prompt based on trigger
      if (trigger === 'time-based') {
        // Show after 2 minutes of usage
        const timer = setTimeout(() => setIsVisible(true), 2 * 60 * 1000);
        return () => clearTimeout(timer);
      } else {
        // Show immediately for other triggers
        setIsVisible(true);
      }
    }
  }, [isAnonymous, isDismissed, trigger]);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    onDismiss?.();
  };

  if (!isAnonymous || !isVisible) return null;

  const messages = {
    'character-limit': {
      title: 'Save Your Characters',
      description: 'Create a free account to save unlimited characters and access them from any device.',
    },
    'story-created': {
      title: 'Keep Your Stories Forever',
      description: 'Sign up to save your stories, track your progress, and continue where you left off.',
    },
    'time-based': {
      title: 'Enjoying the Experience?',
      description: 'Create a free account to save your progress and unlock all features.',
    },
  };

  const { title, description } = messages[trigger];

  return (
    <div className="fixed bottom-4 right-4 max-w-sm animate-in slide-in-from-bottom-5 z-50">
      <div className="glass-primary border border-white/20 rounded-2xl p-6 shadow-2xl backdrop-blur-xl bg-gradient-to-br from-sky-900/30 via-purple-900/20 to-sky-800/30">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-3 right-3 text-white/50 hover:text-white/80 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-sm text-white/70 mb-4">{description}</p>
        
        <div className="flex gap-3">
          <SignInButton mode="modal">
            <button 
              type="button" 
              className="flex-1 bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg font-medium hover:bg-white/30 transition-all border border-white/30"
              onClick={() => {
                try {
                  sessionStorage.setItem('resumeSignInOnReload', 'true')
                } catch {}
              }}
            >
              Sign Up Free
            </button>
          </SignInButton>
          
          <button
            type="button"
            onClick={handleDismiss}
            className="px-4 py-2 text-sm text-white/60 hover:text-white/90 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}