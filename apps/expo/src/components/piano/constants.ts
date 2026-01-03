// Shared constants for piano components
// These ensure pixel-perfect alignment between falling notes and keyboard

// Key dimensions
export const WHITE_KEY_WIDTH = 48;
export const WHITE_KEY_HEIGHT = 200;
export const BLACK_KEY_WIDTH = 32;
export const BLACK_KEY_HEIGHT = 120;

// Gap between white keys
export const KEY_GAP = 2;

// Timing and animation
export const PIXELS_PER_SECOND = 150; // How fast notes fall/rise
export const HIT_LINE_OFFSET = 20; // Distance from keyboard top to hit line

// Note appearance
export const NOTE_COLOR = '#4ADE80'; // Green for all notes
export const NOTE_COLOR_ACTIVE = '#22C55E'; // Slightly darker when playing
export const NOTE_BORDER_RADIUS = 4;
export const MIN_NOTE_HEIGHT = 8; // Minimum height for very short notes

// Grid appearance
export const GRID_BACKGROUND = '#2D2D2D';
export const GRID_LINE_COLOR = '#3A3A3A';
export const HIT_LINE_COLOR = '#FFFFFF';

// Controls bar
export const CONTROLS_BAR_HEIGHT = 56;

// MIDI note range for standard 88-key piano
export const MIDI_MIN = 21; // A0
export const MIDI_MAX = 108; // C8

// Black key offsets relative to white keys (based on standard piano layout)
export const BLACK_KEY_OFFSETS: Record<string, number> = {
  'A#': -0.35, // Between A and B
  'C#': -0.4, // Between C and D
  'D#': -0.3, // Between D and E
  'F#': -0.4, // Between F and G
  'G#': -0.35, // Between G and A
};

// Calculate the X position for a given MIDI note number
export function getMidiNoteXPosition(
  midiNumber: number,
  whiteKeyIndices: Map<number, number>,
  isBlackKey: boolean,
  noteName: string,
): number {
  if (isBlackKey) {
    // Black key is positioned relative to the white key before it
    const whiteKeyBefore = midiNumber - 1;
    const whiteIndex = whiteKeyIndices.get(whiteKeyBefore);
    if (whiteIndex !== undefined) {
      const offset = BLACK_KEY_OFFSETS[noteName] ?? 0.65;
      return (
        whiteIndex * (WHITE_KEY_WIDTH + KEY_GAP) + WHITE_KEY_WIDTH * offset
      );
    }
    return 0;
  }

  // White key position
  const whiteIndex = whiteKeyIndices.get(midiNumber);
  if (whiteIndex !== undefined) {
    return whiteIndex * (WHITE_KEY_WIDTH + KEY_GAP);
  }
  return 0;
}

// Get note width based on whether it's black or white key
export function getNoteWidth(isBlackKey: boolean): number {
  return isBlackKey ? BLACK_KEY_WIDTH : WHITE_KEY_WIDTH;
}
