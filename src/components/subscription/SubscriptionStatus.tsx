"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

const tierNames: Record<string, string> = {
  tier1: "Dawn",
  tier2: "Noon",
  tier3: "Midnight",
};

export function SubscriptionStatus() {
  const { isLoaded, isSignedIn } = useUser();
  const subscription = useQuery(
    api.subscriptions.index.getCurrentSubscription,
    isSignedIn ? {} : "skip"
  );

  if (!isLoaded || (isSignedIn && subscription === undefined)) {
    return (
      <div className="bg-stone-800/25 backdrop-blur-xl border border-amber-100/10 rounded-xl p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-amber-100/10 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-amber-100/5 rounded w-3/4"></div>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="bg-stone-800/25 backdrop-blur-xl border border-amber-100/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-amber-100 mb-2">Free Plan</h3>
        <p className="text-amber-50/60">
          You&apos;re currently on the free plan with limited features.
        </p>
      </div>
    );
  }

  const isActive = subscription.status === "active";

  return (
    <div className="bg-gradient-to-br from-amber-100/10 to-amber-50/5 backdrop-blur-xl border border-amber-100/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-amber-100">Current Plan</h3>
        {isActive && (
          <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm">
            Active
          </span>
        )}
      </div>
      
      <div className="space-y-2">
        <p className="text-2xl font-bold text-amber-50">
          {tierNames[subscription.tier]}
        </p>
        <p className="text-amber-50/60">
          Your enhanced features are active
        </p>
      </div>

      
    </div>
  );
}