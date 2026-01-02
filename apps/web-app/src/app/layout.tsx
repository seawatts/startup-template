import { ReactScan } from '@seawatts/ui/custom/react-scan';
import { ThemeProvider } from '@seawatts/ui/custom/theme';
import { cn } from '@seawatts/ui/lib/utils';
import { Toaster } from '@seawatts/ui/sonner';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import '@seawatts/ui/globals.css';

import { AnalyticsProviders } from '@seawatts/analytics/providers';
import { TRPCReactProvider } from '@seawatts/api/react';
import { StripeProvider } from '@seawatts/stripe/guards/client';
import { Suspense } from 'react';
import { env } from '~/env';

export const metadata: Metadata = {
  description:
    'Production-ready monorepo template for building startups with AI-powered development workflows.',
  metadataBase: new URL(
    env.VERCEL_ENV === 'production'
      ? 'https://seawatts.sh'
      : 'http://localhost:3000',
  ),
  openGraph: {
    description:
      'Production-ready monorepo template for building startups with AI-powered development workflows.',
    siteName: 'Startup Template',
    title: 'AI-Powered Startup Template',
    url: 'https://seawatts.sh',
  },
  title: 'AI-Powered Startup Template',
  twitter: {
    card: 'summary_large_image',
    creator: '@seawatts',
    site: '@seawatts',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { color: 'white', media: '(prefers-color-scheme: light)' },
    { color: 'black', media: '(prefers-color-scheme: dark)' },
  ],
};

const isDevelopment = process.env.NODE_ENV === 'development';

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          'bg-background text-foreground relative min-h-screen font-sans antialiased',
          GeistSans.variable,
          GeistMono.variable,
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {isDevelopment && <ReactScan />}
          <NuqsAdapter>
            <TRPCReactProvider>
              <Suspense>
                <AnalyticsProviders identifyUser>
                  <StripeProvider>
                    {props.children}
                    <Toaster />
                  </StripeProvider>
                </AnalyticsProviders>
              </Suspense>
            </TRPCReactProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
