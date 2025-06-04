import { AudioRecorderProvider } from './context/audio-recorder-context';
import { VolumeMonitorProvider } from './context/volume-monitor-context';
import { AudioRecorder } from './recorder';
import { VolumeMonitor } from './volume-monitor';

interface AudioRecorderContainerProps {
  onComplete: ({ text }: { text?: string }) => void;
  onCancel: () => void;
  maxRecordingTimeSeconds?: number;
  warningRecordingTimeSeconds?: number;
}

export function AudioRecorderContainer(props: AudioRecorderContainerProps) {
  return (
    <VolumeMonitorProvider>
      <AudioRecorderProvider>
        <VolumeMonitor>
          <AudioRecorder {...props} />
        </VolumeMonitor>
      </AudioRecorderProvider>
    </VolumeMonitorProvider>
  );
}
