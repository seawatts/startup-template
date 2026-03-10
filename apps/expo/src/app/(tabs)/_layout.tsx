import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Platform } from 'react-native';

// Tab layout for Home and Settings screens
// Piano is handled separately as a full-screen modal
export default function TabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          drawable={Platform.OS === 'android' ? 'ic_menu_home' : undefined}
          sf={{ default: 'house', selected: 'house.fill' }}
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          drawable={
            Platform.OS === 'android' ? 'ic_menu_preferences' : undefined
          }
          sf={{ default: 'gear', selected: 'gear' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
