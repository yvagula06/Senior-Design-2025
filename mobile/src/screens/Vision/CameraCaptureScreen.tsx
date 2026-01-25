/**
 * CameraCaptureScreen
 * 
 * Screen for capturing meal photos using expo-image-picker.
 * Builds VisionRequest payload and calls the /vision/estimate endpoint.
 * 
 * FEATURES:
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Device from 'expo-device';
import { AppColors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import { CameraGuide } from '../../components/Vision';
import { estimateMeal } from '../../services/visionApi';
import type { VisionRequest, VisionResponse, DeviceType, CaptureMode } from '../../types/vision';
import type { ExploreStackNavigationProp } from '../../navigation/types';

export const CameraCaptureScreen: React.FC = () => {
  const navigation = useNavigation<ExploreStackNavigationProp>();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    requestPermissions();
  }, []);

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
        setImageUri(asset.uri);
        setImageBase64(asset.base64 || null);
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
        setImageUri(asset.uri);
        setImageBase64(asset.base64 || null);
      }
    } catch (error) {
      console.error('❌ [Camera] Failed to pick image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleEstimate = async () => {
    if (!imageBase64) {
      Alert.alert('No Image', 'Please capture or select an image first.');
      return;
    }

    try {
      setIsLoading(true);

      // Build VisionRequest payload
      const request: VisionRequest = {
        images: [
          {
            data: imageBase64,
            angle: 'top',
            timestamp: new Date().toISOString(),
          },
        ],
        metadata: {
          device_type: getDeviceType(),
          capture_mode: 'single' as CaptureMode,
          device_model: getDeviceModel(),
        },
      };

      console.log('📸 [CameraCapture] Calling vision API...');
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
    setImageUri(null);
    setImageBase64(null);
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
      {/* Preview or Camera Guide */}
      <View style={styles.previewContainer}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
        ) : (
          <CameraGuide captureMode="single" />
        )}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {imageUri ? (
          // Post-capture controls
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
        ) : (
          // Pre-capture controls
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
        )}
      </View>

      {/* Instructions */}
      {!imageUri && (
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsText}>
            📸 Take a photo of your meal from directly above for best results
          </Text>
        </View>
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
  previewContainer: {
    flex: 1,
    backgroundColor: AppColors.backgroundSecondary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  controlsContainer: {
    backgroundColor: AppColors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    ...Shadows.medium,
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
