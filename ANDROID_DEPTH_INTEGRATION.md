# Android ARCore Depth Integration Guide

**Status: Phase 2 - Native Module Structure Complete**

## Overview

This guide explains how to complete the ARCore depth capture integration for Android devices. The basic native module structure has been created, but the actual ARCore camera session and depth extraction needs to be implemented.

## What's Already Done ✅

1. ✅ Android native project generated with `expo prebuild`
2. ✅ AndroidManifest.xml configured with ARCore permissions and features
3. ✅ build.gradle updated with ARCore dependency (v1.44.0)
4. ✅ DepthExtractorModule.kt created with module structure
5. ✅ DepthExtractorPackage.kt created and registered in MainApplication.kt
6. ✅ TypeScript bridge (DepthExtractor.ts) created
7. ✅ useDepthCamera hook updated to call native module

## What's Remaining 🚧

The current DepthExtractorModule returns a stub response. To enable real depth capture, you need to:

1. Implement ARCore camera session management
2. Capture photo and depth frame simultaneously
3. Extract and encode depth data
4. Handle ARCore lifecycle properly

## Architecture

```
┌─────────────────────────────────────────┐
│  React Native (CameraCaptureScreen)    │
│  - User taps capture button            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  useDepthCamera Hook                    │
│  - Manages camera permissions           │
│  - Calls native depth extraction        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  DepthExtractor Native Module (Kotlin)  │
│  - Manages ARCore session               │
│  - Captures synchronized photo + depth  │
│  - Encodes depth map as base64          │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  ARCore Depth API                       │
│  - acquireDepthImage16Bits()            │
│  - Depth confidence data                │
│  - Camera intrinsics                    │
└─────────────────────────────────────────┘
```

## Step 1: Update DepthExtractorModule for Real ARCore Session

Replace the stub `extractDepthData` method with a full implementation:

```kotlin
package com.seniordesign.nutritionestimator

import android.graphics.Bitmap
import android.graphics.ImageFormat
import android.media.Image
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.*
import com.google.ar.core.*
import com.google.ar.core.exceptions.CameraNotAvailableException
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

class DepthExtractorModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var arSession: Session? = null
    private var isSessionInitialized = false

    override fun getName(): String = "DepthExtractor"

    /**
     * Initialize ARCore session with depth mode enabled
     */
    @ReactMethod
    fun initializeARSession(promise: Promise) {
        try {
            // Check ARCore availability
            val availability = ArCoreApk.getInstance().checkAvailability(reactApplicationContext)
            if (!availability.isSupported) {
                promise.reject("ARCORE_NOT_SUPPORTED", "ARCore is not supported on this device")
                return
            }

            // Create session
            arSession = Session(reactApplicationContext)
            
            // Configure session for depth mode
            val config = arSession!!.config
            config.depthMode = if (arSession!!.isDepthModeSupported(Config.DepthMode.AUTOMATIC)) {
                Config.DepthMode.AUTOMATIC
            } else {
                Config.DepthMode.DISABLED
            }
            
            // Enable focus mode for better depth accuracy
            config.focusMode = Config.FocusMode.AUTO
            config.updateMode = Config.UpdateMode.LATEST_CAMERA_IMAGE
            
            arSession!!.configure(config)
            isSessionInitialized = true
            
            Log.d(TAG, "ARCore session initialized with depth mode: ${config.depthMode}")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize ARCore session", e)
            promise.reject("INIT_ERROR", "Failed to initialize ARCore session", e)
        }
    }

    /**
     * Start ARCore camera and tracking
     */
    @ReactMethod
    fun startCamera(promise: Promise) {
        try {
            if (!isSessionInitialized || arSession == null) {
                promise.reject("NOT_INITIALIZED", "ARCore session not initialized")
                return
            }
            
            arSession!!.resume()
            promise.resolve(true)
            
        } catch (e: CameraNotAvailableException) {
            Log.e(TAG, "Camera not available", e)
            promise.reject("CAMERA_ERROR", "Camera not available", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start camera", e)
            promise.reject("START_ERROR", "Failed to start camera", e)
        }
    }

    /**
     * Capture current frame with depth data
     */
    @ReactMethod
    fun captureFrameWithDepth(promise: Promise) {
        try {
            if (!isSessionInitialized || arSession == null) {
                promise.reject("NOT_INITIALIZED", "ARCore session not initialized")
                return
            }

            // Update ARCore session to get latest frame
            val frame = arSession!!.update()
            
            // Check tracking state
            if (frame.camera.trackingState != TrackingState.TRACKING) {
                promise.reject("NOT_TRACKING", "ARCore is not tracking. Move device slowly to establish tracking.")
                return
            }

            // Acquire camera image
            val cameraImage = frame.acquireCameraImage()
            
            // Try to acquire depth image
            val depthImage = frame.acquireDepthImage16Bits()
            
            // Convert camera image to bitmap/base64
            val cameraBase64 = convertImageToBase64(cameraImage)
            cameraImage.close()
            
            // Extract depth data
            val depthBase64 = convertDepthImageToBase64(depthImage)
            val depthConfidence = calculateDepthConfidence(depthImage)
            
            val depthWidth = depthImage.width
            val depthHeight = depthImage.height
            
            depthImage.close()
            
            // Get camera intrinsics for 3D reconstruction
            val intrinsics = frame.camera.imageIntrinsics
            val focalLength = intrinsics.focalLength
            val principalPoint = intrinsics.principalPoint
            
            // Build result
            val result = Arguments.createMap().apply {
                putString("cameraImage", cameraBase64)
                putString("depthData", depthBase64)
                putInt("depthWidth", depthWidth)
                putInt("depthHeight", depthHeight)
                putString("depthFormat", "DEPTH16")
                putDouble("depthScale", 0.001) // mm to meters
                putDouble("depthConfidence", depthConfidence)
                putBoolean("isSimulated", false)
                
                // Camera intrinsics
                val intrinsicsMap = Arguments.createMap().apply {
                    putDouble("focalLengthX", focalLength[0].toDouble())
                    putDouble("focalLengthY", focalLength[1].toDouble())
                    putDouble("principalPointX", principalPoint[0].toDouble())
                    putDouble("principalPointY", principalPoint[1].toDouble())
                }
                putMap("cameraIntrinsics", intrinsicsMap)
                
                // Tracking state
                putString("trackingState", frame.camera.trackingState.name)
            }
            
            Log.d(TAG, "Captured frame with depth: ${depthWidth}x${depthHeight}, confidence: $depthConfidence")
            promise.resolve(result)
            
        } catch (e: NotYetAvailableException) {
            Log.w(TAG, "Depth image not yet available", e)
            promise.reject("DEPTH_NOT_AVAILABLE", "Depth data not yet available. Try again in a moment.", e)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to capture frame with depth", e)
            promise.reject("CAPTURE_ERROR", "Failed to capture depth data", e)
        }
    }

    /**
     * Stop ARCore camera
     */
    @ReactMethod
    fun stopCamera(promise: Promise) {
        try {
            arSession?.pause()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", "Failed to stop camera", e)
        }
    }

    /**
     * Clean up ARCore session
     */
    @ReactMethod
    fun closeSession(promise: Promise) {
        try {
            arSession?.close()
            arSession = null
            isSessionInitialized = false
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLOSE_ERROR", "Failed to close session", e)
        }
    }

    // Helper functions

    private fun convertImageToBase64(image: Image): String {
        val yBuffer = image.planes[0].buffer
        val bytes = ByteArray(yBuffer.remaining())
        yBuffer.get(bytes)
        
        // Convert YUV to bitmap (simplified - you may want full color conversion)
        val bitmap = Bitmap.createBitmap(image.width, image.height, Bitmap.Config.ARGB_8888)
        // ... YUV to RGB conversion code ...
        
        val outputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
        val imageBytes = outputStream.toByteArray()
        
        return Base64.encodeToString(imageBytes, Base64.NO_WRAP)
    }

    private fun convertDepthImageToBase64(depthImage: Image): String {
        val depthBuffer = depthImage.planes[0].buffer
        val bytes = ByteArray(depthBuffer.remaining())
        depthBuffer.get(bytes)
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    private fun calculateDepthConfidence(depthImage: Image): Double {
        val depthBuffer = depthImage.planes[0].buffer.asShortBuffer()
        val totalPixels = depthImage.width * depthImage.height
        var validPixels = 0
        
        while (depthBuffer.hasRemaining()) {
            val depth = depthBuffer.get()
            if (depth > 0) { // 0 means no depth data
                validPixels++
            }
        }
        
        return validPixels.toDouble() / totalPixels.toDouble()
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        arSession?.close()
        arSession = null
    }

    companion object {
        private const val TAG = "DepthExtractor"
    }
}
```

## Step 2: Update TypeScript Bridge

Update `mobile/src/native/DepthExtractor.ts` to include new methods:

```typescript
interface DepthExtractorModule {
  // Existing methods
  isARCoreSupported(): Promise<boolean>;
  isDepthModeSupported(): Promise<boolean>;
  
  // New ARCore session methods
  initializeARSession(): Promise<boolean>;
  startCamera(): Promise<boolean>;
  captureFrameWithDepth(): Promise<CaptureResult>;
  stopCamera(): Promise<boolean>;
  closeSession(): Promise<boolean>;
}

interface CaptureResult {
  cameraImage: string;
  depthData: string;
  depthWidth: number;
  depthHeight: number;
  depthFormat: string;
  depthScale: number;
  depthConfidence: number;
  isSimulated: boolean;
  cameraIntrinsics: {
    focalLengthX: number;
    focalLengthY: number;
    principalPointX: number;
    principalPointY: number;
  };
  trackingState: string;
}
```

## Step 3: Update useDepthCamera Hook

Modify the hook to use the ARCore session lifecycle:

```typescript
export function useDepthCamera(config: DepthCameraConfig = {}) {
  const [arSessionReady, setArSessionReady] = useState(false);
  
  useEffect(() => {
    if (Platform.OS === 'android' && depthAvailable) {
      initializeARSession();
    }
    
    return () => {
      if (Platform.OS === 'android') {
        cleanupARSession();
      }
    };
  }, [depthAvailable]);
  
  const initializeARSession = async () => {
    try {
      await DepthExtractor.initializeARSession();
      await DepthExtractor.startCamera();
      setArSessionReady(true);
    } catch (error) {
      console.error('Failed to initialize AR session:', error);
    }
  };
  
  const cleanupARSession = async () => {
    try {
      await DepthExtractor.stopCamera();
      await DepthExtractor.closeSession();
      setArSessionReady(false);
    } catch (error) {
      console.error('Failed to cleanup AR session:', error);
    }
  };
  
  const captureWithDepth = async () => {
    if (Platform.OS === 'android' && arSessionReady) {
      const result = await DepthExtractor.captureFrameWithDepth();
      return {
        photoUri: `data:image/jpeg;base64,${result.cameraImage}`,
        depthData: result.depthData,
        depthQuality: assessQualityFromConfidence(result.depthConfidence),
        timestamp: Date.now(),
      };
    }
    
    // Fallback to regular camera for iOS or if AR not ready
    // ... existing code ...
  };
  
  return {
    cameraRef,
    device,
    format,
    hasPermission,
    depthAvailable: depthAvailable && (Platform.OS === 'ios' || arSessionReady),
    isCapturing,
    captureWithDepth,
    requestPermissions,
  };
}
```

## Testing

### Test Devices
- Google Pixel 4+ (has depth sensor)
- Samsung Galaxy S20+ (ARCore supported)
- OnePlus 8 Pro
- Any device with ARCore 1.18+

### Test Procedure
1. Build app: `cd android && ./gradlew assembleDebug`
2. Install on device: `adb install app/build/outputs/apk/debug/app-debug.apk`
3. Enable camera permissions
4. Navigate to AR capture mode
5. Point at a meal on a table
6. Wait for "TRACKING" state (green indicator)
7. Capture photo
8. Verify depth data is returned (check logs)

### Expected Behavior
- ARCore initializes within 1-2 seconds
- Tracking starts within 2-3 seconds of camera movement
- Depth map resolution: typically 160x120 to 256x192
- Depth confidence: > 60% for well-lit scenes
- Depth range: 0.2m to 5m (20cm to 5 meters)

## Troubleshooting

### "ARCore not supported"
- Check device compatibility: https://developers.google.com/ar/devices
- Ensure ARCore app is installed from Play Store
- Verify android:minSdkVersion is 24 or higher

### "Depth image not yet available"
- ARCore needs time to initialize depth estimation
- Move device slowly to establish tracking
- Ensure good lighting (depth works poorly in dark scenes)
- Wait 2-3 seconds after tracking starts

### Build errors
```bash
# Clean build
cd android
./gradlew clean
./gradlew assembleDebug
```

## Performance Optimization

1. **Depth Map Resolution**: ARCore provides 160x120 by default, which is sufficient
2. **Frame Rate**: Capture depth at 10-15 FPS to save battery
3. **Memory**: Release Image objects immediately after use
4. **Threading**: ARCore updates run on GL thread, keep captures brief

## References

- ARCore Depth API: https://developers.google.com/ar/develop/depth
- ARCore Support: https://developers.google.com/ar/devices
- React Native Native Modules: https://reactnative.dev/docs/native-modules-android

## Next Steps

Once Android depth capture works:
1. Test on multiple ARCore devices
2. Tune depth quality thresholds
3. Implement fallback to multi-angle for low-quality depth
4. Add depth visualization overlay for debugging
5. Integrate with backend vision API
