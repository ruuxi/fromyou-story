"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Redirect to home with subscription modal open
    const params = new URLSearchParams(searchParams);
    params.set("showSubscription", "true");
    router.replace(`/?${params.toString()}`);
  }, [router, searchParams]);

  // Show a loading state while redirecting
  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center">
      <div className="text-amber-100">Redirecting...</div>
    </div>
  );
}