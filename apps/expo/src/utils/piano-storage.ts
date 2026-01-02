import { Directory, File, Paths } from 'expo-file-system';

// Recording data model
export interface PianoNote {
  note: string; // e.g., "C4", "F#5"
  midiNumber: number;
  timestamp: number; // ms from recording start (note-on time)
  duration: number; // ms (calculated from note-off time)
  noteOnTime?: number; // Absolute timestamp when note was pressed
  noteOffTime?: number; // Absolute timestamp when note was released
  sustainActive?: boolean; // Whether sustain pedal was active when note ended
}

export interface SustainEvent {
  timestamp: number; // ms from recording start
  isActive: boolean; // true = pedal down, false = pedal up
}

export interface Recording {
  id: string;
  name: string;
  createdAt: string;
  notes: PianoNote[];
  sustainEvents?: SustainEvent[]; // Optional array of sustain pedal events
}

// Storage directory for recordings
const RECORDINGS_DIR_NAME = 'piano-recordings';
const RECORDINGS_INDEX_FILE_NAME = 'index.json';

class PianoStorageService {
  private isInitialized = false;
  private recordingsDir: Directory | null = null;
  private indexFile: File | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get the document directory and create recordings subdirectory
      this.recordingsDir = new Directory(Paths.document, RECORDINGS_DIR_NAME);
      this.indexFile = new File(this.recordingsDir, RECORDINGS_INDEX_FILE_NAME);

      // Ensure recordings directory exists
      if (!this.recordingsDir.exists) {
        this.recordingsDir.create();
      }

      // Ensure index file exists
      if (!this.indexFile.exists) {
        this.indexFile.create();
        this.indexFile.write(JSON.stringify([]));
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize storage:', error);
    }
  }

  // Generate unique ID for recordings
  private generateId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  // Get all recordings metadata
  async getRecordings(): Promise<Recording[]> {
    await this.initialize();

    try {
      if (!this.indexFile?.exists) {
        return [];
      }

      const indexContent = await this.indexFile.text();
      return JSON.parse(indexContent) as Recording[];
    } catch (error) {
      console.error('Failed to read recordings:', error);
      return [];
    }
  }

  // Get a single recording by ID
  async getRecording(id: string): Promise<Recording | null> {
    const recordings = await this.getRecordings();
    return recordings.find((r) => r.id === id) ?? null;
  }

  // Save a new recording
  async saveRecording(
    name: string,
    notes: PianoNote[],
    sustainEvents?: SustainEvent[],
  ): Promise<Recording | null> {
    await this.initialize();

    try {
      const recording: Recording = {
        createdAt: new Date().toISOString(),
        id: this.generateId(),
        name: name.trim() || `Recording ${new Date().toLocaleString()}`,
        notes,
        sustainEvents:
          sustainEvents && sustainEvents.length > 0 ? sustainEvents : undefined,
      };

      // Read existing recordings
      const recordings = await this.getRecordings();

      // Add new recording to the beginning
      recordings.unshift(recording);

      // Save updated index
      this.indexFile?.write(JSON.stringify(recordings, null, 2));

      return recording;
    } catch (error) {
      console.error('Failed to save recording:', error);
      return null;
    }
  }

  // Update recording name
  async updateRecordingName(id: string, name: string): Promise<boolean> {
    await this.initialize();

    try {
      const recordings = await this.getRecordings();
      const recording = recordings.find((r) => r.id === id);

      if (!recording) return false;

      recording.name = name.trim();

      this.indexFile?.write(JSON.stringify(recordings, null, 2));

      return true;
    } catch (error) {
      console.error('Failed to update recording:', error);
      return false;
    }
  }

  // Delete a recording
  async deleteRecording(id: string): Promise<boolean> {
    await this.initialize();

    try {
      const recordings = await this.getRecordings();
      const filteredRecordings = recordings.filter((r) => r.id !== id);

      if (filteredRecordings.length === recordings.length) {
        return false; // Recording not found
      }

      this.indexFile?.write(JSON.stringify(filteredRecordings, null, 2));

      return true;
    } catch (error) {
      console.error('Failed to delete recording:', error);
      return false;
    }
  }

  // Delete all recordings
  async deleteAllRecordings(): Promise<boolean> {
    await this.initialize();

    try {
      this.indexFile?.write(JSON.stringify([]));
      return true;
    } catch (error) {
      console.error('Failed to delete all recordings:', error);
      return false;
    }
  }

  // Export recording as JSON string (for sharing)
  async exportRecording(id: string): Promise<string | null> {
    const recording = await this.getRecording(id);
    if (!recording) return null;

    return JSON.stringify(recording, null, 2);
  }

  // Import recording from JSON string
  async importRecording(jsonString: string): Promise<Recording | null> {
    try {
      const data = JSON.parse(jsonString) as Recording;

      // Validate required fields
      if (!data.notes || !Array.isArray(data.notes)) {
        throw new Error('Invalid recording format');
      }

      // Save with new ID and timestamp
      return this.saveRecording(
        data.name || 'Imported Recording',
        data.notes,
        data.sustainEvents,
      );
    } catch (error) {
      console.error('Failed to import recording:', error);
      return null;
    }
  }
}

// Singleton instance
export const pianoStorage = new PianoStorageService();
