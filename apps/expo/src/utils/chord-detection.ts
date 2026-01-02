// Chord detection utility
// Analyzes pressed MIDI notes to determine chord names

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
];

// Convert MIDI note number to note name (without octave)
function midiToNoteName(midiNumber: number): string {
  const noteIndex = (midiNumber - 12) % 12;
  return NOTE_NAMES[noteIndex] ?? 'C';
}

// Get the pitch class (0-11) from MIDI number
function midiToPitchClass(midiNumber: number): number {
  return (midiNumber - 12) % 12;
}

// Normalize notes to a single octave (0-11) and sort
function normalizeNotes(midiNumbers: number[]): number[] {
  const pitchClasses = midiNumbers.map(midiToPitchClass);
  return [...new Set(pitchClasses)].sort((a, b) => a - b);
}

// Calculate intervals between notes
function getIntervals(notes: number[]): number[] {
  if (notes.length < 2) return [];
  const intervals: number[] = [];
  for (let i = 1; i < notes.length; i++) {
    const current = notes[i];
    const previous = notes[i - 1];
    if (current !== undefined && previous !== undefined) {
      intervals.push((current - previous + 12) % 12);
    }
  }
  return intervals;
}

// Match intervals to chord patterns
function detectChordFromIntervals(
  intervals: number[],
  rootNote: number,
): string | null {
  const intervalString = intervals.join(',');
  const rootName = NOTE_NAMES[rootNote] ?? 'C';

  // Common chord patterns (intervals in semitones from root)
  const chordPatterns: Record<string, string> = {
    '3,3': '°', // Diminished: root, minor third (3), diminished fifth (6)
    '3,3,3': '°7', // Diminished 7th: root, m3, d5, d7
    '3,3,4': 'm7b5', // Half-diminished 7th: root, m3, d5, m7
    '3,4': 'm', // Minor triad: root, minor third (3), perfect fifth (7)
    '3,4,3': 'm7', // Minor 7th: root, m3, P5, m7
    '3,4,3,4': 'm9', // Minor 9th
    '4,3': '', // Major triad: root, major third (4), perfect fifth (7)
    '4,3,3': '7', // Dominant 7th: root, M3, P5, m7
    '4,3,3,4': '9', // Dominant 9th
    '4,3,4': 'maj7', // Major 7th: root, M3, P5, M7
    '4,3,4,3': 'maj9', // Major 9th
    '4,4': '+', // Augmented: root, major third (4), augmented fifth (8)
  };

  const chordSuffix = chordPatterns[intervalString];
  if (chordSuffix !== undefined) {
    return `${rootName}${chordSuffix}`;
  }

  return null;
}

// Try different roots to find the best chord match
function findBestChordMatch(normalizedNotes: number[]): string | null {
  if (normalizedNotes.length < 2) return null;

  // Try each note as the root
  for (let rootOffset = 0; rootOffset < normalizedNotes.length; rootOffset++) {
    const root = normalizedNotes[rootOffset];
    if (root === undefined) continue;
    const rotatedNotes = [
      ...normalizedNotes.slice(rootOffset),
      ...normalizedNotes.slice(0, rootOffset).map((n) => n + 12),
    ];
    const intervals = getIntervals(rotatedNotes);
    const chord = detectChordFromIntervals(intervals, root);
    if (chord) {
      return chord;
    }
  }

  return null;
}

// Main chord detection function
export function detectChord(pressedKeys: Set<number>): string | null {
  if (pressedKeys.size === 0) return null;
  if (pressedKeys.size === 1) {
    // Single note - just show the note name
    const midiNumber = Array.from(pressedKeys)[0];
    if (midiNumber === undefined) return null;
    return midiToNoteName(midiNumber);
  }

  const midiNumbers = Array.from(pressedKeys);
  const normalizedNotes = normalizeNotes(midiNumbers);

  // Try to detect chord
  const chord = findBestChordMatch(normalizedNotes);

  if (chord) {
    return chord;
  }

  // If no chord pattern matches, show the lowest note as root with other notes
  if (normalizedNotes.length >= 2) {
    const firstMidi = midiNumbers[0];
    if (firstMidi === undefined) return null;
    const root = midiToNoteName(firstMidi);
    const otherNotes = normalizedNotes
      .slice(1)
      .map((n) => NOTE_NAMES[n] ?? '?')
      .filter((n) => n !== '?')
      .join('/');
    return `${root}(${otherNotes})`;
  }

  return null;
}
