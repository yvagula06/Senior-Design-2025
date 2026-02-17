# Quick Start - Testing Phase 2 Depth Capture

**Choose your path based on available hardware:**

---

## Path A: Test Android Integration (Can Do Now ✅)

This tests that the native module integration works, even though it returns stub data.

### Step 1: Build Android App
```powershell
cd mobile/android
./gradlew assembleDebug
```

### Step 2: Install on Device
```powershell
# Install via USB
adb install app/build/outputs/apk/debug/app-debug.apk

# Or use Expo
cd ..
npx expo run:android
```

### Step 3: Test Integration
1. Open app on Android device
2. Navigate to "Explore" → "Vision Capture"
3. Select "AR Depth Mode" (if available)
4. Try to capture
5. Check logs:
```powershell
adb logcat | findstr "DepthExtractor"
```

**Expected**: Module loads, stub returns structure. No crashes.

---

## Path B: Implement iOS Depth (Requires Mac + iPhone 12 Pro+)

### Prerequisites
- macOS with Xcode 14+
- iPhone 12 Pro or later (has LiDAR)
- Project must be on the Mac

### Step 1: Generate iOS Project
```bash
cd mobile
export CI=true
npx expo prebuild --platform ios --clean
```

### Step 2: Follow iOS Setup Guide
Open and follow: `IOS_SETUP_PHASE2.md`

Key steps:
1. Install pods: `cd ios && pod install`
2. Create Swift files (DepthExtractor.swift, bridging header)
3. Configure Xcode (bridging header path, ARKit capability)
4. Build and run on physical device

### Step 3: Test LiDAR Capture
1. Build in Xcode (⌘ + R)
2. Point camera at a meal on a table
3. Capture in AR mode
4. Check Xcode console for depth extraction logs

**Expected**: Real depth data extracted, ~160x120 to 640x480 resolution.

---

## Path C: Full Android ARCore (Advanced, Optional)

Only needed if you want real ARCore depth instead of the stub.

### Step 1: Replace Stub Implementation
Open `ANDROID_DEPTH_INTEGRATION.md` and replace the `DepthExtractorModule.kt` code with the full ARCore implementation provided.

### Step 2: Test on ARCore Device
Requires: Pixel 4+, Galaxy S20+, or other ARCore-supported device

### Step 3: Run Full Session
```bash
cd mobile/android
./gradlew installDebug
adb logcat | findstr "ARCore"
```

**Expected**: ARCore initializes, tracks environment, captures depth frame.

---

## Quick Verification

### Android
```bash
# Check native module is registered
adb logcat | findstr "DepthExtractor"

# Should see:
# DepthExtractorModule created
# DepthExtractorPackage registered
```

### iOS (on Mac)
```bash
# Check Swift module loads
# In Xcode console, should see:
# [DepthExtractor] Module initialized
```

---

## Common Issues

### "Cannot find DepthExtractor module"
- Run `npx expo prebuild --clean` again
- Rebuild app completely
- Check MainApplication.kt has `add(DepthExtractorPackage())`

### "ARCore not supported" (Android)
- Check device: https://developers.google.com/ar/devices
- Install ARCore app from Play Store
- Verify Android version 7.0+

### iOS Build Errors
- Verify bridging header path in Build Settings
- Clean build folder (⌘ + Shift + K)
- Update pods: `cd ios && pod install`

---

## What to Test

### Integration Layer (Both Platforms)
- [x] App builds without errors
- [x] Native module loads
- [x] No crashes when calling depth extraction
- [x] Stub data returns expected structure

### iOS LiDAR (iPhone 12 Pro+)
- [x] Depth data extracted from photos
- [x] Depth map size reasonable (160x120+)
- [x] Quality metadata included
- [x] Works in well-lit scenes

### Android ARCore (Optional)
- [x] ARCore session initializes
- [x] Camera tracking works
- [x] Depth frame captured
- [x] Confidence > 60% in good lighting

---

## Next Steps After Testing

Once you verify the native modules work:

1. **Update CameraCaptureScreen.tsx**:
   - Replace simulated AR scanning
   - Import and use `useDepthCamera` hook
   - Show real-time depth quality
   
2. **Test End-to-End**:
   - Capture with depth data
   - Verify backend receives depth in API call
   - Test fallback to multi-angle mode
   
3. **Tune Parameters**:
   - Adjust depth quality thresholds
   - Optimize capture timing
   - Test various lighting conditions

---

## Files to Reference

- **iOS Setup**: `IOS_SETUP_PHASE2.md`
- **Android Full Implementation**: `ANDROID_DEPTH_INTEGRATION.md`
- **Overall Status**: `PHASE2_STATUS.md`
- **Implementation Plan**: `PHASE2_IMPLEMENTATION_STEPS.md`

---

## Build Commands Reference

### Android
```bash
# Debug build
cd mobile/android
./gradlew assembleDebug

# Install
adb install app/build/outputs/apk/debug/app-debug.apk

# Logs
adb logcat | findstr "DepthExtractor"
```

### iOS (on Mac)
```bash
# Install pods
cd mobile/ios
pod install

# Build in Xcode
open NutritionEstimator.xcworkspace
# Then: ⌘ + R to build and run

# Or command line
xcodebuild -workspace NutritionEstimator.xcworkspace \
           -scheme NutritionEstimator \
           -configuration Debug \
           -destination 'platform=iOS,name=YOUR_DEVICE'
```

---

## Success Criteria

**Phase 2 is complete when:**
- ✅ Android app builds with native module
- ✅ iOS app builds on Mac with Swift module
- ✅ Depth data can be extracted (even if stub)
- ✅ No crashes in depth capture flow
- ✅ Integration with useDepthCamera hook works

**Full production ready when:**
- ✅ Real LiDAR data extracted on iPhone 12 Pro+
- ✅ Real ARCore data extracted on Pixel 4+
- ✅ Depth quality thresholds validated
- ✅ Fallback to multi-angle works
- ✅ Backend integration tested end-to-end
