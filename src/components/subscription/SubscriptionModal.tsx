"use client";

import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { SubscriptionPlans } from "./SubscriptionPlans";
import { useUser, useClerk } from "@clerk/nextjs";
import { useDeviceType } from "@/hooks/useDeviceType";


interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const { isSignedIn, isLoaded } = useUser();
  const { openSignIn } = useClerk();
  const deviceType = useDeviceType();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      setIsAnimating(false);
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 bg-cover bg-center ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
      style={{
        backgroundImage: "url('/onboarding-still-complete.png')",
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-950/40 backdrop-blur-xl will-change-backdrop"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative h-[100svh] overflow-auto simple-scrollbar">
        {/* Desktop unauthenticated: capture any click in modal to open sign-in */}
        {isLoaded && !isSignedIn && deviceType === 'desktop' && (
          <div
            className="absolute inset-0 z-20 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              try {
                sessionStorage.setItem('openSubscriptionAfterAuth', 'true');
                sessionStorage.setItem('resumeSignInOnReload', 'true');
              } catch {}
              openSignIn();
            }}
            aria-label="Sign in required"
          />
        )}
        <div
          className={`min-h-screen min-h-[100svh] px-4 pt-[max(0.5rem,env(safe-area-inset-top))] md:pt-16 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:pb-12 transition-all duration-300 grid place-items-center ${
            isAnimating ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Close Button (desktop only) */}
          {deviceType === 'desktop' && (
            <button
              onClick={handleClose}
              className="fixed top-6 right-6 z-10 p-2 rounded-md bg-transparent border-0 hover:opacity-80 transition-opacity"
              aria-label="Close subscription modal"
            >
              <XMarkIcon className="h-6 w-6 text-white/90" />
            </button>
          )}

          <div className="max-w-7xl w-full">
            {/* Header */}
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-3xl md:text-5xl font-bold text-amber-50 md:text-white/90 mb-3 md:mb-4 tracking-wide">
                Choose Your Plan
              </h1>
              <p className="text-base md:text-xl text-amber-50/80 md:text-white/70 max-w-2xl mx-auto px-4">
                Unlock enhanced features and higher rate limits to create more stories faster
              </p>
            </div>

            

            {/* Subscription Plans */}
            <div className="mt-2 md:mt-12">
              <SubscriptionPlans requestClose={handleClose} />
            </div>

            {/* Removed compare features section */}
          </div>
        </div>
      </div>
    </div>
  );
}