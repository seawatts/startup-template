import {
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@acme/ui/alert-dialog';

import { PITCH_PRACTICE_DESCRIPTION, PITCH_PRACTICE_TIPS } from '../constants';
import type { GeneratePitchPracticeQuestionResponse } from '../types';

interface DialogContentProps {
  question?: GeneratePitchPracticeQuestionResponse;
}

export function DialogContent({ question }: DialogContentProps) {
  return (
    <AlertDialogHeader>
      <AlertDialogTitle>Pitch Practice</AlertDialogTitle>
      {!question && (
        <AlertDialogDescription className="flex flex-col gap-4">
          {PITCH_PRACTICE_DESCRIPTION}
          <ul className="flex list-disc flex-col gap-2 pl-5">
            {PITCH_PRACTICE_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </AlertDialogDescription>
      )}
    </AlertDialogHeader>
  );
}
