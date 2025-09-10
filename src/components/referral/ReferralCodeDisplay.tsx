"use client";

import { useState } from "react";
import { format } from "date-fns";

interface ReferralCodeDisplayProps {
  code: string;
  expiresAt: number;
}

export function ReferralCodeDisplay({ code, expiresAt }: ReferralCodeDisplayProps) {
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = async () => {
    const referralUrl = `${window.location.origin}/referral/${code}`;
    await navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-amber-900/30 rounded-xl p-6 border border-amber-100/20">
      <h3 className="text-lg font-semibold text-amber-100 mb-3">
        Your Referral Code
      </h3>
      <div className="bg-stone-900/50 rounded-lg p-4 mb-3">
        <p className="text-2xl font-mono font-bold text-amber-50 text-center">
          {code}
        </p>
      </div>
      <button
        onClick={copyToClipboard}
        className="w-full py-2 px-4 bg-amber-100/10 hover:bg-amber-100/20 text-amber-100 rounded-lg transition-colors text-sm font-medium"
      >
        {copied ? "Copied!" : "Copy Referral Link"}
      </button>
      <p className="text-amber-100/60 text-xs mt-3 text-center">
        Valid until {format(new Date(expiresAt), "MMM d, yyyy")}
      </p>
    </div>
  );
}
