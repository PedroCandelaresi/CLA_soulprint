import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "backend",
      },
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
