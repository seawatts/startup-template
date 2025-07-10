import { Alert, AlertDescription, AlertTitle } from '@acme/ui/alert';
import { Icons } from '@acme/ui/custom/icons';
import { Label } from '@acme/ui/label';
import { useCallback, useEffect, useReducer } from 'react';

import { useAudio } from '../../hooks/use-audio';
import { AudioRecorderContainer } from '../audio-recorder/container';
import { useCompany } from '../company/context';
import { useDocument } from '../document/context';
import { Entitled } from '../entitlement/entitled';
import { NotEntitled } from '../entitlement/not-entitled';
import { StripeCheckoutButton } from '../stripe-checkout/button';
import { AnswerInput } from './components/answer-input';
import { Feedback } from './components/feedback';
import { MemoizedCamera } from './components/memoized-camera';
import { useAnswerSubmission } from './hooks/use-answer-submission';
import { initialState, reducer } from './state';
import type { PitchPracticeFormProps } from './types';

export function PitchPracticeForm({
  children,
  question,
  audio,
}: PitchPracticeFormProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { company } = useCompany();
  const { document } = useDocument();

  const { handleSubmit } = useAnswerSubmission({
    company,
    document,
    onError: (error) => dispatch({ payload: error, type: 'SUBMISSION_ERROR' }),
    onFeedback: (feedback) =>
      dispatch({ payload: feedback, type: 'SET_FEEDBACK' }),
    onStart: () => dispatch({ type: 'START_SUBMISSION' }),
    onSuccess: () => dispatch({ type: 'SUBMISSION_SUCCESS' }),
    question,
  });

  const { handlePlay, cleanup: cleanupAudio } = useAudio({
    audio,
    onEnd: () => {
      dispatch({ type: 'END_AUDIO_PROMPT' });
      dispatch({ type: 'START_AUDIO_MODE' });
    },
    onStart: () => dispatch({ type: 'START_AUDIO_PROMPT' }),
  });

  const handleAudioComplete = ({ text }: { text?: string }) => {
    dispatch({ type: 'END_AUDIO_MODE' });
    if (text) {
      dispatch({ payload: text, type: 'SET_ANSWER' });
    }
  };

  useEffect(() => {
    return cleanupAudio;
  }, [cleanupAudio]);

  useEffect(() => {
    dispatch({ type: 'RESET_STATE' });
  }, []);

  // Create a stable toggle callback
  const handleCameraToggle = useCallback((show: boolean) => {
    dispatch({ payload: show, type: 'TOGGLE_CAMERA' });
  }, []);

  return (
    <form
      className="flex h-full flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit(state.answer);
      }}
    >
      <Entitled entitlement="pitch_practice">
        {question && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div>{question.question}</div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Tip:</span> {question.tip}
              </div>
            </div>

            <MemoizedCamera
              onToggleCamera={handleCameraToggle}
              showCamera={state.showCamera}
            />

            {!!audio && <Label htmlFor="answer">Your answer</Label>}
            {!state.isAudioMode && !!audio && (
              <AnswerInput
                isPending={state.isPending}
                isPlayingPrompt={state.isPlayingPrompt}
                onChange={(value) =>
                  dispatch({ payload: value, type: 'SET_ANSWER' })
                }
                onMicrophoneClick={handlePlay}
                onSubmit={() => handleSubmit(state.answer)}
                value={state.answer}
              />
            )}

            {state.isAudioMode && (
              <AudioRecorderContainer
                maxRecordingTimeSeconds={120}
                onCancel={() => dispatch({ type: 'END_AUDIO_MODE' })}
                onComplete={handleAudioComplete}
                warningRecordingTimeSeconds={60}
              />
            )}

            <Feedback content={state.answerFeedback} />
          </div>
        )}
      </Entitled>

      <NotEntitled entitlement="pitch_practice">
        <Alert>
          <Icons.Info className="text-green-500" />
          <div className="flex flex-wrap justify-between gap-6">
            <div>
              <AlertTitle>Unlock your pitch practice</AlertTitle>
              <AlertDescription>
                Upgrade to unlock your pitch practice.
              </AlertDescription>
            </div>
            <div>
              <StripeCheckoutButton />
            </div>
          </div>
        </Alert>
      </NotEntitled>

      {state.isError && (
        <div className="text-destructive">
          An error occurred while submitting the answer.
        </div>
      )}
      {children({
        data: null,
        error: state.error,
        isError: state.isError,
        isPending: state.isPending,
        isSuccess: !state.isError,
      })}
    </form>
  );
}
