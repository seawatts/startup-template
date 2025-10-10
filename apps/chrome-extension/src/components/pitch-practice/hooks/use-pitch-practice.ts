import { useUser } from '@clerk/chrome-extension';
import { toast } from '@seawatts/ui/sonner';
import { useCallback, useState } from 'react';

import { useCompany } from '~/components/company/context';
import { useDocument } from '~/components/document/context';
import { useFounderName } from '~/hooks/use-founder-name';
import { getExistingInputs } from '~/utils/existing-inputs';
import { fetchAndStream } from '~/utils/fetch-stream';
import { textToSpeech } from '~/utils/text-to-speech';
import type { GeneratePitchPracticeQuestionResponse } from '../types';

export function usePitchPractice() {
  const [question, setQuestion] =
    useState<GeneratePitchPracticeQuestionResponse>();
  const [audio, setAudio] = useState<Blob>();
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const founderName = useFounderName();

  const user = useUser();
  const { application, company } = useCompany();
  const { document } = useDocument();

  const fetchAudio = useCallback(async () => {
    if (!question) return;

    setIsAudioLoading(true);
    try {
      const audioBlob = await textToSpeech({
        application,
        company,
        document,
        text: question.question,
        user,
      });
      setAudio(audioBlob);
    } catch (error_) {
      console.error('Error fetching audio:', error_);
      toast.error('Failed to fetch audio');
    } finally {
      setIsAudioLoading(false);
    }
  }, [question, application, company, user, document]);

  const fetchQuestion = useCallback(async () => {
    if (isQuestionLoading) return;

    setAudio(undefined);
    setQuestion(undefined);
    setIsQuestionLoading(true);
    setIsError(false);
    setError(null);

    try {
      const existingInputs = getExistingInputs();

      await fetchAndStream<GeneratePitchPracticeQuestionResponse | undefined>(
        '/api/pitch-practice-get-question',
        {
          applicationId: application?.id,
          companyDetails: JSON.stringify(company),
          companyId: company?.id,
          documentId: document?.id,
          existingInputs,
          userId: user.user?.id,
          userName: founderName,
        },
        (partialData) => {
          if (partialData) {
            setQuestion(partialData);
          }
        },
      );
    } catch (error_) {
      console.error('Error generating pitch practice question:', error_);
      setIsError(true);
      setError(error_);
      toast.error('Failed to generate pitch practice question');
    } finally {
      setIsQuestionLoading(false);
    }
  }, [isQuestionLoading, company, user, founderName, document, application]);

  return {
    audio,
    error,
    fetchAudio,
    fetchQuestion,
    isAudioLoading,
    isError,
    isQuestionLoading,
    question,
  };
}
