import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { CONTROLS_BAR_HEIGHT } from './constants';

interface SynthesiaControlsProps {
  isRecording: boolean;
  isPlaying: boolean;
  hasRecordedNotes: boolean;
  currentTime: number; // Current time in ms
  onStartRecording: () => void;
  onStopRecording: () => void;
  onStartPlayback: () => void;
  onStopPlayback: () => void;
  onSave: () => void;
  onClear: () => void;
}

export function SynthesiaControls({
  isRecording,
  isPlaying,
  hasRecordedNotes,
  currentTime,
  onStartRecording,
  onStopRecording,
  onStartPlayback,
  onStopPlayback,
  onSave,
  onClear,
}: SynthesiaControlsProps) {
  const router = useRouter();

  // Format time as MM:SS
  const formattedTime = useMemo(() => {
    const totalSeconds = Math.floor(currentTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [currentTime]);

  // Animated recording indicator
  const recordingPulse = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      recordingPulse.value = withRepeat(
        withTiming(0.4, { duration: 800 }),
        -1,
        true,
      );
    } else {
      recordingPulse.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording, recordingPulse]);

  const recordingIndicatorStyle = useAnimatedStyle(() => ({
    opacity: recordingPulse.value,
  }));

  const handleRecordPress = useCallback(() => {
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  }, [isRecording, onStartRecording, onStopRecording]);

  const handlePlayPress = useCallback(() => {
    if (isPlaying) {
      onStopPlayback();
    } else {
      onStartPlayback();
    }
  }, [isPlaying, onStartPlayback, onStopPlayback]);

  const handleSettingsPress = useCallback(() => {
    router.push('/settings');
  }, [router]);

  return (
    <View style={styles.container}>
      {/* Left section: Recording indicator and timer */}
      <View style={styles.leftSection}>
        {isRecording && (
          <Animated.View
            style={[styles.recordingDot, recordingIndicatorStyle]}
          />
        )}
        <Text style={styles.timer}>{formattedTime}</Text>
      </View>

      {/* Center section: Main controls */}
      <View style={styles.centerSection}>
        {/* Record button */}
        <Pressable
          disabled={isPlaying}
          onPress={handleRecordPress}
          style={[
            styles.controlButton,
            styles.recordButton,
            isRecording && styles.recordButtonActive,
          ]}
        >
          <View style={[styles.recordIcon, isRecording && styles.stopIcon]} />
        </Pressable>

        {/* Play/Pause button */}
        <Pressable
          disabled={!hasRecordedNotes || isRecording}
          onPress={handlePlayPress}
          style={[
            styles.controlButton,
            styles.playButton,
            !hasRecordedNotes && styles.buttonDisabled,
          ]}
        >
          <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </Pressable>

        {/* Save button */}
        <Pressable
          disabled={!hasRecordedNotes || isRecording || isPlaying}
          onPress={onSave}
          style={[
            styles.controlButton,
            styles.saveButton,
            (!hasRecordedNotes || isRecording || isPlaying) &&
              styles.buttonDisabled,
          ]}
        >
          <Text style={styles.saveIcon}>↓</Text>
        </Pressable>

        {/* Clear button */}
        <Pressable
          disabled={!hasRecordedNotes || isRecording || isPlaying}
          onPress={onClear}
          style={[
            styles.controlButton,
            styles.clearButton,
            (!hasRecordedNotes || isRecording || isPlaying) &&
              styles.buttonDisabled,
          ]}
        >
          <Text style={styles.clearIcon}>×</Text>
        </Pressable>
      </View>

      {/* Right section: Settings */}
      <View style={styles.rightSection}>
        <Pressable
          disabled={isRecording || isPlaying}
          onPress={handleSettingsPress}
          style={styles.settingsButton}
        >
          <Text style={styles.settingsIcon}>⚙</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonDisabled: {
    opacity: 0.4,
  },
  centerSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  clearButton: {
    backgroundColor: '#3A3A3C',
  },
  clearIcon: {
    color: '#A1A1AA',
    fontSize: 20,
    fontWeight: '600',
  },
  container: {
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderBottomColor: '#2C2C2E',
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: CONTROLS_BAR_HEIGHT,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  controlButton: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  leftSection: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    minWidth: 80,
  },
  playButton: {
    backgroundColor: '#3A3A3C',
  },
  playIcon: {
    color: '#4ADE80',
    fontSize: 16,
  },
  recordButton: {
    backgroundColor: '#3A3A3C',
  },
  recordButtonActive: {
    backgroundColor: '#DC2626',
  },
  recordIcon: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    height: 16,
    width: 16,
  },
  recordingDot: {
    backgroundColor: '#DC2626',
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  rightSection: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  saveButton: {
    backgroundColor: '#3A3A3C',
  },
  saveIcon: {
    color: '#4ADE80',
    fontSize: 18,
    fontWeight: '600',
  },
  settingsButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  settingsIcon: {
    color: '#A1A1AA',
    fontSize: 20,
  },
  stopIcon: {
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
    height: 12,
    width: 12,
  },
  timer: {
    color: '#FAFAFA',
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '500',
  },
});
