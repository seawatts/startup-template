import baseConfig from '@seawatts/next-config/base';

/** @type {import('next').NextConfig} */
const nextConfig = {
  ...baseConfig,
  transpilePackages: [
    '@seawatts/analytics',
    '@seawatts/api',
    '@seawatts/db',
    '@seawatts/id',
    '@seawatts/ui',
    '@seawatts/logger',
    '@seawatts/stripe',
  ],
};

export default nextConfig;
