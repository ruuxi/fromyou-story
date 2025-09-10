"use client";

import { useSubscriptionModal } from "@/hooks/useSubscriptionModal";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser, SignInButton as ClerkSignInButton } from "@clerk/nextjs";

interface UpgradeButtonProps {
  variant?: "primary" | "secondary" | "inline";
  text?: string;
  className?: string;
}

export function UpgradeButton({ 
  variant = "primary", 
  text = "Upgrade", 
  className = "" 
}: UpgradeButtonProps) {
  const { openModal } = useSubscriptionModal();
  const { isSignedIn } = useUser();
  
  // Check subscription status
  const subscription = useQuery(
    api.subscriptions.index.getCurrentSubscription,
    isSignedIn ? {} : "skip"
  );
  
  // Don't render if user has an active subscription
  if (subscription && subscription.status === "active") {
    return null;
  }

  const baseClasses = "font-medium transition-all duration-300";
  
  const variantClasses = {
    primary: "py-3 px-6 bg-amber-50/10 backdrop-blur-md text-amber-50 rounded-lg border border-amber-50/20 hover:bg-amber-50/15 hover:border-amber-50/30",
    secondary: "py-2 px-4 bg-amber-50/5 backdrop-blur-md text-amber-50/80 rounded-lg border border-amber-50/10 hover:bg-amber-50/10 hover:text-amber-50 hover:border-amber-50/20",
    inline: "text-amber-50/80 hover:text-amber-50 underline underline-offset-4 decoration-amber-50/40"
  };

  // If not signed in, open Clerk sign-in modal (same overlay as the header Sign In button)
  if (!isSignedIn) {
    return (
      <ClerkSignInButton mode="modal">
        <button
          type="button"
          onClick={() => {
            try {
              sessionStorage.setItem('openSubscriptionAfterAuth', 'true')
              sessionStorage.setItem('resumeSignInOnReload', 'true')
            } catch {}
          }}
          className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        >
          {text}
        </button>
      </ClerkSignInButton>
    );
  }

  // If signed in, open the subscription modal directly
  return (
    <button onClick={openModal} className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {text}
    </button>
  );
}