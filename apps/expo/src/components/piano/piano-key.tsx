import { useCallback, useRef } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface PianoKeyProps {
  midiNumber: number;
  note: string;
  isBlackKey: boolean;
  isPressed: boolean;
  onPressIn: (midiNumber: number) => void;
  onPressOut: (midiNumber: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Key dimensions
const WHITE_KEY_WIDTH = 48;
const WHITE_KEY_HEIGHT = 200;
const BLACK_KEY_WIDTH = 32;
const BLACK_KEY_HEIGHT = 120;

// Black key offsets relative to white keys (based on standard piano layout)
const BLACK_KEY_OFFSETS: Record<string, number> = {
  'A#': -0.35, // Between A and B
  'C#': -0.4, // Between C and D
  'D#': -0.3, // Between D and E
  'F#': -0.4, // Between F and G
  'G#': -0.35, // Between G and A
};

export function PianoKey({
  midiNumber,
  note,
  isBlackKey,
  isPressed,
  onPressIn,
  onPressOut,
}: PianoKeyProps) {
  const colorScheme = useColorScheme();
  const pressedValue = useSharedValue(0);
  const pressStartTime = useRef<number>(0);

  const handlePressIn = useCallback(
    (_event: GestureResponderEvent) => {
      pressStartTime.current = Date.now();
      pressedValue.value = withSpring(1, { damping: 15, stiffness: 300 });
      onPressIn(midiNumber);
    },
    [midiNumber, onPressIn, pressedValue],
  );

  const handlePressOut = useCallback(
    (_event: GestureResponderEvent) => {
      pressedValue.value = withTiming(0, { duration: 100 });
      onPressOut(midiNumber);
    },
    [midiNumber, onPressOut, pressedValue],
  );

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 - pressedValue.value * 0.05;
    const translateY = pressedValue.value * (isBlackKey ? 4 : 6);

    return {
      transform: [{ scale }, { translateY }],
    };
  });

  // Color variations based on theme and pressed state
  const getKeyColors = () => {
    const isDark = colorScheme === 'dark';

    if (isBlackKey) {
      return {
        background: isPressed
          ? isDark
            ? '#4A4A4A'
            : '#333333'
          : isDark
            ? '#1A1A1A'
            : '#1C1C1E',
        border: isDark ? '#333333' : '#000000',
        shadow: isDark ? '#000000' : '#000000',
      };
    }

    return {
      background: isPressed
        ? isDark
          ? '#B8B8B8'
          : '#E5E5E5'
        : isDark
          ? '#F5F5F5'
          : '#FFFFFF',
      border: isDark ? '#404040' : '#CCCCCC',
      shadow: isDark ? '#000000' : '#888888',
    };
  };

  const colors = getKeyColors();

  // Get the note name without octave for black key offset
  const noteName = note.replace(/\d+$/, '');

  const keyStyle = isBlackKey
    ? [
        styles.blackKey,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          left: BLACK_KEY_OFFSETS[noteName]
            ? WHITE_KEY_WIDTH + WHITE_KEY_WIDTH * BLACK_KEY_OFFSETS[noteName]
            : 0,
          shadowColor: colors.shadow,
        },
      ]
    : [
        styles.whiteKey,
        {
          backgroundColor: colors.background,
          borderColor: colors.border,
          shadowColor: colors.shadow,
        },
      ];

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[keyStyle, animatedStyle]}
    >
      {/* Optional: Add note label for debugging */}
      {/* <Text style={isBlackKey ? styles.blackKeyLabel : styles.whiteKeyLabel}>
        {note}
      </Text> */}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  blackKey: {
    backgroundColor: '#1C1C1E',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderWidth: 1,
    elevation: 8,
    height: BLACK_KEY_HEIGHT,
    position: 'absolute',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    top: 0,
    width: BLACK_KEY_WIDTH,
    zIndex: 10,
  },
  blackKeyLabel: {
    bottom: 8,
    color: '#FFFFFF',
    fontSize: 8,
    position: 'absolute',
    textAlign: 'center',
    width: '100%',
  },
  whiteKey: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderColor: '#CCCCCC',
    borderWidth: 1,
    elevation: 4,
    height: WHITE_KEY_HEIGHT,
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: WHITE_KEY_WIDTH,
  },
  whiteKeyLabel: {
    bottom: 8,
    color: '#333333',
    fontSize: 10,
    position: 'absolute',
    textAlign: 'center',
    width: '100%',
  },
});

export { WHITE_KEY_WIDTH, WHITE_KEY_HEIGHT, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT };
