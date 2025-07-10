import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  android: {
    adaptiveIcon: {
      backgroundColor: '#1F104A',
      foregroundImage: './assets/icon.png',
    },
    package: 'your.bundle.identifier',
  },
  assetBundlePatterns: ['**/*'],
  // extra: {
  //   eas: {
  //     projectId: "your-eas-project-id",
  //   },
  // },
  experiments: {
    tsconfigPaths: true,
    typedRoutes: true,
  },
  icon: './assets/icon.png',
  ios: {
    bundleIdentifier: 'your.bundle.identifier',
    supportsTablet: true,
  },
  name: 'expo',
  orientation: 'portrait',
  plugins: ['expo-router'],
  scheme: 'expo',
  slug: 'expo',
  splash: {
    backgroundColor: '#1F104A',
    image: './assets/icon.png',
    resizeMode: 'contain',
  },
  updates: {
    fallbackToCacheTimeout: 0,
  },
  userInterfaceStyle: 'automatic',
  version: '0.1.0',
});
