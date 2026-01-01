import type { ConfigContext, ExpoConfig } from 'expo/config';

const APP_ENV = process.env.APP_ENV ?? 'development';
const IS_PRODUCTION = APP_ENV === 'production';

const APP_NAME = IS_PRODUCTION
  ? 'Startup Template'
  : `Startup Template (${APP_ENV.toUpperCase()})`;
const BUNDLE_ID = IS_PRODUCTION
  ? 'com.seawatts.startuptemplate'
  : `com.seawatts.startuptemplate.${APP_ENV}`;
const APP_SCHEME = IS_PRODUCTION
  ? 'startuptemplate'
  : `startuptemplate-${APP_ENV}`;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  android: {
    adaptiveIcon: {
      backgroundColor: '#1F104A',
      foregroundImage: './assets/icon-light.png',
    },
    edgeToEdgeEnabled: true,
    package: BUNDLE_ID,
  },
  assetBundlePatterns: ['**/*'],
  experiments: {
    reactCanary: true,
    reactCompiler: true,
    tsconfigPaths: true,
    typedRoutes: true,
  },
  extra: {
    APP_ENV,
    eas: {
      projectId: '4480eeb4-797b-46af-a5fe-8c30bd6e2df5',
    },
  },
  icon: './assets/icon-light.png',
  ios: {
    bundleIdentifier: BUNDLE_ID,
    icon: {
      dark: './assets/icon-dark.png',
      light: './assets/icon-light.png',
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSBluetoothAlwaysUsageDescription:
        'This app uses Bluetooth to connect to MIDI devices.',
      NSBluetoothPeripheralUsageDescription:
        'This app uses Bluetooth to connect to MIDI devices.',
    },
    supportsTablet: true,
  },
  name: APP_NAME,
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
    [
      'react-native-ble-plx',
      {
        isBackgroundEnabled: false,
        modes: ['peripheral', 'central'],
      },
    ],
    'expo-audio',
  ],
  runtimeVersion: {
    policy: 'appVersion',
  },
  scheme: APP_SCHEME,
  slug: 'startuptemplate',
  updates: {
    fallbackToCacheTimeout: 0,
    url: 'https://u.expo.dev/4480eeb4-797b-46af-a5fe-8c30bd6e2df5',
  },
  userInterfaceStyle: 'automatic',
  version: '0.1.0',
});
