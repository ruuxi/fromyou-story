import type { NextConfig } from "next";

const disableClerk = process.env.NEXT_PUBLIC_DISABLE_CLERK === 'true'

const nextConfig: NextConfig = {
  reactStrictMode: false,
  eslint: {
    // Disable ESLint during builds on main branch
    ignoreDuringBuilds: true,
  },
  experimental: disableClerk
    ? {
        turbo: {
          resolveAlias: {
            ['@clerk/nextjs']: './src/stubs/clerk-nextjs.tsx',
          },
        },
      }
    : undefined,
  webpack: (config) => {
    if (disableClerk) {
      config.resolve = config.resolve || {}
      config.resolve.alias = config.resolve.alias || {}
      config.resolve.alias['@clerk/nextjs'] = './src/stubs/clerk-nextjs.tsx'
    }
    return config
  },
};

export default nextConfig;
