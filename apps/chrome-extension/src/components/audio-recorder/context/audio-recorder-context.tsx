import type React from 'react';
import { createContext, useContext } from 'react';

import { useAudioRecorder } from '../hooks/use-audio-recorder';

interface AudioRecorderContextType {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  analyzerNode?: AnalyserNode;
  isAudioEnabled: boolean;
  audioContext?: AudioContext;
  togglePauseResume: () => void;
  recordingBlob?: Blob;
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  mediaRecorder: MediaRecorder | null;
}

const AudioRecorderContext = createContext<
  AudioRecorderContextType | undefined
>(undefined);

export function AudioRecorderProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const audioRecorder = useAudioRecorder();

  return (
    <AudioRecorderContext.Provider value={audioRecorder}>
      {children}
    </AudioRecorderContext.Provider>
  );
}

export function useAudioRecorderContext() {
  const context = useContext(AudioRecorderContext);
  if (context === undefined) {
    throw new Error(
      'useAudioRecorderContext must be used within an AudioRecorderProvider',
    );
  }
  return context;
}
