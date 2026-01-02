import * as SecureStore from 'expo-secure-store';

const SHOW_KEY_NAMES_KEY = 'piano_show_key_names';

/**
 * Get whether key names should be shown on piano keys
 */
export async function getShowKeyNames(): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(SHOW_KEY_NAMES_KEY);
    return value === 'true';
  } catch {
    return false;
  }
}

/**
 * Set whether key names should be shown on piano keys
 */
export async function setShowKeyNames(value: boolean): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      SHOW_KEY_NAMES_KEY,
      value ? 'true' : 'false',
    );
  } catch (error) {
    console.error('Failed to save show key names setting:', error);
  }
}
