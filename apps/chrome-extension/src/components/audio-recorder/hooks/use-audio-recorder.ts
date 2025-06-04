import { useCallback, useEffect, useRef, useState } from 'react';

interface UseAudioRecorderProps {
  onNotAllowedOrFound?: (error: DOMException) => void;
  audioTrackConstraints?: MediaTrackConstraints;
}

export function useAudioRecorder({
  onNotAllowedOrFound,
  audioTrackConstraints,
}: UseAudioRecorderProps = {}) {
  const [audioContext, setAudioContext] = useState<AudioContext>();
  const [recordingBlob, setRecordingBlob] = useState<Blob>();
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [analyzerNode, setAnalyzerNode] = useState<AnalyserNode>();
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);

  const chunks = useRef<Blob[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const isActiveRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);

  const dataAvailableListener = useCallback((event: BlobEvent) => {
    if (isActiveRef.current && event.data.size > 0) {
      chunks.current.push(event.data);
    }
  }, []);

  const stopListener = useCallback(() => {
    const blob = new Blob(chunks.current, { type: 'audio/webm' });
    setRecordingBlob(blob);
    isActiveRef.current = false;
  }, []);

  const cleanupMediaRecorder = useCallback(() => {
    if (!mediaRecorderRef.current) return; // Add early return if no recorder exists

    mediaRecorderRef.current.removeEventListener(
      'dataavailable',
      dataAvailableListener,
    );
    mediaRecorderRef.current.removeEventListener('stop', stopListener);
    mediaRecorderRef.current = null;

    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    isActiveRef.current = false;
    chunks.current = [];
    setRecordingTime(0);
  }, [dataAvailableListener, stopListener]);

  const startRecording = useCallback(async () => {
    try {
      cleanupMediaRecorder();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioTrackConstraints || true,
      });
      streamRef.current = stream;
      const context = new AudioContext();
      await context.resume();
      setAudioContext(context);
      setIsAudioEnabled(context.destination.maxChannelCount > 0);

      const source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      setAnalyzerNode(analyser);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      isActiveRef.current = true;

      recorder.addEventListener('dataavailable', dataAvailableListener);
      recorder.addEventListener('stop', stopListener);

      recorder.start(100);
      setIsRecording(true);

      setStartTime(Date.now());
      setRecordingTime(0);
    } catch (error) {
      if (onNotAllowedOrFound) {
        onNotAllowedOrFound(error as DOMException);
      }
    }
  }, [
    audioTrackConstraints,
    onNotAllowedOrFound,
    dataAvailableListener,
    stopListener,
    cleanupMediaRecorder,
  ]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      isActiveRef.current = false;
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        for (const track of streamRef.current.getTracks()) track.stop();
      }
      setIsRecording(false);
    }
  }, []);

  const togglePauseResume = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  }, [isPaused]);

  useEffect(() => {
    if (!isRecording || startTime === 0) return;

    const interval = setInterval(() => {
      // Calculate time in seconds
      const currentTime = (Date.now() - startTime) / 1000;
      setRecordingTime(currentTime);
    }, 100); // Update more frequently for smoother display

    return () => clearInterval(interval);
  }, [isRecording, startTime]);

  useEffect(() => {
    // Return cleanup function
    return () => {
      if (mediaRecorderRef.current || streamRef.current) {
        cleanupMediaRecorder();
        setAudioContext(undefined);
        setAnalyzerNode(undefined);
        setRecordingBlob(undefined);
        setRecordingTime(0);
      }
    };
  }, [cleanupMediaRecorder]); // Empty dependency array to only run on unmount

  return {
    analyzerNode,
    audioContext,
    isAudioEnabled,
    isPaused,
    isRecording,
    mediaRecorder: mediaRecorderRef.current,
    recordingBlob,
    recordingTime,
    startRecording,
    stopRecording,
    togglePauseResume,
    cleanupMediaRecorder,
  };
}
