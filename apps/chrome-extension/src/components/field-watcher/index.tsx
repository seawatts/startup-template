import { useUser } from '@clerk/chrome-extension';
import { useCallback, useEffect, useRef } from 'react';

import { api } from '@acme/api/chrome-extension';

import { useYcApp } from '~/hooks/yc/use-yc-app';
import { useFormGeneration } from '~/stores/form-generation';
import { useCompany } from '../company/context';
import { useDocument } from '../document/context';
import { handleFormAction } from './form-handler';
import type { InputActionProps } from './types';
import { handleVideoUpload } from './video-handler';

interface FieldWatcherProps {
  enabled?: boolean;
  fetchOnLoad?: boolean;
}

export function FieldWatcher({
  enabled = true,
  fetchOnLoad = false,
}: FieldWatcherProps) {
  const user = useUser();
  const apiUtils = api.useUtils();
  const createAnswer = api.application.createAnswer.useMutation();
  const getSignedUrl = api.document.getSignedUrl.useMutation();
  const createDocuments = api.document.create.useMutation();
  const { application, company } = useCompany();
  const { document: documentStorage } = useDocument();
  const isGenerating = useFormGeneration((state) => state.isGenerating);
  const ycGraphqlResponse = useYcApp();

  const props = {
    application,
    checkDuplicate: apiUtils.document.checkDuplicate.fetch,
    company,
    createAnswer: createAnswer.mutateAsync,
    createDocuments: createDocuments.mutateAsync,
    document: documentStorage,
    enabled,
    getSignedUrl: getSignedUrl.mutateAsync,
    isGenerating,
    user,
    ycGraphqlResponse: ycGraphqlResponse.app,
  } satisfies InputActionProps;

  const processVideos = useCallback(async () => {
    const videos = document.querySelectorAll<HTMLVideoElement>(
      '#videoS3Key video, #demoS3Key video, #f_founder_video video',
    );

    await Promise.all(
      [...videos]
        .filter((video) => video.src)
        .map((video) => handleVideoUpload(video, props)),
    );
  }, [props]);

  const handleFormSubmission = useCallback(
    async (actionType: 'save' | 'submit') => {
      // Process videos first

      await Promise.all([processVideos(), handleFormAction(props, actionType)]);
    },
    [props, processVideos],
  );

  useEffect(() => {
    if (!enabled) return;

    const handleButtonClick = async (event: MouseEvent) => {
      const target = event.target as HTMLButtonElement;
      if (!target.matches('button')) return;

      event.preventDefault();

      const isSave = target.textContent?.toLowerCase().includes('save');
      const isSubmit = target.textContent?.toLowerCase().includes('submit');

      if (isSave || isSubmit) {
        target.disabled = true;
        try {
          await handleFormSubmission(isSave ? 'save' : 'submit');
        } finally {
          target.disabled = false;
        }
      }
    };

    document.addEventListener('click', handleButtonClick, true);
    return () => document.removeEventListener('click', handleButtonClick, true);
  }, [enabled, handleFormSubmission]);

  const hasFetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !fetchOnLoad || hasFetchedRef.current) return;
    if (!company?.id || !application?.id) {
      console.warn(
        'Cannot fetch form data: No company ID available or application ID',
        company?.id,
        application?.id,
      );
      return;
    }

    const processReadonlyForm = async () => {
      // Set the ref before processing to prevent multiple runs
      hasFetchedRef.current = true;

      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Find and click the founder profile button first
      const founderProfileButton =
        document.querySelector<HTMLDivElement>('.cursor-pointer');
      if (founderProfileButton instanceof HTMLElement) {
        founderProfileButton.click();
        // Wait a brief moment for any animations/content to load
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Then process the form
      await handleFormSubmission('save').catch(console.error);
    };

    processReadonlyForm();
  }, [
    enabled,
    fetchOnLoad,
    handleFormSubmission,
    company?.id,
    application?.id,
  ]);

  return null;
}
