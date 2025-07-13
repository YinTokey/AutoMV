import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'im.runware.ai',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
