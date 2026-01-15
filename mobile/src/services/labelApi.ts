/**
 * Label API Service
 * 
 * Handles requests to the POST /label endpoint for nutrition estimation.
 * Uses axios for HTTP requests with proper error handling.
 */

import axios, { AxiosError } from 'axios';
import { Platform } from 'react-native';
import { LabelRequest, LabelResponse, LabelError } from '../types/label';

// ============================================================================
// AXIOS INSTANCE CONFIGURATION
// ============================================================================

/**
 * Get base URL based on environment and platform
 * 
 * For Android Emulator: Use 10.0.2.2 (special alias for host machine)
 * For iOS Simulator: Use localhost
 * For Physical Device: Use your computer's local IP address
 * 
 * DEVELOPMENT SETUP:
 * 1. Android Emulator: Works automatically with 10.0.2.2
 * 2. iOS Simulator: Works automatically with localhost
 * 3. Physical Device: 
 *    - Find your computer's IP: ipconfig (Windows) or ifconfig (Mac/Linux)
 *    - Update PHYSICAL_DEVICE_IP below with your IP (e.g., '192.168.1.100')
 *    - Ensure backend is accessible on network (use 0.0.0.0:8000, not 127.0.0.1:8000)
 * 
 * PRODUCTION:
 * - Update PRODUCTION_URL with deployed backend URL
 */
const PHYSICAL_DEVICE_IP = '192.168.1.100'; // TODO: Update with your computer's IP

const getBaseURL = (): string => {
  if (__DEV__) {
    // Development mode
    if (Platform.OS === 'android') {
      // Android emulator uses special alias
      return 'http://10.0.2.2:8000';
    } else if (Platform.OS === 'ios') {
      // iOS simulator can use localhost
      return 'http://localhost:8000';
    } else {
      // Physical device - use computer's local network IP
      return `http://${PHYSICAL_DEVICE_IP}:8000`;
    }
  } else {
    // Production mode
    return 'https://api.nutrilabelai.com'; // TODO: Update with deployed URL
  }
};

/**
 * Axios instance for API requests
 * 
 * Configured with:
 * - Base URL (environment-aware)
 * - 10 second timeout
 * - JSON content type
 */
export const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000, // 10 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Request nutrition label estimation for a dish
 * 
 * @param dishName - Name of the dish (required)
 * @param targetCalories - Optional calorie target for scaling
 * @param style - Optional preparation style ('home', 'restaurant', etc.)
 * @param topK - Number of similar dishes to retrieve (default: 5)
 * @returns Promise resolving to nutrition label data
 * @throws LabelError with user-friendly message
 * 
 * @example
 * ```typescript
 * try {
 *   const result = await requestLabel('Chicken Tikka Masala', 600);
 *   console.log(`Matched: ${result.matched_dish}`);
 *   console.log(`Calories: ${result.nutrition.calories}`);
 *   console.log(`Confidence: ${result.confidence}`);
 * } catch (error) {
 *   console.error(error.message);
 * }
 * ```
 */
export async function requestLabel(
  dishName: string,
  targetCalories?: number,
  style?: string,
  topK?: number
): Promise<LabelResponse> {
  try {
    // Build request payload
    const requestData: LabelRequest = {
      dish_name: dishName,
    };
    
    if (targetCalories !== undefined) {
      requestData.calories = targetCalories;
    }
    
    if (style !== undefined) {
      requestData.style = style;
    }
    
    if (topK !== undefined) {
      requestData.top_k = topK;
    }

    // Make POST request
    const response = await api.post<LabelResponse>('/label', requestData);
    
    return response.data;
    
  } catch (error) {
    // Transform error into user-friendly message
    throw handleApiError(error);
  }
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Transform axios errors into user-friendly LabelError objects
 * 
 * Handles:
 * - Network errors (no internet, backend down)
 * - Timeout errors (request took too long)
 * - Server errors (500, 502, 503)
 * - Validation errors (400, 422)
 * - Unknown errors
 */
function handleApiError(error: unknown): LabelError {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    
    // Network error (no internet, backend unreachable)
    if (!axiosError.response) {
      if (axiosError.code === 'ECONNABORTED') {
        return {
          message: 'Request timed out. Please check your connection and try again.',
          type: 'timeout',
          originalError: error,
        };
      }
      return {
        message: 'Unable to connect to server. Please check your internet connection.',
        type: 'network',
        originalError: error,
      };
    }
    
    // Server error (500, 502, 503)
    if (axiosError.response.status >= 500) {
      return {
        message: 'Server error. Please try again later.',
        type: 'server',
        originalError: error,
      };
    }
    
    // Validation error (400, 422)
    if (axiosError.response.status === 400 || axiosError.response.status === 422) {
      const errorData = axiosError.response.data as any;
      const errorMessage = errorData?.detail 
        ? (typeof errorData.detail === 'string' 
            ? errorData.detail 
            : 'Invalid request. Please check your input.')
        : 'Invalid request. Please check your input.';
        
      return {
        message: errorMessage,
        type: 'validation',
        originalError: error,
      };
    }
    
    // Other HTTP errors
    return {
      message: `Request failed with status ${axiosError.response.status}`,
      type: 'unknown',
      originalError: error,
    };
  }
  
  // Unknown error type
  return {
    message: 'An unexpected error occurred. Please try again.',
    type: 'unknown',
    originalError: error,
  };
}

// ============================================================================
// HEALTH CHECK (Optional utility)
// ============================================================================

/**
 * Check if backend is accessible
 * 
 * @returns Promise resolving to true if backend is healthy, false otherwise
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await api.get('/health', { timeout: 3000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}
