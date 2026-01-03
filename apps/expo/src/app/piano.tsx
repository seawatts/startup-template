import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CONTROLS_BAR_HEIGHT,
  WHITE_KEY_HEIGHT,
} from '~/components/piano/constants';

import { FallingNotesDisplay } from '~/components/piano/falling-notes-display';
import { PianoKeys } from '~/components/piano/piano-keys';
import { SynthesiaControls } from '~/components/piano/synthesia-controls';
import {
  type MidiControlChange,
  type MidiNote,
  useMidiService,
} from '~/utils/midi-service';
import { PIANO_KEYS, pianoAudio } from '~/utils/piano-audio';
import { getShowKeyNames } from '~/utils/piano-settings';
import { type PianoNote, pianoStorage } from '~/utils/piano-storage';
import {
  type UsbMidiControlChange,
  type UsbMidiNote,
  useUsbMidi,
} from '~/utils/usb-midi-service';
import { usePianoStore } from '../stores/piano-store';

export default function PianoScreen() {
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  // Zustand store state
  const isRecording = usePianoStore((state) => state.isRecording);
  const isPlaying = usePianoStore((state) => state.isPlaying);
  const recordedNotes = usePianoStore((state) => state.recordedNotes);
  const sustainEvents = usePianoStore((state) => state.sustainEvents);
  const showKeyNames = usePianoStore((state) => state.showKeyNames);
  const currentTime = usePianoStore((state) => state.currentTime);

  // Local state for frequently updated values
  const [activeNotes, setActiveNotes] = useState<Map<number, number>>(
    new Map(),
  );
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [recordingName, setRecordingName] = useState('');

  // Store actions
  const startRecording = usePianoStore((state) => state.startRecording);
  const stopRecording = usePianoStore((state) => state.stopRecording);
  const addNote = usePianoStore((state) => state.addNote);
  const clearRecording = usePianoStore((state) => state.clearRecording);
  const startPlayback = usePianoStore((state) => state.startPlayback);
  const stopPlayback = usePianoStore((state) => state.stopPlayback);
  const setCurrentTime = usePianoStore((state) => state.setCurrentTime);
  const setShowKeyNames = usePianoStore((state) => state.setShowKeyNames);

  // Load show key names setting on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      getShowKeyNames().then(setShowKeyNames);
    }, [setShowKeyNames]),
  );

  const recordingStartTime = useRef<number>(0);
  const playbackStartTime = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track note-on times for accurate duration calculation
  const noteOnTimes = useRef<Map<number, number>>(new Map());
  // Track sustain pedal state
  const sustainActive = useRef<boolean>(false);

  // Unified scroll view ref
  const unifiedScrollRef = useRef<ScrollView>(null);

  // Handle BLE MIDI control change (sustain pedal)
  const handleBleMidiControlChange = useCallback((cc: MidiControlChange) => {
    if (cc.ccNumber === 64) {
      const isActive = cc.value >= 64;
      sustainActive.current = isActive;
      // Sustain events are handled by the Zustand store
    }
  }, []);

  // Handle BLE MIDI note events
  const handleBleMidiNoteEvent = useCallback(
    (midiNote: MidiNote) => {
      const currentTimeMs = Date.now();

      if (midiNote.type === 'noteOn') {
        pianoAudio.playNote(midiNote.note);

        if (isRecording) {
          noteOnTimes.current.set(midiNote.note, currentTimeMs);
          setActiveNotes((prev) => {
            const newMap = new Map(prev);
            newMap.set(
              midiNote.note,
              currentTimeMs - recordingStartTime.current,
            );
            return newMap;
          });
        }
      } else if (midiNote.type === 'noteOff' && isRecording) {
        const noteOnTime = noteOnTimes.current.get(midiNote.note);
        const keyInfo = PIANO_KEYS.find((k) => k.midiNumber === midiNote.note);

        if (keyInfo && noteOnTime !== undefined) {
          const duration = currentTimeMs - noteOnTime;
          const note: PianoNote = {
            duration,
            midiNumber: midiNote.note,
            note: keyInfo.note,
            noteOffTime: currentTimeMs,
            noteOnTime,
            sustainActive: sustainActive.current,
            timestamp: noteOnTime - recordingStartTime.current,
          };
          addNote(note);
          noteOnTimes.current.delete(midiNote.note);
          setActiveNotes((prev) => {
            const newMap = new Map(prev);
            newMap.delete(midiNote.note);
            return newMap;
          });
        }
      }
    },
    [isRecording, addNote],
  );

  // Handle USB MIDI control change (sustain pedal)
  const handleUsbMidiControlChange = useCallback((cc: UsbMidiControlChange) => {
    if (cc.ccNumber === 64) {
      const isActive = cc.value >= 64;
      sustainActive.current = isActive;
      // Sustain events are handled by the Zustand store
    }
  }, []);

  // Handle USB MIDI note events
  const handleUsbMidiNoteEvent = useCallback(
    (midiNote: UsbMidiNote) => {
      const currentTimeMs = Date.now();

      if (midiNote.type === 'noteOn') {
        pianoAudio.playNote(midiNote.note);

        if (isRecording) {
          noteOnTimes.current.set(midiNote.note, currentTimeMs);
          setActiveNotes((prev) => {
            const newMap = new Map(prev);
            newMap.set(
              midiNote.note,
              currentTimeMs - recordingStartTime.current,
            );
            return newMap;
          });
        }
      } else if (midiNote.type === 'noteOff' && isRecording) {
        const noteOnTime = noteOnTimes.current.get(midiNote.note);
        const keyInfo = PIANO_KEYS.find((k) => k.midiNumber === midiNote.note);

        if (keyInfo && noteOnTime !== undefined) {
          const duration = currentTimeMs - noteOnTime;
          const note: PianoNote = {
            duration,
            midiNumber: midiNote.note,
            note: keyInfo.note,
            noteOffTime: currentTimeMs,
            noteOnTime,
            sustainActive: sustainActive.current,
            timestamp: noteOnTime - recordingStartTime.current,
          };
          addNote(note);
          noteOnTimes.current.delete(midiNote.note);
          setActiveNotes((prev) => {
            const newMap = new Map(prev);
            newMap.delete(midiNote.note);
            return newMap;
          });
        }
      }
    },
    [isRecording, addNote],
  );

  // Initialize MIDI services (BLE and USB)
  const bleMidi = useMidiService(
    handleBleMidiNoteEvent,
    handleBleMidiControlChange,
  );
  const usbMidi = useUsbMidi(
    handleUsbMidiNoteEvent,
    handleUsbMidiControlChange,
  );

  // Merge pressed keys from both MIDI sources
  const combinedPressedKeys = useMemo(() => {
    const combined = new Set<number>();
    for (const key of bleMidi.pressedKeys) {
      combined.add(key);
    }
    for (const key of usbMidi.pressedKeys) {
      combined.add(key);
    }
    return combined;
  }, [bleMidi.pressedKeys, usbMidi.pressedKeys]);

  // Calculate which notes are currently "landing" (playing) during playback
  // These are notes whose timestamp has been reached and duration hasn't expired
  const landingNotes = useMemo(() => {
    if (!isPlaying) return new Set<number>();

    const landing = new Set<number>();
    for (const note of recordedNotes) {
      const noteStartTime = note.timestamp;
      const noteEndTime = note.timestamp + note.duration;

      // Note is "landing" if current time is within the note's duration
      if (currentTime >= noteStartTime && currentTime <= noteEndTime) {
        landing.add(note.midiNumber);
      }
    }
    return landing;
  }, [isPlaying, recordedNotes, currentTime]);

  // Allow all orientations when on piano screen, lock back to portrait when leaving
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.unlockAsync();

      return () => {
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
      };
    }, []),
  );

  // Timer management
  useEffect(() => {
    if (isRecording) {
      recordingStartTime.current = Date.now();
      setCurrentTime(0);

      timerIntervalRef.current = setInterval(() => {
        setCurrentTime(Date.now() - recordingStartTime.current);
      }, 50);
    } else if (isPlaying) {
      // Timer is managed by playback
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isRecording, isPlaying, setCurrentTime]);

  const handleStartRecording = useCallback(() => {
    setActiveNotes(new Map());
    startRecording();
  }, [startRecording]);

  const handleStopRecording = useCallback(() => {
    stopRecording();
  }, [stopRecording]);

  const handleStartPlayback = useCallback(async () => {
    if (recordedNotes.length === 0) return;

    startPlayback();

    // Start playback timer (16ms ≈ 60fps for smooth falling notes animation)
    timerIntervalRef.current = setInterval(() => {
      setCurrentTime(Date.now() - playbackStartTime.current);
    }, 16);

    // Play the sequence
    await pianoAudio.playSequence(recordedNotes, sustainEvents);

    // Playback finished
    stopPlayback();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, [
    recordedNotes,
    sustainEvents,
    startPlayback,
    stopPlayback,
    setCurrentTime,
  ]);

  const handleStopPlayback = useCallback(() => {
    stopPlayback();
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, [stopPlayback]);

  const handleClearRecording = useCallback(() => {
    setActiveNotes(new Map());
    clearRecording();
  }, [clearRecording]);

  const handleSavePress = useCallback(() => {
    if (recordedNotes.length === 0) {
      Alert.alert('No Notes', 'Record some notes first before saving.');
      return;
    }
    setShowSaveModal(true);
  }, [recordedNotes.length]);

  const handleSaveConfirm = useCallback(async () => {
    const saved = await pianoStorage.saveRecording(
      recordingName,
      recordedNotes,
      sustainEvents,
    );
    if (saved) {
      setRecordingName('');
      setShowSaveModal(false);
      handleClearRecording();
      Alert.alert('Saved!', `Recording "${saved.name}" has been saved.`);
    } else {
      Alert.alert('Error', 'Failed to save recording.');
    }
  }, [recordingName, recordedNotes, sustainEvents, handleClearRecording]);

  const handleNotePlay = useCallback(
    (note: PianoNote) => {
      addNote(note);
    },
    [addNote],
  );

  // Calculate falling notes display height
  const keyboardHeight = isLandscape
    ? WHITE_KEY_HEIGHT * 0.8
    : WHITE_KEY_HEIGHT;
  const fallingNotesHeight = height - CONTROLS_BAR_HEIGHT - keyboardHeight - 40; // 40 for safe area padding

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      {/* Top Controls Bar */}
      <SynthesiaControls
        currentTime={currentTime}
        hasRecordedNotes={recordedNotes.length > 0}
        isPlaying={isPlaying}
        isRecording={isRecording}
        onClear={handleClearRecording}
        onSave={handleSavePress}
        onStartPlayback={handleStartPlayback}
        onStartRecording={handleStartRecording}
        onStopPlayback={handleStopPlayback}
        onStopRecording={handleStopRecording}
      />

      {/* Unified Scroll View for Falling Notes and Piano Keys */}
      <View style={styles.unifiedContainer}>
        <ScrollView
          horizontal
          ref={unifiedScrollRef}
          showsHorizontalScrollIndicator={false}
          style={styles.unifiedScrollView}
        >
          {/* Vertical stack of falling notes and piano keys */}
          <View style={styles.verticalStack}>
            {/* Falling Notes Display */}
            <View
              style={[
                styles.fallingNotesInScroll,
                { height: fallingNotesHeight },
              ]}
            >
              <FallingNotesDisplay
                activeNotes={activeNotes}
                currentTime={currentTime}
                displayHeight={fallingNotesHeight}
                isPlaying={isPlaying}
                isRecording={isRecording}
                notes={recordedNotes}
              />
            </View>

            {/* Piano Keyboard */}
            <View
              style={[
                styles.keyboardInScroll,
                isLandscape && styles.keyboardLandscape,
              ]}
            >
              <PianoKeys
                externalPressedKeys={combinedPressedKeys}
                isRecording={isRecording}
                landingNotes={landingNotes}
                onNotePlay={handleNotePlay}
                showKeyNames={showKeyNames}
              />
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Save Modal */}
      <Modal
        animationType="fade"
        onRequestClose={() => {
          setShowSaveModal(false);
          setRecordingName('');
        }}
        transparent
        visible={showSaveModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.saveModal}>
            <Text style={styles.saveTitle}>Save Recording</Text>
            <Text style={styles.saveSubtitle}>
              {recordedNotes.length} notes
            </Text>
            <TextInput
              autoFocus
              onChangeText={setRecordingName}
              placeholder="Enter a name..."
              placeholderTextColor="#A1A1AA"
              style={styles.saveInput}
              value={recordingName}
            />
            <View style={styles.saveActions}>
              <Pressable
                onPress={() => {
                  setShowSaveModal(false);
                  setRecordingName('');
                }}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={!recordingName.trim()}
                onPress={handleSaveConfirm}
                style={[
                  styles.confirmButton,
                  !recordingName.trim() && styles.buttonDisabled,
                ]}
              >
                <Text style={styles.confirmButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    alignItems: 'center',
    backgroundColor: '#3A3A3C',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#FAFAFA',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    alignItems: 'center',
    backgroundColor: '#4ADE80',
    borderRadius: 10,
    flex: 1,
    paddingVertical: 12,
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
  container: {
    backgroundColor: '#1C1C1E',
    flex: 1,
  },
  fallingNotesInScroll: {
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 4,
  },
  keyboardInScroll: {
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  keyboardLandscape: {
    paddingHorizontal: 8,
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    flex: 1,
    justifyContent: 'center',
  },
  saveActions: {
    flexDirection: 'row',
    gap: 12,
  },
  saveInput: {
    backgroundColor: '#3A3A3C',
    borderRadius: 10,
    color: '#FAFAFA',
    fontSize: 16,
    padding: 12,
  },
  saveModal: {
    backgroundColor: '#2C2C2E',
    borderRadius: 20,
    gap: 16,
    marginHorizontal: 24,
    padding: 20,
    width: '85%',
  },
  saveSubtitle: {
    color: '#A1A1AA',
    fontSize: 14,
    textAlign: 'center',
  },
  saveTitle: {
    color: '#FAFAFA',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  unifiedContainer: {
    flex: 1,
  },
  unifiedScrollView: {
    flex: 1,
  },
  verticalStack: {
    flexDirection: 'column',
  },
});
