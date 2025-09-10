"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [secondsLeft, setSecondsLeft] = useState(5);

  const tier = searchParams.get("tier");
  const isReferral = searchParams.get("referral") === "true";

  const planName = useMemo(() => {
    if (tier === "tier1") return "Dawn";
    if (tier === "tier2") return "Noon";
    if (tier === "tier3") return "Midnight";
    return "Premium";
  }, [tier]);

  useEffect(() => {
    // Countdown only; avoid side effects inside state updater
    const interval = setInterval(() => {
      setSecondsLeft((current) => {
        const next = current - 1;
        return next <= 0 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (secondsLeft <= 0) {
      router.push("/");
    }
  }, [secondsLeft, router]);

  return (
    <div className="w-full h-full px-4 py-10 flex items-center justify-center">
      <div className="w-full max-w-lg">
        <div className="bg-stone-800/20 backdrop-blur-xl border border-white/20 rounded-2xl p-8">
          <div className="text-center">
            <div className="mx-auto mb-5 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/5 p-3">
              <CheckCircleIcon className="h-8 w-8 text-emerald-400" />
            </div>

            <h1 className="text-3xl font-bold text-white/90 mb-2">
              Subscription Activated
            </h1>

            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-white/60 text-sm">Your plan:</span>
              <span className="px-2.5 py-1 rounded-md border border-white/20 bg-white/5 text-white/80 text-sm font-medium">
                {planName}
              </span>
              {isReferral && (
                <span className="px-2 py-1 rounded-md border border-emerald-300/30 bg-emerald-300/10 text-emerald-300 text-xs font-medium">
                  Free month applied
                </span>
              )}
            </div>

            <p className="text-white/70 mb-8">
              Thanks for upgrading. Premium features are now active. Enjoy faster generation and better models.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 px-6 rounded-md font-semibold text-white/90 bg-sky-600/30 hover:bg-sky-500/30 border border-white/20 transition-all"
            >
              Start creating stories
            </button>
            <button
              onClick={() => router.push("/?showSubscription=true")}
              className="w-full py-3 px-6 rounded-md font-semibold text-white/90 bg-white/10 hover:bg-white/20 border border-white/20 transition-all"
            >
              Manage subscription
            </button>
          </div>

          <div className="mt-6 text-center text-white/60 text-sm">
            Redirecting in {secondsLeft}s...
          </div>
        </div>
      </div>
    </div>
  );
}