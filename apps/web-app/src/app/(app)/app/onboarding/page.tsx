import { readSession } from '@seawatts/auth/session-reader';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './_components/onboarding-form';

export const dynamic = 'force-dynamic';

export default async function Page(props: {
  searchParams: Promise<{
    redirectTo?: string;
    source?: string;
    orgName?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  // Routing only: who is signed in decides where to send them. The page's
  // data comes from oRPC on the client.
  const session = await readSession(await headers()).catch(() => null);

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  // If user already has an organization, redirect to dashboard
  if (session.session?.activeOrganizationId) {
    return redirect('/app/dashboard');
  }

  // If orgName is provided, redirect to webhook wizard
  // The organization will be created when the user submits the form
  if (searchParams.orgName) {
    return redirect('/app/webhooks/create');
  }

  // Otherwise, show the regular onboarding form for users with source/redirect
  return (
    <div className="container mx-auto max-w-2xl py-8">
      <OnboardingForm
        redirectTo={searchParams.redirectTo}
        source={searchParams.source}
      />
    </div>
  );
}
