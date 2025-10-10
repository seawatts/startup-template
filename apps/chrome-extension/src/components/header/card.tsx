import ycCfLogo from 'data-base64:~/../assets/yc-cf-logo.png';
import { SignedOut } from '@clerk/chrome-extension';
import { Alert, AlertDescription, AlertTitle } from '@seawatts/ui/alert';
import { Button } from '@seawatts/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@seawatts/ui/card';
import { Icons } from '@seawatts/ui/icons';

import { CouponDiscountAlert } from '~/components/coupon-discount-alert';
import { PoweredByLink } from '~/components/powered-by-link';
import { env } from '~/env';
import { Menu } from './menu';

export function WelcomeCard({
  error,
  onTryAgain,
}: {
  error?: Error | null;
  onTryAgain?: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex flex-col gap-2">
            <div className="flex justify-between">
              <div className="flex items-center gap-2">
                <img
                  alt="YC vibe-check"
                  className="h-16 w-auto"
                  src={ycCfLogo}
                />
                <div className="flex flex-col gap-2">
                  <span>Welcome to YC vibe-check - apply with ai</span>
                  <div className="text-sm text-muted-foreground">
                    Your AI-powered fundraising assistant is here to help. Let's
                    supercharge your startup journey!
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <PoweredByLink />
                <Menu />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        {!error && (
          <SignedOut>
            <CardContent>
              <div className="flex flex-col items-center justify-center gap-6 p-6 text-center">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">Get Started</h3>
                  <p className="text-sm text-muted-foreground">
                    Sign in to access AI-powered insights and supercharge your
                    YC application.
                  </p>
                </div>
                <Button asChild className="w-full max-w-44">
                  <a
                    href={`${env.PLASMO_PUBLIC_API_URL}/chrome-extension/sign-in?redirect_url=${globalThis.location.href}`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <Icons.LogIn className="mr-2" />
                    Sign in
                  </a>
                </Button>
              </div>
            </CardContent>
          </SignedOut>
        )}
        {error && (
          <CardContent>
            <Alert variant="destructive">
              <Icons.AlertTriangle />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="flex flex-col gap-2">
                {error.message || 'An unexpected error occurred'}
                <div>
                  <Button
                    onClick={() => {
                      onTryAgain?.();
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Try again
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
        <div className="flex items-center justify-between gap-2 px-6 pb-2">
          <div className="max-w-md text-xs text-muted-foreground">
            YC vibe-check is not affiliated with, endorsed by, or sponsored by Y
            Combinator.
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              questions, comments, concerns?
            </span>
            <a
              className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              href="mailto:vibes@seawatts.ai"
            >
              vibes@seawatts.ai
            </a>
          </div>
        </div>
      </Card>
      {!error && <CouponDiscountAlert withCheckoutButton />}
    </div>
  );
}
