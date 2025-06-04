import type { useUser } from '@clerk/chrome-extension';

import type { Application, Company } from '~/components/company/context';
import type { Document } from '~/components/document/context';

export async function textToSpeech({
  text,
  company,
  document,
  application,
  user,
}: {
  text: string;
  company?: Company;
  document?: Document;
  application?: Application;
  user: ReturnType<typeof useUser>;
}): Promise<Blob> {
  const endpoint = '/api/text-to-speech';
  const apiUrl =
    process.env.NODE_ENV === 'production'
      ? `https://app.acme.ai${endpoint}`
      : `http://localhost:3000${endpoint}`;

  const response = await fetch(apiUrl, {
    body: JSON.stringify({
      applicationId: application?.id,
      companyId: company?.id,
      documentId: document?.id,
      text,
      userId: user.user?.id,
    }),
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch audio from text');
  }

  return await response.blob();
}
