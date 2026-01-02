import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

// Get the native module
const { UsbMidiModule } = NativeModules;

// Debug: Log module availability
if (Platform.OS === 'ios') {
  console.log('UsbMidiModule available:', UsbMidiModule != null);
  console.log('All native modules:', Object.keys(NativeModules));
}

// Check if module is available
const isModuleAvailable = Platform.OS === 'ios' && UsbMidiModule != null;

export interface UsbMidiDevice {
  id: number;
  name: string;
  manufacturer: string;
  model: string;
}

export interface UsbMidiNote {
  note: number;
  velocity: number;
  channel: number;
  timestamp: number;
  type: 'noteOn' | 'noteOff';
}

export interface UsbMidiControlChange {
  channel: number;
  ccNumber: number;
  value: number;
  timestamp: number;
}

interface UsbMidiState {
  isListening: boolean;
  isAvailable: boolean;
  connectedDevices: UsbMidiDevice[];
  pressedKeys: Set<number>;
}

export function useUsbMidi(
  onNoteEvent?: (note: UsbMidiNote) => void,
  onControlChange?: (cc: UsbMidiControlChange) => void,
) {
  const eventEmitterRef = useRef<NativeEventEmitter | null>(null);
  // Store callbacks in refs to avoid re-initializing when they change
  const onNoteEventRef = useRef(onNoteEvent);
  const onControlChangeRef = useRef(onControlChange);

  // Update refs when callbacks change
  useEffect(() => {
    onNoteEventRef.current = onNoteEvent;
    onControlChangeRef.current = onControlChange;
  }, [onNoteEvent, onControlChange]);

  const [state, setState] = useState<UsbMidiState>({
    connectedDevices: [],
    isAvailable: isModuleAvailable,
    isListening: false,
    pressedKeys: new Set(),
  });

  // Initialize event emitter
  // biome-ignore lint/correctness/useExhaustiveDependencies: we don't want to re-create the event emitter on every render
  useEffect(() => {
    if (!isModuleAvailable) {
      return;
    }

    eventEmitterRef.current = new NativeEventEmitter(UsbMidiModule);

    // Subscribe to MIDI events
    const noteOnSubscription = eventEmitterRef.current.addListener(
      'onMidiNoteOn',
      (event: {
        note: number;
        velocity: number;
        channel: number;
        timestamp: number;
      }) => {
        const midiNote: UsbMidiNote = {
          channel: event.channel,
          note: event.note,
          timestamp: event.timestamp,
          type: 'noteOn',
          velocity: event.velocity,
        };

        setState((prev) => {
          const newPressedKeys = new Set(prev.pressedKeys);
          newPressedKeys.add(event.note);
          return { ...prev, pressedKeys: newPressedKeys };
        });

        onNoteEventRef.current?.(midiNote);
      },
    );

    const noteOffSubscription = eventEmitterRef.current.addListener(
      'onMidiNoteOff',
      (event: {
        note: number;
        velocity: number;
        channel: number;
        timestamp: number;
      }) => {
        const midiNote: UsbMidiNote = {
          channel: event.channel,
          note: event.note,
          timestamp: event.timestamp,
          type: 'noteOff',
          velocity: event.velocity,
        };

        setState((prev) => {
          const newPressedKeys = new Set(prev.pressedKeys);
          newPressedKeys.delete(event.note);
          return { ...prev, pressedKeys: newPressedKeys };
        });

        onNoteEventRef.current?.(midiNote);
      },
    );

    const deviceConnectedSubscription = eventEmitterRef.current.addListener(
      'onMidiDeviceConnected',
      (device: UsbMidiDevice) => {
        setState((prev) => {
          const exists = prev.connectedDevices.some((d) => d.id === device.id);
          if (exists) return prev;
          return {
            ...prev,
            connectedDevices: [...prev.connectedDevices, device],
          };
        });
      },
    );

    const deviceDisconnectedSubscription = eventEmitterRef.current.addListener(
      'onMidiDeviceDisconnected',
      (event: { id: number }) => {
        setState((prev) => ({
          ...prev,
          connectedDevices: prev.connectedDevices.filter(
            (d) => d.id !== event.id,
          ),
          pressedKeys: new Set(), // Clear pressed keys when device disconnects
        }));
      },
    );

    const packetReceivedSubscription = eventEmitterRef.current.addListener(
      'onMidiPacketReceived',
      (_event: { packetCount: number }) => {
        // Packet received - no logging needed
      },
    );

    const controlChangeSubscription = eventEmitterRef.current.addListener(
      'onMidiControlChange',
      (event: {
        channel: number;
        ccNumber: number;
        value: number;
        timestamp: number;
      }) => {
        const cc: UsbMidiControlChange = {
          ccNumber: event.ccNumber,
          channel: event.channel,
          timestamp: event.timestamp,
          value: event.value,
        };
        onControlChangeRef.current?.(cc);
      },
    );

    // Start listening and get initial devices (only once)
    startListening();
    refreshDevices();

    return () => {
      noteOnSubscription.remove();
      noteOffSubscription.remove();
      deviceConnectedSubscription.remove();
      deviceDisconnectedSubscription.remove();
      packetReceivedSubscription.remove();
      controlChangeSubscription.remove();
      stopListening();
    };
  }, []);

  const startListening = useCallback(async () => {
    if (!isModuleAvailable) {
      console.log('[USB MIDI] Cannot start listening - module not available');
      return;
    }

    try {
      console.log('[USB MIDI] Starting to listen for MIDI devices...');
      await UsbMidiModule.startListening();
      setState((prev) => ({ ...prev, isListening: true }));
      console.log('[USB MIDI] Successfully started listening');
    } catch (error) {
      console.error('[USB MIDI] Failed to start USB MIDI listening:', error);
    }
  }, []);

  const stopListening = useCallback(async () => {
    if (!isModuleAvailable) return;

    try {
      await UsbMidiModule.stopListening();
      setState((prev) => ({
        ...prev,
        isListening: false,
        pressedKeys: new Set(),
      }));
    } catch (error) {
      console.error('Failed to stop USB MIDI listening:', error);
    }
  }, []);

  const refreshDevices = useCallback(async () => {
    if (!isModuleAvailable) {
      console.log('[USB MIDI] Module not available');
      return;
    }

    try {
      console.log('[USB MIDI] Fetching connected devices...');
      const devices: UsbMidiDevice[] =
        await UsbMidiModule.getConnectedDevices();
      console.log('[USB MIDI] Found devices:', devices.length, devices);

      if (devices.length === 0) {
        console.warn(
          '[USB MIDI] No devices found. Note: iOS Simulator may not have access to macOS MIDI devices.',
        );
        console.warn(
          '[USB MIDI] Check Xcode console for Swift logs (look for [UsbMidiModule] messages)',
        );
        console.warn('[USB MIDI] For best results, test on a physical device.');
      }

      setState((prev) => ({ ...prev, connectedDevices: devices }));
    } catch (error) {
      console.error('[USB MIDI] Failed to get USB MIDI devices:', error);
    }
  }, []);

  return {
    ...state,
    refreshDevices,
    startListening,
    stopListening,
  };
}
