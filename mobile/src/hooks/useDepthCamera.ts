import { useState, useCallback, useRef, useEffect } from 'react';
import { Camera, useCameraDevice, useCameraFormat, PhotoFile } from 'react-native-vision-camera';
import { Platform } from 'react-native';

export interface DepthCaptureResult {
  photoUri: string;
  depthData: string | null; // Base64 encoded depth map
  depthQuality: 'high' | 'medium' | 'low' | 'none';
  timestamp: number;
}

export interface DepthCameraConfig {
  preferredDevice?: 'back' | 'front';
  minDepthQuality?: 'high' | 'medium' | 'low';
}

/**
 * Custom hook for capturing photos with depth data using react-native-vision-camera
 * Supports LiDAR on iOS (iPhone 12 Pro+) and ARCore on Android
 */
export function useDepthCamera(config: DepthCameraConfig = {}) {
  const { preferredDevice = 'back', minDepthQuality = 'medium' } = config;
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [depthAvailable, setDepthAvailable] = useState(false);
  const cameraRef = useRef<Camera>(null);

  // Get the appropriate camera device
  const device = useCameraDevice(preferredDevice, {
    physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera', 'telephoto-camera']
  });

  // Select camera format that supports depth data
  const format = useCameraFormat(device, [
    { photoResolution: { width: 1920, height: 1440 } },
    // iOS LiDAR support
    { pixelFormat: 'depth' },
  ]);

  // Check for camera permissions
  useEffect(() => {
    checkPermissions();
  }, []);

  // Check if depth capture is available on this device
  useEffect(() => {
    if (device && format) {
      // Check for LiDAR (iOS) or ARCore (Android) support
      const hasDepth = checkDepthSupport();
      setDepthAvailable(hasDepth);
    }
  }, [device, format]);

  const checkPermissions = async () => {
    const cameraPermission = await Camera.getCameraPermissionStatus();
    setHasPermission(cameraPermission === 'granted');
    
    if (cameraPermission !== 'granted') {
      const newPermission = await Camera.requestCameraPermission();
      setHasPermission(newPermission === 'granted');
    }
  };

  const checkDepthSupport = (): boolean => {
    if (!device) return false;

    if (Platform.OS === 'ios') {
      // Check for LiDAR sensor (iPhone 12 Pro, 13 Pro, 14 Pro, 15 Pro)
      // supportsDepthCapture is a property on the device
      return (device as any).supportsDepthCapture === true;
    } else if (Platform.OS === 'android') {
      // Check for ARCore support
      // This will be validated by our native module
      return true; // Will be checked at runtime by native code
    }
    
    return false;
  };

  /**
   * Capture a photo with depth data
   */
  const captureWithDepth = useCallback(async (): Promise<DepthCaptureResult | null> => {
    if (!cameraRef.current || !device) {
      console.error('Camera not ready');
      return null;
    }

    setIsCapturing(true);

    try {
      // Capture the photo
      const photo: PhotoFile = await cameraRef.current.takePhoto({
        enableShutterSound: true,
        flash: 'off',
        qualityPrioritization: 'quality',
      });

      let depthData: string | null = null;
      let depthQuality: 'high' | 'medium' | 'low' | 'none' = 'none';

      if (depthAvailable) {
        // Extract depth data using native module
        if (Platform.OS === 'ios') {
          depthData = await extractDepthDataIOS(photo.path);
          depthQuality = assessDepthQualityIOS(depthData);
        } else if (Platform.OS === 'android') {
          depthData = await extractDepthDataAndroid(photo.path);
          depthQuality = assessDepthQualityAndroid(depthData);
        }
      }

      // Check if depth quality meets minimum requirements
      if (minDepthQuality !== 'low') {
        const qualityLevels = { 'none': 0, 'low': 1, 'medium': 2, 'high': 3 };
        if (qualityLevels[depthQuality] < qualityLevels[minDepthQuality]) {
          console.warn(`Depth quality ${depthQuality} below minimum ${minDepthQuality}`);
        }
      }

      return {
        photoUri: `file://${photo.path}`,
        depthData,
        depthQuality,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('Error capturing photo with depth:', error);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [device, depthAvailable, minDepthQuality]);

  /**
   * Request camera permissions if not already granted
   */
  const requestPermissions = useCallback(async () => {
    const permission = await Camera.requestCameraPermission();
    setHasPermission(permission === 'granted');
    return permission === 'granted';
  }, []);

  return {
    cameraRef,
    device,
    format,
    hasPermission,
    depthAvailable,
    isCapturing,
    captureWithDepth,
    requestPermissions,
  };
}

/**
 * Extract depth data from iOS LiDAR sensor
 * This calls a native module that accesses AVDepthData
 */
async function extractDepthDataIOS(photoPath: string): Promise<string | null> {
  try {
    const DepthExtractor = require('../native/DepthExtractor').default;
    
    if (!DepthExtractor) {
      console.warn('DepthExtractor native module not available - iOS setup required');
      return null;
    }
    
    const depthData = await DepthExtractor.extractDepthData(photoPath);
    
    if (!depthData) {
      console.log('No depth data available in photo');
      return null;
    }
    
    console.log(
      `Extracted depth data: ${depthData.width}x${depthData.height}, ` +
      `accuracy: ${depthData.depthDataAccuracy}, quality: ${depthData.depthDataQuality}`
    );
    
    return depthData.depthData;
  } catch (error) {
    console.error('Error extracting iOS depth data:', error);
    return null;
  }
}

/**
 * Extract depth data from Android ARCore
 * This calls a native module that accesses ARCore's depth API
 */
async function extractDepthDataAndroid(photoPath: string): Promise<string | null> {
  try {
    const DepthExtractor = require('../native/DepthExtractor').default;
    
    if (!DepthExtractor) {
      console.warn('DepthExtractor native module not available');
      return null;
    }
    
    const depthData = await DepthExtractor.extractDepthData(photoPath);
    
    if (!depthData || !depthData.depthData) {
      if (depthData?.isSimulated) {
        console.log('Android depth extraction stub - native implementation pending');
      } else {
        console.log('No depth data available in photo');
      }
      return null;
    }
    
    console.log(
      `Extracted depth data: ${depthData.width}x${depthData.height}, ` +
      `format: ${depthData.depthFormat}, scale: ${depthData.depthScale}`
    );
    
    return depthData.depthData;
  } catch (error) {
    console.error('Error extracting Android depth data:', error);
    return null;
  }
}

/**
 * Assess the quality of iOS depth data
 */
function assessDepthQualityIOS(depthData: string | null): 'high' | 'medium' | 'low' | 'none' {
  if (!depthData) return 'none';
  
  // TODO: Implement proper quality assessment
  // Check depth map resolution, confidence values, etc.
  try {
    const dataLength = depthData.length;
    if (dataLength > 100000) return 'high';
    if (dataLength > 50000) return 'medium';
    if (dataLength > 0) return 'low';
  } catch (error) {
    console.error('Error assessing iOS depth quality:', error);
  }
  
  return 'none';
}

/**
 * Assess the quality of Android depth data
 */
function assessDepthQualityAndroid(depthData: string | null): 'high' | 'medium' | 'low' | 'none' {
  if (!depthData) return 'none';
  
  // TODO: Implement proper quality assessment
  // Check ARCore tracking state, depth confidence, etc.
  try {
    const dataLength = depthData.length;
    if (dataLength > 100000) return 'high';
    if (dataLength > 50000) return 'medium';
    if (dataLength > 0) return 'low';
  } catch (error) {
    console.error('Error assessing Android depth quality:', error);
  }
  
  return 'none';
}
