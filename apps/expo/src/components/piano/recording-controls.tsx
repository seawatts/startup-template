import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import { pianoAudio } from '~/utils/piano-audio';
import {
  type PianoNote,
  pianoStorage,
  type Recording,
} from '~/utils/piano-storage';

interface RecordingControlsProps {
  isRecording: boolean;
  recordedNotes: PianoNote[];
  onStartRecording: () => void;
  onStopRecording: () => void;
  onClearRecording: () => void;
}

export function RecordingControls({
  isRecording,
  recordedNotes,
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

  const loadRecordings = useCallback(async () => {
    const saved = await pianoStorage.getRecordings();
    setRecordings(saved);
  }, []);

  // Load saved recordings on mount
  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  const handleSave = useCallback(async () => {
    if (recordedNotes.length === 0) {
      Alert.alert('No Notes', 'Record some notes first before saving.');
      return;
    }

    const saved = await pianoStorage.saveRecording(
      recordingName,
      recordedNotes,
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
  }, [recordedNotes, recordingName, onClearRecording, loadRecordings]);

  const handlePlayCurrent = useCallback(async () => {
    if (recordedNotes.length === 0) return;

    setIsPlaying(true);
    await pianoAudio.playSequence(recordedNotes);
    setIsPlaying(false);
  }, [recordedNotes]);

  const handlePlayRecording = useCallback(async (recording: Recording) => {
    if (recording.notes.length === 0) return;

    setIsPlaying(true);
    setPlayingId(recording.id);
    await pianoAudio.playSequence(recording.notes);
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
      background: isDark ? '#1C1C1E' : '#F5F5F5',
      border: isDark ? '#38383A' : '#E5E5E5',
      buttonBg: isDark ? '#2C2C2E' : '#FFFFFF',
      danger: '#FF453A',
      foreground: isDark ? '#FFFFFF' : '#000000',
      muted: isDark ? '#8E8E93' : '#8E8E93',
      primary: '#FF6B6B',
      success: '#30D158',
    }),
    [isDark],
  );

  const renderRecordingItem = useCallback(
    ({ item }: { item: Recording }) => (
      <View style={[styles.recordingItem, { backgroundColor: theme.buttonBg }]}>
        <View style={styles.recordingInfo}>
          <Text style={[styles.recordingName, { color: theme.foreground }]}>
            {item.name}
          </Text>
          <Text style={[styles.recordingMeta, { color: theme.muted }]}>
            {item.notes.length} notes •{' '}
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.recordingActions}>
          <Pressable
            disabled={isPlaying}
            onPress={() => handlePlayRecording(item)}
            style={[
              styles.iconButton,
              { backgroundColor: `${theme.success}20` },
            ]}
          >
            <Text style={[styles.iconText, { color: theme.success }]}>
              {playingId === item.id ? '⏸' : '▶'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => handleDeleteRecording(item)}
            style={[
              styles.iconButton,
              { backgroundColor: `${theme.danger}20` },
            ]}
          >
            <Text style={[styles.iconText, { color: theme.danger }]}>🗑</Text>
          </Pressable>
        </View>
      </View>
    ),
    [theme, isPlaying, playingId, handlePlayRecording, handleDeleteRecording],
  );

  return (
    <View style={styles.container}>
      {/* Recording Controls */}
      <View style={[styles.controlsRow, { backgroundColor: theme.background }]}>
        {/* Record/Stop Button */}
        <Pressable
          onPress={isRecording ? onStopRecording : onStartRecording}
          style={[
            styles.mainButton,
            {
              backgroundColor: isRecording ? theme.danger : theme.primary,
            },
          ]}
        >
          <Text style={styles.mainButtonIcon}>{isRecording ? '⏹' : '⏺'}</Text>
          <Text style={styles.mainButtonText}>
            {isRecording ? 'Stop' : 'Record'}
          </Text>
        </Pressable>

        {/* Play Current Recording */}
        <Pressable
          disabled={recordedNotes.length === 0 || isPlaying}
          onPress={handlePlayCurrent}
          style={[
            styles.secondaryButton,
            {
              backgroundColor: theme.buttonBg,
              borderColor: theme.border,
              opacity: recordedNotes.length === 0 ? 0.5 : 1,
            },
          ]}
        >
          <Text style={[styles.secondaryButtonIcon, { color: theme.success }]}>
            ▶
          </Text>
          <Text
            style={[styles.secondaryButtonText, { color: theme.foreground }]}
          >
            Play
          </Text>
        </Pressable>

        {/* Save Button */}
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
          <Text style={[styles.secondaryButtonIcon, { color: theme.primary }]}>
            💾
          </Text>
          <Text
            style={[styles.secondaryButtonText, { color: theme.foreground }]}
          >
            Save
          </Text>
        </Pressable>

        {/* Clear Button */}
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
            ✕
          </Text>
          <Text
            style={[styles.secondaryButtonText, { color: theme.foreground }]}
          >
            Clear
          </Text>
        </Pressable>
      </View>

      {/* Recording Status */}
      {isRecording && (
        <View
          style={[styles.statusBar, { backgroundColor: `${theme.danger}20` }]}
        >
          <View style={styles.recordingIndicator} />
          <Text style={[styles.statusText, { color: theme.danger }]}>
            Recording... {recordedNotes.length} notes captured
          </Text>
        </View>
      )}

      {/* Save Input Modal */}
      {showSaveInput && (
        <View style={[styles.saveModal, { backgroundColor: theme.background }]}>
          <Text style={[styles.saveTitle, { color: theme.foreground }]}>
            Save Recording
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
              style={[styles.saveButton, { backgroundColor: theme.buttonBg }]}
            >
              <Text
                style={[styles.saveButtonText, { color: theme.foreground }]}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable
              onPress={handleSave}
              style={[styles.saveButton, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.saveButtonTextWhite}>Save</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Saved Recordings List */}
      {recordings.length > 0 && (
        <View style={styles.recordingsSection}>
          <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
            Saved Recordings
          </Text>
          <FlatList
            contentContainerStyle={styles.recordingsContent}
            data={recordings}
            keyExtractor={(item) => item.id}
            renderItem={renderRecordingItem}
            showsVerticalScrollIndicator={false}
            style={styles.recordingsList}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
  },
  controlsRow: {
    borderRadius: 16,
    flexDirection: 'row',
    gap: 8,
    padding: 12,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconText: {
    fontSize: 16,
  },
  mainButton: {
    alignItems: 'center',
    borderRadius: 12,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  mainButtonIcon: {
    color: '#FFFFFF',
    fontSize: 24,
  },
  mainButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  recordingIndicator: {
    backgroundColor: '#FF453A',
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  recordingInfo: {
    flex: 1,
    gap: 2,
  },
  recordingItem: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  recordingMeta: {
    fontSize: 12,
  },
  recordingName: {
    fontSize: 16,
    fontWeight: '500',
  },
  recordingsContent: {
    paddingBottom: 16,
  },
  recordingsList: {
    maxHeight: 200,
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
    flex: 1,
    paddingVertical: 12,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
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
    borderRadius: 16,
    gap: 16,
    padding: 16,
  },
  saveTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  secondaryButtonIcon: {
    fontSize: 20,
  },
  secondaryButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBar: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
