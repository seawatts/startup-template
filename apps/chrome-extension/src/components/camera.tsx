import interviewImage from 'data-base64:~/../assets/interviewer.png';
import { useCallback, useEffect, useRef } from 'react';

import { Button } from '@acme/ui/button';
import { toast } from '@acme/ui/sonner';

interface CameraProps {
  showCamera: boolean;
  onToggleCamera: (show: boolean) => void;
}

export function Camera({ showCamera, onToggleCamera }: CameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleShowCamera = useCallback(() => {
    // Don't request camera access if we already have a stream
    if (streamRef.current) return;

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((error) => {
        console.error('Error accessing webcam:', error);
        toast.error('Failed to access webcam');
        onToggleCamera(false);
      });
  }, [onToggleCamera]); // Remove onToggleCamera from dependencies

  const handleHideCamera = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Use a separate effect for handling camera toggle
  useEffect(() => {
    if (showCamera) {
      handleShowCamera();
    } else {
      handleHideCamera();
    }
  }, [showCamera, handleShowCamera, handleHideCamera]); // Only depend on showCamera

  // Cleanup effect
  useEffect(() => {
    return () => {
      handleHideCamera();
    };
  }, [handleHideCamera]);

  // Memoize the button click handler
  const handleButtonClick = useCallback(() => {
    onToggleCamera(!showCamera);
  }, [showCamera, onToggleCamera]);

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <Button
        type="button"
        onClick={handleButtonClick}
        variant="outline"
        size="sm"
      >
        {showCamera ? 'Hide Camera' : 'Show Camera'}
      </Button>

      {/* Use memo for conditional content */}
      {!showCamera && (
        <div className="text-sm text-muted-foreground">
          Tip: Practicing with a camera will help you prepare for the interview.
        </div>
      )}

      {showCamera && (
        <div className="flex w-full flex-col gap-2">
          <div className="relative aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full rounded-md object-cover"
            />
          </div>
          <div className="relative" style={{ paddingTop: '56.21%' }}>
            <img
              src={interviewImage}
              alt="Interview"
              className="absolute inset-0 h-full w-full rounded-md object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
