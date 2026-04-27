/**
 * CameraCaptureScreen
 * 
 * Screen for capturing meal photos using expo-image-picker.
 * Supports both single-image and multi-angle capture modes.
 * 
 * FEATURES (Phase 1 MVP):
 * - Single image capture (quick mode)
 * - Multi-angle capture (top + side photos for better volume estimation)
 * - Camera or library image selection
 * - Base64 encoding for API
 * - Device info detection
 * - Loading state during API call
 * - Navigation to result screen
 */

import React, { useState, useEffect , useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Device from 'expo-device';
import { Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import { CameraGuide, ARScanningOverlay, CaptureModeSelector, PlateReferenceSelector, ReferenceObjectSelector } from '../../components/Vision';
import { estimateMeal } from '../../services/visionApi';
import type { VisionRequest, VisionResponse, DeviceType, CaptureMode, CaptureAngle, NormalCameraMode, PlateType, ReferenceObjectType } from '../../types/vision';
import type { ExploreStackNavigationProp } from '../../navigation/types';

type CaptureStep = 'select-mode' | 'setup-reference' | 'capture-top' | 'capture-side' | 'ar-scanning' | 'preview';
type ScanningStatus = 'initializing' | 'scanning' | 'processing' | 'complete' | 'error';

/**
 * Compress and resize an image URI to keep the base64 payload under ~1MB.
 * Reduces to max 800px wide and JPEG quality 0.5 — more than enough for meal recognition.
 */
async function compressImage(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG, base64: true }
  );
  return result.base64!;
}

export const CameraCaptureScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<ExploreStackNavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Capability detection (Phase 2)
  const [depthCapable, setDepthCapable] = useState(false);
  const [arCapable, setArCapable] = useState(false);
  
  // Capture mode state
  const [captureMode, setCaptureMode] = useState<CaptureMode>('multi_angle');
  const [normalCameraMode, setNormalCameraMode] = useState<NormalCameraMode>('multi_angle');
  const [currentStep, setCurrentStep] = useState<CaptureStep>('select-mode');

  // Reference state for scale estimation
  const [plateType, setPlateType] = useState<PlateType | null>(null);
  const [plateDiameterCm, setPlateDiameterCm] = useState<number | null>(null);
  const [referenceObjectType, setReferenceObjectType] = useState<ReferenceObjectType | null>(null);
  const [referenceObjectSizeCm, setReferenceObjectSizeCm] = useState<number | null>(null);
  
  // AR/Depth scanning state (Phase 2)
  const [scanningStatus, setScanningStatus] = useState<ScanningStatus>('initializing');
  const [scanProgress, setScanProgress] = useState(0);
  const [depthQuality, setDepthQuality] = useState(0);
  
  // Image state
  const [topImageUri, setTopImageUri] = useState<string | null>(null);
  const [topImageBase64, setTopImageBase64] = useState<string | null>(null);
  const [sideImageUri, setSideImageUri] = useState<string | null>(null);
  const [sideImageBase64, setSideImageBase64] = useState<string | null>(null);
  
  // Depth data state (Phase 2)
  const [depthData, setDepthData] = useState<any>(null);
  const [cameraIntrinsics, setCameraIntrinsics] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    requestPermissions();
    detectCapabilities();
  }, []);

  const detectCapabilities = async () => {
    // Phase 2: Detect depth/AR capabilities
    // iOS: Check for LiDAR (iPhone 12 Pro and later)
    // Android: Check for ARCore support
    
    if (Platform.OS === 'ios') {
      // Simple heuristic: iPhone 12 Pro and later have LiDAR
      const deviceModel = Device.modelName || '';
      const hasLidar = deviceModel.includes('iPhone 12 Pro') ||
                       deviceModel.includes('iPhone 13 Pro') ||
                       deviceModel.includes('iPhone 14 Pro') ||
                       deviceModel.includes('iPhone 15 Pro') ||
                       deviceModel.includes('iPad Pro');
      
      setDepthCapable(hasLidar);
      setArCapable(hasLidar);
      
      if (hasLidar) {
        console.log('✅ LiDAR/AR depth capable device detected');
      }
    } else if (Platform.OS === 'android') {
      // For Android, ARCore support detection would require native module
      // For MVP, we'll assume newer Android devices support it
      const hasArCore = Device.modelName ? true : false; // Simplified
      setDepthCapable(hasArCore);
      setArCapable(hasArCore);
      
      if (hasArCore) {
        console.log('✅ ARCore capable device detected');
      }
    }
  };

  const requestPermissions = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const libraryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setHasPermission(cameraStatus.granted && libraryStatus.granted);
  };

  const getDeviceType = (): DeviceType => {
    if (Platform.OS === 'ios') {
      const model = Device.modelName || '';
      const isLiDAR =
        model.includes('iPhone 12 Pro') ||
        model.includes('iPhone 13 Pro') ||
        model.includes('iPhone 14 Pro') ||
        model.includes('iPhone 15 Pro') ||
        model.includes('iPad Pro');
      return isLiDAR ? 'ios_lidar' : 'iphone_camera';
    }
    if (Platform.OS === 'android') return 'android_camera';
    return 'unknown';
  };

  const getDeviceModel = (): string | undefined => {
    return Device.modelName || undefined;
  };

  const pickImageFromCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Store image based on current step
        if (currentStep === 'capture-top' || captureMode === 'single') {
          setTopImageUri(asset.uri);
          setTopImageBase64(asset.base64 || null);
          
          if (captureMode === 'multi_angle') {
            // Move to side capture step
            setCurrentStep('capture-side');
          } else {
            // Single mode: go straight to preview
            setCurrentStep('preview');
          }
        } else if (currentStep === 'capture-side') {
          setSideImageUri(asset.uri);
          setSideImageBase64(asset.base64 || null);
          setCurrentStep('preview');
        }
      }
    } catch (error) {
      console.error('❌ [Camera] Failed to capture image:', error);
      Alert.alert('Error', 'Failed to capture image. Please try again.');
    }
  };

  const pickImageFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        // Store image based on current step
        if (currentStep === 'capture-top' || captureMode === 'single') {
          setTopImageUri(asset.uri);
          setTopImageBase64(asset.base64 || null);
          
          if (captureMode === 'multi_angle') {
            setCurrentStep('capture-side');
          } else {
            setCurrentStep('preview');
          }
        } else if (currentStep === 'capture-side') {
          setSideImageUri(asset.uri);
          setSideImageBase64(asset.base64 || null);
          setCurrentStep('preview');
        }
      }
    } catch (error) {
      console.error('❌ [Camera] Failed to pick image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleEstimate = async () => {
    // Validate depth mode requirements
    if (captureMode === 'depth') {
      if (!depthData || !cameraIntrinsics) {
        Alert.alert('Missing Depth Data', 'Please complete AR scanning first.');
        return;
      }
    } else {
      // Validate regular image requirements
      if (!topImageBase64) {
        Alert.alert('No Image', 'Please capture at least one image first.');
        return;
      }

      if (captureMode === 'multi_angle' && !sideImageBase64) {
        Alert.alert('Missing Side Image', 'Please capture both top and side photos for multi-angle mode.');
        return;
      }
    }

    try {
      setIsLoading(true);

      // Compress images before sending — raw iPhone photos (~4MB) exceed ngrok's 8MB limit
      const compressedTop = topImageUri ? await compressImage(topImageUri) : topImageBase64!;
      const compressedSide = sideImageUri ? await compressImage(sideImageUri) : sideImageBase64;

      // Build images array based on capture mode
      const images: Array<{data: string; angle: CaptureAngle; timestamp: string}> = [];

      if (captureMode === 'depth') {
        // For depth mode, we still need at least one RGB image
        // In production, this would be captured during AR scanning
        if (compressedTop) {
          images.push({
            data: compressedTop,
            angle: 'top' as CaptureAngle,
            timestamp: new Date().toISOString(),
          });
        } else {
          // For MVP simulation, create a placeholder
          images.push({
            data: 'placeholder_rgb_image_base64',
            angle: 'top' as CaptureAngle,
            timestamp: new Date().toISOString(),
          });
        }
      } else {
        // Regular image-based modes
        images.push({
          data: compressedTop,
          angle: 'top' as CaptureAngle,
          timestamp: new Date().toISOString(),
        });

        // Add side image if in multi-angle mode
        if (captureMode === 'multi_angle' && compressedSide) {
          images.push({
            data: compressedSide,
            angle: 'side' as CaptureAngle,
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Build VisionRequest payload
      const request: VisionRequest = {
        images,
        metadata: {
          device_type: getDeviceType(),
          capture_mode: captureMode,
          device_model: getDeviceModel(),
        },
        // Phase 2: Include depth data and intrinsics
        depth_data: captureMode === 'depth' ? depthData : undefined,
        camera_intrinsics: captureMode === 'depth' ? cameraIntrinsics : undefined,
        // Normal-camera scale reference hints
        normal_camera_mode: normalCameraMode,
        plate_type: plateType ?? undefined,
        plate_diameter_cm: plateDiameterCm ?? undefined,
        reference_object_type: referenceObjectType ?? undefined,
        reference_object_size_cm: referenceObjectSizeCm ?? undefined,
      };

      console.log('📸 [CameraCapture] Calling vision API...');
      console.log('📸 [CameraCapture] Mode:', captureMode, 'Images:', images.length);
      if (captureMode === 'depth') {
        console.log('🔬 [CameraCapture] Including depth data and intrinsics');
      }
      
      const response = await estimateMeal(request);
      console.log('✅ [CameraCapture] Received estimation:', response);

      // Navigate to result screen
      navigation.navigate('EstimationResult', { response });
    } catch (error: any) {
      console.error('❌ [CameraCapture] Estimation failed:', error);

      const message: string = error.message ?? '';

      if (message.includes('non_food_detected')) {
        Alert.alert(
          'Not Food Detected',
          "That doesn't look like a meal. Please scan a plate or food item and try again."
        );
      } else {
        Alert.alert(
          'Estimation Failed',
          message || 'Failed to estimate meal. Please try again.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetake = () => {
    setTopImageUri(null);
    setTopImageBase64(null);
    setSideImageUri(null);
    setSideImageBase64(null);
    setDepthData(null);
    setCameraIntrinsics(null);
    setScanProgress(0);
    setDepthQuality(0);
    setPlateType(null);
    setPlateDiameterCm(null);
    setReferenceObjectType(null);
    setReferenceObjectSizeCm(null);
    setCurrentStep('select-mode');
  };

  const handleSelectMode = (mode: CaptureMode | NormalCameraMode) => {
    if (mode === 'depth') {
      setCaptureMode('depth');
      setNormalCameraMode('basic_single');
      setCurrentStep('ar-scanning');
      startARScanning();
    } else if (mode === 'plate_reference') {
      setCaptureMode('single');
      setNormalCameraMode('plate_reference');
      setCurrentStep('setup-reference');
    } else if (mode === 'reference_object') {
      setCaptureMode('single');
      setNormalCameraMode('reference_object');
      setCurrentStep('setup-reference');
    } else if (mode === 'multi_angle') {
      setCaptureMode('multi_angle');
      setNormalCameraMode('multi_angle');
      setCurrentStep('capture-top');
    } else {
      // basic_single / 'single'
      setCaptureMode('single');
      setNormalCameraMode('basic_single');
      setCurrentStep('capture-top');
    }
  };

  const startARScanning = async () => {
    // Phase 2: Initialize AR session and start depth scanning
    setScanningStatus('initializing');
    setScanProgress(0);
    setDepthQuality(0);
    
    // Simulate AR scanning for MVP (actual AR implementation requires native modules)
    // In production, this would use:
    // - iOS: ARKit with LiDAR
    // - Android: ARCore depth API
    
    try {
      console.log('🔬 Starting AR depth scanning...');
      
      // Simulate initialization delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setScanningStatus('scanning');
      
      // Simulate scanning progress
      const scanDuration = 3000; // 3 seconds as per plan
      const updateInterval = 100; // Update every 100ms
      const steps = scanDuration / updateInterval;
      
      for (let i = 0; i <= steps; i++) {
        await new Promise(resolve => setTimeout(resolve, updateInterval));
        setScanProgress((i / steps) * 100);
        setDepthQuality(Math.min(0.9, (i / steps) * 1.1)); // Simulate improving quality
      }
      
      setScanningStatus('processing');
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if depth quality is sufficient
      if (depthQuality < 0.5) {
        // Low quality - fallback to multi-angle
        Alert.alert(
          'Depth Quality Low',
          'AR scanning quality is insufficient. Would you like to use 2-photo mode instead?',
          [
            { text: 'Try Again', onPress: startARScanning },
            {
              text: 'Use 2-Photo Mode',
              onPress: () => {
                setCaptureMode('multi_angle');
                setCurrentStep('capture-top');
              },
            },
          ]
        );
        setScanningStatus('error');
      } else {
        setScanningStatus('complete');
        
        // In production, capture actual depth data here
        // For MVP, we'll use placeholder data
        setDepthData({
          depth_map: 'placeholder_base64_depth_data',
          format: 'png_16bit',
          scale: 0.001, // 1mm per unit
        });
        
        setCameraIntrinsics({
          focal_length_x: 1000,
          focal_length_y: 1000,
          principal_point_x: 640,
          principal_point_y: 480,
          image_width: 1280,
          image_height: 960,
        });
        
        // Move to preview
        setTimeout(() => {
          setCurrentStep('preview');
        }, 500);
      }
      
    } catch (error) {
      console.error('❌ AR scanning failed:', error);
      setScanningStatus('error');
      Alert.alert(
        'Scanning Failed',
        'Could not complete AR scan. Please try 2-photo mode instead.',
        [{ text: 'OK', onPress: () => setCurrentStep('select-mode') }]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Requesting permissions...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons
          name="camera-off"
          size={64}
          color={colors.textSecondary}
        />
        <Text style={styles.permissionText}>
          Camera and library permissions are required
        </Text>
        <TouchableOpacity style={styles.button} onPress={requestPermissions}>
          <Text style={styles.buttonText}>Grant Permissions</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Step: Mode Selection */}
      {currentStep === 'select-mode' && (
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 40 }}
        >
          <Text style={styles.headerText}>Choose Capture Mode</Text>
          <Text style={styles.subtitleText}>
            More info = more accurate calorie estimates
          </Text>
          <CaptureModeSelector
            selectedMode={normalCameraMode}
            hasLiDAR={depthCapable}
            onSelect={(mode) => handleSelectMode(mode as CaptureMode | NormalCameraMode)}
          />
        </ScrollView>
      )}

      {/* Step: Reference Setup (plate or object) */}
      {currentStep === 'setup-reference' && (
        <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ paddingBottom: 120 }}>
          {normalCameraMode === 'plate_reference' ? (
            <PlateReferenceSelector
              selectedType={plateType}
              customDiameterCm={plateDiameterCm}
              onSelect={(type, diam) => { setPlateType(type); setPlateDiameterCm(diam); }}
            />
          ) : (
            <ReferenceObjectSelector
              selectedType={referenceObjectType}
              customSizeCm={referenceObjectSizeCm}
              onSelect={(type, size) => { setReferenceObjectType(type); setReferenceObjectSizeCm(size); }}
            />
          )}
          <View style={{ paddingHorizontal: 16, gap: 12, marginTop: 8 }}>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={() => setCurrentStep('capture-top')}
            >
              <Text style={styles.buttonTextPrimary}>Next: Take Photo →</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep('select-mode')}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Step: AR Scanning (Phase 2) */}
      {currentStep === 'ar-scanning' && (
        <View style={styles.scanningContainer}>
          <ARScanningOverlay
            status={scanningStatus}
            progress={scanProgress}
            depthQuality={depthQuality}
            distanceToSubject={0.4}
            onScanComplete={() => {
              console.log('✅ AR Scan complete');
            }}
          />
        </View>
      )}

      {/* Step: Capture Top Photo */}
      {currentStep === 'capture-top' && (
        <>
          <View style={styles.previewContainer}>
            {topImageUri ? (
              <Image source={{ uri: topImageUri }} style={styles.previewImage} />
            ) : (
              <>
                <CameraGuide captureMode={captureMode as 'single' | 'multi_angle' | 'reference_object'} />
                {/* Plate alignment circle overlay */}
                <View pointerEvents="none" style={styles.plateGuideOverlay}>
                  <View style={styles.plateGuideCircle} />
                  <Text style={styles.plateGuideLabel}>Centre the plate</Text>
                </View>
              </>
            )}
          </View>

          <View style={styles.controlsContainer}>
            <Text style={styles.stepText}>
              {captureMode === 'multi_angle' ? 'Step 1 of 2 — ' : ''}
              📸 Point camera straight down at your food
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={pickImageFromLibrary}
              >
                <MaterialCommunityIcons name="image" size={24} color={colors.text} />
                <Text style={styles.buttonTextSecondary}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={pickImageFromCamera}
              >
                <MaterialCommunityIcons name="camera" size={24} color={colors.textInverse} />
                <Text style={styles.buttonTextPrimary}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() =>
                setCurrentStep(
                  normalCameraMode === 'plate_reference' || normalCameraMode === 'reference_object'
                    ? 'setup-reference'
                    : 'select-mode',
                )
              }
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Step: Capture Side Photo */}
      {currentStep === 'capture-side' && (
        <>
          <View style={styles.previewContainer}>
            <ScrollView horizontal pagingEnabled>
              {topImageUri && (
                <View style={styles.thumbnailContainer}>
                  <Image source={{ uri: topImageUri }} style={styles.thumbnailImage} />
                  <Text style={styles.thumbnailLabel}>✓ Top View</Text>
                </View>
              )}
              {sideImageUri ? (
                <View style={styles.fullImageContainer}>
                  <Image source={{ uri: sideImageUri }} style={styles.previewImage} />
                </View>
              ) : (
                <View style={styles.fullImageContainer}>
                  <CameraGuide captureMode={captureMode as 'single' | 'multi_angle' | 'reference_object'} />
                </View>
              )}
            </ScrollView>
          </View>

          <View style={styles.controlsContainer}>
            <Text style={styles.stepText}>
              Step 2 of 2 — 📸 Now tilt the camera ~45° to show the food height
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={pickImageFromLibrary}
              >
                <MaterialCommunityIcons name="image" size={24} color={colors.text} />
                <Text style={styles.buttonTextSecondary}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={pickImageFromCamera}
              >
                <MaterialCommunityIcons name="camera" size={24} color={colors.textInverse} />
                <Text style={styles.buttonTextPrimary}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                setSideImageUri(null);
                setSideImageBase64(null);
                setCurrentStep('capture-top');
              }}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {/* Step: Preview & Estimate */}
      {currentStep === 'preview' && (
        <>
          <ScrollView style={styles.previewScrollContainer}>
            <View style={styles.previewGrid}>
              {topImageUri && (
                <View style={styles.previewCard}>
                  <Image source={{ uri: topImageUri }} style={styles.previewCardImage} />
                  <Text style={styles.previewLabel}>Top View</Text>
                </View>
              )}
              {sideImageUri && (
                <View style={styles.previewCard}>
                  <Image source={{ uri: sideImageUri }} style={styles.previewCardImage} />
                  <Text style={styles.previewLabel}>Side View</Text>
                </View>
              )}
            </View>

            <View style={styles.modeInfoContainer}>
              <MaterialCommunityIcons 
                name={captureMode === 'multi_angle' ? "camera-burst" : "camera"} 
                size={24} 
                color={colors.primary} 
              />
              <Text style={styles.modeInfoText}>
                {captureMode === 'multi_angle' 
                  ? 'Multi-Angle Mode: Better accuracy' 
                  : 'Quick Mode: Fast results'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.controlsContainer}>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={handleRetake}
                disabled={isLoading}
              >
                <MaterialCommunityIcons name="camera-retake" size={24} color={colors.text} />
                <Text style={styles.buttonTextSecondary}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, isLoading && styles.buttonDisabled]}
                onPress={handleEstimate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="food" size={24} color={colors.textInverse} />
                    <Text style={styles.buttonTextPrimary}>Estimate Meal</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </View>
  );
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: Spacing.xl,
  },
  scanningContainer: {
    flex: 1,
    backgroundColor: colors.backgroundDark || '#000',
  },
  headerText: {
    ...Typography.h2,
    color: colors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitleText: {
    ...Typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  modeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    width: '100%',
    justifyContent: 'center',
  },
  modeCard: {
    flex: 1,
    minWidth: 140,
    maxWidth: 180,
    backgroundColor: colors.surface,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
    ...Shadows.md,
  },
  modeCardFeatured: {
    borderColor: colors.success,
    borderWidth: 3,
    backgroundColor: colors.success + '10',
  },
  modeCardDisabled: {
    borderColor: colors.border,
    borderWidth: 2,
    backgroundColor: colors.surface,
    opacity: 0.55,
  },
  badgeContainer: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
  },
  badge: {
    ...Typography.caption,
    fontSize: 10,
    fontWeight: '800',
    color: colors.success,
    backgroundColor: colors.success + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeTitle: {
    ...Typography.h3,
    color: colors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  modeTitleDisabled: {
    color: colors.textSecondary,
  },
  modeDescription: {
    ...Typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modeAccuracy: {
    ...Typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    position: 'relative',
  },
  plateGuideOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plateGuideCircle: {
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#00D4AACC',
    borderStyle: 'dashed',
  },
  plateGuideLabel: {
    marginTop: 12,
    fontSize: 13,
    color: '#00D4AA',
    fontWeight: '600',
    backgroundColor: '#00000066',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  thumbnailContainer: {
    width: 120,
    padding: Spacing.sm,
    alignItems: 'center',
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.sm,
    resizeMode: 'cover',
  },
  thumbnailLabel: {
    ...Typography.caption,
    color: colors.success,
    marginTop: Spacing.xs,
  },
  fullImageContainer: {
    flex: 1,
    minWidth: 300,
  },
  previewScrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  previewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  previewCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    ...Shadows.sm,
  },
  previewCardImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    resizeMode: 'cover',
  },
  previewLabel: {
    ...Typography.caption,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
  },
  modeInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    backgroundColor: colors.primaryLight + '20',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  modeInfoText: {
    ...Typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  controlsContainer: {
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    ...Shadows.md,
  },
  stepText: {
    ...Typography.body,
    color: colors.text,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    minHeight: 56,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
    ...Shadows.sm,
  },
  buttonSecondary: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextPrimary: {
    ...Typography.button,
    color: colors.textInverse,
  },
  buttonTextSecondary: {
    ...Typography.button,
    color: colors.text,
  },
  buttonText: {
    ...Typography.button,
    color: colors.textInverse,
  },
  backButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  backText: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  loadingText: {
    ...Typography.body,
    color: colors.textSecondary,
    marginTop: Spacing.md,
  },
  permissionText: {
    ...Typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  instructionsContainer: {
    backgroundColor: colors.primaryLight + '20',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  instructionsText: {
    ...Typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  });
}

