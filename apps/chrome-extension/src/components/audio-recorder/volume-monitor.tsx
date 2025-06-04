import { useEffect } from 'react';

import { useAudioRecorderContext } from './context/audio-recorder-context';
import { useVolumeMonitorContext } from './context/volume-monitor-context';

export function VolumeMonitor({ children }: { children: React.ReactNode }) {
  const { analyzerNode, isRecording } = useAudioRecorderContext();
  const { startVolumeMonitor, stopVolumeMonitor } = useVolumeMonitorContext();

  useEffect(() => {
    if (analyzerNode && isRecording) {
      startVolumeMonitor(analyzerNode);
    }
    return () => stopVolumeMonitor();
  }, [analyzerNode, isRecording, startVolumeMonitor, stopVolumeMonitor]);

  return children;
}
