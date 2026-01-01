// Piano note frequencies relative to A4 (440Hz)
// We use pitch shifting from a base sample for each octave
const A4_FREQUENCY = 440;

// MIDI note numbers: A0 = 21, C4 = 60, A4 = 69, C8 = 108
// Piano range: A0 (21) to C8 (108) = 88 keys

interface NoteInfo {
  note: string;
  midiNumber: number;
  frequency: number;
  octave: number;
  isBlackKey: boolean;
}

// Generate all 88 piano keys with their properties
function generatePianoKeys(): NoteInfo[] {
  const noteNames = [
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
  const blackKeyNotes = new Set(['C#', 'D#', 'F#', 'G#', 'A#']);
  const keys: NoteInfo[] = [];

  // Piano starts at A0 (MIDI 21) and ends at C8 (MIDI 108)
  for (let midi = 21; midi <= 108; midi++) {
    const noteIndex = (midi - 12) % 12;
    const octave = Math.floor((midi - 12) / 12);
    const noteName = noteNames[noteIndex];
    const frequency = A4_FREQUENCY * 2 ** ((midi - 69) / 12);

    if (noteName) {
      keys.push({
        frequency,
        isBlackKey: blackKeyNotes.has(noteName),
        midiNumber: midi,
        note: `${noteName}${octave}`,
        octave,
      });
    }
  }

  return keys;
}

export const PIANO_KEYS = generatePianoKeys();

// Map MIDI numbers to key info for quick lookup
export const MIDI_TO_KEY = new Map<number, NoteInfo>(
  PIANO_KEYS.map((key) => [key.midiNumber, key]),
);

class PianoAudioService {
  private isInitialized = false;
  private audioModule: typeof import('expo-audio') | null = null;
  private activePlayers: Map<number, unknown> = new Map();

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Dynamically import expo-audio to avoid crashes if native module isn't available
      this.audioModule = await import('expo-audio');

      // Configure audio mode for low latency playback
      await this.audioModule.setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });

      this.isInitialized = true;
    } catch (error) {
      console.warn(
        'Audio module not available. Sound playback disabled.',
        error,
      );
      this.audioModule = null;
    }
  }

  async playNote(midiNumber: number): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const keyInfo = MIDI_TO_KEY.get(midiNumber);
    if (!keyInfo) return;

    // If audio module isn't available, just log
    if (!this.audioModule) {
      console.log(
        `Playing note: ${keyInfo.note} (${keyInfo.frequency.toFixed(2)}Hz)`,
      );
      return;
    }

    // For now, just log - actual audio implementation would use sample files
    // expo-audio requires actual audio files, which we'd need to bundle
    // Note: expo-audio uses hooks (useAudioPlayer) which can't be used in class methods
    console.log(
      `Playing note: ${keyInfo.note} (${keyInfo.frequency.toFixed(2)}Hz)`,
    );
  }

  async stopNote(_midiNumber: number): Promise<void> {
    // For sustained notes, you would stop the sound here
    // With one-shot samples, this is typically not needed
  }

  async playSequence(
    notes: Array<{ midiNumber: number; timestamp: number; duration: number }>,
  ): Promise<void> {
    if (notes.length === 0) return;

    const startTime = Date.now();

    for (const note of notes) {
      const delay = note.timestamp - (Date.now() - startTime);
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      await this.playNote(note.midiNumber);
    }
  }

  async cleanup(): Promise<void> {
    this.activePlayers.clear();
    this.isInitialized = false;
  }
}

// Singleton instance
export const pianoAudio = new PianoAudioService();

// Helper to get note name from MIDI number
export function getNoteNameFromMidi(midiNumber: number): string {
  const key = MIDI_TO_KEY.get(midiNumber);
  return key?.note ?? `Unknown(${midiNumber})`;
}

// Helper to check if a MIDI number is a black key
export function isBlackKey(midiNumber: number): boolean {
  const key = MIDI_TO_KEY.get(midiNumber);
  return key?.isBlackKey ?? false;
}
