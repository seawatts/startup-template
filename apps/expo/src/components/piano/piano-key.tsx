import { useCallback, useEffect, useRef } from 'react';
import {
  type GestureResponderEvent,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import {
  BLACK_KEY_HEIGHT,
  BLACK_KEY_WIDTH,
  NOTE_COLOR,
  WHITE_KEY_HEIGHT,
  WHITE_KEY_WIDTH,
} from './constants';

interface PianoKeyProps {
  midiNumber: number;
  note: string;
  isBlackKey: boolean;
  isPressed: boolean;
  isLanding?: boolean; // Note is "landing" from falling notes
  onPressIn: (midiNumber: number) => void;
  onPressOut: (midiNumber: number) => void;
  showKeyName?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function PianoKey({
  midiNumber,
  note,
  isBlackKey,
  isPressed,
  isLanding = false,
  onPressIn,
  onPressOut,
  showKeyName = false,
}: PianoKeyProps) {
  const pressedValue = useSharedValue(0);
  const landingValue = useSharedValue(0);
  const pressStartTime = useRef<number>(0);

  // Handle press animation
  useEffect(() => {
    if (isPressed) {
      pressedValue.value = withSpring(1, { damping: 15, stiffness: 300 });
    } else {
      pressedValue.value = withTiming(0, { duration: 100 });
    }
  }, [isPressed, pressedValue]);

  // Handle landing animation (note falling and hitting the key)
  useEffect(() => {
    if (isLanding) {
      landingValue.value = withSequence(
        withTiming(1, { duration: 50 }),
        withTiming(0.7, { duration: 150 }),
      );
    } else {
      landingValue.value = withTiming(0, { duration: 200 });
    }
  }, [isLanding, landingValue]);

  const handlePressIn = useCallback(
    (_event: GestureResponderEvent) => {
      pressStartTime.current = Date.now();
      onPressIn(midiNumber);
    },
    [midiNumber, onPressIn],
  );

  const handlePressOut = useCallback(
    (_event: GestureResponderEvent) => {
      onPressOut(midiNumber);
    },
    [midiNumber, onPressOut],
  );

  // White key animated style
  const whiteKeyAnimatedStyle = useAnimatedStyle(() => {
    const scale = 1 - pressedValue.value * 0.03;
    const translateY = pressedValue.value * 4;

    // Interpolate background color based on landing
    const backgroundColor = interpolateColor(
      Math.max(pressedValue.value, landingValue.value),
      [0, 1],
      ['#FFFFFF', NOTE_COLOR],
    );

    return {
      backgroundColor,
      shadowOpacity: 0.2 - pressedValue.value * 0.1,
      transform: [{ scale }, { translateY }],
    };
  });

  // Black key animated style
  const blackKeyAnimatedStyle = useAnimatedStyle(() => {
    const scale = 1 - pressedValue.value * 0.05;
    const translateY = pressedValue.value * 3;

    // Interpolate background color based on landing
    const backgroundColor = interpolateColor(
      Math.max(pressedValue.value, landingValue.value),
      [0, 1],
      ['#1C1C1E', NOTE_COLOR],
    );

    return {
      backgroundColor,
      shadowOpacity: 0.4 - pressedValue.value * 0.2,
      transform: [{ scale }, { translateY }],
    };
  });

  // Glow effect for landing notes
  const glowAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: landingValue.value * 0.6,
      transform: [{ scale: 1 + landingValue.value * 0.1 }],
    };
  });

  // Get note name without octave for display
  const displayNote = note.replace(/\d+$/, '');

  if (isBlackKey) {
    return (
      <AnimatedPressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.blackKey, blackKeyAnimatedStyle]}
      >
        {/* Glow effect overlay */}
        <Animated.View style={[styles.blackKeyGlow, glowAnimatedStyle]} />

        {showKeyName && <Text style={styles.blackKeyLabel}>{displayNote}</Text>}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.whiteKey, whiteKeyAnimatedStyle]}
    >
      {/* Glow effect overlay */}
      <Animated.View style={[styles.whiteKeyGlow, glowAnimatedStyle]} />

      {showKeyName && <Text style={styles.whiteKeyLabel}>{displayNote}</Text>}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  blackKey: {
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderColor: '#000000',
    borderWidth: 1,
    elevation: 8,
    height: BLACK_KEY_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    paddingBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    width: BLACK_KEY_WIDTH,
    zIndex: 10,
  },
  blackKeyGlow: {
    backgroundColor: NOTE_COLOR,
    borderRadius: 4,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  blackKeyLabel: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
  },
  whiteKey: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    borderColor: '#CCCCCC',
    borderWidth: 1,
    elevation: 4,
    height: WHITE_KEY_HEIGHT,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    paddingBottom: 8,
    shadowColor: '#888888',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    width: WHITE_KEY_WIDTH,
  },
  whiteKeyGlow: {
    backgroundColor: NOTE_COLOR,
    borderRadius: 6,
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  whiteKeyLabel: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    zIndex: 1,
  },
});

export { WHITE_KEY_WIDTH, WHITE_KEY_HEIGHT, BLACK_KEY_WIDTH, BLACK_KEY_HEIGHT };
