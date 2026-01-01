import { QueryClientProvider } from '@tanstack/react-query';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { queryClient } from '~/utils/api';

// This is the main layout of the app using Native Tabs for liquid glass effect
// See: https://docs.expo.dev/router/advanced/native-tabs/
export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <NativeTabs>
        <NativeTabs.Trigger name="index">
          <Label>Home</Label>
          <Icon
            drawable={Platform.OS === 'android' ? 'ic_menu_home' : undefined}
            sf={{ default: 'house', selected: 'house.fill' }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="piano">
          <Label>Piano</Label>
          <Icon
            drawable={Platform.OS === 'android' ? 'ic_media_play' : undefined}
            sf={{ default: 'pianokeys', selected: 'pianokeys' }}
          />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="settings">
          <Label>Settings</Label>
          <Icon
            drawable={
              Platform.OS === 'android' ? 'ic_menu_preferences' : undefined
            }
            sf={{ default: 'gear', selected: 'gear' }}
          />
        </NativeTabs.Trigger>
      </NativeTabs>
      <StatusBar />
    </QueryClientProvider>
  );
}
