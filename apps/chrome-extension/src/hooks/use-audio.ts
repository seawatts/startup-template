import { useCallback, useRef } from 'react';

export interface UseAudioProps {
  audio?: Blob;
  onStart: () => void;
  onEnd: () => void;
}

export function useAudio({ audio, onStart, onEnd }: UseAudioProps) {
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback(
    async (event?: React.MouseEvent<HTMLButtonElement>) => {
      event?.preventDefault();
      event?.stopPropagation();
      if (!audio) return;

      onStart();
      const audioUrl = URL.createObjectURL(audio);
      const audioElement = new Audio(audioUrl);
      audioElementRef.current = audioElement;

      try {
        await new Promise((resolve, reject) => {
          audioElement.addEventListener('ended', resolve);
          audioElement.onerror = reject;
          audioElement.play();
        });
      } catch (error) {
        console.error('Error playing audio:', error);
      } finally {
        onEnd();
        URL.revokeObjectURL(audioUrl);
        audioElementRef.current = null;
      }
    },
    [audio, onStart, onEnd],
  );

  const cleanup = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
  }, []);

  return { cleanup, handlePlay };
}
