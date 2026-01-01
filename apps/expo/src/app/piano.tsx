import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MidiConnection,
  PianoKeys,
  RecordingControls,
} from '~/components/piano';
import { type MidiNote, useMidiService } from '~/utils/midi-service';
import { PIANO_KEYS, pianoAudio } from '~/utils/piano-audio';
import type { PianoNote } from '~/utils/piano-storage';

const colors = {
  dark: {
    background: '#000000',
    foreground: '#FFFFFF',
    muted: '#8E8E93',
    surface: '#1C1C1E',
  },
  light: {
    background: '#F2F2F7',
    foreground: '#000000',
    muted: '#8E8E93',
    surface: '#FFFFFF',
  },
};

export default function PianoScreen() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<PianoNote[]>([]);
  const recordingStartTime = useRef<number>(0);

  // Handle MIDI note events
  const handleMidiNoteEvent = useCallback(
    (midiNote: MidiNote) => {
      // Play audio for MIDI note on
      if (midiNote.type === 'noteOn') {
        pianoAudio.playNote(midiNote.note);
      }

      // Record MIDI notes if recording is active
      if (isRecording && midiNote.type === 'noteOff') {
        const keyInfo = PIANO_KEYS.find((k) => k.midiNumber === midiNote.note);
        if (keyInfo) {
          const note: PianoNote = {
            duration: 100, // Default duration for MIDI (we don't track note-on time here)
            midiNumber: midiNote.note,
            note: keyInfo.note,
            timestamp: midiNote.timestamp - recordingStartTime.current,
          };
          setRecordedNotes((prev) => [...prev, note]);
        }
      }
    },
    [isRecording],
  );

  // Initialize MIDI service
  const midi = useMidiService(handleMidiNoteEvent);

  // Allow all orientations when on piano screen, lock back to portrait when leaving
  useFocusEffect(
    useCallback(() => {
      // Unlock orientation when piano screen is focused
      ScreenOrientation.unlockAsync();

      return () => {
        // Lock back to portrait when leaving piano screen
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        );
      };
    }, []),
  );

  const handleStartRecording = useCallback(() => {
    setRecordedNotes([]);
    recordingStartTime.current = Date.now();
    setIsRecording(true);
  }, []);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const handleClearRecording = useCallback(() => {
    setRecordedNotes([]);
  }, []);

  const handleNotePlay = useCallback((note: PianoNote) => {
    setRecordedNotes((prev) => [...prev, note]);
  }, []);

  // Landscape layout: piano on top, compact controls below
  if (isLandscape) {
    return (
      <SafeAreaView
        edges={['left', 'right']}
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.landscapeContainer}>
          {/* Piano Keyboard - takes most of the space */}
          <View style={styles.landscapePianoSection}>
            <PianoKeys
              externalPressedKeys={midi.pressedKeys}
              isRecording={isRecording}
              onNotePlay={handleNotePlay}
            />
          </View>

          {/* Compact Recording Controls */}
          <View style={styles.landscapeControlsSection}>
            <RecordingControls
              isRecording={isRecording}
              onClearRecording={handleClearRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              recordedNotes={recordedNotes}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Portrait layout: standard vertical scroll
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.foreground }]}>
            🎹 Piano
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            Tap the keys or connect MIDI • Rotate for landscape
          </Text>
        </View>

        {/* MIDI Connection */}
        <View style={styles.midiSection}>
          <MidiConnection
            availableDevices={midi.availableDevices}
            bluetoothState={midi.bluetoothState}
            connectedDevice={midi.connectedDevice}
            isAvailable={midi.isAvailable}
            isConnected={midi.isConnected}
            isScanning={midi.isScanning}
            onConnectToDevice={midi.connectToDevice}
            onDisconnect={midi.disconnect}
            onStartScanning={midi.startScanning}
            onStopScanning={midi.stopScanning}
          />
        </View>

        {/* Piano Keyboard */}
        <View style={styles.pianoSection}>
          <PianoKeys
            externalPressedKeys={midi.pressedKeys}
            isRecording={isRecording}
            onNotePlay={handleNotePlay}
          />
        </View>

        {/* Recording Controls */}
        <View style={styles.controlsSection}>
          <RecordingControls
            isRecording={isRecording}
            onClearRecording={handleClearRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            recordedNotes={recordedNotes}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  controlsSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  landscapeContainer: {
    flex: 1,
    flexDirection: 'column',
  },
  landscapeControlsSection: {
    paddingBottom: 8,
    paddingHorizontal: 16,
  },
  landscapePianoSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  midiSection: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  pianoSection: {
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  scrollView: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
});
