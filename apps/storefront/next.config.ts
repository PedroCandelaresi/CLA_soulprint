import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/webp", "image/avif"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "backend",
      },
      // Keep HTTPS wildcard until the final public asset hostname is confirmed.
      {
        protocol: "https",
        hostname: "**",
      }
    ],
  },
  async rewrites() {
    return [
      {
        source: '/assets/:path*',
        destination: 'http://backend:3001/assets/:path*',
      },
    ];
  },
};

export default nextConfig;
