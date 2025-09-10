"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/solid";

export default function ReferralRedemptionPage() {
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;
  const { isSignedIn, user } = useUser();
  
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);
  
  const validation = useQuery(api.referrals.queries.validateReferralCode, { 
    code: code?.toUpperCase() || "" 
  });
  const hasUsedCode = useQuery(api.referrals.queries.hasUsedReferralCode);
  const redeemCode = useMutation(api.referrals.mutations.redeemReferralCode);
  const generateCheckoutLink = useAction(api.stripe.generateCheckoutLink);

  // Mount/unmount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Cancel any ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (!validation?.valid && validation?.error) {
      setError(validation.error);
    }
  }, [validation]);

  useEffect(() => {
    if (validation?.valid && validation.expiresAt) {
      const updateTimeLeft = () => {
        const now = Date.now();
        const diff = validation.expiresAt - now;
        
        if (diff <= 0) {
          setTimeLeft("Expired");
          setError("This referral code has expired");
          return;
        }

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
          setTimeLeft(`Valid for ${hours}h ${minutes}m`);
        } else {
          setTimeLeft(`Valid for ${minutes}m`);
        }
      };

      updateTimeLeft();
      const interval = setInterval(updateTimeLeft, 60000);
      return () => clearInterval(interval);
    }
  }, [validation]);

  const handleRedeem = async () => {
    if (!isSignedIn) {
      // Save the referral code and redirect to sign-in
      sessionStorage.setItem("referralCode", code);
      router.push(`/sign-in?redirect_url=/referral/${code}`);
      return;
    }

    if (hasUsedCode) {
      setError("You have already used a referral code");
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    try {
      setIsRedeeming(true);
      setError(null);

      // Mark the code as redeemed in the database
      await redeemCode({ code: code.toUpperCase() });

      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || currentController.signal.aborted) {
        return;
      }

      // For referrals, we'll use a Stripe coupon for free month (if configured)
      let couponId: string | undefined;
      
      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || currentController.signal.aborted) {
        return;
      }

      // For referrals, try to use a referral coupon (you'd need to create this in Stripe)
      couponId = process.env.NEXT_PUBLIC_STRIPE_COUPON_REFERRAL_ID;

      // Generate checkout link with Stripe
      const checkoutParams: {
        productId: string;
        origin: string;
        successUrl: string;
        couponId?: string;
      } = {
        productId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER1_ID || "",
        origin: window.location.origin,
        successUrl: `${window.location.origin}/subscription/success?tier=tier1&referral=true`,
      };
      
      if (couponId) {
        checkoutParams.couponId = couponId;
      }
      
      const result = await generateCheckoutLink(checkoutParams);
      
      // Final check before redirecting
      if (!isMountedRef.current || currentController.signal.aborted) {
        return;
      }
      
      if (result?.url) {
        window.location.href = result.url;
      } else {
        throw new Error("Failed to generate checkout link");
      }
    } catch (err: unknown) {
      // Don't show error if request was aborted
      if ((err as Error).name === 'AbortError' || !isMountedRef.current) {
        return;
      }
      console.error("Failed to redeem code:", err);
      if (isMountedRef.current) {
        setError((err as Error).message || "Failed to redeem code. Please try again.");
        setIsRedeeming(false);
      }
    }
  };

  // Loading state
  if (!validation) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
        <div className="text-amber-100">Validating referral code...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-gradient-to-br from-amber-100/20 to-amber-50/10 backdrop-blur-xl border border-amber-100/20 rounded-2xl p-8">
          
          {/* Valid Code */}
          {validation.valid && !error && (
            <>
              <CheckCircleIcon className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
              
              <h1 className="text-3xl font-bold text-amber-50 mb-2 text-center">
                You're Invited!
              </h1>
              
              <p className="text-amber-100/80 mb-6 text-center">
                Your friend has gifted you a <span className="font-semibold text-emerald-400">FREE month</span> of FromYou Dawn subscription!
              </p>
              
              <div className="bg-stone-900/50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-amber-100/60">Referral Code</span>
                  <span className="font-mono font-bold text-emerald-400">{code.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-amber-100/60">Value</span>
                  <span className="font-semibold text-emerald-400">$7.99 FREE</span>
                </div>
              </div>
              
              {timeLeft && (
                <div className="flex items-center justify-center gap-2 mb-6 text-amber-100/70">
                  <ClockIcon className="h-4 w-4" />
                  <span className="text-sm">{timeLeft}</span>
                </div>
              )}
              
              {hasUsedCode ? (
                <div className="p-4 bg-amber-900/30 border border-amber-100/30 rounded-lg mb-4">
                  <p className="text-amber-100/80 text-sm">
                    You have already used a referral code. Each user can only use one referral code.
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleRedeem}
                  disabled={isRedeeming}
                  className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-emerald-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRedeeming ? "Processing..." : isSignedIn ? "Claim Your Free Month" : "Sign In to Claim"}
                </button>
              )}
              
              <div className="mt-6 p-3 bg-amber-900/20 border border-amber-100/20 rounded-lg">
                <p className="text-xs text-amber-100/60">
                  Dawn subscription includes unlimited story generation. After your free month, you can continue for $7.99/month or cancel anytime.
                </p>
              </div>
            </>
          )}
          
          {/* Invalid Code */}
          {(!validation.valid || error) && (
            <>
              <XCircleIcon className="h-16 w-16 text-red-400 mx-auto mb-4" />
              
              <h1 className="text-2xl font-bold text-amber-50 mb-4 text-center">
                Invalid Referral Code
              </h1>
              
              <div className="p-4 bg-red-900/30 border border-red-100/30 rounded-lg mb-6">
                <p className="text-red-100/80 text-center">
                  {error || validation?.error || "This referral code is not valid"}
                </p>
              </div>
              
              <button
                onClick={() => router.push("/")}
                className="w-full py-3 px-6 bg-amber-900/50 text-amber-100 rounded-lg font-semibold hover:bg-amber-800/50 transition-all"
              >
                Back to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}