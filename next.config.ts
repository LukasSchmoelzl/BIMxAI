import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize for production
  poweredByHeader: false,
  compress: true,
  
  // ESLint configuration for production builds
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },

  // TypeScript configuration for production builds
  typescript: {
    // Warning: This allows production builds to successfully complete even if
    // your project has type errors.
    ignoreBuildErrors: true,
  },
  
  // WebWorker support
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    return config;
  },
  
  // Security headers (additional to vercel.json)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }
        ]
      },
      // Ensure correct MIME type for WASM files
      {
        source: '/:all*.wasm',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/wasm'
          }
        ]
      }
    ];
  },
  
  // Disable x-powered-by header
  experimental: {
    // Optimize for serverless
  },
  
  // Disable React DevTools in production
  productionBrowserSourceMaps: false,
  
  // Optimize dev experience
  reactStrictMode: process.env.NODE_ENV === 'production'
};

export default nextConfig;
