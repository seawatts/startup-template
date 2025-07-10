import { withBaml } from '@boundaryml/baml-nextjs-plugin';
import MillionLint from '@million/lint';

// @ts-check
import withBundleAnalyzer from '@next/bundle-analyzer';

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    scrollRestoration: true,
    // typedRoutes: true,
    // dynamicIO: true,
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  images: {
    remotePatterns: [
      { hostname: 'images.unsplash.com' },
      { hostname: 'gravatar.com' },
      { hostname: 'avatars.githubusercontent.com' },
      { hostname: 'cloudflare-ipfs.com' },
      { hostname: 'lh3.googleusercontent.com' },
      { hostname: 'media.licdn.com' },
      { hostname: 'img.clerk.com' },
      { hostname: 'image.tmdb.org' },
      { hostname: 'picsum.photos' },
    ],
  },
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  poweredByHeader: false,
  // compiler: {
  // removeConsole: true,
  // },
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
};

const withPlugins = [
  process.env.MILLION_LINT === 'true'
    ? MillionLint.next({
        rsc: true,
      })
    : null,
  withBaml(),
  process.env.WITH_BUNDLE_ANALYZER === 'true'
    ? withBundleAnalyzer({ enabled: true })
    : null,
].filter((plugin) => plugin !== null);

export default withPlugins.reduce((acc, plugin) => plugin(acc), nextConfig);
