import pdfjsUrl from 'url:~/pdf.worker.min.js';
import type { api } from '@seawatts/api/chrome-extension';
import * as pdfJS from 'pdfjs-dist';

export const createDocumentPages = async (props: {
  evaluationId?: string;
  file: File;
  apiUtils: ReturnType<typeof api.useUtils>;
  documentId: string;
  companyId?: string;
  raiseId?: string;
  onProgress?: (
    progress: number,
    currentPage: number,
    totalPages: number,
  ) => void;
}) => {
  pdfJS.GlobalWorkerOptions.workerSrc = pdfjsUrl;

  const pdf = await pdfJS.getDocument(URL.createObjectURL(props.file)).promise;

  const totalPages = pdf.numPages;
  let processedPages = 0;

  const pages = await Promise.all(
    Array.from({ length: totalPages }, async (_, index) => {
      const pageNumber = index + 1;
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      if (context) {
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        await page.render(renderContext).promise;
        const dataUrl = canvas.toDataURL('image/png');

        processedPages++;
        if (props.onProgress) {
          props.onProgress(
            (processedPages / totalPages) * 50, // 50% progress for rendering
            processedPages,
            totalPages,
          );
        }

        return {
          dataUrl,
          pageNumber,
        };
      }
    }),
  );

  const filteredPages = pages.filter((page) => page !== undefined);

  const signedUrls = await props.apiUtils.client.document.getSignedUrl.mutate({
    documentId: props.documentId,
    fileNames: filteredPages.map((page) => `${page.pageNumber}.b64`),
    withFileNamePrefix: true,
  });

  await Promise.all(
    filteredPages.map(async (page) => {
      const matchingUrl = signedUrls.find(
        (url) => url.fileName === `${page.pageNumber}.b64`,
      );
      if (matchingUrl) {
        await fetch(matchingUrl.signedUrl, {
          body: page.dataUrl,
          method: 'PUT',
        });
      }
    }),
  );

  if (props.onProgress) {
    props.onProgress(75, totalPages, totalPages); // 75% progress after uploading
  }

  // Call createDocumentPagesAction once with all pages
  await props.apiUtils.client.document.createPages.mutate({
    companyId: props.companyId,
    documentId: props.documentId,
    evaluationId: props.evaluationId,
    pages: filteredPages.map((page) => ({
      pageNumber: page.pageNumber,
      s3Key:
        signedUrls.find((url) => url.fileName === `${page.pageNumber}.b64`)
          ?.s3Key || '',
    })),
    raiseId: props.raiseId,
  });

  if (props.onProgress) {
    props.onProgress(100, totalPages, totalPages); // 100% progress after creating document pages
  }

  return;
};
