import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useColorScheme, View } from 'react-native';

import { PIANO_KEYS, pianoAudio } from '~/utils/piano-audio';
import type { PianoNote } from '~/utils/piano-storage';

import { PianoKey, WHITE_KEY_WIDTH } from './piano-key';

interface PianoKeysProps {
  isRecording: boolean;
  onNotePlay?: (note: PianoNote) => void;
  externalPressedKeys?: Set<number>; // Keys pressed from MIDI input
}

export function PianoKeys({
  isRecording,
  onNotePlay,
  externalPressedKeys,
}: PianoKeysProps) {
  const colorScheme = useColorScheme();
  const [touchPressedKeys, setTouchPressedKeys] = useState<Set<number>>(
    new Set(),
  );
  const noteStartTimes = useRef<Map<number, number>>(new Map());
  const recordingStartTime = useRef<number>(0);

  // Combine touch and external (MIDI) pressed keys
  const pressedKeys = useMemo(() => {
    const combined = new Set(touchPressedKeys);
    if (externalPressedKeys) {
      for (const key of externalPressedKeys) {
        combined.add(key);
      }
    }
    return combined;
  }, [touchPressedKeys, externalPressedKeys]);

  // Initialize audio on mount
  useEffect(() => {
    pianoAudio.initialize();
    return () => {
      pianoAudio.cleanup();
    };
  }, []);

  // Track recording start time
  useEffect(() => {
    if (isRecording) {
      recordingStartTime.current = Date.now();
    }
  }, [isRecording]);

  // Separate white and black keys for proper layering
  const { whiteKeys, blackKeys } = useMemo(() => {
    const white = PIANO_KEYS.filter((key) => !key.isBlackKey);
    const black = PIANO_KEYS.filter((key) => key.isBlackKey);
    return { blackKeys: black, whiteKeys: white };
  }, []);

  // Create a mapping of white key index for positioning black keys
  const whiteKeyIndices = useMemo(() => {
    const indices = new Map<number, number>();
    whiteKeys.forEach((key, index) => {
      indices.set(key.midiNumber, index);
    });
    return indices;
  }, [whiteKeys]);

  // Find the white key before a black key for positioning
  const getBlackKeyPosition = useCallback(
    (blackKeyMidi: number): number => {
      // Black key is positioned relative to the white key before it
      const whiteKeyBefore = blackKeyMidi - 1;
      const whiteIndex = whiteKeyIndices.get(whiteKeyBefore);

      if (whiteIndex !== undefined) {
        // Position at the right edge of the white key before
        return whiteIndex * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH * 0.65;
      }

      return 0;
    },
    [whiteKeyIndices],
  );

  const handlePressIn = useCallback((midiNumber: number) => {
    setTouchPressedKeys((prev) => new Set(prev).add(midiNumber));

    // Play the note
    pianoAudio.playNote(midiNumber);

    // Track note start time for recording
    noteStartTimes.current.set(midiNumber, Date.now());
  }, []);

  const handlePressOut = useCallback(
    (midiNumber: number) => {
      setTouchPressedKeys((prev) => {
        const next = new Set(prev);
        next.delete(midiNumber);
        return next;
      });

      // Stop the note
      pianoAudio.stopNote(midiNumber);

      // Record the note if recording is active
      if (isRecording && onNotePlay) {
        const startTime = noteStartTimes.current.get(midiNumber);
        if (startTime) {
          const keyInfo = PIANO_KEYS.find((k) => k.midiNumber === midiNumber);
          if (keyInfo) {
            const note: PianoNote = {
              duration: Date.now() - startTime,
              midiNumber,
              note: keyInfo.note,
              timestamp: startTime - recordingStartTime.current,
            };
            onNotePlay(note);
          }
          noteStartTimes.current.delete(midiNumber);
        }
      }
    },
    [isRecording, onNotePlay],
  );

  const isDark = colorScheme === 'dark';

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        <View style={styles.keysContainer}>
          {/* White keys layer */}
          <View style={styles.whiteKeysRow}>
            {whiteKeys.map((key) => (
              <PianoKey
                isBlackKey={false}
                isPressed={pressedKeys.has(key.midiNumber)}
                key={key.midiNumber}
                midiNumber={key.midiNumber}
                note={key.note}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              />
            ))}
          </View>

          {/* Black keys layer (absolute positioned) */}
          {blackKeys.map((key) => (
            <View
              key={key.midiNumber}
              style={[
                styles.blackKeyWrapper,
                { left: getBlackKeyPosition(key.midiNumber) },
              ]}
            >
              <PianoKey
                isBlackKey={true}
                isPressed={pressedKeys.has(key.midiNumber)}
                midiNumber={key.midiNumber}
                note={key.note}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  blackKeyWrapper: {
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  container: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    overflow: 'hidden',
    padding: 8,
  },
  containerDark: {
    backgroundColor: '#1C1C1E',
  },
  keysContainer: {
    flexDirection: 'row',
    position: 'relative',
  },
  scrollContent: {
    paddingHorizontal: 4,
  },
  scrollView: {
    flexGrow: 0,
  },
  whiteKeysRow: {
    flexDirection: 'row',
    gap: 2,
  },
});
