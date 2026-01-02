import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import type { MidiDevice } from '~/utils/midi-service';
import type { UsbMidiDevice } from '~/utils/usb-midi-service';

interface MidiConnectionProps {
  // Bluetooth MIDI props
  isScanning: boolean;
  isConnected: boolean;
  isAvailable: boolean;
  connectedDevice: MidiDevice | null;
  availableDevices: MidiDevice[];
  bluetoothState: string;
  onStartScanning: () => void;
  onStopScanning: () => void;
  onConnectToDevice: (deviceId: string) => void;
  onDisconnect: () => void;
  // USB MIDI props
  usbMidiConnectedDevices?: UsbMidiDevice[];
  usbMidiIsAvailable?: boolean;
  usbMidiIsListening?: boolean;
}

export function MidiConnection({
  isScanning,
  isConnected,
  isAvailable,
  connectedDevice,
  availableDevices,
  bluetoothState,
  onStartScanning,
  onStopScanning,
  onConnectToDevice,
  onDisconnect,
  usbMidiConnectedDevices = [],
  usbMidiIsAvailable = false,
  usbMidiIsListening = false,
}: MidiConnectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = useMemo(
    () => ({
      background: isDark ? '#27272A' : '#F5F5F5',
      border: isDark ? '#27272A' : '#E5E5E5',
      buttonBg: isDark ? '#27272A' : '#FFFFFF',
      connected: '#30D158',
      danger: isDark ? '#DC2626' : '#EF4444',
      foreground: isDark ? '#FAFAFA' : '#0A0A0A',
      muted: isDark ? '#A1A1AA' : '#737373',
      primary: '#007AFF',
      usb: '#FF9500', // Orange for USB
    }),
    [isDark],
  );

  const isBluetoothOn = bluetoothState === 'PoweredOn';
  const hasUsbDevices = usbMidiConnectedDevices.length > 0;

  const renderDevice = useCallback(
    ({ item }: { item: MidiDevice }) => (
      <Pressable
        onPress={() => onConnectToDevice(item.id)}
        style={[
          styles.deviceItem,
          {
            backgroundColor: theme.buttonBg,
            borderColor: theme.border,
          },
        ]}
      >
        <View style={styles.deviceInfo}>
          <Text style={[styles.deviceName, { color: theme.foreground }]}>
            {item.name}
          </Text>
          <Text style={[styles.deviceId, { color: theme.muted }]}>
            {item.id.slice(0, 8)}...
          </Text>
        </View>
        <Text style={[styles.connectText, { color: theme.primary }]}>
          Connect
        </Text>
      </Pressable>
    ),
    [theme, onConnectToDevice],
  );

  // USB MIDI status component
  const UsbMidiStatus = () => {
    if (!usbMidiIsAvailable) return null;

    if (hasUsbDevices) {
      return (
        <View
          style={[
            styles.usbMidiSection,
            {
              backgroundColor: theme.buttonBg,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.usbMidiHeader}>
            <View style={[styles.statusDot, { backgroundColor: theme.usb }]} />
            <Text style={[styles.usbMidiTitle, { color: theme.foreground }]}>
              USB MIDI Connected
            </Text>
          </View>
          {usbMidiConnectedDevices.map((device) => (
            <View key={device.id} style={styles.usbMidiDevice}>
              <Text style={[styles.deviceName, { color: theme.foreground }]}>
                {device.name}
              </Text>
              <Text style={[styles.deviceId, { color: theme.muted }]}>
                {device.manufacturer} • {device.model}
              </Text>
            </View>
          ))}
        </View>
      );
    }

    if (usbMidiIsListening) {
      return (
        <View
          style={[
            styles.usbMidiSection,
            {
              backgroundColor: theme.buttonBg,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.usbMidiHeader}>
            <View
              style={[styles.statusDot, { backgroundColor: theme.muted }]}
            />
            <Text style={[styles.usbMidiTitle, { color: theme.muted }]}>
              USB MIDI Ready
            </Text>
          </View>
          <Text style={[styles.usbMidiHint, { color: theme.muted }]}>
            Connect your piano via USB-C cable
          </Text>
        </View>
      );
    }

    return null;
  };

  // Show unavailable message if MIDI native module isn't loaded
  if (!isAvailable && !usbMidiIsAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.foreground }]}>
            MIDI Input
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            Not available
          </Text>
        </View>
        <View
          style={[
            styles.bluetoothOff,
            {
              backgroundColor: theme.buttonBg,
              borderColor: theme.border,
              borderWidth: 1,
            },
          ]}
        >
          <Text style={[styles.bluetoothOffText, { color: theme.muted }]}>
            MIDI requires a native rebuild. Please run `npx expo run:ios` to
            rebuild the app with MIDI support.
          </Text>
        </View>
      </View>
    );
  }

  // Connected state (BLE MIDI)
  if (isConnected && connectedDevice) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* USB MIDI Status */}
        <UsbMidiStatus />

        {/* Bluetooth MIDI Connected */}
        <View style={styles.connectedHeader}>
          <View
            style={[styles.statusDot, { backgroundColor: theme.connected }]}
          />
          <Text style={[styles.connectedText, { color: theme.foreground }]}>
            Bluetooth MIDI Connected
          </Text>
        </View>
        <View
          style={[
            styles.connectedDevice,
            {
              backgroundColor: theme.buttonBg,
              borderColor: theme.border,
            },
          ]}
        >
          <Text style={[styles.deviceName, { color: theme.foreground }]}>
            {connectedDevice.name}
          </Text>
          <Pressable
            onPress={onDisconnect}
            style={[
              styles.disconnectButton,
              { backgroundColor: `${theme.danger}20` },
            ]}
          >
            <Text style={[styles.disconnectText, { color: theme.danger }]}>
              Disconnect
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Scanning/Not connected state
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.foreground }]}>
          MIDI Input
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          Connect via USB-C or Bluetooth
        </Text>
      </View>

      {/* USB MIDI Status - always show when available */}
      <UsbMidiStatus />

      {/* Bluetooth MIDI Section */}
      {isAvailable && (
        <View style={styles.bluetoothSection}>
          <Text style={[styles.sectionTitle, { color: theme.foreground }]}>
            Bluetooth MIDI
          </Text>

          {isBluetoothOn ? (
            <>
              <Pressable
                onPress={isScanning ? onStopScanning : onStartScanning}
                style={[
                  styles.scanButton,
                  {
                    backgroundColor: isScanning ? theme.danger : theme.primary,
                  },
                ]}
              >
                {isScanning && (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                )}
                <Text style={styles.scanButtonText}>
                  {isScanning ? 'Stop Scanning' : 'Scan for Devices'}
                </Text>
              </Pressable>

              {availableDevices.length > 0 && (
                <View style={styles.devicesList}>
                  <Text
                    style={[styles.devicesTitle, { color: theme.foreground }]}
                  >
                    Available Devices
                  </Text>
                  <FlatList
                    data={availableDevices}
                    keyExtractor={(item) => item.id}
                    renderItem={renderDevice}
                    scrollEnabled={false}
                  />
                </View>
              )}

              {isScanning && availableDevices.length === 0 && (
                <Text style={[styles.scanningText, { color: theme.muted }]}>
                  Searching for MIDI devices...
                </Text>
              )}
            </>
          ) : (
            <View
              style={[styles.bluetoothOff, { backgroundColor: theme.buttonBg }]}
            >
              <Text style={[styles.bluetoothOffText, { color: theme.muted }]}>
                Enable Bluetooth to scan for wireless MIDI devices.
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bluetoothOff: {
    borderRadius: 12,
    padding: 16,
  },
  bluetoothOffText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  bluetoothSection: {
    gap: 12,
    marginTop: 16,
  },
  connectedDevice: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 14,
  },
  connectedHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  connectedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  connectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  container: {
    borderRadius: 16,
    padding: 16,
  },
  deviceId: {
    fontSize: 13,
  },
  deviceInfo: {
    flex: 1,
    gap: 4,
  },
  deviceItem: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 14,
  },
  deviceName: {
    fontSize: 15,
    fontWeight: '500',
  },
  devicesList: {
    gap: 8,
    marginTop: 16,
  },
  devicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  disconnectButton: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  scanButton: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scanningText: {
    fontSize: 14,
    marginTop: 16,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  subtitle: {
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  usbMidiDevice: {
    gap: 4,
    paddingLeft: 20,
    paddingTop: 4,
  },
  usbMidiHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  usbMidiHint: {
    fontSize: 13,
    lineHeight: 18,
    paddingLeft: 20,
  },
  usbMidiSection: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
    padding: 14,
  },
  usbMidiTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
});
