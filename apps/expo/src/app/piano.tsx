import { useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PianoKeys, RecordingControls } from '~/components/piano';
import {
  type MidiControlChange,
  type MidiNote,
  useMidiService,
} from '~/utils/midi-service';
import { PIANO_KEYS, pianoAudio } from '~/utils/piano-audio';
import { getShowKeyNames } from '~/utils/piano-settings';
import type { PianoNote, SustainEvent } from '~/utils/piano-storage';
import {
  type UsbMidiControlChange,
  type UsbMidiNote,
  useUsbMidi,
} from '~/utils/usb-midi-service';

const colors = {
  dark: {
    background: '#09090B',
    border: '#27272A',
    destructive: '#DC2626',
    foreground: '#FAFAFA',
    muted: '#27272A',
    mutedForeground: '#A1A1AA',
  },
  light: {
    background: '#FFFFFF',
    border: '#E5E5E5',
    destructive: '#EF4444',
    foreground: '#0A0A0A',
    muted: '#F5F5F5',
    mutedForeground: '#737373',
  },
};

export default function PianoScreen() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const [isRecording, setIsRecording] = useState(false);
  const [recordedNotes, setRecordedNotes] = useState<PianoNote[]>([]);
  const [sustainEvents, setSustainEvents] = useState<SustainEvent[]>([]);
  const [showKeyNames, setShowKeyNames] = useState(false);
  const [activeNotes, setActiveNotes] = useState<Map<number, number>>(
    new Map(),
  );

  // Load show key names setting on mount and when screen is focused
  useFocusEffect(
    useCallback(() => {
      getShowKeyNames().then(setShowKeyNames);
    }, []),
  );
  const recordingStartTime = useRef<number>(0);

  // Track note-on times for accurate duration calculation
  const noteOnTimes = useRef<Map<number, number>>(new Map());
  // Track sustain pedal state
  const sustainActive = useRef<boolean>(false);

  // Handle BLE MIDI control change (sustain pedal)
  const handleBleMidiControlChange = useCallback(
    (cc: MidiControlChange) => {
      // CC 64 is sustain pedal
      if (cc.ccNumber === 64) {
        const isActive = cc.value >= 64; // 0-63 = off, 64-127 = on
        sustainActive.current = isActive;

        if (isRecording) {
          const sustainEvent: SustainEvent = {
            isActive,
            timestamp: cc.timestamp - recordingStartTime.current,
          };
          setSustainEvents((prev) => [...prev, sustainEvent]);
        }
      }
    },
    [isRecording],
  );

  // Handle BLE MIDI note events
  const handleBleMidiNoteEvent = useCallback(
    (midiNote: MidiNote) => {
      const currentTime = Date.now();

      // Play audio for MIDI note on
      if (midiNote.type === 'noteOn') {
        pianoAudio.playNote(midiNote.note);

        // Track note-on time for recording
        if (isRecording) {
          noteOnTimes.current.set(midiNote.note, currentTime);
          setActiveNotes((prev) => {
            const newMap = new Map(prev);
            newMap.set(midiNote.note, currentTime - recordingStartTime.current);
            return newMap;
          });
        }
      } else if (midiNote.type === 'noteOff' && isRecording) {
        // Record MIDI notes if recording is active
        const noteOnTime = noteOnTimes.current.get(midiNote.note);
        const keyInfo = PIANO_KEYS.find((k) => k.midiNumber === midiNote.note);

        if (keyInfo && noteOnTime !== undefined) {
          const duration = currentTime - noteOnTime;
          const note: PianoNote = {
            duration,
            midiNumber: midiNote.note,
            note: keyInfo.note,
            noteOffTime: currentTime,
            noteOnTime,
            sustainActive: sustainActive.current,
            timestamp: noteOnTime - recordingStartTime.current,
          };
          setRecordedNotes((prev) => [...prev, note]);
          noteOnTimes.current.delete(midiNote.note);
          setActiveNotes((prev) => {
            const newMap = new Map(prev);
            newMap.delete(midiNote.note);
            return newMap;
          });
        }
      }
    },
    [isRecording],
  );

  // Handle USB MIDI control change (sustain pedal)
  const handleUsbMidiControlChange = useCallback(
    (cc: UsbMidiControlChange) => {
      // CC 64 is sustain pedal
      if (cc.ccNumber === 64) {
        const isActive = cc.value >= 64; // 0-63 = off, 64-127 = on
        sustainActive.current = isActive;

        if (isRecording) {
          const sustainEvent: SustainEvent = {
            isActive,
            timestamp: cc.timestamp - recordingStartTime.current,
          };
          setSustainEvents((prev) => [...prev, sustainEvent]);
        }
      }
    },
    [isRecording],
  );

  // Handle USB MIDI note events
  const handleUsbMidiNoteEvent = useCallback(
    (midiNote: UsbMidiNote) => {
      const currentTime = Date.now();

      // Play audio for MIDI note on
      if (midiNote.type === 'noteOn') {
        pianoAudio.playNote(midiNote.note);

        // Track note-on time for recording
        if (isRecording) {
          noteOnTimes.current.set(midiNote.note, currentTime);
          setActiveNotes((prev) => {
            const newMap = new Map(prev);
            newMap.set(midiNote.note, currentTime - recordingStartTime.current);
            return newMap;
          });
        }
      } else if (midiNote.type === 'noteOff' && isRecording) {
        // Record MIDI notes if recording is active
        const noteOnTime = noteOnTimes.current.get(midiNote.note);
        const keyInfo = PIANO_KEYS.find((k) => k.midiNumber === midiNote.note);

        if (keyInfo && noteOnTime !== undefined) {
          const duration = currentTime - noteOnTime;
          const note: PianoNote = {
            duration,
            midiNumber: midiNote.note,
            note: keyInfo.note,
            noteOffTime: currentTime,
            noteOnTime,
            sustainActive: sustainActive.current,
            timestamp: noteOnTime - recordingStartTime.current,
          };
          setRecordedNotes((prev) => [...prev, note]);
          noteOnTimes.current.delete(midiNote.note);
          setActiveNotes((prev) => {
            const newMap = new Map(prev);
            newMap.delete(midiNote.note);
            return newMap;
          });
        }
      }
    },
    [isRecording],
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

  // Helper function to score devices - higher score = better (actual MIDI device vs Mac connection)
  const scoreDevice = useCallback(
    (device: { name: string; manufacturer: string; model: string }) => {
      let score = 0;

      // Known manufacturer (not "Unknown") is a strong indicator of a real MIDI device
      if (device.manufacturer?.trim() && device.manufacturer !== 'Unknown') {
        score += 100;
      }

      // Non-empty model name indicates a real device
      if (device.model?.trim()) {
        score += 50;
      }

      // Generic session names (like "Session 1", "Session 2") suggest Mac connection
      if (device.name && /^Session \d+$/i.test(device.name.trim())) {
        score -= 200; // Heavy penalty for session names
      }

      // Unknown manufacturer with empty model strongly suggests Mac connection
      if (
        device.manufacturer === 'Unknown' &&
        (!device.model || !device.model.trim())
      ) {
        score -= 150;
      }

      return score;
    },
    [],
  );

  // Determine connected device (USB MIDI takes priority)
  // Filter out Mac connections and prioritize actual MIDI devices
  const connectedDeviceInfo = useMemo(() => {
    const hasUsbDevice = usbMidi.connectedDevices.length > 0;
    const hasBleDevice =
      bleMidi.isConnected && bleMidi.connectedDevice !== null;

    if (hasUsbDevice) {
      // Filter and sort devices by score - pick the best one
      const scoredDevices = usbMidi.connectedDevices
        .map((device) => ({
          device,
          score: scoreDevice(device),
        }))
        .sort((a, b) => b.score - a.score); // Sort descending (best first)

      // Get the highest scoring device (most likely the actual MIDI keyboard)
      const bestDevice = scoredDevices[0]?.device;

      if (bestDevice) {
        // Prefer device name, fall back to manufacturer, then model
        const displayName =
          bestDevice.name?.trim() && bestDevice.name !== 'Unknown'
            ? bestDevice.name
            : bestDevice.manufacturer?.trim() &&
                bestDevice.manufacturer !== 'Unknown'
              ? bestDevice.manufacturer
              : bestDevice.model?.trim() && bestDevice.model !== 'Unknown'
                ? bestDevice.model
                : 'USB MIDI Device';
        return {
          name: displayName,
          type: 'USB' as const,
        };
      }
    }

    if (hasBleDevice && bleMidi.connectedDevice) {
      return {
        name: bleMidi.connectedDevice.name,
        type: 'Bluetooth' as const,
      };
    }

    return null;
  }, [
    usbMidi.connectedDevices,
    scoreDevice,
    bleMidi.isConnected,
    bleMidi.connectedDevice,
  ]);

  const hasConnectedDevice = connectedDeviceInfo !== null;

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
    setSustainEvents([]);
    noteOnTimes.current.clear();
    setActiveNotes(new Map());
    sustainActive.current = false;
    recordingStartTime.current = Date.now();
    setIsRecording(true);
  }, []);

  const handleStopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const handleClearRecording = useCallback(() => {
    setRecordedNotes([]);
    setSustainEvents([]);
    noteOnTimes.current.clear();
    setActiveNotes(new Map());
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
              externalPressedKeys={combinedPressedKeys}
              isRecording={isRecording}
              onNotePlay={handleNotePlay}
              showKeyNames={showKeyNames}
            />
          </View>

          {/* Compact Recording Controls */}
          <View style={styles.landscapeControlsSection}>
            <RecordingControls
              activeNotes={activeNotes}
              isRecording={isRecording}
              onClearRecording={handleClearRecording}
              onStartRecording={handleStartRecording}
              onStopRecording={handleStopRecording}
              recordedNotes={recordedNotes}
              sustainEvents={sustainEvents}
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
        {/* Connected Device Indicator */}
        <View style={styles.topSection}>
          <View
            style={[
              styles.connectedDeviceIndicator,
              !hasConnectedDevice && styles.hidden,
            ]}
          >
            {connectedDeviceInfo && (
              <>
                <View
                  style={[styles.statusDot, { backgroundColor: '#30D158' }]}
                />
                <Text
                  style={[
                    styles.connectedDeviceName,
                    { color: theme.mutedForeground },
                  ]}
                >
                  {connectedDeviceInfo.name}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Piano Keyboard */}
        <View style={styles.pianoSection}>
          <PianoKeys
            externalPressedKeys={combinedPressedKeys}
            isRecording={isRecording}
            onNotePlay={handleNotePlay}
            showKeyNames={showKeyNames}
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
            sustainEvents={sustainEvents}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  connectedDeviceIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  connectedDeviceName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  controlsSection: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  hidden: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
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
  pianoSection: {
    paddingBottom: 16,
    paddingHorizontal: 8,
    paddingTop: 24,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  scrollView: {
    flex: 1,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  topSection: {
    minHeight: 1, // Prevent layout shift
  },
});
