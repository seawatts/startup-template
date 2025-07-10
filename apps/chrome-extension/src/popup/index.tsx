import ycCfLogo from 'data-base64:~/../assets/yc-cf-logo.png';
import { SignedIn, SignedOut, SignOutButton } from '@clerk/chrome-extension';

import '../style.css';

import { Button } from '@acme/ui/button';
import { Card, CardHeader, CardTitle } from '@acme/ui/card';
import { Icons } from '@acme/ui/icons';
import { MemoryRouter } from 'react-router-dom';

import { Footer } from '~/components/footer';
import { env } from '~/env';
import { Providers } from '~/providers';

function IndexPopup() {
  return (
    <div className="container mx-auto flex h-[600px] w-[450px] flex-col bg-background font-sans text-base text-foreground antialiased">
      <div className="flex flex-grow flex-col">
        <div className="flex-grow py-6">
          <Card className="mb-6 w-full">
            <CardHeader>
              <CardTitle className="flex flex-col gap-2">
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <img
                      alt="YC vibe-check"
                      className="h-12 w-auto"
                      src={ycCfLogo}
                    />
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold">
                        YC vibe-check
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Apply with AI
                      </span>
                    </div>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
          </Card>
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() =>
                chrome.tabs.create({
                  url: './tabs/welcome.html',
                })
              }
              variant="outline"
            >
              Tutorial
            </Button>
            <Button
              onClick={() =>
                chrome.tabs.create({
                  url: './tabs/changelog.html',
                })
              }
              variant="outline"
            >
              Changelog
            </Button>
            <SignedIn>
              <Button
                onClick={() =>
                  chrome.tabs.create({
                    url: './tabs/account.html',
                  })
                }
                variant="outline"
              >
                <Icons.User className="mr-2 h-4 w-4" />
                Account
              </Button>
              <Button asChild variant="outline">
                <SignOutButton />
              </Button>
            </SignedIn>
            <SignedOut>
              <Button asChild variant="outline">
                <a
                  href={`${env.PLASMO_PUBLIC_API_URL}/chrome-extension/sign-in?redirect_url=https://apply.ycombinator.com`}
                  rel="noreferrer"
                  target="_blank"
                >
                  {/* <Icons.LogIn className="mr-2 h-4 w-4" /> */}
                  Sign In
                </a>
              </Button>
            </SignedOut>
            <Button asChild variant="outline">
              <a
                href="https://apply.ycombinator.com"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Icons.Plus className="mr-2" />
                New YC App
              </a>
            </Button>
            <Button asChild variant="outline">
              <a
                href="https://apply.ycombinator.com/app/edit"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Icons.Pencil className="mr-2" />
                Open YC App
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="mailto:vibes@acme.ai">
                <Icons.Mail className="mr-2" />
                Contact Support
              </a>
            </Button>
          </div>
        </div>

        <Footer />
      </div>
    </div>
  );
}

function ClerkProviderWrapper() {
  return (
    <MemoryRouter>
      <Providers>
        <IndexPopup />
      </Providers>
    </MemoryRouter>
  );
}

export default ClerkProviderWrapper;
