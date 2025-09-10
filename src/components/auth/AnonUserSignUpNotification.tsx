'use client';

import { useAuthState } from '@/hooks/useAuthState';
import { SignInButton } from '@clerk/nextjs';
import { X, UserPlus } from 'lucide-react';

interface AnonUserSignUpNotificationProps {
  isOpen: boolean;
  onClose: () => void;
  context?: 'assistant-overlay' | 'story-created' | 'story-history';
  title?: string;
  message?: string;
}

export function AnonUserSignUpNotification({ 
  isOpen, 
  onClose, 
  context = 'assistant-overlay',
  title,
  message
}: AnonUserSignUpNotificationProps) {
  const { isAnonymous } = useAuthState();

  if (!isAnonymous || !isOpen) return null;

  const defaultMessages = {
    'assistant-overlay': {
      title: 'Create Free Account',
      message: 'Sign up to save your stories, characters, and preferences across all devices.'
    },
    'story-created': {
      title: 'Keep Your Stories Forever',
      message: 'Sign up now to save this story and access it from any device.'
    },
    'story-history': {
      title: 'Sign Up to Save Stories',
      message: 'Create a free account to save your story history and access it from anywhere.'
    }
  };

  const content = {
    title: title || defaultMessages[context].title,
    message: message || defaultMessages[context].message
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 pointer-events-auto"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4 z-50 pointer-events-auto">
        <div className="relative z-10 w-full max-w-sm md:max-w-md mx-4 glass-secondary border border-amber-100/20 rounded-2xl p-4 md:p-6 text-white shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 text-white/50 hover:text-white/80 transition-colors"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <div className="p-1.5 md:p-2 rounded-full bg-white/10 backdrop-blur-sm">
              <UserPlus className="w-5 h-5 md:w-6 md:h-6 text-white/80" />
            </div>
            <h3 className="text-white/90 text-base md:text-lg font-semibold">{content.title}</h3>
          </div>
          
          <p className="text-white/70 text-sm md:text-base mb-5 md:mb-6 leading-relaxed">
            {content.message}
          </p>
          
          <div className="flex flex-col md:flex-row gap-2 md:gap-3">
            <SignInButton mode="modal">
              <button 
                type="button" 
                className="mode-button flex-1 w-full md:w-auto px-3.5 py-2.5 md:px-4 md:py-2.5 rounded-2xl text-[12px] md:text-[13px] font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
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
              onClick={onClose}
              className="px-3 py-2 md:px-4 md:py-3 text-sm md:text-base text-white/60 hover:text-white/90 transition-colors font-medium"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </>
  );
}