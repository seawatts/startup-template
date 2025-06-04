import { Alert, AlertDescription, AlertTitle } from '@acme/ui/alert';
import { Icons } from '@acme/ui/icons';

import { UploadPitchDeckButton } from './button';

export function UploadDeckAlert({
  withSelectedPitchDeckLabel,
}: {
  withSelectedPitchDeckLabel?: boolean;
}) {
  return (
    <Alert>
      <Icons.Info className="text-green-500" />
      <div className="flex flex-wrap justify-between gap-6">
        <div>
          <AlertTitle>Level up your pitch game</AlertTitle>
          <AlertDescription>
            Upload your deck and get personalized feedback to boost your
            chances.
          </AlertDescription>
        </div>
        <div>
          <UploadPitchDeckButton
            withSelectedPitchDeckLabel={withSelectedPitchDeckLabel}
          />
        </div>
      </div>
    </Alert>
  );
}
