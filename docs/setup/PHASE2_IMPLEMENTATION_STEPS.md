# Phase 2 Implementation: Real AR/Depth Capture

## Overview
This guide walks through implementing real LiDAR (iOS) and ARCore (Android) depth capture to replace the current simulation.

**Estimated Time:** 3-5 days
**Difficulty:** Intermediate-Advanced

---

## Step 1: Setup react-native-vision-camera

### 1.1 Install Dependencies

```bash
cd mobile

# Install react-native-vision-camera
npx expo install react-native-vision-camera

# For depth processing
npm install react-native-worklets-core
```

### 1.2 Switch to Bare Workflow (if needed)

react-native-vision-camera requires native code access:

```bash
# Generate native android/ios folders
npx expo prebuild

# This creates:
# - android/ folder
# - ios/ folder
```

### 1.3 Configure iOS (Info.plist)

Add to `mobile/ios/YourApp/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to estimate your meal calories</string>
<key>NSMicrophoneUsageDescription</key>
<string>Optional: for video capture</string>
```

### 1.4 Configure Android (AndroidManifest.xml)

Add to `mobile/android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<uses-feature android:name="android.hardware.camera.ar" android:required="false" />
```

---

## Step 2: Create Depth Capture Hook

Create `mobile/src/hooks/useDepthCamera.ts`:

```typescript
import { useRef, useState, useCallback } from 'react';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { Worklets } from 'react-native-worklets-core';

interface DepthData {
  depthMap: string; // base64
  format: 'png_16bit' | 'binary_float32';
  scale: number;
}

interface CameraIntrinsics {
  focal_length_x: number;
  focal_length_y: number;
  principal_point_x: number;
  principal_point_y: number;
  image_width: number;
  image_height: number;
}

export const useDepthCamera = () => {
  const camera = useRef<Camera>(null);
  const device = useCameraDevice('back', {
    physicalDevices: ['ultra-wide-angle-camera', 'wide-angle-camera']
  });

  const [isScanning, setIsScanning] = useState(false);
  const [depthQuality, setDepthQuality] = useState(0);
  const [depthData, setDepthData] = useState<DepthData | null>(null);
  const [intrinsics, setIntrinsics] = useState<CameraIntrinsics | null>(null);

  // Check if device supports depth
  const supportsDepth = device?.supportsDepth ?? false;

  // Frame processor for real-time depth capture
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    // Check if frame has depth data
    if (frame.depth) {
      // Extract depth map
      const depthBuffer = frame.depth.buffer;
      const width = frame.depth.width;
      const height = frame.depth.height;
      
      // Calculate depth quality (coverage, range, etc.)
      // This is a simplified version - implement full quality check
      const quality = calculateDepthQuality(depthBuffer, width, height);
      
      // Update state on JS thread
      Worklets.runOnJS(setDepthQuality)(quality);
    }
  }, []);

  const captureDepth = useCallback(async (): Promise<{
    depthData: DepthData;
    intrinsics: CameraIntrinsics;
    rgbImage: string;
  } | null> => {
    if (!camera.current || !supportsDepth) {
      console.warn('Depth capture not supported on this device');
      return null;
    }

    try {
      setIsScanning(true);

      // Capture photo with depth
      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'quality',
        enableDepth: true,
      });

      // Extract RGB image
      const rgbImage = photo.path; // Will need to convert to base64

      // Extract depth data (iOS LiDAR format)
      const depthMap = photo.depth?.data; // Raw depth buffer
      const depthWidth = photo.depth?.width ?? 0;
      const depthHeight = photo.depth?.height ?? 0;

      // Get camera intrinsics
      const intrinsics: CameraIntrinsics = {
        focal_length_x: photo.metadata?.focalLength?.x ?? 1000,
        focal_length_y: photo.metadata?.focalLength?.y ?? 1000,
        principal_point_x: photo.width / 2,
        principal_point_y: photo.height / 2,
        image_width: photo.width,
        image_height: photo.height,
      };

      // Encode depth map to base64
      const depthBase64 = await encodeDepthMapToBase64(depthMap, depthWidth, depthHeight);

      const depthData: DepthData = {
        depthMap: depthBase64,
        format: 'binary_float32', // iOS LiDAR uses float32
        scale: 0.001, // meters per unit
      };

      return {
        depthData,
        intrinsics,
        rgbImage: await convertImageToBase64(rgbImage),
      };
    } catch (error) {
      console.error('Depth capture failed:', error);
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [supportsDepth]);

  return {
    camera,
    device,
    supportsDepth,
    isScanning,
    depthQuality,
    captureDepth,
    frameProcessor,
  };
};

// Helper functions
function calculateDepthQuality(buffer: ArrayBuffer, width: number, height: number): number {
  'worklet';
  
  // Simplified quality calculation
  // In production: check coverage, range distribution, noise level
  const values = new Float32Array(buffer);
  let validPixels = 0;
  let totalPixels = values.length;
  
  for (let i = 0; i < totalPixels; i++) {
    if (values[i] > 0 && values[i] < 10) { // Valid depth range 0-10m
      validPixels++;
    }
  }
  
  return validPixels / totalPixels;
}

async function encodeDepthMapToBase64(
  buffer: ArrayBuffer,
  width: number,
  height: number
): Promise<string> {
  // Convert depth buffer to base64
  // Platform-specific implementation needed
  // For iOS: Use CVPixelBuffer conversion
  // For Android: Use Bitmap encoding
  
  // Placeholder - implement native module for this
  return 'base64_encoded_depth_data';
}

async function convertImageToBase64(path: string): Promise<string> {
  // Convert image file to base64
  const { default: RNFS } = await import('react-native-fs');
  return await RNFS.readFile(path, 'base64');
}
```

---

## Step 3: Update CameraCaptureScreen

Modify `mobile/src/screens/Vision/CameraCaptureScreen.tsx`:

```typescript
// Add at top
import { Camera } from 'react-native-vision-camera';
import { useDepthCamera } from '../../hooks/useDepthCamera';

// Inside component
export const CameraCaptureScreen: React.FC = () => {
  const navigation = useNavigation<ExploreStackNavigationProp>();
  
  // Replace existing capability detection
  const {
    camera: cameraRef,
    device,
    supportsDepth,
    isScanning,
    depthQuality,
    captureDepth,
    frameProcessor,
  } = useDepthCamera();

  // Update capability state
  useEffect(() => {
    setDepthCapable(supportsDepth);
    setArCapable(supportsDepth);
  }, [supportsDepth]);

  // Replace startARScanning with real depth capture
  const startARScanning = async () => {
    if (!supportsDepth) {
      Alert.alert('Not Supported', 'Your device does not support depth capture.');
      return;
    }

    try {
      setCurrentStep('ar-scanning');
      setScanningStatus('initializing');
      setScanProgress(0);

      // Start scanning animation
      setScanningStatus('scanning');
      
      // Capture depth data
      const result = await captureDepth();
      
      if (!result) {
        throw new Error('Failed to capture depth data');
      }

      const { depthData: capturedDepth, intrinsics, rgbImage } = result;

      // Check depth quality
      if (depthQuality < 0.5) {
        Alert.alert(
          'Low Depth Quality',
          'Depth data quality is insufficient. Would you like to use 2-photo mode instead?',
          [
            { text: 'Try Again', onPress: () => startARScanning() },
            { 
              text: 'Use 2-Photo Mode', 
              onPress: () => {
                setCaptureMode('multi_angle');
                setCurrentStep('capture-top');
              }
            },
          ]
        );
        return;
      }

      // Success!
      setScanningStatus('complete');
      setScanProgress(100);
      
      setDepthData(capturedDepth);
      setCameraIntrinsics(intrinsics);
      setTopImageBase64(rgbImage);

      // Auto-advance to preview
      setTimeout(() => {
        setCurrentStep('preview');
      }, 500);

    } catch (error) {
      console.error('AR scanning failed:', error);
      setScanningStatus('error');
      Alert.alert('Scanning Failed', 'Failed to capture depth data. Please try again.');
    }
  };

  // Render camera view when in AR mode
  if (currentStep === 'ar-scanning' && device) {
    return (
      <View style={styles.container}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          photo={true}
          enableDepthData={true}
          frameProcessor={frameProcessor}
        />
        
        <ARScanningOverlay
          status={scanningStatus}
          progress={scanProgress}
          depthQuality={depthQuality}
          onScanComplete={() => {/* handled in startARScanning */}}
        />
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => {
            setCurrentStep('select-mode');
            setScanningStatus('initializing');
          }}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ... rest of the component
};
```

---

## Step 4: Add Native Depth Processing (iOS)

Create `mobile/ios/DepthCapture.swift`:

```swift
import Foundation
import AVFoundation
import UIKit

@objc(DepthCapture)
class DepthCapture: NSObject {
  
  @objc
  func extractDepthData(_ photoData: Data, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    
    guard let source = CGImageSourceCreateWithData(photoData as CFData, nil),
          let auxDataInfo = CGImageSourceCopyAuxiliaryDataInfoAtIndex(source, 0, kCGImageAuxiliaryDataTypeDepth) as? [AnyHashable: Any] else {
      reject("NO_DEPTH", "No depth data found in image", nil)
      return
    }
    
    do {
      // Extract depth map
      let depthData = try AVDepthData(fromDictionaryRepresentation: auxDataInfo)
      let depthDataMap = depthData.depthDataMap
      
      // Convert to Float32
      let convertedDepth = depthData.converting(toDepthDataType: kCVPixelFormatType_DepthFloat32)
      let pixelBuffer = convertedDepth.depthDataMap
      
      // Lock pixel buffer
      CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
      defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }
      
      let width = CVPixelBufferGetWidth(pixelBuffer)
      let height = CVPixelBufferGetHeight(pixelBuffer)
      let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
      
      guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else {
        reject("NO_ADDRESS", "Failed to get pixel buffer address", nil)
        return
      }
      
      // Convert to Data
      let data = Data(bytes: baseAddress, count: height * bytesPerRow)
      let base64 = data.base64EncodedString()
      
      // Get camera intrinsics
      let intrinsics = depthData.cameraCalibrationData?.intrinsicMatrix
      
      resolve([
        "depthMap": base64,
        "width": width,
        "height": height,
        "format": "binary_float32",
        "intrinsics": [
          "fx": intrinsics?[0][0] ?? 1000.0,
          "fy": intrinsics?[1][1] ?? 1000.0,
          "cx": intrinsics?[2][0] ?? Double(width) / 2.0,
          "cy": intrinsics?[2][1] ?? Double(height) / 2.0
        ]
      ])
      
    } catch {
      reject("EXTRACTION_FAILED", "Failed to extract depth data: \\(error.localizedDescription)", error)
    }
  }
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
}
```

Create bridge file `mobile/ios/DepthCapture.m`:

```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DepthCapture, NSObject)

RCT_EXTERN_METHOD(extractDepthData:(NSData *)photoData
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
```

---

## Step 5: Add Native Depth Processing (Android)

Create `mobile/android/app/src/main/java/com/yourapp/DepthCaptureModule.kt`:

```kotlin
package com.yourapp

import android.graphics.ImageFormat
import android.media.Image
import android.util.Base64
import com.facebook.react.bridge.*
import java.nio.ByteBuffer

class DepthCaptureModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
  
  override fun getName() = "DepthCapture"
  
  @ReactMethod
  fun extractDepthData(image: ReadableMap, promise: Promise) {
    try {
      // ARCore depth map processing
      val width = image.getInt("width")
      val height = image.getInt("height")
      val buffer = image.getString("buffer") // base64 encoded
      
      // Decode depth data
      val depthBytes = Base64.decode(buffer, Base64.DEFAULT)
      val depthBuffer = ByteBuffer.wrap(depthBytes)
      
      // Convert to Float32 array
      val depthArray = FloatArray(width * height)
      val shortBuffer = depthBuffer.asShortBuffer()
      
      for (i in 0 until width * height) {
        // ARCore depth is in millimeters (uint16)
        val depthMm = shortBuffer.get(i).toInt() and 0xFFFF
        depthArray[i] = depthMm / 1000.0f // Convert to meters
      }
      
      // Re-encode as Float32
      val floatBuffer = ByteBuffer.allocate(depthArray.size * 4)
      floatBuffer.asFloatBuffer().put(depthArray)
      val base64Depth = Base64.encodeToString(floatBuffer.array(), Base64.DEFAULT)
      
      val result = Arguments.createMap().apply {
        putString("depthMap", base64Depth)
        putInt("width", width)
        putInt("height", height)
        putString("format", "binary_float32")
      }
      
      promise.resolve(result)
      
    } catch (e: Exception) {
      promise.reject("EXTRACTION_FAILED", "Failed to extract depth: ${e.message}", e)
    }
  }
}

class DepthCapturePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    return listOf(DepthCaptureModule(reactContext))
  }

  override fun createViewManagers(reactContext: ReactApplicationContext) = emptyList<ViewManager<*, *>>()
}
```

Register in `MainApplication.java`:

```java
@Override
protected List<ReactPackage> getPackages() {
  return Arrays.<ReactPackage>asList(
      new MainReactPackage(),
      new DepthCapturePackage()  // Add this
  );
}
```

---

## Step 6: Testing

### 6.1 Test on iOS Device with LiDAR

```bash
cd mobile

# Build and run on physical device
npx expo run:ios --device
```

Test flow:
1. Open app → Vision tab
2. Select "AR Scan" mode
3. Point camera at a plate of food
4. Should see real depth quality indicator
5. Capture should extract real LiDAR data
6. Backend should process with depth mode

### 6.2 Test on Android with ARCore

```bash
cd mobile
npx expo run:android
```

Similar test flow for Android devices.

### 6.3 Verify Backend Processing

Check logs for:
```
✅ [VisionOrchestrator] Using depth estimation mode
🔬 [DepthVolumeEstimator] Point cloud size: 12543 points
📊 [DepthVolumeEstimator] Volume: 375.2 ml, Quality: 0.87
```

---

## Step 7: Troubleshooting

### Common Issues

1. **"No depth data available"**
   - Check device actually has LiDAR (iPhone 12 Pro+)
   - Verify camera permissions granted
   - Check `enableDepthData={true}` on Camera component

2. **"Depth quality too low"**
   - Ensure good lighting
   - Point camera directly at food (not too angled)
   - Maintain 30-50cm distance from plate

3. **"Module 'DepthCapture' not found"**
   - Rebuild native code: `npx expo prebuild --clean`
   - Check bridge files are properly created
   - Verify module registration in AppDelegate/MainActivity

4. **Backend errors**
   - Check Open3D is installed: `pip install open3d`
   - Verify depth map format matches backend expectation
   - Check camera intrinsics are valid numbers

---

## Next Steps

After completing Phase 2:

1. **Collect Real Data** - Test with various foods and lighting
2. **Tune Quality Thresholds** - Adjust based on real performance
3. **Optimize Performance** - Cache depth processing, reduce latency
4. **Add User Feedback** - Collect accuracy reports for improvement

## Estimated Timeline

- **Day 1-2**: Setup react-native-vision-camera, test basic capture
- **Day 3-4**: Implement native depth extraction modules
- **Day 5**: Integration testing and bug fixes
- **Day 6-7**: Performance tuning and edge case handling

---

## Alternative: Simpler Approach for MVP

If full native implementation is too complex, consider:

**Quick Win: Multi-frame Depth Estimation**
- Capture 3-5 frames from slightly different angles
- Use structure-from-motion to estimate depth
- Libraries: OpenCV.js or TensorFlow.js depth estimation
- Accuracy: 70-80% (vs 90-95% with LiDAR)

This can be implemented entirely in JavaScript without native modules.

---

**Questions or issues? Check:**
- react-native-vision-camera docs: https://github.com/mrousavy/react-native-vision-camera
- ARKit depth: https://developer.apple.com/documentation/arkit
- ARCore depth: https://developers.google.com/ar/develop/depth
