import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  android: {
    adaptiveIcon: {
      backgroundColor: '#1F104A',
      foregroundImage: './assets/icon-light.png',
    },
    edgeToEdgeEnabled: true,
    package: 'com.seawatts.startuptemplate',
  },
  assetBundlePatterns: ['**/*'],
  // extra: {
  //   eas: {
  //     projectId: "your-eas-project-id",
  //   },
  // },
  experiments: {
    reactCanary: true,
    reactCompiler: true,
    tsconfigPaths: true,
    typedRoutes: true,
  },
  icon: './assets/icon-light.png',
  ios: {
    bundleIdentifier: 'com.seawatts.startuptemplate',
    icon: {
      dark: './assets/icon-dark.png',
      light: './assets/icon-light.png',
    },
    supportsTablet: true,
  },
  name: 'startuptemplate',
  newArchEnabled: true,
  orientation: 'portrait',
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#E4E4E7',
        dark: {
          backgroundColor: '#18181B',
          image: './assets/icon-dark.png',
        },
        image: './assets/icon-light.png',
      },
    ],
  ],
  scheme: 'startuptemplate',
  slug: 'startuptemplate',
  updates: {
    fallbackToCacheTimeout: 0,
  },
  userInterfaceStyle: 'automatic',
  version: '0.1.0',
});
