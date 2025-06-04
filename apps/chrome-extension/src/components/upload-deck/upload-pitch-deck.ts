import type { api } from '@acme/api/chrome-extension';

import { calculateFileHash } from '~/utils/file-hash';
import type { Company } from '../company/context';
import { createDocumentPages } from './create-document-pages';
import type { ProcessInfo } from './types';

export async function uploadPitchDeck({
  files,
  company,
  apiUtils,
  setProcessInfo,
  getSignedUrl,
  createDocuments,
  startExecution,
}: {
  files: File[];
  company?: Company;
  apiUtils: ReturnType<typeof api.useUtils>;
  setProcessInfo: React.Dispatch<React.SetStateAction<ProcessInfo>>;
  getSignedUrl: ReturnType<
    typeof api.document.getSignedUrl.useMutation
  >['mutateAsync'];
  createDocuments: ReturnType<
    typeof api.document.create.useMutation
  >['mutateAsync'];
  startExecution: ReturnType<
    typeof api.document.startParseExecution.useMutation
  >['mutateAsync'];
}) {
  setProcessInfo({
    isGenerating: true,
    progress: 5,
    progressLabel: 'Uploading pitch deck...',
  });

  const signedUrls = await getSignedUrl({
    fileNames: files.map((file) => file.name),
  });

  let uploadedFiles = 0;
  const filesWithUrl = await Promise.all(
    files.map(async (file, index) => {
      const signedUrl = signedUrls[index] ?? null;

      if (!signedUrl) {
        throw new Error('No signed URL found');
      }

      await fetch(signedUrl.signedUrl, {
        body: file,
        method: 'PUT',
      });

      uploadedFiles++;
      setProcessInfo((previous) => ({
        ...previous,
        progress: 5 + (uploadedFiles / files.length) * 20,
      }));

      const hash = await calculateFileHash(file);
      return {
        documentId: signedUrl.documentId,
        file,
        hash,
        name: file.name,
        s3Key: signedUrl.s3Key,
        url: signedUrl.signedUrl,
      };
    }),
  );

  setProcessInfo((previous) => ({
    ...previous,
    progress: 25,
    progressLabel: 'Creating document...',
  }));

  const documents = await createDocuments({
    companyId: company?.id ?? '',
    files: filesWithUrl.map((file) => ({
      documentId: file.documentId,
      hash: file.hash,
      name: file.name,
      s3Key: file.s3Key,
      url: file.url,
    })),
  });

  setProcessInfo((previous) => ({
    ...previous,
    progress: 30,
    progressLabel: 'Splitting document pages...',
  }));

  let processedDocuments = 0;
  const totalDocuments = documents.length;

  await Promise.all(
    filesWithUrl.map(async (file) => {
      await createDocumentPages({
        apiUtils,
        companyId: company?.id ?? '',
        documentId: file.documentId,
        file: file.file,
        onProgress: (pageProgress, currentPage, totalPages) => {
          const documentProgress =
            (processedDocuments + pageProgress / 100) / totalDocuments;
          const overallProgress = 30 + documentProgress * 30;
          setProcessInfo((previous) => ({
            ...previous,
            progress: overallProgress,
            progressLabel: `Splitting document pages ${currentPage}/${totalPages}`,
          }));
        },
      });

      processedDocuments++;
    }),
  );

  setProcessInfo((previous) => ({
    ...previous,
    progress: 60,
    progressLabel: 'Parsing document...',
  }));

  await Promise.all(
    filesWithUrl.map(async (file) => {
      if (!company?.id) {
        return;
      }

      await startExecution({
        companyId: company.id,
        documentId: file.documentId,
      });
    }),
  );

  let isParsing = true;

  while (isParsing) {
    const documentsInProgress = await Promise.all(
      filesWithUrl.map(async (file) => {
        const document = await apiUtils.client.document.byId.query({
          documentId: file.documentId,
          withPages: true,
        });

        return document;
      }),
    );

    const totalPages = documentsInProgress.reduce(
      (sum, document) => sum + (document?.documentPages.length || 0),
      0,
    );
    const generatedPages = documentsInProgress.reduce(
      (sum, document) =>
        sum +
        (document?.documentPages.filter(
          (page) => page.generationStatus === 'generated',
        ).length || 0),
      0,
    );

    const progressPercentage = Math.floor((generatedPages / totalPages) * 100);
    setProcessInfo((previous) => ({
      ...previous,
      progress: 60 + progressPercentage * 0.2,
      progressLabel: `Parsing document... ${generatedPages}/${totalPages} pages`,
    }));

    isParsing = documentsInProgress.some((document) =>
      document?.documentPages.some(
        (page) => page.generationStatus !== 'generated',
      ),
    );

    if (!isParsing) break;

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  setProcessInfo((previous) => ({
    ...previous,
    isGenerating: false,
  }));

  return documents;
}
