import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { pianoAudio } from '~/utils/piano-audio';
import {
  type PianoNote,
  pianoStorage,
  type Recording,
  type SustainEvent,
} from '~/utils/piano-storage';

import { PianoRollTimeline } from './piano-roll-timeline';

interface RecordingControlsProps {
  isRecording: boolean;
  recordedNotes: PianoNote[];
  sustainEvents?: SustainEvent[];
  activeNotes?: Map<number, number>; // Map of midiNumber -> timestamp (relative to recording start)
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording: () => void;
}

export function RecordingControls({
  isRecording,
  recordedNotes,
  sustainEvents = [],
  activeNotes = new Map(),
  onStartRecording,
  onStopRecording,
  onClearRecording,
}: RecordingControlsProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [currentRecordingTime, setCurrentRecordingTime] = useState<number>(0);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadRecordings = useCallback(async () => {
    const saved = await pianoStorage.getRecordings();
    setRecordings(saved);
  }, []);

  // Load saved recordings on mount
  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Track recording time - use lower frequency updates (10fps) to reduce lag
  useEffect(() => {
    if (isRecording) {
      const startTime = Date.now();
      setCurrentRecordingTime(0);

      // Update at 10fps (100ms intervals) instead of 60fps for better performance
      recordingIntervalRef.current = setInterval(() => {
        setCurrentRecordingTime(Date.now() - startTime);
      }, 100);
    } else {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
      setCurrentRecordingTime(0);
    }

    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [isRecording]);

  const handleSave = useCallback(async () => {
    if (recordedNotes.length === 0) {
      Alert.alert('No Notes', 'Record some notes first before saving.');
      return;
    }

    const saved = await pianoStorage.saveRecording(
      recordingName,
      recordedNotes,
      sustainEvents,
    );
    if (saved) {
      setRecordingName('');
      setShowSaveInput(false);
      onClearRecording();
      await loadRecordings();
      Alert.alert('Saved!', `Recording "${saved.name}" has been saved.`);
    } else {
      Alert.alert('Error', 'Failed to save recording.');
    }
  }, [
    recordedNotes,
    recordingName,
    onClearRecording,
    loadRecordings,
    sustainEvents,
  ]);

  const handlePlayCurrent = useCallback(async () => {
    if (recordedNotes.length === 0) return;

    setIsPlaying(true);
    await pianoAudio.playSequence(recordedNotes, sustainEvents);
    setIsPlaying(false);
  }, [recordedNotes, sustainEvents]);

  const handlePlayRecording = useCallback(async (recording: Recording) => {
    if (recording.notes.length === 0) return;

    setIsPlaying(true);
    setPlayingId(recording.id);
    await pianoAudio.playSequence(recording.notes, recording.sustainEvents);
    setIsPlaying(false);
    setPlayingId(null);
  }, []);

  const handleDeleteRecording = useCallback(
    async (recording: Recording) => {
      Alert.alert(
        'Delete Recording',
        `Are you sure you want to delete "${recording.name}"?`,
        [
          { style: 'cancel', text: 'Cancel' },
          {
            onPress: async () => {
              await pianoStorage.deleteRecording(recording.id);
              await loadRecordings();
            },
            style: 'destructive',
            text: 'Delete',
          },
        ],
      );
    },
    [loadRecordings],
  );

  const theme = useMemo(
    () => ({
      background: isDark ? '#1C1C1E' : '#FFFFFF',
      border: isDark ? '#2C2C2E' : '#E5E5E5',
      buttonBg: isDark ? '#2C2C2E' : '#F5F5F5',
      cardBg: isDark ? '#2C2C2E' : '#FFFFFF',
      danger: isDark ? '#FF453A' : '#EF4444',
      foreground: isDark ? '#FAFAFA' : '#0A0A0A',
      muted: isDark ? '#A1A1AA' : '#737373',
      mutedBg: isDark ? '#3A3A3C' : '#F5F5F5',
      primary: '#EF4444',
      success: isDark ? '#30D158' : '#34C759',
    }),
    [isDark],
  );

  // Animated recording indicator
  const recordingPulse = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      recordingPulse.value = withRepeat(
        withTiming(1.2, { duration: 1000 }),
        -1,
        true,
      );
    } else {
      recordingPulse.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording, recordingPulse]);

  const recordingIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: recordingPulse.value }],
    };
  });

  const formatTime = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  return (
    <View style={styles.container}>
      {/* Piano Roll Timeline */}
      {(isRecording || recordedNotes.length > 0) && (
        <View style={styles.timelineWrapper}>
          <PianoRollTimeline
            activeNotes={activeNotes}
            currentTime={isRecording ? currentRecordingTime : undefined}
            isRecording={isRecording}
            notes={recordedNotes}
          />
        </View>
      )}

      {/* Recording Status Bar */}
      {isRecording && (
        <View
          style={[
            styles.statusBar,
            {
              backgroundColor: isDark
                ? `${theme.danger}15`
                : `${theme.danger}10`,
              borderColor: theme.danger,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.recordingIndicator,
              {
                backgroundColor: theme.danger,
              },
              recordingIndicatorStyle,
            ]}
          />
          <View style={styles.statusContent}>
            <Text style={[styles.statusText, { color: theme.danger }]}>
              Recording
            </Text>
            <Text style={[styles.statusTime, { color: theme.muted }]}>
              {formatTime(currentRecordingTime)}
            </Text>
            <Text style={[styles.statusNotes, { color: theme.muted }]}>
              • {recordedNotes.length} notes
            </Text>
          </View>
        </View>
      )}

      {/* Main Controls Card */}
      <View
        style={[
          styles.controlsCard,
          {
            backgroundColor: theme.cardBg,
            borderColor: theme.border,
          },
        ]}
      >
        {/* Primary Action: Record/Stop */}
        <Pressable
          onPress={isRecording ? onStopRecording : onStartRecording}
          style={[
            styles.primaryButton,
            {
              backgroundColor: isRecording ? theme.danger : theme.primary,
            },
          ]}
        >
          <View style={styles.buttonContent}>
            <View
              style={[
                styles.buttonIconContainer,
                { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
              ]}
            >
              <Text style={styles.primaryButtonIcon}>
                {isRecording ? '■' : '●'}
              </Text>
            </View>
            <Text style={styles.primaryButtonText}>
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </Text>
          </View>
        </Pressable>

        {/* Secondary Actions Row */}
        <View style={styles.secondaryActions}>
          <Pressable
            disabled={recordedNotes.length === 0 || isPlaying}
            onPress={handlePlayCurrent}
            style={[
              styles.secondaryButton,
              {
                backgroundColor: theme.buttonBg,
                borderColor: theme.border,
                opacity: recordedNotes.length === 0 || isPlaying ? 0.5 : 1,
              },
            ]}
          >
            <Text
              style={[styles.secondaryButtonIcon, { color: theme.success }]}
            >
              ▶
            </Text>
            <Text
              style={[styles.secondaryButtonText, { color: theme.foreground }]}
            >
              Play
            </Text>
          </Pressable>

          <Pressable
            disabled={recordedNotes.length === 0}
            onPress={() => setShowSaveInput(true)}
            style={[
              styles.secondaryButton,
              {
                backgroundColor: theme.buttonBg,
                borderColor: theme.border,
                opacity: recordedNotes.length === 0 ? 0.5 : 1,
              },
            ]}
          >
            <Text
              style={[styles.secondaryButtonIcon, { color: theme.primary }]}
            >
              ↓
            </Text>
            <Text
              style={[styles.secondaryButtonText, { color: theme.foreground }]}
            >
              Save
            </Text>
          </Pressable>

          <Pressable
            disabled={recordedNotes.length === 0}
            onPress={onClearRecording}
            style={[
              styles.secondaryButton,
              {
                backgroundColor: theme.buttonBg,
                borderColor: theme.border,
                opacity: recordedNotes.length === 0 ? 0.5 : 1,
              },
            ]}
          >
            <Text style={[styles.secondaryButtonIcon, { color: theme.muted }]}>
              ×
            </Text>
            <Text
              style={[styles.secondaryButtonText, { color: theme.foreground }]}
            >
              Clear
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Save Modal */}
      <Modal
        animationType="fade"
        onRequestClose={() => {
          setShowSaveInput(false);
          setRecordingName('');
        }}
        transparent
        visible={showSaveInput}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.saveModal,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
              },
            ]}
          >
            <Text style={[styles.saveTitle, { color: theme.foreground }]}>
              Save Recording
            </Text>
            <Text style={[styles.saveSubtitle, { color: theme.muted }]}>
              {recordedNotes.length} notes •{' '}
              {formatTime(
                recordedNotes.length > 0
                  ? Math.max(
                      ...recordedNotes.map((n) => n.timestamp + n.duration),
                    )
                  : 0,
              )}
            </Text>
            <TextInput
              autoFocus
              onChangeText={setRecordingName}
              placeholder="Enter a name for your recording..."
              placeholderTextColor={theme.muted}
              style={[
                styles.saveInput,
                {
                  backgroundColor: theme.buttonBg,
                  borderColor: theme.border,
                  color: theme.foreground,
                },
              ]}
              value={recordingName}
            />
            <View style={styles.saveActions}>
              <Pressable
                onPress={() => {
                  setShowSaveInput(false);
                  setRecordingName('');
                }}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: theme.buttonBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[styles.saveButtonText, { color: theme.foreground }]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled={!recordingName.trim()}
                onPress={handleSave}
                style={[
                  styles.saveButton,
                  {
                    backgroundColor: theme.primary,
                    opacity: !recordingName.trim() ? 0.5 : 1,
                  },
                ]}
              >
                <Text style={styles.saveButtonTextWhite}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Saved Recordings List */}
      {recordings.length > 0 && (
        <View style={styles.recordingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
            Saved Recordings
          </Text>
          <View style={styles.recordingsContent}>
            {recordings.map((recording) => (
              <View
                key={recording.id}
                style={[
                  styles.recordingItem,
                  {
                    backgroundColor: theme.cardBg,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.recordingInfo}>
                  <Text
                    style={[styles.recordingName, { color: theme.foreground }]}
                  >
                    {recording.name}
                  </Text>
                  <Text style={[styles.recordingMeta, { color: theme.muted }]}>
                    {recording.notes.length} notes •{' '}
                    {new Date(recording.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.recordingActions}>
                  <Pressable
                    disabled={isPlaying}
                    onPress={() => handlePlayRecording(recording)}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor:
                          playingId === recording.id
                            ? theme.primary
                            : theme.buttonBg,
                        borderColor: theme.border,
                        opacity:
                          isPlaying && playingId !== recording.id ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionButtonText,
                        {
                          color:
                            playingId === recording.id
                              ? '#FFFFFF'
                              : theme.foreground,
                        },
                      ]}
                    >
                      {playingId === recording.id ? '⏸' : '▶'}
                    </Text>
                  </Pressable>
                  <Pressable
                    disabled={isPlaying}
                    onPress={() => handleDeleteRecording(recording)}
                    style={[
                      styles.actionButton,
                      {
                        backgroundColor: theme.buttonBg,
                        borderColor: theme.border,
                        opacity: isPlaying ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[styles.actionButtonText, { color: theme.danger }]}
                    >
                      ×
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonContent: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  buttonIconContainer: {
    alignItems: 'center',
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  container: {
    flex: 1,
    gap: 16,
  },
  controlsCard: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flex: 1,
    justifyContent: 'center',
  },
  primaryButton: {
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  primaryButtonIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  recordingIndicator: {
    borderRadius: 6,
    height: 12,
    width: 12,
  },
  recordingInfo: {
    flex: 1,
    gap: 4,
  },
  recordingItem: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  recordingMeta: {
    fontSize: 12,
  },
  recordingName: {
    fontSize: 15,
    fontWeight: '600',
  },
  recordingsContent: {
    paddingBottom: 16,
  },
  recordingsSection: {
    gap: 12,
  },
  saveActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextWhite: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  saveInput: {
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    padding: 12,
  },
  saveModal: {
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
    marginHorizontal: 24,
    padding: 20,
    width: '90%',
  },
  saveSubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  saveTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryButtonIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  statusBar: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusContent: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  statusNotes: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 15,
    fontWeight: '600',
  },
  statusTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  timelineWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
