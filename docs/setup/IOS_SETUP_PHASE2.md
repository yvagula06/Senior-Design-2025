# iOS Setup Guide for Phase 2 - Real Depth Capture

**⚠️ IMPORTANT: This setup MUST be run on a Mac with Xcode installed**

## Prerequisites
- macOS with Xcode 14+ installed
- iPhone 12 Pro or later with LiDAR sensor (for testing)
- CocoaPods installed (`sudo gem install cocoapods`)

## Step 1: Generate iOS Native Project

Since Expo prebuild can only generate iOS projects on macOS:

```bash
cd mobile
export CI=true
npx expo prebuild --platform ios --clean
```

This will create the `ios/` folder with:
- `.xcodeproj` project file
- Podfile for dependencies
- Native Swift/Objective-C code structure

## Step 2: Install iOS Dependencies

```bash
cd ios
pod install
```

This installs:
- react-native-vision-camera pods
- ARKit frameworks
- Required camera libraries

## Step 3: Configure Info.plist Permissions

The `Info.plist` file should already have camera permissions from app.json, but verify:

```xml
<key>NSCameraUsageDescription</key>
<string>We need camera access to scan your meals</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need photo library access to select meal images</string>
```

## Step 4: Enable LiDAR/ARKit Capabilities

Open `ios/NutritionEstimator.xcworkspace` in Xcode (note: use .xcworkspace, NOT .xcodeproj)

1. Select the project in the navigator
2. Go to "Signing & Capabilities" tab
3. Click "+ Capability"
4. Add "ARKit" capability
5. In Build Settings, ensure:
   - Deployment Target is iOS 14.0 or later
   - Architecture includes arm64

## Step 5: Create Native Depth Extraction Module

Create `ios/DepthExtractor.swift`:

```swift
import Foundation
import AVFoundation
import UIKit

@objc(DepthExtractor)
class DepthExtractor: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func extractDepthData(_ photoPath: String,
                       resolver: @escaping RCTPromiseResolveBlock,
                       rejecter: @escaping RCTPromiseRejectBlock) {
    
    guard let url = URL(string: photoPath.replacingOccurrences(of: "file://", with: "")) else {
      rejecter("INVALID_PATH", "Invalid photo path", nil)
      return
    }
    
    // Load the image
    guard let imageData = try? Data(contentsOf: url),
          let imageSource = CGImageSourceCreateWithData(imageData as CFData, nil) else {
      rejecter("LOAD_ERROR", "Failed to load image", nil)
      return
    }
    
    // Extract depth data from auxiliary depth info
    guard let auxiliaryDataInfo = CGImageSourceCopyAuxiliaryDataInfoAtIndex(imageSource, 0, kCGImageAuxiliaryDataTypeDisparity) as? [String: Any] else {
      // No depth data available
      resolver(nil)
      return
    }
    
    // Parse the depth map
    guard let depthData = try? AVDepthData(fromDictionaryRepresentation: auxiliaryDataInfo) else {
      rejecter("PARSE_ERROR", "Failed to parse depth data", nil)
      return
    }
    
    // Convert to disparity for depth calculation
    let disparityDepth = depthData.converting(toDepthDataType: kCVPixelFormatType_DisparityFloat32)
    
    // Get the CVPixelBuffer
    let pixelBuffer = disparityDepth.depthDataMap
    
    // Convert to base64 encoded data
    let base64String = convertPixelBufferToBase64(pixelBuffer)
    
    // Return depth data with metadata
    let result: [String: Any] = [
      "depthData": base64String,
      "width": CVPixelBufferGetWidth(pixelBuffer),
      "height": CVPixelBufferGetHeight(pixelBuffer),
      "depthDataAccuracy": disparityDepth.depthDataAccuracy.rawValue,
      "depthDataQuality": disparityDepth.depthDataQuality.rawValue,
      "isDepthDataFiltered": disparityDepth.isDepthDataFiltered
    ]
    
    resolver(result)
  }
  
  private func convertPixelBufferToBase64(_ pixelBuffer: CVPixelBuffer) -> String {
    CVPixelBufferLockBaseAddress(pixelBuffer, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(pixelBuffer, .readOnly) }
    
    let width = CVPixelBufferGetWidth(pixelBuffer)
    let height = CVPixelBufferGetHeight(pixelBuffer)
    let bytesPerRow = CVPixelBufferGetBytesPerRow(pixelBuffer)
    
    guard let baseAddress = CVPixelBufferGetBaseAddress(pixelBuffer) else {
      return ""
    }
    
    let data = Data(bytes: baseAddress, count: bytesPerRow * height)
    return data.base64EncodedString()
  }
}
```

Create bridging header `ios/DepthExtractor-Bridging-Header.h`:

```objc
#import <React/RCTBridgeModule.h>
```

Create module interface `ios/DepthExtractor.m`:

```objc
#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DepthExtractor, NSObject)

RCT_EXTERN_METHOD(extractDepthData:(NSString *)photoPath
                  resolver:(RCTPromiseResolveBlock)resolver
                  rejecter:(RCTPromiseRejectBlock)rejecter)

@end
```

## Step 6: Update Bridging Header in Xcode

1. In Xcode, go to Build Settings
2. Search for "Objective-C Bridging Header"
3. Set value to: `NutritionEstimator/DepthExtractor-Bridging-Header.h`
4. Search for "Swift Language Version"
5. Ensure it's set to Swift 5.0

## Step 7: TypeScript Bridge

Create `mobile/src/native/DepthExtractor.ts`:

```typescript
import { NativeModules } from 'react-native';

interface DepthData {
  depthData: string; // Base64 encoded depth map
  width: number;
  height: number;
  depthDataAccuracy: number;
  depthDataQuality: number;
  isDepthDataFiltered: boolean;
}

interface DepthExtractorModule {
  extractDepthData(photoPath: string): Promise<DepthData | null>;
}

const { DepthExtractor } = NativeModules;

export default DepthExtractor as DepthExtractorModule;
```

## Step 8: Update useDepthCamera Hook

Update the `extractDepthDataIOS` function in `useDepthCamera.ts`:

```typescript
import DepthExtractor from '../native/DepthExtractor';

async function extractDepthDataIOS(photoPath: string): Promise<string | null> {
  try {
    const depthData = await DepthExtractor.extractDepthData(photoPath);
    if (!depthData) {
      console.log('No depth data available in photo');
      return null;
    }
    
    console.log(`Extracted depth data: ${depthData.width}x${depthData.height}, quality: ${depthData.depthDataQuality}`);
    return depthData.depthData;
  } catch (error) {
    console.error('Error extracting iOS depth data:', error);
    return null;
  }
}
```

## Step 9: Configure react-native-vision-camera for Depth

Update the camera capture in the hook to enable depth data:

```typescript
const photo: PhotoFile = await cameraRef.current.takePhoto({
  enableShutterSound: true,
  flash: 'off',
  qualityPrioritization: 'quality',
  enableAutoDepthData: true,  // Enable depth data capture
});
```

## Step 10: Build and Test

```bash
cd ios
xcodebuild -workspace NutritionEstimator.xcworkspace \
           -scheme NutritionEstimator \
           -configuration Debug \
           -destination 'platform=iOS,name=YOUR_DEVICE_NAME'
```

Or in Xcode:
1. Select your physical device (must have LiDAR)
2. Click Run (⌘ + R)

## Testing Depth Capture

Test on these LiDAR-capable devices:
- iPhone 12 Pro / Pro Max
- iPhone 13 Pro / Pro Max
- iPhone 14 Pro / Pro Max
- iPhone 15 Pro / Pro Max
- iPad Pro (2020 and later)

Expected behavior:
- Camera should capture photo with depth data
- Depth map should be ~160x120 to 640x480 resolution
- Quality should be "high" for well-lit scenes
- Fallback to multi-angle if depth quality < 50%

## Troubleshooting

### "DepthExtractor module not found"
- Verify Swift files are added to the Xcode project
- Check Bridging Header path in Build Settings
- Clean build folder (⌘ + Shift + K)

### "No depth data in captured photo"
- Verify device has LiDAR (check model)
- Ensure `enableAutoDepthData` is true
- Check camera permissions are granted

### Build errors
- Update CocoaPods: `pod repo update`
- Clean pods: `rm -rf Pods && pod install`
- Update Xcode to latest version

## Phase 2 Completion Checklist

- [ ] Generate iOS project with expo prebuild
- [ ] Install pods successfully
- [ ] Create DepthExtractor native module
- [ ] Configure bridging header
- [ ] Test on LiDAR device
- [ ] Verify depth data extraction
- [ ] Integrate with useDepthCamera hook
- [ ] End-to-end test with backend API
