import { Button } from '@acme/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@acme/ui/card';
import { Icons } from '@acme/ui/icons';
import { Separator } from '@acme/ui/separator';

import '../style.css';

import ycCfLogo from 'data-base64:~/../assets/yc-cf-logo.png';
import { SignedIn, SignedOut, useUser } from '@clerk/chrome-extension';

import { CouponDiscountAlert } from '~/components/coupon-discount-alert';
import { FeatureWaitlistButton } from '~/components/feature-waitlist/button';
import { Footer } from '~/components/footer';
import { PoweredByLink } from '~/components/powered-by-link';
import { SubmitFeedbackButton } from '~/components/submit-feedback/button';
import { env } from '~/env';
import { Providers } from '~/providers';

function WelcomePage() {
  const user = useUser();
  // const { data: features, isLoading: isLoadingFeatures } =
  // api.productFeature.all.useQuery();

  // Split features into current and coming soon
  const currentFeatures: string[] =
    // features?.filter((feature) => !feature.comingSoon) ?? [];
    [];
  const comingSoonFeatures: string[] =
    // features?.filter((feature) => feature.comingSoon) ?? [];
    [];

  return (
    <div className="flex min-h-screen flex-col bg-background font-sans text-base text-foreground antialiased">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex flex-col gap-2">
              <div className="flex justify-between">
                <div className="flex items-center gap-2">
                  <img
                    src={ycCfLogo}
                    className="h-16 w-auto"
                    alt="YC vibe-check"
                  />
                  <div className="flex flex-col gap-2">
                    <span>Welcome to YC vibe-check - apply with ai</span>
                    <div className="text-sm text-muted-foreground">
                      Your AI-powered fundraising assistant is here to help.
                      Let's supercharge your startup journey!
                    </div>
                  </div>
                </div>
                <div className="flex gap-8">
                  <PoweredByLink />
                </div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        <CouponDiscountAlert />
        <div className="flex-1">
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">Getting Started</h2>
            <p className="mb-4 text-muted-foreground">
              YC vibe-check is your AI-powered assistant for crafting a standout
              YC application. Here's how to get started:
            </p>
            <div className="space-y-4">
              <SignedOut>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      1. Create Your Account
                    </CardTitle>
                    <CardDescription>
                      Sign up to access all YC vibe-check features
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <Button asChild>
                      <a
                        href={`${env.PLASMO_PUBLIC_API_URL}/chrome-extension/sign-in?redirect_url=${globalThis.location.href}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Icons.Plus className="mr-2" />
                        Create Account
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </SignedOut>
              <SignedIn>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      1. Account Created
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      You're all set! Continue with the next steps.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Icons.CheckCircle2 className="mt-1 text-green-500" />
                      <div className="flex flex-col">
                        <span className="font-semibold">
                          {user.user?.fullName}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {user.user?.emailAddresses[0]?.emailAddress}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      2. Create or Edit your YC Application
                    </CardTitle>
                    <CardDescription>
                      Start a new application or continue working on an existing
                      one
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                    <Button asChild>
                      <a
                        href="https://apply.ycombinator.com"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icons.Plus className="mr-2" />
                        New YC App
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <a
                        href="https://apply.ycombinator.com/app/edit"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Icons.Pencil className="mr-2" />
                        Edit Existing YC App
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      3. Use YC vibe-check Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="list-inside space-y-2 text-muted-foreground">
                      {isLoadingFeatures ? (
                        <div className="flex justify-center">
                          <Icons.Spinner className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        <>
                          {currentFeatures.map((feature) => (
                            <li
                              key={feature}
                              className="flex items-center gap-2"
                            >
                              <span>{feature.emoji}</span>
                              <span className="font-semibold">
                                {feature.name}:
                              </span>
                              {feature.description}
                            </li>
                          ))}
                        </>
                      )}
                    </ul>

                    <div className="my-4">
                      <Separator />
                    </div>

                    <h3 className="font-semibold">Coming soon:</h3>
                    <ul className="mt-4 list-inside space-y-2 text-muted-foreground">
                      {isLoadingFeatures ? (
                        <div className="flex justify-center">
                          <Icons.Spinner className="h-6 w-6 animate-spin" />
                        </div>
                      ) : (
                        comingSoonFeatures.map((feature) => (
                          <li
                            key={feature.name}
                            className="flex items-center gap-2"
                          >
                            <span>{feature.emoji}</span>
                            <span className="font-semibold">
                              {feature.name}:
                            </span>
                            {feature.description}
                          </li>
                        ))
                      )}
                    </ul>
                    <div className="mt-4 flex gap-2">
                      <FeatureWaitlistButton
                        featureName="coming-soon"
                        element="welcome-page"
                      />
                      <SubmitFeedbackButton
                        type="feature-request"
                        element="welcome-page"
                      >
                        Suggest a Feature
                      </SubmitFeedbackButton>
                    </div>
                  </CardContent>
                </Card>
                {/* <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          6. Invite Your Acmes
                        </CardTitle>
                        <CardDescription>
                          YC vibe-check works best when your whole team is
                          involved.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="mb-4 list-inside list-disc space-y-2 text-muted-foreground">
                          <li>Collaborate on application responses</li>
                          <li>Share insights from AI-powered feedback</li>
                          <li>Practice pitches together</li>
                        </ul>
                        <Button asChild>
                          <a href="./invite.html">
                            <Icons.Plus className="mr-2" />
                            Invite Acmes
                          </a>
                        </Button>
                      </CardContent>
                    </Card> */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      4. Manage Your Account
                    </CardTitle>
                    <CardDescription>
                      View and update your account settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4 text-muted-foreground">
                      Access your account details, payment information, and
                      more.
                    </p>
                    <Button asChild variant="outline">
                      <a href="./account.html">
                        <Icons.User className="mr-2" />
                        Manage Account
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </SignedIn>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">Tips for Best Use</h2>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                Use AI suggestions as a starting point and refine as needed
              </li>
              <li>
                Ensure your pitch deck includes key information for better AI
                analysis
              </li>
              <li>
                Practice interview questions regularly to improve your responses
              </li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">Data Privacy</h2>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>
                Your data is kept 100% private - we don't share your information
              </li>
              <li>
                View our{' '}
                <a
                  href="https://acme.ai/terms"
                  className="text-muted-foreground underline underline-offset-4"
                >
                  terms of service
                </a>{' '}
                and{' '}
                <a
                  href="https://acme.ai/privacy"
                  className="text-muted-foreground underline underline-offset-4"
                >
                  privacy policy
                </a>
              </li>
              <li>
                To delete your account email us at{' '}
                <a
                  href="mailto:vibes@acme.ai"
                  className="text-muted-foreground underline underline-offset-4"
                >
                  vibes@acme.ai
                </a>
              </li>
            </ul>
          </section>
          <section className="mb-8">
            <h2 className="mb-4 text-2xl font-semibold">Stay Up to Date</h2>
            <p className="mb-4 text-muted-foreground">
              We're constantly improving YC vibe-check to provide you with the
              best experience. Keep an eye on our changelog for the latest
              updates, new features, and improvements.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                chrome.tabs.create({
                  url: './tabs/changelog.html',
                });
              }}
            >
              View Changelog
            </Button>
          </section>

          <section>
            <h2 className="mb-4 text-2xl font-semibold">Need Help?</h2>
            <p className="mb-4 text-muted-foreground">
              If you have any questions, comments, or concerns, don't hesitate
              to reach out. We're here to help you succeed!
            </p>
            <Button asChild variant="outline">
              <a href="mailto:vibes@acme.ai">
                <Icons.Mail className="mr-2" />
                Contact Support
              </a>
            </Button>
          </section>
        </div>

        <div className="mt-12">
          <Footer />
        </div>
      </div>
    </div>
  );
}

function WelcomePageWrapper() {
  return (
    <Providers>
      <WelcomePage />
    </Providers>
  );
}

export default WelcomePageWrapper;
