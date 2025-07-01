import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  experimental: {
    outputFileTracingIncludes: {
      '/': ['./public/**/*'],
    },
  },
};

export default nextConfig;
