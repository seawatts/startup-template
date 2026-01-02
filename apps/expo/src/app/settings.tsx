import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View,
} from 'react-native';

import { MidiConnection } from '~/components/piano';
import { authClient } from '~/utils/auth';
import { useMidiService } from '~/utils/midi-service';
import { getShowKeyNames, setShowKeyNames } from '~/utils/piano-settings';
import { useUsbMidi } from '~/utils/usb-midi-service';

const colors = {
  dark: {
    background: '#09090B',
    border: '#27272A',
    destructive: '#DC2626',
    foreground: '#FAFAFA',
    muted: '#27272A',
    mutedForeground: '#A1A1AA',
  },
  light: {
    background: '#FFFFFF',
    border: '#E5E5E5',
    destructive: '#EF4444',
    foreground: '#0A0A0A',
    muted: '#F5F5F5',
    mutedForeground: '#737373',
  },
};

export default function Settings() {
  const colorScheme = useColorScheme();
  const theme = colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { data: session } = authClient.useSession();
  const [showKeyNames, setShowKeyNamesState] = useState(false);

  // Initialize MIDI services (no event handlers needed for settings page)
  const bleMidi = useMidiService();
  const usbMidi = useUsbMidi();

  // Load show key names setting on mount
  useEffect(() => {
    getShowKeyNames().then(setShowKeyNamesState);
  }, []);

  // Handle show key names toggle
  const handleShowKeyNamesChange = useCallback(async (value: boolean) => {
    setShowKeyNamesState(value);
    await setShowKeyNames(value);
  }, []);

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* Profile Section */}
      <View style={[styles.section, { backgroundColor: theme.muted }]}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatar, { backgroundColor: theme.destructive }]}>
            <Text style={styles.avatarText}>
              {session?.user?.name?.charAt(0) ?? '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: theme.foreground }]}>
              {session?.user?.name ?? 'Guest User'}
            </Text>
            <Text
              style={[styles.profileEmail, { color: theme.mutedForeground }]}
            >
              {session?.user?.email ?? 'Not signed in'}
            </Text>
          </View>
        </View>
      </View>

      {/* Preferences Section */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>
          PREFERENCES
        </Text>
        <View style={[styles.section, { backgroundColor: theme.muted }]}>
          <SettingRow
            label="Notifications"
            rightElement={<Switch value={true} />}
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingRow
            label="Dark Mode"
            rightElement={
              <Text
                style={[styles.settingValue, { color: theme.mutedForeground }]}
              >
                System
              </Text>
            }
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingRow
            label="Language"
            rightElement={
              <Text
                style={[styles.settingValue, { color: theme.mutedForeground }]}
              >
                English
              </Text>
            }
            theme={theme}
          />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingRow
            label="Show Key Names"
            rightElement={
              <Switch
                onValueChange={handleShowKeyNamesChange}
                trackColor={{ false: theme.border, true: '#007AFF' }}
                value={showKeyNames}
              />
            }
            theme={theme}
          />
        </View>
      </View>

      {/* MIDI Debug Section */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>
          MIDI
        </Text>
        <View style={[styles.section, { backgroundColor: theme.muted }]}>
          <View style={styles.midiDebugContainer}>
            <MidiConnection
              availableDevices={bleMidi.availableDevices}
              bluetoothState={bleMidi.bluetoothState}
              connectedDevice={bleMidi.connectedDevice}
              isAvailable={bleMidi.isAvailable}
              isConnected={bleMidi.isConnected}
              isScanning={bleMidi.isScanning}
              onConnectToDevice={bleMidi.connectToDevice}
              onDisconnect={bleMidi.disconnect}
              onStartScanning={bleMidi.startScanning}
              onStopScanning={bleMidi.stopScanning}
              // USB MIDI props
              usbMidiConnectedDevices={usbMidi.connectedDevices}
              usbMidiIsAvailable={usbMidi.isAvailable}
              usbMidiIsListening={usbMidi.isListening}
            />
          </View>
        </View>
      </View>

      {/* Account Section */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>
          ACCOUNT
        </Text>
        <View style={[styles.section, { backgroundColor: theme.muted }]}>
          <SettingRow label="Edit Profile" showChevron theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingRow label="Change Password" showChevron theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingRow label="Privacy Settings" showChevron theme={theme} />
        </View>
      </View>

      {/* Support Section */}
      <View style={styles.sectionContainer}>
        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>
          SUPPORT
        </Text>
        <View style={[styles.section, { backgroundColor: theme.muted }]}>
          <SettingRow label="Help Center" showChevron theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingRow label="Contact Us" showChevron theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingRow label="Terms of Service" showChevron theme={theme} />
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <SettingRow label="Privacy Policy" showChevron theme={theme} />
        </View>
      </View>

      {/* Sign Out */}
      <View style={styles.sectionContainer}>
        <Pressable
          onPress={() => {
            if (session) {
              authClient.signOut();
            } else {
              authClient.signIn.social({
                callbackURL: '/',
                provider: 'google',
              });
            }
          }}
          style={[styles.signOutButton, { backgroundColor: theme.muted }]}
        >
          <Text
            style={[
              styles.signOutText,
              { color: session ? theme.destructive : theme.foreground },
            ]}
          >
            {session ? 'Sign Out' : 'Sign In'}
          </Text>
        </Pressable>
      </View>

      {/* Version */}
      <Text style={[styles.version, { color: theme.mutedForeground }]}>
        Version 1.0.0
      </Text>
    </ScrollView>
  );
}

function SettingRow({
  label,
  theme,
  rightElement,
  showChevron,
}: {
  label: string;
  theme: (typeof colors)['light'];
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}) {
  return (
    <Pressable style={styles.settingRow}>
      <Text style={[styles.settingLabel, { color: theme.foreground }]}>
        {label}
      </Text>
      {rightElement ??
        (showChevron && (
          <Text style={{ color: theme.mutedForeground }}>›</Text>
        ))}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: 32,
    height: 64,
    justifyContent: 'center',
    width: 64,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  container: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginLeft: 16,
  },
  midiDebugContainer: {
    padding: 8,
  },
  profileEmail: {
    fontSize: 14,
  },
  profileHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    padding: 16,
  },
  profileInfo: {
    gap: 4,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  sectionContainer: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 32,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  settingValue: {
    fontSize: 16,
  },
  signOutButton: {
    alignItems: 'center',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingVertical: 16,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
  version: {
    fontSize: 12,
    marginBottom: 48,
    marginTop: 24,
    textAlign: 'center',
  },
});
