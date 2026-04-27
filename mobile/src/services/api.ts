/**
 * Axios API Client Configuration
 * 
 * Central axios instance for all API requests.
 * Configured with platform-aware base URL and timeout.
 * 
 * DEV NOTES:
 * - Android Emulator: Uses 10.0.2.2:8000 (special alias to host machine)
 * - iOS Simulator: Uses localhost:8000
 * - Physical Device: Uses your machine's LAN IP (same WiFi required)
 *   Update DEV_MACHINE_IP if your IP changes: run `ipconfig` and look for
 *   the IPv4 Address under your WiFi adapter.
 */

import axios from 'axios';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

// Your machine's LAN IP — update this if it changes (run `ipconfig` to find it)
const DEV_MACHINE_IP = '172.20.63.112';

/**
 * Base URL Configuration
 */
const API_BASE_URL = (() => {
  const isDevice = Device.isDevice;
  console.log(`📱 [API] Platform.OS: ${Platform.OS}, isDevice: ${isDevice}, __DEV__: ${__DEV__}`);

  if (__DEV__) {
    if (isDevice) {
      // Physical device — use machine's LAN IP (phone must be on same WiFi)
      return `http://${DEV_MACHINE_IP}:8000`;
    } else if (Platform.OS === 'android') {
      // Android emulator
      return 'http://10.0.2.2:8000';
    } else {
      // iOS simulator
      return 'http://localhost:8000';
    }
  } else {
    // Production
    return 'https://api.nutrilabelai.com';
  }
})();

/**
 * Axios client instance
 * 
 * Pre-configured with:
 * - Platform-aware base URL
 * - 30 second timeout
 * - JSON content type
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log the API base URL for debugging
console.log(`🌐 [API] Base URL: ${API_BASE_URL}`);

/**
 * Fetch featured dishes from the backend
 * Note: Currently returns empty array as endpoint is not implemented
 */
export async function fetchFeaturedDishes(): Promise<any[]> {
  try {
    // TODO: Implement /dishes/featured endpoint on backend
    // const response = await apiClient.get('/dishes/featured');
    // return response.data;
    return [];
  } catch (error) {
    console.error('[API] Failed to fetch featured dishes:', error);
    return [];
  }
}

//Test 2