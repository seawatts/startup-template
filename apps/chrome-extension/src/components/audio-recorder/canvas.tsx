import { useEffect, useRef } from 'react';

import { useAudioRecorderContext } from './context/audio-recorder-context';
import { createAudioVisualizer } from './utils/draw-audio-visualizer';

export function AudioCanvas() {
  const { analyzerNode, isRecording } = useAudioRecorderContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const visualizerRef = useRef(createAudioVisualizer());

  useEffect(() => {
    if (!canvasRef.current || !analyzerNode || !isRecording) return;

    // Set canvas size
    const canvas = canvasRef.current;
    const updateCanvasSize = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = 46; // Fixed height
      }
    };
    updateCanvasSize();

    const draw = () => {
      if (!canvasRef.current || !analyzerNode || !isRecording) return;

      visualizerRef.current({
        analyser: analyzerNode,
        canvas: canvasRef.current,
      });
      animationRef.current = requestAnimationFrame(draw);
    };

    animationRef.current = requestAnimationFrame(draw);

    // Handle resize
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, [analyzerNode, isRecording]);

  return <canvas ref={canvasRef} className="h-[46px] w-full" />;
}
