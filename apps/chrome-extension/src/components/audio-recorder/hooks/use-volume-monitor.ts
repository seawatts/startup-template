import { useEffect, useRef, useState } from 'react';

export function useVolumeMonitor() {
  const [isLowVolume, setIsLowVolume] = useState(false);
  const volumeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const volumeCheckDelayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startVolumeMonitor = (analyzerNode: AnalyserNode) => {
    const volumeBuffer: number[] = [];
    const bufferSize = 5;
    const sampleInterval = 500;

    const checkVolume = () => {
      const dataArray = new Uint8Array(analyzerNode.frequencyBinCount);
      analyzerNode.getByteFrequencyData(dataArray);
      const instantAverage =
        dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;

      volumeBuffer.push(instantAverage);
      if (volumeBuffer.length > bufferSize) {
        volumeBuffer.shift();
      }

      const average =
        volumeBuffer.reduce((sum, value) => sum + value, 0) /
        volumeBuffer.length;
      setIsLowVolume(average < 5);
    };

    volumeCheckDelayTimeoutRef.current = setTimeout(() => {
      volumeCheckIntervalRef.current = setInterval(checkVolume, sampleInterval);
    }, 3000);
  };

  const stopVolumeMonitor = () => {
    if (volumeCheckIntervalRef.current)
      clearInterval(volumeCheckIntervalRef.current);
    if (volumeCheckDelayTimeoutRef.current)
      clearTimeout(volumeCheckDelayTimeoutRef.current);
  };

  useEffect(() => {
    return () => stopVolumeMonitor();
  }, []);

  return {
    isLowVolume,
    startVolumeMonitor,
    stopVolumeMonitor,
  };
}
