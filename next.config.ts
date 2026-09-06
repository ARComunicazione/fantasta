import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: ['@electric-sql/pglite', 'ably'],
  outputFileTracingIncludes: { '/**': ['./drizzle/**'] },
  async rewrites() {
    return [{ source: '/studio', destination: '/studio/index.html' }];
  },
};

export default nextConfig;
