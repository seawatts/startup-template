import { formatDuration, intervalToDuration } from 'date-fns';

export const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs < 10 ? '0' : ''}${Number(secs).toFixed(0)}`;
};

export const formatTimeReadable = (seconds: number) => {
  const duration = intervalToDuration({ end: seconds * 1000, start: 0 });
  return formatDuration(duration, { format: ['minutes', 'seconds'] });
};
