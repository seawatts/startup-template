import { isOperator } from '@seawatts/api/operator/access';
import { readSession } from '@seawatts/auth/session-reader';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

// Internal is for operators only. Everyone else gets the same page as an
// address that does not exist. This decides what is shown; every read behind
// these pages checks the operator again on the server.
export default async function InternalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession(await headers()).catch(() => null);
  if (!isOperator(session?.user)) notFound();
  return children;
}
