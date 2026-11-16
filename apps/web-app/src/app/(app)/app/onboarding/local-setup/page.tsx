import { readSession } from '@seawatts/auth/session-reader';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { LocalDevelopmentSetup } from './_components/local-development-setup';

export const dynamic = 'force-dynamic';

export default async function LocalSetupPage(props: {
  searchParams: Promise<{
    orgName?: string;
    webhookName?: string;
    redirectTo?: string;
    source?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  // Routing only: who is signed in decides where to send them. The page's
  // data comes from oRPC on the client.
  const session = await readSession(await headers()).catch(() => null);

  if (!session?.user?.id) {
    return redirect('/sign-in');
  }

  const { orgName, webhookName, redirectTo, source } = searchParams;

  if (!orgName || !webhookName) {
    return redirect('/app/onboarding');
  }

  return (
    <div className="container mx-auto max-w-4xl py-8">
      <LocalDevelopmentSetup
        orgName={orgName}
        redirectTo={redirectTo}
        source={source}
        webhookName={webhookName}
      />
    </div>
  );
}
