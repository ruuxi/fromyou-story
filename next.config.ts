import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    // Disable ESLint during builds on main branch
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
