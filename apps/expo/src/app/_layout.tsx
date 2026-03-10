import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { queryClient } from '~/utils/api';

// Root layout uses Stack navigator
// - (tabs) group contains Home and Settings with NativeTabs
// - Piano is a full-screen modal for immersive experience
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="piano"
            options={{
              presentation: 'fullScreenModal',
            }}
          />
        </Stack>
        <StatusBar />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
