import { useEffect, useMemo, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';

const AnimatedLine = Animated.createAnimatedComponent(Line);

import { isBlackKey, PIANO_KEYS } from '~/utils/piano-audio';
import type { PianoNote } from '~/utils/piano-storage';

interface PianoRollTimelineProps {
  notes: PianoNote[];
  isRecording: boolean;
  currentTime?: number; // Current recording time in ms (for real-time updates)
  activeNotes?: Map<number, number>; // Map of midiNumber -> timestamp when note started (for live visualization)
}

const KEY_WIDTH = 30; // Width of each key column in the timeline
const MIN_NOTE_HEIGHT = 4; // Minimum height for very short notes
const PIXELS_PER_SECOND = 100; // Scale: 100px per second

export function PianoRollTimeline({
  notes,
  isRecording,
  currentTime = 0,
  activeNotes = new Map(),
}: PianoRollTimelineProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { height: screenHeight } = useWindowDimensions();

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (notes.length === 0) {
      return Math.max(5000, currentTime || 5000); // Default 5 seconds or current time
    }
    const lastNote = notes.reduce((latest, note) => {
      const noteEnd = note.timestamp + note.duration;
      const latestEnd = latest.timestamp + latest.duration;
      return noteEnd > latestEnd ? note : latest;
    });
    const maxTime = lastNote.timestamp + lastNote.duration;
    return Math.max(maxTime, currentTime || maxTime);
  }, [notes, currentTime]);

  // Calculate timeline height (vertical)
  const timelineHeight = useMemo(() => {
    const calculatedHeight = (totalDuration / 1000) * PIXELS_PER_SECOND;
    return Math.max(calculatedHeight, 400); // Minimum height
  }, [totalDuration]);

  // Get visible key range (only show keys that have notes or are in a reasonable range)
  const visibleKeys = useMemo(() => {
    if (notes.length === 0) {
      // Show a default range (C4 to C6)
      return PIANO_KEYS.filter(
        (key) => key.midiNumber >= 60 && key.midiNumber <= 84,
      );
    }

    // Get all MIDI numbers from notes
    const midiNumbers = new Set(notes.map((note) => note.midiNumber));

    // Include a few keys above and below for context
    const minMidi = Math.min(...Array.from(midiNumbers));
    const maxMidi = Math.max(...Array.from(midiNumbers));

    return PIANO_KEYS.filter(
      (key) =>
        key.midiNumber >= Math.max(21, minMidi - 5) &&
        key.midiNumber <= Math.min(108, maxMidi + 5),
    );
  }, [notes]);

  // Sort keys from low to high (left to right)
  const sortedKeys = useMemo(() => {
    return [...visibleKeys].sort((a, b) => a.midiNumber - b.midiNumber);
  }, [visibleKeys]);

  // Create a map of MIDI number to index for quick lookup
  const midiToIndex = useMemo(() => {
    const map = new Map<number, number>();
    sortedKeys.forEach((key, index) => {
      map.set(key.midiNumber, index);
    });
    return map;
  }, [sortedKeys]);

  const theme = useMemo(
    () => ({
      background: isDark ? '#1C1C1E' : '#FFFFFF',
      blackKeyBackground: isDark ? '#1C1C1E' : '#E5E5E5',
      border: isDark ? '#2C2C2E' : '#E5E5E5',
      keyBackground: isDark ? '#2C2C2E' : '#F5F5F5',
      keyBorder: isDark ? '#3A3A3C' : '#E5E5E5',
      mutedText: isDark ? '#A1A1AA' : '#737373',
      noteColor: isDark ? '#EF4444' : '#DC2626',
      noteColorLight: isDark ? '#EF444480' : '#DC262680',
      playhead: isDark ? '#0A84FF' : '#007AFF',
      text: isDark ? '#FAFAFA' : '#0A0A0A',
      whiteKeyBackground: isDark ? '#2C2C2E' : '#FFFFFF',
    }),
    [isDark],
  );

  // Refs for scroll views
  const timelineScrollRef = useRef<ScrollView>(null);
  const headerScrollRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);

  // Animated playhead position using Reanimated
  const playheadY = useSharedValue(0);

  // Update playhead position
  useEffect(() => {
    if (isRecording && currentTime && currentTime > 0 && totalDuration > 0) {
      playheadY.value = (currentTime / totalDuration) * timelineHeight;
    } else {
      playheadY.value = 0;
    }
  }, [currentTime, totalDuration, timelineHeight, isRecording, playheadY]);

  // Animated props for playhead
  const playheadAnimatedProps = useAnimatedProps(() => {
    'worklet';
    return {
      y1: playheadY.value,
      y2: playheadY.value,
    };
  });

  // Sync header scroll with timeline scroll (vertical) - optimized
  const handleTimelineScroll = (event: {
    nativeEvent: { contentOffset: { y: number } };
  }) => {
    const y = event.nativeEvent.contentOffset.y;
    if (!isScrollingRef.current && headerScrollRef.current) {
      isScrollingRef.current = true;
      headerScrollRef.current.scrollTo({
        animated: false,
        y,
      });
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    }
  };

  // Track when user starts scrolling
  const handleTimelineScrollBeginDrag = () => {
    // No-op - always auto-scroll
  };

  // Track when user stops scrolling
  const handleTimelineScrollEndDrag = () => {
    // No-op - always auto-scroll
  };

  // Sync timeline scroll with header scroll - optimized
  const handleHeaderScroll = (event: {
    nativeEvent: { contentOffset: { y: number } };
  }) => {
    const y = event.nativeEvent.contentOffset.y;
    if (!isScrollingRef.current && timelineScrollRef.current) {
      isScrollingRef.current = true;
      timelineScrollRef.current.scrollTo({
        animated: false,
        y,
      });
      requestAnimationFrame(() => {
        isScrollingRef.current = false;
      });
    }
  };

  // Auto-scroll logic - always follow live position
  useEffect(() => {
    if (!isRecording || !currentTime || currentTime <= 0) {
      return;
    }

    const position = (currentTime / totalDuration) * timelineHeight;
    const scrollPosition = Math.max(0, position - screenHeight + 200);

    if (timelineScrollRef.current && headerScrollRef.current) {
      timelineScrollRef.current.scrollTo({
        animated: false, // Use false for smoother performance
        y: scrollPosition,
      });
      headerScrollRef.current.scrollTo({
        animated: false,
        y: scrollPosition,
      });
    }
  }, [currentTime, totalDuration, timelineHeight, isRecording, screenHeight]);

  // Scroll to end when recording stops (only once)
  useEffect(() => {
    if (
      !isRecording &&
      notes.length > 0 &&
      timelineHeight > screenHeight - 100
    ) {
      const maxScroll = Math.max(0, timelineHeight - (screenHeight - 100));
      requestAnimationFrame(() => {
        timelineScrollRef.current?.scrollTo({
          animated: false,
          y: maxScroll,
        });
        headerScrollRef.current?.scrollTo({
          animated: false,
          y: maxScroll,
        });
      });
    }
  }, [isRecording, notes.length, timelineHeight, screenHeight]);

  // Prepare note data for SVG rendering
  const noteRects = useMemo(() => {
    return notes
      .map((note) => {
        const keyIndex = midiToIndex.get(note.midiNumber);
        if (keyIndex === undefined) return null;

        const top = (note.timestamp / totalDuration) * timelineHeight;
        const height = Math.max(
          (note.duration / totalDuration) * timelineHeight,
          MIN_NOTE_HEIGHT,
        );
        const left = keyIndex * KEY_WIDTH;
        const isBlack = isBlackKey(note.midiNumber);

        return {
          fill: isBlack ? theme.noteColorLight : theme.noteColor,
          height,
          key: `${note.midiNumber}-${note.timestamp}-${note.duration}`,
          stroke: theme.noteColor,
          strokeWidth: isBlack ? 0 : 1,
          width: KEY_WIDTH - 2,
          x: left + 1,
          y: top,
        };
      })
      .filter((rect) => rect !== null);
  }, [notes, midiToIndex, totalDuration, timelineHeight, theme]);

  // Prepare active notes for SVG rendering
  const activeNoteRects = useMemo(() => {
    if (!isRecording || !currentTime || activeNotes.size === 0) return [];

    return Array.from(activeNotes.entries())
      .map(([midiNumber, startTimestamp]) => {
        const keyIndex = midiToIndex.get(midiNumber);
        if (keyIndex === undefined) return null;

        const top = (startTimestamp / totalDuration) * timelineHeight;
        const currentPosition = (currentTime / totalDuration) * timelineHeight;
        const height = Math.max(currentPosition - top, MIN_NOTE_HEIGHT);
        const left = keyIndex * KEY_WIDTH;
        const isBlack = isBlackKey(midiNumber);

        return {
          fill: isBlack ? theme.noteColorLight : theme.noteColor,
          height,
          key: `active-${midiNumber}-${startTimestamp}`,
          opacity: 0.8,
          stroke: theme.noteColor,
          strokeWidth: isBlack ? 0 : 1,
          width: KEY_WIDTH - 2,
          x: left + 1,
          y: top,
        };
      })
      .filter((rect) => rect !== null);
  }, [
    activeNotes,
    isRecording,
    currentTime,
    totalDuration,
    timelineHeight,
    midiToIndex,
    theme,
  ]);

  const canvasWidth = sortedKeys.length * KEY_WIDTH;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Keys row (fixed/sticky on top) */}
      <View
        style={[
          styles.keysRow,
          {
            backgroundColor: theme.keyBackground,
            borderBottomColor: theme.border,
          },
        ]}
      >
        {sortedKeys.map((key) => {
          const isBlack = key.isBlackKey;
          return (
            <View
              key={key.midiNumber}
              style={[
                styles.keyColumn,
                {
                  backgroundColor: isBlack
                    ? theme.blackKeyBackground
                    : theme.whiteKeyBackground,
                  borderRightColor: theme.keyBorder,
                  width: KEY_WIDTH,
                },
              ]}
            >
              <Text
                style={[
                  styles.keyLabel,
                  {
                    color: isBlack ? theme.mutedText : theme.text,
                    fontSize: isBlack ? 9 : 10,
                  },
                ]}
              >
                {key.note}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Piano roll content - time markers and timeline */}
      <View style={styles.pianoRollContainer}>
        {/* Time markers header (scrollable vertically) */}
        <View
          style={[
            styles.timeMarkersContainer,
            { borderRightColor: theme.border },
          ]}
        >
          <ScrollView
            onScroll={handleHeaderScroll}
            ref={headerScrollRef}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            style={styles.headerScroll}
          >
            <View style={[styles.timeMarkers, { height: timelineHeight }]}>
              {Array.from({ length: Math.ceil(totalDuration / 1000) + 1 }).map(
                (_, i) => {
                  const time = i;
                  const position = (time * 1000) / totalDuration;
                  const top = position * timelineHeight;

                  return (
                    <View
                      key={`time-${time}`}
                      style={[
                        styles.timeMarker,
                        { borderTopColor: theme.border, top },
                      ]}
                    >
                      <Text
                        style={[styles.timeLabel, { color: theme.mutedText }]}
                      >
                        {time}s
                      </Text>
                    </View>
                  );
                },
              )}
            </View>
          </ScrollView>
        </View>

        {/* Timeline area with SVG (scrollable vertically) */}
        <ScrollView
          onScroll={handleTimelineScroll}
          onScrollBeginDrag={handleTimelineScrollBeginDrag}
          onScrollEndDrag={handleTimelineScrollEndDrag}
          ref={timelineScrollRef}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={true}
          style={styles.timelineScrollView}
        >
          <Svg
            height={timelineHeight}
            style={styles.svgContainer}
            width={canvasWidth}
          >
            {/* Render note bars */}
            {noteRects.map((rect) => (
              <Rect
                fill={rect.fill}
                height={rect.height}
                key={rect.key}
                rx={2}
                stroke={rect.stroke}
                strokeWidth={rect.strokeWidth}
                width={rect.width}
                x={rect.x}
                y={rect.y}
              />
            ))}

            {/* Render active notes (currently being pressed) */}
            {activeNoteRects.map((rect) => (
              <Rect
                fill={rect.fill}
                height={rect.height}
                key={rect.key}
                opacity={rect.opacity}
                rx={2}
                stroke={rect.stroke}
                strokeWidth={rect.strokeWidth}
                width={rect.width}
                x={rect.x}
                y={rect.y}
              />
            ))}

            {/* Playhead indicator (when recording) - horizontal line */}
            {isRecording && (
              <AnimatedLine
                animatedProps={playheadAnimatedProps}
                stroke={theme.playhead}
                strokeWidth={2}
                x1={0}
                x2={canvasWidth}
              />
            )}
          </Svg>
        </ScrollView>
      </View>

      {/* Footer with info */}
      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <Text style={[styles.footerText, { color: theme.mutedText }]}>
          {notes.length} notes • {Math.round(totalDuration / 1000)}s
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  footer: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  headerScroll: {
    flex: 1,
    maxWidth: 50,
  },
  keyColumn: {
    alignItems: 'center',
    borderRightWidth: 0.5,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  keyLabel: {
    fontWeight: '500',
    textAlign: 'center',
  },
  keysRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    paddingVertical: 8,
  },
  pianoRollContainer: {
    flexDirection: 'row',
    maxHeight: 400,
  },
  svgContainer: {
    backgroundColor: 'transparent',
  },
  timeLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
  },
  timelineScrollView: {
    flex: 1,
  },
  timeMarker: {
    borderTopWidth: 1,
    left: 0,
    paddingTop: 4,
    position: 'absolute',
  },
  timeMarkers: {
    position: 'relative',
    width: 50,
  },
  timeMarkersContainer: {
    borderRightWidth: 1,
    maxWidth: 50,
    width: 50,
  },
});
