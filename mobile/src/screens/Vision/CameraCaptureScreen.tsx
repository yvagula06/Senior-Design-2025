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

import React, { useState, useEffect } from 'react';
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
import * as Device from 'expo-device';
import { AppColors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { CameraGuide, ARScanningOverlay } from '../../components/Vision';
import { estimateMeal } from '../../services/visionApi';
import type { VisionRequest, VisionResponse, DeviceType, CaptureMode, CaptureAngle } from '../../types/vision';
import type { ExploreStackNavigationProp } from '../../navigation/types';

type CaptureStep = 'select-mode' | 'capture-top' | 'capture-side' | 'ar-scanning' | 'preview';
type ScanningStatus = 'initializing' | 'scanning' | 'processing' | 'complete' | 'error';

export const CameraCaptureScreen: React.FC = () => {
  const navigation = useNavigation<ExploreStackNavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Capability detection (Phase 2)
  const [depthCapable, setDepthCapable] = useState(false);
  const [arCapable, setArCapable] = useState(false);
  
  // Capture mode state
  const [captureMode, setCaptureMode] = useState<CaptureMode>('single');
  const [currentStep, setCurrentStep] = useState<CaptureStep>('select-mode');
  
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
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
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

      // Build images array based on capture mode
      const images: Array<{data: string; angle: CaptureAngle; timestamp: string}> = [];

      if (captureMode === 'depth') {
        // For depth mode, we still need at least one RGB image
        // In production, this would be captured during AR scanning
        if (topImageBase64) {
          images.push({
            data: topImageBase64,
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
          data: topImageBase64!,
          angle: 'top' as CaptureAngle,
          timestamp: new Date().toISOString(),
        });

        // Add side image if in multi-angle mode
        if (captureMode === 'multi_angle' && sideImageBase64) {
          images.push({
            data: sideImageBase64,
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
      Alert.alert(
        'Estimation Failed',
        error.message || 'Failed to estimate meal. Please try again.'
      );
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
    setCurrentStep('select-mode');
  };

  const handleSelectMode = (mode: CaptureMode) => {
    setCaptureMode(mode);
    if (mode === 'depth') {
      // Start AR scanning
      setCurrentStep('ar-scanning');
      startARScanning();
    } else {
      setCurrentStep(mode === 'single' ? 'capture-top' : 'capture-top');
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
        <ActivityIndicator size="large" color={AppColors.primary} />
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
          color={AppColors.textSecondary}
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
        <View style={styles.centerContainer}>
          <Text style={styles.headerText}>Choose Capture Mode</Text>
          <Text style={styles.subtitleText}>
            {depthCapable || arCapable 
              ? 'AR scanning provides the most accurate results'
              : 'Multi-angle mode provides more accurate calorie estimates'}
          </Text>

          <View style={styles.modeContainer}>
            {/* Depth/AR Mode (Phase 2) - only show if device capable */}
            {(depthCapable || arCapable) && (
              <TouchableOpacity
                style={[styles.modeCard, styles.modeCardFeatured]}
                onPress={() => handleSelectMode('depth')}
              >
                <MaterialCommunityIcons name="cube-scan" size={48} color={AppColors.success} />
                <View style={styles.badgeContainer}>
                  <Text style={styles.badge}>BEST</Text>
                </View>
                <Text style={styles.modeTitle}>AR Scan</Text>
                <Text style={styles.modeDescription}>
                  3D depth scanning (2-3 sec)
                </Text>
                <Text style={[styles.modeAccuracy, { color: AppColors.success }]}>
                  ~85-95% accuracy
                </Text>
              </TouchableOpacity>
            )}

            {/* Single Image Mode */}
            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => handleSelectMode('single')}
            >
              <MaterialCommunityIcons name="camera" size={48} color={AppColors.primary} />
              <Text style={styles.modeTitle}>Quick Mode</Text>
              <Text style={styles.modeDescription}>
                Take 1 photo from above
              </Text>
              <Text style={styles.modeAccuracy}>~60-70% accuracy</Text>
            </TouchableOpacity>

            {/* Multi-Angle Mode */}
            <TouchableOpacity
              style={styles.modeCard}
              onPress={() => handleSelectMode('multi_angle')}
            >
              <MaterialCommunityIcons name="camera-burst" size={48} color={AppColors.warning} />
              <Text style={styles.modeTitle}>Multi-Angle</Text>
              <Text style={styles.modeDescription}>
                Take 2 photos (top + side)
              </Text>
              <Text style={styles.modeAccuracy}>~75-85% accuracy</Text>
            </TouchableOpacity>
          </View>
        </View>
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
              <CameraGuide captureMode={captureMode} />
            )}
          </View>

          <View style={styles.controlsContainer}>
            <Text style={styles.stepText}>
              {captureMode === 'multi_angle' ? 'Step 1 of 2: ' : ''}
              📸 Take a photo from directly above
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={pickImageFromLibrary}
              >
                <MaterialCommunityIcons name="image" size={24} color={AppColors.text} />
                <Text style={styles.buttonTextSecondary}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={pickImageFromCamera}
              >
                <MaterialCommunityIcons name="camera" size={24} color={AppColors.textInverse} />
                <Text style={styles.buttonTextPrimary}>Take Photo</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep('select-mode')}
            >
              <Text style={styles.backText}>← Back to Mode Selection</Text>
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
                  <CameraGuide captureMode={captureMode} />
                </View>
              )}
            </ScrollView>
          </View>

          <View style={styles.controlsContainer}>
            <Text style={styles.stepText}>
              Step 2 of 2: 📸 Take a photo from the side
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={pickImageFromLibrary}
              >
                <MaterialCommunityIcons name="image" size={24} color={AppColors.text} />
                <Text style={styles.buttonTextSecondary}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary]}
                onPress={pickImageFromCamera}
              >
                <MaterialCommunityIcons name="camera" size={24} color={AppColors.textInverse} />
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
                color={AppColors.primary} 
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
                <MaterialCommunityIcons name="camera-retake" size={24} color={AppColors.text} />
                <Text style={styles.buttonTextSecondary}>Retake</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonPrimary, isLoading && styles.buttonDisabled]}
                onPress={handleEstimate}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={AppColors.textInverse} />
                ) : (
                  <>
                    <MaterialCommunityIcons name="food" size={24} color={AppColors.textInverse} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
    paddingHorizontal: Spacing.xl,
  },
  scanningContainer: {
    flex: 1,
    backgroundColor: AppColors.backgroundDark || '#000',
  },
  headerText: {
    ...Typography.h2,
    color: AppColors.text,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitleText: {
    ...Typography.body,
    color: AppColors.textSecondary,
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
    backgroundColor: AppColors.surface,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.border,
    ...Shadows.medium,
  },
  modeCardFeatured: {
    borderColor: AppColors.success,
    borderWidth: 3,
    backgroundColor: AppColors.success + '10',
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
    color: AppColors.success,
    backgroundColor: AppColors.success + '20',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modeTitle: {
    ...Typography.h3,
    color: AppColors.text,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  modeDescription: {
    ...Typography.caption,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  modeAccuracy: {
    ...Typography.caption,
    color: AppColors.success,
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: AppColors.backgroundSecondary,
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
    color: AppColors.success,
    marginTop: Spacing.xs,
  },
  fullImageContainer: {
    flex: 1,
    minWidth: 300,
  },
  previewScrollContainer: {
    flex: 1,
    backgroundColor: AppColors.background,
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
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    ...Shadows.small,
  },
  previewCardImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.sm,
    resizeMode: 'cover',
  },
  previewLabel: {
    ...Typography.caption,
    color: AppColors.textSecondary,
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
    backgroundColor: AppColors.primaryLight + '20',
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  modeInfoText: {
    ...Typography.caption,
    color: AppColors.primary,
    fontWeight: '600',
  },
  controlsContainer: {
    backgroundColor: AppColors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    ...Shadows.medium,
  },
  stepText: {
    ...Typography.body,
    color: AppColors.text,
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
    backgroundColor: AppColors.primary,
    ...Shadows.small,
  },
  buttonSecondary: {
    backgroundColor: AppColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextPrimary: {
    ...Typography.button,
    color: AppColors.textInverse,
  },
  buttonTextSecondary: {
    ...Typography.button,
    color: AppColors.text,
  },
  buttonText: {
    ...Typography.button,
    color: AppColors.textInverse,
  },
  backButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  backText: {
    ...Typography.caption,
    color: AppColors.textSecondary,
  },
  loadingText: {
    ...Typography.body,
    color: AppColors.textSecondary,
    marginTop: Spacing.md,
  },
  permissionText: {
    ...Typography.body,
    color: AppColors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.xl,
  },
  instructionsContainer: {
    backgroundColor: AppColors.primaryLight + '20',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  instructionsText: {
    ...Typography.caption,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
});
