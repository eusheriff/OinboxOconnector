import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'oinbox.oconnector.tech',
      },
    ],
  },
  transpilePackages: ['fumadocs-ui', 'fumadocs-core', 'fumadocs-mdx'],
};

export default nextConfig;
