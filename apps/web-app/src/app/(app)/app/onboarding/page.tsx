import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { OnboardingForm } from './_components/onboarding-form';

export default async function Page(props: {
  searchParams: Promise<{
    redirectTo?: string;
    source?: string;
    orgName?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const { orgId, userId } = await auth();

  if (!userId) {
    return redirect('/');
  }

  // If user already has an organization, redirect to dashboard
  if (orgId) {
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
