import { ReactScan } from '@seawatts/ui/custom/react-scan';
import { ThemeProvider } from '@seawatts/ui/custom/theme';
import { cn } from '@seawatts/ui/lib/utils';
import { Toaster } from '@seawatts/ui/sonner';
import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata, Viewport } from 'next';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import '@seawatts/ui/globals.css';

import { ClerkProvider } from '@clerk/nextjs';
import { AnalyticsProviders } from '@seawatts/analytics/providers';
import { TRPCReactProvider } from '@seawatts/api/react';
import { StripeProvider } from '@seawatts/stripe/guards/client';
import { Suspense } from 'react';
import { env } from '~/env.server';

export const metadata: Metadata = {
  description: 'Acme is a tool for developers to manage their webhooks',
  metadataBase: new URL(
    env.VERCEL_ENV === 'production'
      ? 'https://acme.sh'
      : 'http://localhost:3000',
  ),
  openGraph: {
    description: 'Acme is a tool for developers to manage their webhooks',
    siteName: 'Acme',
    title: 'Acme',
    url: 'https://acme.sh',
  },
  title: 'Acme',
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
        {isDevelopment && <ReactScan />}
        <NuqsAdapter>
          <TRPCReactProvider>
            <Suspense>
              <ClerkProvider>
                <AnalyticsProviders identifyUser>
                  <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                  >
                    <StripeProvider>
                      {props.children}
                      <Toaster />
                    </StripeProvider>
                  </ThemeProvider>
                </AnalyticsProviders>
              </ClerkProvider>
            </Suspense>
          </TRPCReactProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
