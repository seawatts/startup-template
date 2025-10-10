import { sendToBackground } from '@plasmohq/messaging';
import type { RouterOutputs } from '@seawatts/api';

import type { InputActionProps } from './types';

function getVideoLabel(videoElement: HTMLVideoElement): string {
  if (videoElement.closest('#videoS3Key')) return 'Founder Video';
  if (videoElement.closest('#demoS3Key')) return 'Demo Video';
  return 'Unknown Video';
}

export async function handleVideoUpload(
  videoElement: HTMLVideoElement,
  props: InputActionProps,
) {
  const {
    enabled,
    user,
    getSignedUrl,
    company,
    application,
    createDocuments,
    createAnswer,
    checkDuplicate,
  } = props;

  if (!enabled || !user.isSignedIn || !videoElement.src) return;

  try {
    const label = getVideoLabel(videoElement);
    const fileName = `${label.replaceAll(/\s+/g, '-').toLowerCase()}.webm`;

    // First fetch the video and get its hash
    const fetchResult = await sendToBackground({
      body: {
        videoUrl: videoElement.src,
      },
      name: 'fetchVideo',
    });

    if (!fetchResult.success) {
      throw new Error(`Failed to fetch video: ${fetchResult.error}`);
    }

    if (!fetchResult.arrayBuffer?.length) {
      throw new Error('Received empty video data');
    }

    // Check for duplicates
    const duplicateCheck = await checkDuplicate({
      companyId: company?.id,
      fileName,
      hash: fetchResult.hash,
    });

    if (duplicateCheck.isDuplicate) {
      return;
    }

    // Get signed URL for upload
    const signedUrls = await getSignedUrl({ fileNames: [fileName] });
    const signedUrl = signedUrls[0];
    if (!signedUrl) throw new Error('No signed URL found');

    // Upload to S3
    const uploadResult = await sendToBackground({
      body: {
        arrayBuffer: fetchResult.arrayBuffer,
        signedUrl: signedUrl.signedUrl,
      },
      name: 'uploadVideo',
    });

    if (!uploadResult.success) {
      throw new Error(`Failed to upload file: ${uploadResult.error}`);
    }

    // Create documents
    await createVideoDocuments(signedUrl, fileName, fetchResult.hash, {
      application,
      company,
      createAnswer,
      createDocuments,
      label,
    });
  } catch (error) {
    console.error('Error handling video:', error);
    throw error;
  }
}

async function createVideoDocuments(
  signedUrl: RouterOutputs['document']['getSignedUrl'][0],
  fileName: string,
  hash: string,
  props: Pick<
    InputActionProps,
    'company' | 'createDocuments' | 'createAnswer' | 'application'
  > & { label: string },
) {
  const { company, createDocuments, createAnswer, label, application } = props;

  if (!company?.id || !application?.id) return;

  const documents = await createDocuments({
    companyId: company.id,
    files: [
      {
        documentId: signedUrl.documentId,
        hash,
        name: fileName,
        s3Key: signedUrl.s3Key,
        url: signedUrl.signedUrl,
      },
    ],
  });

  if (!documents[0]?.id) return;

  const fieldId = label === 'Founder Video' ? 'videoS3Key' : 'demoS3Key';

  await createAnswer({
    applicationId: application?.id,
    companyId: company.id,
    displayOrder: 0,
    documentId: documents[0].id,
    label: fieldId,
    text: '',
  });
}
