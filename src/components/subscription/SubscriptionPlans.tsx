"use client";

import { useState, useRef, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SunIcon, SparklesIcon, BoltIcon, MoonIcon, XMarkIcon } from "@heroicons/react/24/solid";
import { ManageSubscription } from "./ManageSubscription";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useSubscriptionModal } from "@/hooks/useSubscriptionModal";


type PlanTier = "tier1" | "tier2" | "tier3";

interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  priceId: string; // Stripe price ID
  popular?: boolean;
  features: string[];
  promoPrice?: number;
  promoNote?: string;
}

const plans: Plan[] = [
  {
    id: "tier1",
    name: "Dawn",
    price: 7.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER1_ID || "",
    features: [
      "Increased usage limits",
      "Better AI Model",
      "Improved Story Quality",
    ],
    promoPrice: 1,
    promoNote: "Limited time",
  },
  {
    id: "tier2",
    name: "Noon",
    price: 19.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER2_ID || "",
    popular: true,
    features: [
      "Higher usage limits",
      "Even Smarter AI Model",
      "Improved Story Quality",
    ],
  },
  {
    id: "tier3",
    name: "Midnight",
    price: 29.99,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TIER3_ID || "",
    features: [
      "Highest usage limits",
      "Smartest AI",
      "Highest Story Quality",
    ],
  },
];

interface SubscriptionPlansProps {
  fillViewport?: boolean;
  requestClose?: () => void;
}

export function SubscriptionPlans({ fillViewport = false, requestClose }: SubscriptionPlansProps) {
  const { isSignedIn, isLoaded } = useUser();
  const [loading, setLoading] = useState<string | null>(null);
  const { openSignIn } = useClerk();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const deviceType = useDeviceType();
  const { closeModal } = useSubscriptionModal();

  // Check current subscription
  const subscription = useQuery(
    api.subscriptions.index.getCurrentSubscription,
    isSignedIn ? {} : "skip"
  );
  const [currentIndex, setCurrentIndex] = useState(1); // Default to Noon (popular)
  const generateCheckoutLink = useAction(api.stripe.generateCheckoutLink);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

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

  // Default to Dawn when on mobile
  useEffect(() => {
    if (deviceType === 'mobile') {
      setCurrentIndex(0);
    }
  }, [deviceType]);

  const handleSubscribe = async (plan: Plan) => {
    setErrorMessage(null);
    // If Clerk hasn't loaded yet, do nothing to avoid false negatives
    if (!isLoaded) {
      return;
    }

    if (!isSignedIn) {
      // Open sign-in modal and ensure refresh resumes the modal instead of navigating away
      try {
        sessionStorage.setItem('resumeSignInOnReload', 'true')
      } catch {}
      openSignIn()
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    const currentController = abortControllerRef.current;

    setLoading(plan.id);
    try {
      // Check if component is still mounted and request wasn't aborted
      if (!isMountedRef.current || currentController.signal.aborted) {
        return;
      }
      
      const checkoutParams: {
        productId: string;
        origin: string;
        successUrl: string;
        couponId?: string;
      } = {
        productId: plan.priceId,
        origin: window.location.origin,
        successUrl: `${window.location.origin}/subscription/success?tier=${plan.id}`,
      };

      // Auto-apply coupon for Dawn plan if configured
      if (plan.id === "tier1" && process.env.NEXT_PUBLIC_STRIPE_COUPON_DAWN_ID) {
        checkoutParams.couponId = process.env.NEXT_PUBLIC_STRIPE_COUPON_DAWN_ID;
      }
      
      const result = await generateCheckoutLink(checkoutParams);
      console.log("Checkout result:", result);
      
      // Final check before redirecting
      if (!isMountedRef.current || currentController.signal.aborted) {
        return;
      }
      
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error: unknown) {
      // Don't show error if request was aborted
      if ((error as Error).name === 'AbortError' || !isMountedRef.current) {
        return;
      }
      console.error("Failed to create checkout link:", error);
      if (isMountedRef.current) {
        setErrorMessage("Failed to start checkout. Please try again.");
      }
    } finally {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setLoading(null);
      }
    }
  };

  const selectedPlan = plans[currentIndex];
  const dawnPlan = plans.find((p) => p.id === "tier1");
  const noonPlan = plans.find((p) => p.id === "tier2");
  const midnightPlan = plans.find((p) => p.id === "tier3");

  return (
    <>
      {/* Mobile: Current plan section container */}
      <div className="md:hidden mx-auto max-w-2xl mb-3">
        <div className="rounded-lg border border-white/15 bg-white/5 backdrop-blur-md px-3 py-2">
          <div className="flex items-center justify-center gap-2">
            {!subscription ? (
              <>
                <span className="px-2.5 py-1 rounded-md border border-stone-700/60 bg-stone-800/60 backdrop-blur-md text-stone-200 text-xs font-medium">Your plan</span>
                <span className="text-stone-200 text-sm flex items-center gap-1">
                  Free <span className="text-sm" role="img" aria-label="poop">💩</span>
                </span>
              </>
            ) : (
              <>
                <span className="px-2.5 py-1 rounded-md border border-white/20 bg-white/10 backdrop-blur-md text-white/90 text-xs font-medium">Your plan</span>
                <span className="text-white/80 text-sm">
                  {subscription.tier === 'tier1' ? 'Dawn' : subscription.tier === 'tier2' ? 'Noon' : 'Midnight'}
                </span>
              </>
            )}
          </div>
          {!subscription && (
            <ul className="mt-2 space-y-1 text-stone-400 mx-auto w-fit text-left">
              <li className="flex items-center justify-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400/70" aria-hidden="true" />
                <span className="text-xs">Usage limited</span>
              </li>
              <li className="flex items-center justify-start gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400/70" aria-hidden="true" />
                <span className="text-xs">Standard AI model</span>
              </li>
            </ul>
          )}
        </div>
      </div>

      {/* Header: Choose your plan */}
      <div className="mb-4 md:mb-6">
        {subscription && (
          <p className="hidden md:block mt-1 text-sm text-white/60">
            Current plan: <span className="font-medium text-white/80">{subscription.tier}</span>
          </p>
        )}
        {errorMessage && (
          <div className="mt-3 text-sm text-red-300/90 bg-red-500/10 border border-red-400/30 rounded-md px-3 py-2">
            {errorMessage}
          </div>
        )}
      </div>

      {/* Mobile: 3-button plan selector */}
      <div className="md:hidden">
        <div className="grid grid-cols-3 gap-0">
          <button
            type="button"
            aria-pressed={currentIndex === 0}
            onClick={() => setCurrentIndex(0)}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm border transition-colors
              ${currentIndex === 0
                ? 'bg-indigo-600/30 text-indigo-50 border-indigo-300/40'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white/90'}`}
          >
            <span className="sr-only">Select Dawn</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            <span>Dawn</span>
          </button>
          <button
            type="button"
            aria-pressed={currentIndex === 1}
            onClick={() => setCurrentIndex(1)}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm border transition-colors
              ${currentIndex === 1
                ? 'bg-amber-600/30 text-amber-50 border-amber-300/40'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white/90'}`}
          >
            <span className="sr-only">Select Noon</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.8 1.8-1.8zM1 13h3v-2H1v2zm10-9h2V1h-2v3zm7.03 2.05l1.79-1.8-1.79-1.79-1.8 1.79 1.8 1.8zM17 13h3v-2h-3v2zM12 22h2v-3h-2v3zM4.22 18.36l1.79 1.79 1.8-1.79-1.8-1.8-1.79 1.8zM20.83 18.36l-1.8-1.8-1.79 1.8 1.79 1.79 1.8-1.79z"/></svg>
            <span>Noon</span>
          </button>
          <button
            type="button"
            aria-pressed={currentIndex === 2}
            onClick={() => setCurrentIndex(2)}
            className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-sm border transition-colors
              ${currentIndex === 2
                ? 'bg-gradient-to-r from-fuchsia-600/40 to-indigo-600/40 text-white/90 border-white/30'
                : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white/90'}`}
          >
            <span className="sr-only">Select Midnight</span>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M9.37 5.51A7 7 0 0012 19a7 7 0 006.49-9.63 9 9 0 11-9.12-3.86z"/></svg>
            <span>Midnight</span>
          </button>
        </div>
      </div>

      {/* Selected plan details (mobile only) */}
      <div className="mt-0 mx-auto max-w-2xl md:hidden">
        <div
          className={`relative rounded-none p-4 max-[700px]:p-3 md:p-8 text-center overflow-hidden ${
            selectedPlan.id === "tier1"
              ? "bg-gradient-to-tr from-slate-300/20 via-indigo-200/15 to-transparent border border-indigo-200/30 backdrop-blur-xl shadow-[0_0_25px_rgba(99,102,241,0.25)]"
              : selectedPlan.id === "tier2"
              ? "bg-gradient-to-tr from-amber-300/20 via-orange-300/10 to-transparent border border-amber-300/40 backdrop-blur-xl shadow-[0_0_35px_rgba(251,191,36,0.30)]"
              : "bg-[radial-gradient(ellipse_at_top,_rgba(24,24,48,0.75),_rgba(12,12,24,0.55))] border border-white/30 backdrop-blur-xl shadow-[0_0_60px_rgba(99,102,241,0.35)]"
          }`}
        >
          {selectedPlan.id === "tier3" && (
            <div className="pointer-events-none absolute -inset-1 rounded-none bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/25 to-sky-500/25 blur-2xl opacity-70" />
          )}
          <div className="relative">
            <div className="mb-4 max-[700px]:mb-3">
              <h3 className={`text-xl max-[700px]:text-lg md:text-2xl font-bold ${
                selectedPlan.id === "tier3"
                  ? "bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-200 via-indigo-200 to-sky-200"
                  : selectedPlan.id === "tier2"
                  ? "text-amber-50"
                  : "text-indigo-50"
              }`}>{selectedPlan.name}</h3>
              {subscription && (
                <div className="mt-1 text-xs md:text-sm text-white/70">Current: {subscription.tier}</div>
              )}
              <div className="mt-2 max-[700px]:mt-1 flex items-baseline justify-center">
                {selectedPlan.promoPrice ? (
                  <>
                    <span className={`line-through mr-2 ${
                      selectedPlan.id === "tier2" ? "text-amber-100/70" : "text-indigo-100/70"
                    }`}>${selectedPlan.price}</span>
                     <span className={`text-2xl max-[700px]:text-xl md:text-4xl font-bold ${
                       selectedPlan.id === "tier3"
                         ? "bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-200 via-indigo-200 to-sky-200"
                         : selectedPlan.id === "tier2"
                         ? "text-amber-50"
                         : "text-indigo-50"
                     }`}>${selectedPlan.promoPrice}</span>
                    <span className="text-white/70 ml-2">/month</span>
                    {selectedPlan.promoNote && (
                      <span className={`ml-3 text-[10px] md:text-xs px-2 py-0.5 rounded ${
                        selectedPlan.id === "tier2"
                          ? "text-amber-50/90 bg-amber-400/15 border border-amber-200/30"
                          : "text-indigo-50/90 bg-indigo-400/15 border border-indigo-200/30"
                      }`}>{selectedPlan.promoNote}</span>
                    )}
                  </>
                ) : (
                  <>
                    <span className={`text-2xl max-[700px]:text-xl md:text-4xl font-bold ${
                      selectedPlan.id === "tier3"
                        ? "bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-200 via-indigo-200 to-sky-200"
                        : selectedPlan.id === "tier2"
                        ? "text-amber-50"
                        : "text-indigo-50"
                    }`}>${selectedPlan.price}</span>
                    <span className="text-white/70 ml-2">/month</span>
                  </>
                )}
              </div>
            </div>

            {selectedPlan.features?.length > 0 && (
              <ul className={`mb-4 max-[700px]:mb-3 grid grid-cols-1 gap-2 mx-auto w-fit text-left ${
                selectedPlan.id === "tier2" ? "text-amber-50/85" : selectedPlan.id === "tier1" ? "text-indigo-50/85" : "text-white/90"
              }`}>
                {selectedPlan.features.map((feature, idx) => (
                  <li key={idx} className="grid grid-cols-[14px_auto] items-start gap-2">
                    <span className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      selectedPlan.id === "tier3"
                        ? "bg-fuchsia-300/90"
                        : selectedPlan.id === "tier2"
                        ? "bg-amber-200/80"
                        : "bg-indigo-200/80"
                    }`} aria-hidden="true" />
                    <span className="text-sm leading-snug">{feature}</span>
                  </li>
                ))}
              </ul>
            )}

            <button
              onClick={() => handleSubscribe(selectedPlan)}
              disabled={loading !== null || !!(subscription && subscription.tier === selectedPlan.id)}
              className={`w-full py-2 max-[700px]:py-1.5 px-6 rounded-md font-medium transition-all ${
                subscription && subscription.tier === selectedPlan.id
                  ? "bg-green-600/30 text-green-100 cursor-default"
                  : selectedPlan.id === "tier3"
                  ? "bg-gradient-to-r from-fuchsia-600/50 to-indigo-600/50 hover:from-fuchsia-600/60 hover:to-indigo-600/60 text-white/90 shadow-[0_10px_30px_rgba(168,85,247,0.35)]"
                  : selectedPlan.id === "tier2"
                  ? "bg-amber-600/30 hover:bg-amber-500/30 text-amber-50"
                  : "bg-indigo-600/30 hover:bg-indigo-500/30 text-indigo-50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {subscription && subscription.tier === selectedPlan.id
                ? "Current Plan"
                : loading === selectedPlan.id
                ? "Loading..."
                : "Get Started"}
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: 4-column grid (Free, Dawn, Noon, Midnight) */}
      <div className="hidden md:grid grid-cols-4 gap-6 mt-6 items-stretch">
        {/* Free plan */}
        <div className="relative h-full flex flex-col rounded-none p-4 bg-stone-900/40 backdrop-blur-xl border border-stone-700/60">
          {/* Your plan label (desktop) - styled similar to other plan badges */}
          {!subscription && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="flex items-center gap-1 bg-stone-800/60 backdrop-blur-md text-stone-200 px-3 py-1 rounded-md text-sm font-medium border border-stone-700/60">
                Your plan
              </span>
            </div>
          )}
          <div className="flex items-center justify-center gap-2 pt-6 mb-2">
            <h3 className="text-2xl font-bold text-stone-200">Free</h3>
            <span className="text-xl" role="img" aria-label="poop">💩</span>
          </div>
          <div className="flex items-baseline justify-center">
            <span className="text-4xl font-bold text-stone-200">$0</span>
            <span className="text-stone-400 ml-2">/month</span>
          </div>
          <ul className="mt-4 space-y-1 text-stone-400 mx-auto w-fit text-left">
            <li className="flex items-center justify-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400/70" aria-hidden="true" />
              <span className="text-sm">Usage limited</span>
            </li>
            <li className="flex items-center justify-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400/70" aria-hidden="true" />
              <span className="text-sm">Standard AI model</span>
            </li>
          </ul>
          <button
            disabled
            className="mt-auto w-full py-3 px-6 rounded-md font-medium bg-stone-700/40 text-stone-300 cursor-default"
          >
            Current Plan
          </button>
        </div>

        {/* Dawn */}
        {dawnPlan && (
          <div
            className="relative h-full flex flex-col rounded-none p-4 border border-indigo-200/30 backdrop-blur-xl bg-gradient-to-tr from-slate-300/20 via-indigo-200/15 to-transparent shadow-[0_0_25px_rgba(99,102,241,0.25)]"
          >
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="flex items-center gap-1 bg-indigo-300/20 backdrop-blur-md text-white/90 px-3 py-1 rounded-md text-sm font-medium border border-indigo-200/40">
                <BoltIcon className="h-4 w-4 text-indigo-100" /> Great deal
              </span>
            </div>
            {subscription && subscription.tier === dawnPlan.id && (
              <div className="mb-2 text-center">
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white/80">Your plan</span>
              </div>
            )}
            <div className="pt-6 mb-6 text-center">
              <h3 className="text-2xl font-bold text-indigo-50 mb-2">{dawnPlan.name}</h3>
                <div className="flex items-baseline justify-center">
                  {dawnPlan.promoPrice ? (
                    <>
                      <span className="text-white/60 line-through mr-3">${dawnPlan.price}</span>
                      <span className="text-4xl font-bold text-indigo-50">${dawnPlan.promoPrice}</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-indigo-50">${dawnPlan.price}</span>
                  )}
                  <span className="text-white/70 ml-2">/month</span>
                </div>
              </div>
            {dawnPlan.features?.length > 0 && (
              <ul className="mb-8 space-y-2 text-white/80 mx-auto w-fit text-left">
                {dawnPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center justify-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-200/80" aria-hidden="true" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => handleSubscribe(dawnPlan)}
              disabled={loading !== null || !!(subscription && subscription.tier === dawnPlan.id)}
              className={`mt-auto w-full py-3 px-6 rounded-md font-medium transition-all ${
                subscription && subscription.tier === dawnPlan.id
                  ? "bg-green-600/30 text-green-100 cursor-default"
                  : "bg-indigo-600/30 hover:bg-indigo-500/30 text-indigo-50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {subscription && subscription.tier === dawnPlan.id
                ? "Current Plan"
                : loading === dawnPlan.id
                ? "Loading..."
                : "Get Dawn"}
            </button>
          </div>
        )}

        {/* Noon - extra pizzazz */}
        {noonPlan && (
          <div className="relative h-full flex flex-col rounded-none p-4 bg-gradient-to-tr from-amber-300/20 via-orange-300/10 to-transparent border border-amber-300/40 backdrop-blur-xl shadow-[0_0_35px_rgba(251,191,36,0.30)]">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <span className="flex items-center gap-1 bg-amber-300/25 backdrop-blur-md text-amber-50 px-4 py-1 rounded-md text-sm font-medium border border-amber-200/40 shadow-[0_0_20px_rgba(251,191,36,0.35)]">
                <SunIcon className="h-4 w-4 text-amber-100" /> Most Popular
              </span>
            </div>
            {subscription && subscription.tier === noonPlan.id && (
              <div className="mb-2 text-center">
                <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white/80">Your plan</span>
              </div>
            )}
            <div className="pt-6 mb-6 text-center">
              <h3 className="text-2xl font-bold text-amber-50 mb-2">{noonPlan.name}</h3>
              <div className="flex items-baseline justify-center">
                <span className="text-4xl font-bold text-amber-50">${noonPlan.price}</span>
                <span className="text-white/70 ml-2">/month</span>
              </div>
            </div>
            {noonPlan.features?.length > 0 && (
              <ul className="mb-8 space-y-2 text-white/80 mx-auto w-fit text-left">
                {noonPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center justify-start gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-200/80" aria-hidden="true" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={() => handleSubscribe(noonPlan)}
              disabled={loading !== null || !!(subscription && subscription.tier === noonPlan.id)}
              className={`mt-auto w-full py-3 px-6 rounded-md font-medium transition-all ${
                subscription && subscription.tier === noonPlan.id
                  ? "bg-green-600/30 text-green-100 cursor-default"
                  : "bg-amber-600/30 hover:bg-amber-500/30 text-amber-50"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {subscription && subscription.tier === noonPlan.id
                ? "Current Plan"
                : loading === noonPlan.id
                ? "Loading..."
                : "Get Noon"}
            </button>
          </div>
        )}

        {/* Midnight - lots of pizzazz */}
        {midnightPlan && (
          <div className="relative h-full flex flex-col">
            {/* outer glow */}
            <div className="pointer-events-none absolute -inset-1 rounded-none bg-gradient-to-r from-fuchsia-500/25 via-indigo-500/25 to-sky-500/25 blur-2xl opacity-70" />
            {/* shiny gradient badge wrapper (gradient border) */}
            <div className="relative rounded-none p-[1px] bg-gradient-to-r from-fuchsia-500/70 via-indigo-500/70 to-sky-500/70 shadow-[0_0_60px_rgba(99,102,241,0.35)]">
              {/* sparkles */}
              <span className="sparkle hidden md:block" style={{ top: "8%", left: "14%", animationDelay: "0s" }} />
              <span className="sparkle hidden md:block" style={{ top: "18%", right: "10%", animationDelay: "0.6s" }} />
              <span className="sparkle hidden md:block" style={{ top: "42%", left: "6%", animationDelay: "1.2s" }} />
              <span className="sparkle hidden md:block" style={{ top: "58%", right: "8%", animationDelay: "1.8s" }} />
              <span className="sparkle hidden md:block" style={{ bottom: "12%", left: "18%", animationDelay: "1.1s" }} />
              <span className="sparkle hidden md:block" style={{ bottom: "10%", right: "14%", animationDelay: "0.3s" }} />
              <div className="rounded-none p-4 backdrop-blur-xl bg-[radial-gradient(ellipse_at_top,_rgba(24,24,48,0.75),_rgba(12,12,24,0.55))] flex flex-col h-full">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="flex items-center gap-1 bg-gradient-to-r from-fuchsia-400/40 to-indigo-400/40 backdrop-blur-md text-white/90 px-4 py-1 rounded-md text-sm font-semibold border border-white/40 shadow-[0_0_30px_rgba(168,85,247,0.45)]">
                    <MoonIcon className="h-4 w-4" /> Elite
                  </span>
                </div>
                {subscription && subscription.tier === midnightPlan.id && (
                  <div className="mb-2 text-center">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 border border-white/20 text-white/80">Your plan</span>
                  </div>
                )}
                <div className="pt-6 mb-6 text-center">
                  <h3 className="text-2xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-200 via-indigo-200 to-sky-200 mb-2">{midnightPlan.name}</h3>
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-200 via-indigo-200 to-sky-200">${midnightPlan.price}</span>
                    <span className="text-white/70 ml-2">/month</span>
                  </div>
                </div>
                {midnightPlan.features?.length > 0 && (
                  <ul className="mb-8 space-y-2 text-white/85 mx-auto w-fit text-left">
                    {midnightPlan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center justify-start gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300/90" aria-hidden="true" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  onClick={() => handleSubscribe(midnightPlan)}
                  disabled={loading !== null || !!(subscription && subscription.tier === midnightPlan.id)}
                  className={`mt-auto w-full py-3 px-6 rounded-md font-semibold transition-all ${
                    subscription && subscription.tier === midnightPlan.id
                      ? "bg-green-600/30 text-green-100 cursor-default"
                      : "bg-gradient-to-r from-fuchsia-600/50 to-indigo-600/50 hover:from-fuchsia-600/60 hover:to-indigo-600/60 text-white/90 shadow-[0_10px_30px_rgba(168,85,247,0.45)]"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {subscription && subscription.tier === midnightPlan.id
                    ? "Current Plan"
                    : loading === midnightPlan.id
                    ? "Loading..."
                    : "Go Midnight"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manage Subscription - centered with X button */}
      <div className="mt-8 md:mt-16 flex justify-center items-center gap-3">
        <ManageSubscription />
        <button
          type="button"
          aria-label="Close subscription"
          title="Close"
          onClick={() => {
            if (requestClose) requestClose();
            else closeModal();
          }}
          className="md:hidden p-2 rounded-md bg-transparent border-0 hover:opacity-80 transition-opacity"
        >
          <XMarkIcon className="h-6 w-6 text-white/90" />
        </button>
      </div>
    </>
  );
}