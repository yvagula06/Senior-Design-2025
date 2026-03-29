/**
 * TypeScript bridge for DepthExtractor native module
 * Provides depth data extraction from captured images using ARCore
 */
import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'DepthExtractor' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const DepthExtractorModule = NativeModules.DepthExtractor
  ? NativeModules.DepthExtractor
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export interface ARCoreSupportResult {
  supported: boolean;
  message: string;
}

export interface DepthModeSupportResult {
  supported: boolean;
  message: string;
}

export interface DepthDataMetadata {
  width: number;
  height: number;
  format: string;
  isStubData?: boolean;
  message?: string;
  timestamp?: number;
  minDepth?: number;
  maxDepth?: number;
  averageConfidence?: number;
}

export interface DepthDataResult {
  depthMap: number[][];
  confidenceMap: number[][];
  metadata: DepthDataMetadata;
}

export class DepthExtractor {
  /**
   * Check if ARCore is supported and installed on this device
   * @returns Promise resolving to support status and message
   */
  static async isARCoreSupported(): Promise<ARCoreSupportResult> {
    if (Platform.OS !== 'android') {
      return {
        supported: false,
        message: 'ARCore is only available on Android',
      };
    }
    return DepthExtractorModule.isARCoreSupported();
  }

  /**
   * Check if depth mode is supported on this device
   * @returns Promise resolving to depth mode support status
   */
  static async isDepthModeSupported(): Promise<DepthModeSupportResult> {
    if (Platform.OS !== 'android') {
      return {
        supported: false,
        message: 'Depth mode is only available on Android',
      };
    }
    return DepthExtractorModule.isDepthModeSupported();
  }

  /**
   * Extract depth data from a captured image
   * @param imageUri - URI of the captured image (file://, content://, etc.)
   * @returns Promise resolving to depth map, confidence map, and metadata
   */
  static async extractDepthData(imageUri: string): Promise<DepthDataResult> {
    if (Platform.OS !== 'android') {
      throw new Error('Depth extraction is only available on Android');
    }
    
    if (!imageUri || typeof imageUri !== 'string') {
      throw new Error('Invalid image URI provided');
    }

    return DepthExtractorModule.extractDepthData(imageUri);
  }

  /**
   * Check if depth extraction is available on this device
   * Convenience method that checks both ARCore and depth mode support
   * @returns Promise resolving to availability status
   */
  static async isAvailable(): Promise<{
    available: boolean;
    arCoreSupported: boolean;
    depthModeSupported: boolean;
    message: string;
  }> {
    if (Platform.OS !== 'android') {
      return {
        available: false,
        arCoreSupported: false,
        depthModeSupported: false,
        message: 'Depth extraction is only available on Android',
      };
    }

    try {
      const [arCoreResult, depthModeResult] = await Promise.all([
        this.isARCoreSupported(),
        this.isDepthModeSupported(),
      ]);

      const available = arCoreResult.supported && depthModeResult.supported;

      return {
        available,
        arCoreSupported: arCoreResult.supported,
        depthModeSupported: depthModeResult.supported,
        message: available
          ? 'Depth extraction is available'
          : `${arCoreResult.message}. ${depthModeResult.message}`,
      };
    } catch (error) {
      return {
        available: false,
        arCoreSupported: false,
        depthModeSupported: false,
        message: error instanceof Error ? error.message : 'Unknown error checking availability',
      };
    }
  }
}

export default DepthExtractor;
