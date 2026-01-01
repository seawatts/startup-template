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

interface MidiConnectionProps {
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
}: MidiConnectionProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = useMemo(
    () => ({
      background: isDark ? '#1C1C1E' : '#F5F5F5',
      border: isDark ? '#38383A' : '#E5E5E5',
      buttonBg: isDark ? '#2C2C2E' : '#FFFFFF',
      connected: '#30D158',
      danger: '#FF453A',
      foreground: isDark ? '#FFFFFF' : '#000000',
      muted: isDark ? '#8E8E93' : '#8E8E93',
      primary: '#007AFF',
    }),
    [isDark],
  );

  const isBluetoothOn = bluetoothState === 'PoweredOn';

  const renderDevice = useCallback(
    ({ item }: { item: MidiDevice }) => (
      <Pressable
        onPress={() => onConnectToDevice(item.id)}
        style={[styles.deviceItem, { backgroundColor: theme.buttonBg }]}
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

  // Show unavailable message if MIDI native module isn't loaded
  if (!isAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.foreground }]}>
            🎹 MIDI Input
          </Text>
          <Text style={[styles.subtitle, { color: theme.muted }]}>
            Not available
          </Text>
        </View>
        <View
          style={[styles.bluetoothOff, { backgroundColor: theme.buttonBg }]}
        >
          <Text style={[styles.bluetoothOffText, { color: theme.muted }]}>
            Bluetooth MIDI requires a native rebuild. Please run `npx expo
            run:ios` to rebuild the app with MIDI support.
          </Text>
        </View>
      </View>
    );
  }

  // Connected state
  if (isConnected && connectedDevice) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.connectedHeader}>
          <View
            style={[styles.statusDot, { backgroundColor: theme.connected }]}
          />
          <Text style={[styles.connectedText, { color: theme.foreground }]}>
            Connected to MIDI
          </Text>
        </View>
        <View
          style={[styles.connectedDevice, { backgroundColor: theme.buttonBg }]}
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
          🎹 MIDI Input
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {isBluetoothOn
            ? 'Connect a Bluetooth MIDI device'
            : 'Please enable Bluetooth'}
        </Text>
      </View>

      {isBluetoothOn ? (
        <>
          <Pressable
            onPress={isScanning ? onStopScanning : onStartScanning}
            style={[
              styles.scanButton,
              { backgroundColor: isScanning ? theme.danger : theme.primary },
            ]}
          >
            {isScanning && <ActivityIndicator color="#FFFFFF" size="small" />}
            <Text style={styles.scanButtonText}>
              {isScanning ? 'Stop Scanning' : 'Scan for MIDI Devices'}
            </Text>
          </Pressable>

          {availableDevices.length > 0 && (
            <View style={styles.devicesList}>
              <Text style={[styles.devicesTitle, { color: theme.foreground }]}>
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
            Bluetooth is turned off. Please enable Bluetooth in your device
            settings to connect to MIDI devices.
          </Text>
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
  connectedDevice: {
    alignItems: 'center',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
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
    fontSize: 12,
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceItem: {
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    marginBottom: 8,
    padding: 12,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: '500',
  },
  devicesList: {
    gap: 8,
    marginTop: 16,
  },
  devicesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  disconnectButton: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  disconnectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    gap: 4,
    marginBottom: 16,
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
  statusDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  subtitle: {
    fontSize: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
});
