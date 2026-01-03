import { createStore, useStore } from 'zustand';
import type { PianoNote, SustainEvent } from '../utils/piano-storage';

// Simple selector hook using Zustand's useStore

export interface PianoState {
  // Recording state
  isRecording: boolean;
  isPlaying: boolean;
  recordedNotes: PianoNote[];
  sustainEvents: SustainEvent[];

  // Playback state
  currentTime: number;
  playbackStartTime: number;

  // UI state
  showKeyNames: boolean;

  // Performance optimizations
  pendingNotes: PianoNote[];
  pendingSustainEvents: SustainEvent[];
  activeNotes: Map<number, number>;
}

interface PianoActions {
  // Recording actions
  startRecording: () => void;
  stopRecording: () => void;
  addNote: (note: PianoNote) => void;
  clearRecording: () => void;

  // Playback actions
  startPlayback: () => void;
  stopPlayback: () => void;
  setCurrentTime: (time: number) => void;

  // UI actions
  setShowKeyNames: (show: boolean) => void;

  // Performance actions
  batchRecordingUpdates: () => void;
}

type PianoStore = PianoState & PianoActions;

const initialState: PianoState = {
  activeNotes: new Map(),
  currentTime: 0,
  isPlaying: false,
  isRecording: false,
  pendingNotes: [],
  pendingSustainEvents: [],
  playbackStartTime: 0,
  recordedNotes: [],
  showKeyNames: false,
  sustainEvents: [],
};

export const store = createStore<PianoStore>()((set, get) => ({
  ...initialState,

  addNote: (note) => {
    // For immediate visual feedback during recording
    set((state) => ({
      activeNotes: new Map(state.activeNotes).set(
        note.midiNumber,
        note.timestamp,
      ),
    }));

    // Batch the note for later
    set((state) => ({
      pendingNotes: [...state.pendingNotes, note],
    }));
  },

  // Performance actions
  batchRecordingUpdates: () => {
    const { pendingNotes, pendingSustainEvents } = get();
    if (pendingNotes.length > 0 || pendingSustainEvents.length > 0) {
      set((state) => ({
        pendingNotes: [],
        pendingSustainEvents: [],
        recordedNotes: [...state.recordedNotes, ...pendingNotes],
        sustainEvents: [...state.sustainEvents, ...pendingSustainEvents],
      }));
    }
  },

  clearRecording: () =>
    set({
      activeNotes: new Map(),
      currentTime: 0,
      pendingNotes: [],
      pendingSustainEvents: [],
      recordedNotes: [],
      sustainEvents: [],
    }),

  setCurrentTime: (time) => set({ currentTime: time }),
  setShowKeyNames: (show) => set({ showKeyNames: show }),

  // Playback actions
  startPlayback: () =>
    set({
      currentTime: 0,
      isPlaying: true,
      playbackStartTime: Date.now(),
    }),

  // Recording actions with batched updates
  startRecording: () =>
    set({
      activeNotes: new Map(),
      currentTime: 0,
      isRecording: true,
      pendingNotes: [],
      pendingSustainEvents: [],
      recordedNotes: [],
      sustainEvents: [],
    }),

  stopPlayback: () =>
    set({
      currentTime: 0,
      isPlaying: false,
    }),

  stopRecording: () => {
    const { pendingNotes, pendingSustainEvents } = get();
    set({
      isRecording: false,
      pendingNotes: [],
      pendingSustainEvents: [],
      recordedNotes: [...get().recordedNotes, ...pendingNotes],
      sustainEvents: [...get().sustainEvents, ...pendingSustainEvents],
    });
  },
}));

export const usePianoStore = <T>(
  selector: (state: PianoState & PianoActions) => T,
) => {
  return useStore(store, selector);
};
