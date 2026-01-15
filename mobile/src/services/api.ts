/**
 * Axios API Client Configuration
 * 
 * Central axios instance for all API requests.
 * Configured with platform-aware base URL and timeout.
 * 
 * USAGE:
 * import { apiClient } from './api';
 * const response = await apiClient.post('/label', data);
 * 
 * DEV NOTES:
 * - Android Emulator: Uses 10.0.2.2:8000 (special alias to host machine)
 * - iOS Simulator: Uses localhost:8000
 * - Physical Device: Update PHYSICAL_DEVICE_IP with your machine's LAN IP
 *   Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
 */

import axios from 'axios';
import { Platform } from 'react-native';
import * as Device from 'expo-device';

/**
 * Base URL Configuration
 */
const API_BASE_URL = (() => {
  const isDevice = Device.isDevice;
  console.log(`📱 [API] Platform.OS: ${Platform.OS}, isDevice: ${isDevice}, __DEV__: ${__DEV__}`);
  
  if (__DEV__) {
    // Development mode
    if (Platform.OS === 'android') {
      if (isDevice) {
        // Physical Android device - use LAN IP
        const PHYSICAL_DEVICE_IP = '192.168.1.191';
        return `http://${PHYSICAL_DEVICE_IP}:8000`;
      } else {
        // Android emulator - use special alias to host
        return 'http://10.0.2.2:8000';
      }
    } else if (Platform.OS === 'ios') {
      if (isDevice) {
        // Physical iOS device - use LAN IP
        const PHYSICAL_DEVICE_IP = '192.168.1.191';
        return `http://${PHYSICAL_DEVICE_IP}:8000`;
      } else {
        // iOS simulator - use localhost
        return 'http://localhost:8000';
      }
    } else {
      // Other platforms (web, etc.) - use localhost
      return 'http://localhost:8000';
    }
  } else {
    // Production - update with deployed backend URL
    return 'https://api.nutrilabelai.com';
  }
})();

/**
 * Axios client instance
 * 
 * Pre-configured with:
 * - Platform-aware base URL
 * - 10 second timeout
 * - JSON content type
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Log the API base URL for debugging
console.log(`🌐 [API] Base URL: ${API_BASE_URL}`);
