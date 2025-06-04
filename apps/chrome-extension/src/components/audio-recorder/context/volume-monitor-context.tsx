import type React from 'react';
import { createContext, useContext } from 'react';

import { useVolumeMonitor } from '../hooks/use-volume-monitor';

interface VolumeMonitorContextType {
  isLowVolume: boolean;
  startVolumeMonitor: (analyzerNode: AnalyserNode) => void;
  stopVolumeMonitor: () => void;
}

const VolumeMonitorContext = createContext<
  VolumeMonitorContextType | undefined
>(undefined);

export function VolumeMonitorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const volumeMonitor = useVolumeMonitor();

  return (
    <VolumeMonitorContext.Provider value={volumeMonitor}>
      {children}
    </VolumeMonitorContext.Provider>
  );
}

export function useVolumeMonitorContext() {
  const context = useContext(VolumeMonitorContext);
  if (context === undefined) {
    throw new Error(
      'useVolumeMonitorContext must be used within a VolumeMonitorProvider',
    );
  }
  return context;
}
