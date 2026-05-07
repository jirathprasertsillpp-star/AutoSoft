import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Only proxy to localhost during development
    if (process.env.NODE_ENV === 'production') return []
    
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/:path*' // Proxy to Backend
      }
    ]
  }
};

export default nextConfig;
