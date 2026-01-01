import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, PermissionsAndroid, Platform } from 'react-native';

// Try to import BLE module - it may not be available if native module isn't built
type BleManagerType = InstanceType<
  typeof import('react-native-ble-plx').BleManager
>;
let BleManagerClass: (new () => BleManagerType) | null = null;

try {
  // biome-ignore lint/style/noCommonJs: Using require for optional native module that may not be available
  const blePlx = require('react-native-ble-plx');
  BleManagerClass = blePlx.BleManager;
} catch {
  console.warn('react-native-ble-plx not available. MIDI support disabled.');
}

// BLE MIDI Service UUIDs (standard)
const MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
const MIDI_CHARACTERISTIC_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

// MIDI message types
const MIDI_NOTE_ON = 0x90;
const MIDI_NOTE_OFF = 0x80;

// Bluetooth states (matching react-native-ble-plx State enum)
const BLE_STATE_POWERED_ON = 'PoweredOn';
const BLE_STATE_UNKNOWN = 'Unknown';

export interface MidiNote {
  note: number; // MIDI note number (0-127)
  velocity: number; // Velocity (0-127)
  timestamp: number; // Timestamp in ms
  type: 'noteOn' | 'noteOff';
}

export interface MidiDevice {
  id: string;
  name: string;
  isConnected: boolean;
}

// Use string for bluetoothState since we can't guarantee the type import
interface MidiServiceState {
  isScanning: boolean;
  isConnected: boolean;
  connectedDevice: MidiDevice | null;
  availableDevices: MidiDevice[];
  bluetoothState: string;
  pressedKeys: Set<number>;
  isAvailable: boolean;
}

// Parse BLE MIDI packet to extract MIDI messages
function parseBLEMidiPacket(data: Uint8Array): MidiNote[] {
  const notes: MidiNote[] = [];
  const timestamp = Date.now();

  let i = 0;

  // Skip header byte
  const firstByte = data[0];
  if (data.length > 0 && firstByte !== undefined && (firstByte & 0x80) !== 0) {
    i++;
  }

  while (i < data.length) {
    const currentByte = data[i];
    if (currentByte === undefined) break;

    // Check for timestamp byte
    if ((currentByte & 0x80) !== 0) {
      i++;
      continue;
    }

    const status = currentByte;
    const messageType = status & 0xf0;

    if (messageType === MIDI_NOTE_ON && i + 2 < data.length) {
      const note = data[i + 1];
      const velocity = data[i + 2];

      if (note !== undefined && velocity !== undefined) {
        if (velocity === 0) {
          notes.push({ note, timestamp, type: 'noteOff', velocity: 0 });
        } else {
          notes.push({ note, timestamp, type: 'noteOn', velocity });
        }
      }
      i += 3;
    } else if (messageType === MIDI_NOTE_OFF && i + 2 < data.length) {
      const note = data[i + 1];
      const velocity = data[i + 2];

      if (note !== undefined && velocity !== undefined) {
        notes.push({ note, timestamp, type: 'noteOff', velocity });
      }
      i += 3;
    } else {
      i++;
    }
  }

  return notes;
}

// Convert base64 to Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function useMidiService(onNoteEvent?: (note: MidiNote) => void) {
  const bleManager = useRef<BleManagerType | null>(null);
  const [state, setState] = useState<MidiServiceState>({
    availableDevices: [],
    bluetoothState: BLE_STATE_UNKNOWN,
    connectedDevice: null,
    isAvailable: BleManagerClass !== null,
    isConnected: false,
    isScanning: false,
    pressedKeys: new Set(),
  });

  // Initialize BLE manager (only if available)
  useEffect(() => {
    if (!BleManagerClass) {
      return;
    }

    try {
      bleManager.current = new BleManagerClass();

      const subscription = bleManager.current.onStateChange((bleState) => {
        setState((prev) => ({ ...prev, bluetoothState: bleState }));
      }, true);

      return () => {
        subscription.remove();
        bleManager.current?.destroy();
      };
    } catch (error) {
      console.warn('Failed to initialize BLE manager:', error);
      setState((prev) => ({ ...prev, isAvailable: false }));
    }
  }, []);

  // Request permissions (Android)
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      const apiLevel = Platform.Version;

      if (apiLevel >= 31) {
        const bluetoothScan = PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN;
        const bluetoothConnect =
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT;

        if (!bluetoothScan || !bluetoothConnect) {
          return false;
        }

        const granted = await PermissionsAndroid.requestMultiple([
          bluetoothScan,
          bluetoothConnect,
        ]);

        return (
          granted[bluetoothScan] === PermissionsAndroid.RESULTS.GRANTED &&
          granted[bluetoothConnect] === PermissionsAndroid.RESULTS.GRANTED
        );
      }

      const locationPermission =
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION;
      if (!locationPermission) {
        return false;
      }

      const granted = await PermissionsAndroid.request(locationPermission);
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  }, []);

  const stopScanning = useCallback(() => {
    bleManager.current?.stopDeviceScan();
    setState((prev) => ({ ...prev, isScanning: false }));
  }, []);

  // Scan for MIDI devices
  const startScanning = useCallback(async () => {
    if (!bleManager.current || !state.isAvailable) {
      Alert.alert(
        'MIDI Not Available',
        'Bluetooth MIDI is not available. Please rebuild the app with native modules.',
      );
      return;
    }

    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'Bluetooth permission is required to connect to MIDI devices.',
      );
      return;
    }

    if (state.bluetoothState !== BLE_STATE_POWERED_ON) {
      Alert.alert(
        'Bluetooth Off',
        'Please turn on Bluetooth to scan for MIDI devices.',
      );
      return;
    }

    setState((prev) => ({ ...prev, availableDevices: [], isScanning: true }));

    bleManager.current.startDeviceScan(
      [MIDI_SERVICE_UUID],
      { allowDuplicates: false },
      (error, device) => {
        if (error) {
          console.error('Scan error:', error);
          setState((prev) => ({ ...prev, isScanning: false }));
          return;
        }

        if (device?.name) {
          setState((prev) => {
            const exists = prev.availableDevices.some(
              (d) => d.id === device.id,
            );
            if (exists) return prev;

            return {
              ...prev,
              availableDevices: [
                ...prev.availableDevices,
                {
                  id: device.id,
                  isConnected: false,
                  name: device.name ?? 'Unknown MIDI Device',
                },
              ],
            };
          });
        }
      },
    );

    // Stop scanning after 10 seconds
    setTimeout(() => {
      stopScanning();
    }, 10000);
  }, [
    state.bluetoothState,
    state.isAvailable,
    requestPermissions,
    stopScanning,
  ]);

  // Connect to a MIDI device
  const connectToDevice = useCallback(
    async (deviceId: string) => {
      if (!bleManager.current) return;

      stopScanning();

      try {
        const device = await bleManager.current.connectToDevice(deviceId);
        await device.discoverAllServicesAndCharacteristics();

        // Subscribe to MIDI characteristic
        device.monitorCharacteristicForService(
          MIDI_SERVICE_UUID,
          MIDI_CHARACTERISTIC_UUID,
          (error, characteristic) => {
            if (error) {
              console.error('MIDI monitor error:', error);
              return;
            }

            if (characteristic?.value) {
              const data = base64ToUint8Array(characteristic.value);
              const midiNotes = parseBLEMidiPacket(data);

              for (const note of midiNotes) {
                setState((prev) => {
                  const newPressedKeys = new Set(prev.pressedKeys);
                  if (note.type === 'noteOn') {
                    newPressedKeys.add(note.note);
                  } else {
                    newPressedKeys.delete(note.note);
                  }
                  return { ...prev, pressedKeys: newPressedKeys };
                });

                onNoteEvent?.(note);
              }
            }
          },
        );

        const deviceInfo: MidiDevice = {
          id: device.id,
          isConnected: true,
          name: device.name ?? 'MIDI Device',
        };

        setState((prev) => ({
          ...prev,
          connectedDevice: deviceInfo,
          isConnected: true,
        }));

        // Handle disconnection
        bleManager.current?.onDeviceDisconnected(deviceId, () => {
          setState((prev) => ({
            ...prev,
            connectedDevice: null,
            isConnected: false,
            pressedKeys: new Set(),
          }));
        });
      } catch (error) {
        console.error('Connection error:', error);
        Alert.alert('Connection Failed', 'Could not connect to MIDI device.');
      }
    },
    [stopScanning, onNoteEvent],
  );

  // Disconnect from current device
  const disconnect = useCallback(async () => {
    if (!bleManager.current || !state.connectedDevice) return;

    try {
      await bleManager.current.cancelDeviceConnection(state.connectedDevice.id);
    } catch (error) {
      console.error('Disconnect error:', error);
    }

    setState((prev) => ({
      ...prev,
      connectedDevice: null,
      isConnected: false,
      pressedKeys: new Set(),
    }));
  }, [state.connectedDevice]);

  return {
    ...state,
    connectToDevice,
    disconnect,
    startScanning,
    stopScanning,
  };
}
