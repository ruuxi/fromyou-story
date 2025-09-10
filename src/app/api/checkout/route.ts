import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("productId");
  const couponId = url.searchParams.get("couponId");
  
  if (!productId) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
  }

  // Get the base URL for success/cancel URLs
  const baseUrl = process.env.NODE_ENV === "production" 
    ? `https://${request.headers.get("host")}`
    : `http://${request.headers.get("host") || "localhost:3000"}`;

  try {
    const checkoutParams: {
      productId: string;
      origin: string;
      successUrl: string;
      couponId?: string;
    } = {
      productId,
      origin: baseUrl,
      successUrl: `${baseUrl}/subscription/success`,
    };

    if (couponId) {
      checkoutParams.couponId = couponId;
    }

    const result = await convex.action(api.stripe.generateCheckoutLink, checkoutParams);
    
    return NextResponse.redirect(result.url);
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    return NextResponse.json({ error: "Failed to create checkout session" }, { status: 500 });
  }
}