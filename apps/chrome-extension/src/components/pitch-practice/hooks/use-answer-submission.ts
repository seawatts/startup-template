import { useUser } from '@clerk/chrome-extension';
import { toast } from '@seawatts/ui/sonner';
import { useCallback } from 'react';

import type { Application, Company } from '~/components/company/context';
import type { Document } from '~/components/document/context';
import { useFounderName } from '~/hooks/use-founder-name';
import { getExistingInputs } from '~/utils/existing-inputs';
import { fetchAndStream } from '~/utils/fetch-stream';
import type { GeneratePitchPracticeQuestionResponse } from '../types';

interface UseAnswerSubmissionProps {
  company?: Company;
  document?: Document;
  application?: Application;
  question?: GeneratePitchPracticeQuestionResponse;
  onStart: () => void;
  onSuccess: () => void;
  onError: (error: unknown) => void;
  onFeedback: (feedback: string) => void;
}

export function useAnswerSubmission({
  company,
  document,
  question,
  application,
  onStart,
  onSuccess,
  onError,
  onFeedback,
}: UseAnswerSubmissionProps) {
  const user = useUser();
  const founderName = useFounderName();

  const handleSubmit = useCallback(
    async (answer: string) => {
      if (!founderName || !question || !answer) return;

      onStart();
      const existingInputs = getExistingInputs();

      try {
        await fetchAndStream<string>(
          '/api/pitch-practice-answer-question',
          {
            answer,
            applicationId: application?.id,
            companyDetails: JSON.stringify(company),
            companyId: company?.id,
            documentId: document?.id,
            existingInputs,
            question: question.question,
            userId: user.user?.id,
            userName: founderName,
          },
          (partialData) => {
            if (partialData) {
              onFeedback(partialData);
            }
          },
        );
        onSuccess();
      } catch (error) {
        console.error('Error submitting answer:', error);
        onError(error);
        toast.error('Failed to submit answer');
      }
    },
    [
      founderName,
      company,
      document,
      application,
      question,
      user.user?.id,
      onStart,
      onSuccess,
      onError,
      onFeedback,
    ],
  );

  return { handleSubmit };
}
