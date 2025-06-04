import type { useUser } from '@clerk/chrome-extension';

import type { Application, Company } from '~/components/company/context';
import type { Document } from '~/components/document/context';

export async function speechToText({
  audioBlob,
  application,
  company,
  document,
  user,
}: {
  audioBlob: Blob;
  company?: Company;
  application?: Application;
  document?: Document;
  user: ReturnType<typeof useUser>;
}): Promise<string> {
  if (!application || !company) {
    throw new Error('Application or company is required');
  }

  const endpoint = '/api/speech-to-text';
  const apiUrl =
    process.env.NODE_ENV === 'production'
      ? `https://app.acme.ai${endpoint}`
      : `http://localhost:3000${endpoint}`;

  const formData = new FormData();
  formData.append('audio', audioBlob);
  formData.append('documentId', document?.id || '');
  formData.append('companyId', company.id || '');
  formData.append('applicationId', application.id || '');
  formData.append('userId', user.user?.id || '');

  const response = await fetch(apiUrl, {
    body: formData,
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Failed to fetch text from audio');
  }

  const textResponse = await response.json();
  return textResponse.text;
}
