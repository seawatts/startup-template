import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
} from '@seawatts/ui/alert-dialog';
import { Button } from '@seawatts/ui/button';
import { Icons } from '@seawatts/ui/icons';
import { useEffect } from 'react';

import { useChromePortal } from '~/hooks/use-chrome-portal';
import { Entitled } from '../entitlement/entitled';
import { DialogContent } from './components/dialog-content';
import { PitchPracticeForm } from './form';
import { usePitchPractice } from './hooks/use-pitch-practice';

interface PitchPracticeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PitchPracticeDialog({
  isOpen,
  onClose,
}: PitchPracticeDialogProps) {
  const portalElement = useChromePortal();

  const {
    question,
    audio,
    isAudioLoading,
    isQuestionLoading,
    fetchQuestion,
    fetchAudio,
  } = usePitchPractice();

  useEffect(() => {
    if (question && !isAudioLoading && !isQuestionLoading && !audio) {
      fetchAudio();
    }
  }, [question, isAudioLoading, isQuestionLoading, audio, fetchAudio]);

  const handleQuestionClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    fetchQuestion();
  };

  const buttonText =
    isQuestionLoading || isAudioLoading
      ? 'Generating...'
      : question
        ? 'Next Question'
        : 'Start';

  return (
    <AlertDialog onOpenChange={onClose} open={isOpen}>
      <AlertDialogContent portalContainer={portalElement}>
        <DialogContent question={question} />

        <PitchPracticeForm audio={audio} question={question}>
          {() => (
            <AlertDialogFooter className="flex w-full sm:justify-between">
              <div className="flex-1" />
              <div className="self flex items-center justify-end gap-2">
                <Button onClick={onClose} type="button" variant="outline">
                  Close
                </Button>

                <Entitled entitlement="pitch_practice">
                  <Button
                    disabled={isQuestionLoading || isAudioLoading}
                    onClick={handleQuestionClick}
                    type="button"
                  >
                    {(isQuestionLoading || isAudioLoading) && (
                      <Icons.Spinner className="mr-2" />
                    )}
                    {buttonText}
                  </Button>
                </Entitled>
              </div>
            </AlertDialogFooter>
          )}
        </PitchPracticeForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}
