import { useUser } from '@clerk/chrome-extension';
import { useCallback, useEffect, useState } from 'react';

import { speechToText } from '~/utils/speech-to-text';
import { useCompany } from '../company/context';
import { useDocument } from '../document/context';
import { Alerts } from './alerts';
import { useAudioRecorderContext } from './context/audio-recorder-context';
import { RecordingControls } from './controls';

interface AudioRecorderProps {
  onComplete: ({ text }: { text?: string }) => void;
  onCancel: () => void;
  maxRecordingTimeSeconds?: number;
  warningRecordingTimeSeconds?: number;
}

export function AudioRecorder({
  onComplete,
  onCancel,
  maxRecordingTimeSeconds = 120,
  warningRecordingTimeSeconds = 60,
}: AudioRecorderProps) {
  const { application, company } = useCompany();
  const { document } = useDocument();
  const user = useUser();
  const [isGeneratingText, setIsGeneratingText] = useState(false);

  const { startRecording, stopRecording, isRecording, recordingBlob } =
    useAudioRecorderContext();

  // Combine the recording start and timeout logic into a single effect
  useEffect(() => {
    startRecording();

    const timeoutId = setTimeout(() => {
      stopRecording();
    }, maxRecordingTimeSeconds * 1000);

    return () => {
      stopRecording();
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startRecording, stopRecording, maxRecordingTimeSeconds]); // Only run once on mount

  const handleRecordingComplete = useCallback(
    async (blob: Blob) => {
      if (blob.size === 0) {
        console.error('No recording data available');
        onComplete({});
        return;
      }

      setIsGeneratingText(true);
      try {
        const text = await speechToText({
          application,
          audioBlob: blob,
          company,
          document,
          user,
        });
        onComplete({ text });
      } catch (error) {
        console.error('Speech to text error:', error);
        onComplete({});
      } finally {
        setIsGeneratingText(false);
      }
    },
    [application, company, document, user, onComplete],
  );

  useEffect(() => {
    if (recordingBlob && !isRecording) {
      handleRecordingComplete(recordingBlob);
    }
  }, [recordingBlob, isRecording, handleRecordingComplete]);

  return (
    <div className="flex flex-col gap-4">
      <RecordingControls
        onCancel={onCancel}
        maxRecordingTimeSeconds={maxRecordingTimeSeconds}
        isGeneratingText={isGeneratingText}
      />
      <Alerts
        maxRecordingTimeSeconds={maxRecordingTimeSeconds}
        warningRecordingTimeSeconds={warningRecordingTimeSeconds}
      />
    </div>
  );
}
