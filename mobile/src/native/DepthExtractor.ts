import { NativeModules, Platform } from 'react-native';

interface DepthData {
  depthData: string | null; // Base64 encoded depth map (16-bit per pixel)
  width: number;              // Depth map width (typically 1/4 of photo resolution)
  height: number;             // Depth map height
  depthFormat: string;        // Format: "DEPTH16" for 16-bit depth
  depthScale: number;         // Scale factor to convert to meters (typically 0.001 for mm to m)
  isSimulated: boolean;       // True if this is placeholder data
  message?: string;           // Optional message for debugging
}

interface DepthExtractorModule {
  /**
   * Check if ARCore is supported on this Android device
   * @returns Promise resolving to true if ARCore is available
   */
  isARCoreSupported(): Promise<boolean>;
  
  /**
   * Check if depth mode is supported (requires ARCore 1.18+)
   * @returns Promise resolving to true if depth capture is supported
   */
  isDepthModeSupported(): Promise<boolean>;
  
  /**
   * Extract depth data from a captured photo
   * 
   * Note: Current implementation is a stub that returns structure
   * without real depth data. See ANDROID_DEPTH_INTEGRATION.md for
   * full implementation with ARCore camera session.
   * 
   * @param photoPath File path to the captured photo (file:// URI)
   * @returns Promise resolving to depth data or null if unavailable
   */
  extractDepthData(photoPath: string): Promise<DepthData | null>;
}

const { DepthExtractor } = NativeModules;

if (!DepthExtractor) {
  console.warn(
    'DepthExtractor native module not found. ' +
    'Make sure you have run `npx expo prebuild` and rebuilt the app.'
  );
}

export default DepthExtractor as DepthExtractorModule;

/**
 * Helper function to check if depth capture is available
 * Combines ARCore support check with depth mode support
 */
export async function isDepthCaptureAvailable(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  
  if (!DepthExtractor) {
    return false;
  }
  
  try {
    const arCoreSupported = await DepthExtractor.isARCoreSupported();
    if (!arCoreSupported) {
      return false;
    }
    
    const depthModeSupported = await DepthExtractor.isDepthModeSupported();
    return depthModeSupported;
  } catch (error) {
    console.error('Error checking depth capture availability:', error);
    return false;
  }
}

/**
 * Helper to convert base64 depth map to typed array
 * Useful for processing depth data in JavaScript
 */
export function decodeDepthMap(base64Data: string): Uint16Array | null {
  try {
    // Decode base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert to 16-bit unsigned integers
    return new Uint16Array(bytes.buffer);
  } catch (error) {
    console.error('Error decoding depth map:', error);
    return null;
  }
}
