"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

export function ManageSubscription() {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const generateCustomerPortalUrl = useAction(api.stripe.generateCustomerPortalUrl);

  const handleManageSubscription = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await generateCustomerPortalUrl();
      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error("Failed to create portal link:", error);
      setErrorMessage("Failed to open subscription management. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleManageSubscription}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white/90 rounded-md hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Manage subscription"
      >
        <span>{loading ? "Loading..." : "Manage Subscription"}</span>
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </button>
      {errorMessage && (
        <div className="text-sm text-red-300/90 bg-red-500/10 border border-red-400/30 rounded-md px-3 py-2">
          {errorMessage}
        </div>
      )}
    </div>
  );
}