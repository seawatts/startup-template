import { Button } from '@acme/ui/button';
import { Icons } from '@acme/ui/icons';

import { formatTime } from '~/utils/format-time';
import { AudioCanvas } from './canvas';
import { useAudioRecorderContext } from './context/audio-recorder-context';

interface RecordingControlsProps {
  onCancel: () => void;
  maxRecordingTimeSeconds?: number;
  isGeneratingText?: boolean;
}

export function RecordingControls({
  onCancel,
  maxRecordingTimeSeconds = 120,
  isGeneratingText = false,
}: RecordingControlsProps) {
  const { recordingTime, stopRecording } = useAudioRecorderContext();

  return (
    <div className="flex items-center gap-2 rounded-md border bg-white px-2 py-0.5">
      <Button onClick={onCancel} variant="outline" size="sm">
        <Icons.X />
      </Button>
      <div className="flex h-10 flex-grow items-center overflow-hidden">
        <AudioCanvas />
      </div>
      <div className="shrink-0 text-right">
        <div className="flex items-center justify-end gap-1">
          <div className="text-sm text-muted-foreground">
            {formatTime(recordingTime)}
          </div>
          <span className="text-sm text-muted-foreground">/</span>
          <div className="text-sm text-muted-foreground">
            {formatTime(maxRecordingTimeSeconds)}
          </div>
        </div>
      </div>
      <Button
        onClick={stopRecording}
        variant="outline"
        size="sm"
        disabled={isGeneratingText}
      >
        {isGeneratingText ? (
          <Icons.Spinner />
        ) : (
          <Icons.Circle className="animate-pulse fill-red-500 text-red-500" />
        )}
      </Button>
    </div>
  );
}
