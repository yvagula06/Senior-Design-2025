/**
 * AR Scanning Component (Phase 2)
 * 
 * Guides users through depth/AR scanning for accurate volume estimation.
 * Shows real-time feedback during the 2-3 second scanning period.
 * 
 * Features:
 * - AR session indicator
 * - Scanning progress bar/animation
 * - Distance/coverage feedback
 * - Automatic completion on sufficient data
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Typography, Spacing, BorderRadius } from '../../theme';

type ScanningStatus = 'initializing' | 'scanning' | 'processing' | 'complete' | 'error';

interface ARScanningOverlayProps {
  status: ScanningStatus;
  progress: number; // 0-100
  depthQuality?: number; // 0-1
  distanceToSubject?: number; // in meters
  onScanComplete?: () => void;
}

export const ARScanningOverlay: React.FC<ARScanningOverlayProps> = ({
  status,
  progress,
  depthQuality = 0,
  distanceToSubject,
  onScanComplete,
}) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const [rotateAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Pulse animation during scanning
    if (status === 'scanning') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Rotation animation for scanning icon
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'complete' && onScanComplete) {
      onScanComplete();
    }
  }, [status, onScanComplete]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const getStatusInfo = () => {
    switch (status) {
      case 'initializing':
        return {
          icon: 'cube-scan' as const,
          text: 'Initializing AR Session...',
          subtext: 'Please wait',
          color: AppColors.textSecondary,
        };
      case 'scanning':
        return {
          icon: 'cube-scan' as const,
          text: 'Scanning...',
          subtext: 'Move your phone around the plate',
          color: AppColors.primary,
        };
      case 'processing':
        return {
          icon: 'progress-clock' as const,
          text: 'Processing...',
          subtext: 'Building 3D model',
          color: AppColors.warning,
        };
      case 'complete':
        return {
          icon: 'check-circle' as const,
          text: 'Scan Complete!',
          subtext: 'Great data captured',
          color: AppColors.success,
        };
      case 'error':
        return {
          icon: 'alert-circle' as const,
          text: 'Scan Failed',
          subtext: 'Try again or use 2-photo mode',
          color: AppColors.error,
        };
      default:
        return {
          icon: 'cube-scan' as const,
          text: 'Ready',
          subtext: '',
          color: AppColors.text,
        };
    }
  };

  const statusInfo = getStatusInfo();
  const qualityColor = depthQuality > 0.7 ? AppColors.success : depthQuality > 0.4 ? AppColors.warning : AppColors.error;

  return (
    <View style={styles.overlay}>
      {/* Top Info Panel */}
      <View style={styles.topPanel}>
        <View style={styles.statusContainer}>
          <Animated.View
            style={[
              styles.statusIcon,
              status === 'scanning' && {
                transform: [{ scale: pulseAnim }, { rotate }],
              },
            ]}
          >
            <MaterialCommunityIcons
              name={statusInfo.icon}
              size={48}
              color={statusInfo.color}
            />
          </Animated.View>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
          <Text style={styles.statusSubtext}>{statusInfo.subtext}</Text>
        </View>

        {/* Progress Bar */}
        {(status === 'scanning' || status === 'processing') && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                    backgroundColor: statusInfo.color,
                  },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        )}
      </View>

      {/* Center Scanning Guide */}
      {status === 'scanning' && (
        <View style={styles.centerGuide}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <MaterialCommunityIcons
            name="grid"
            size={200}
            color={AppColors.primary + '40'}
            style={styles.gridIcon}
          />
        </View>
      )}

      {/* Bottom Info Panel */}
      <View style={styles.bottomPanel}>
        {/* Depth Quality Indicator */}
        {status === 'scanning' && depthQuality > 0 && (
          <View style={styles.qualityContainer}>
            <MaterialCommunityIcons
              name="signal"
              size={24}
              color={qualityColor}
            />
            <Text style={styles.qualityLabel}>Depth Quality</Text>
            <View style={styles.qualityBar}>
              <View
                style={[
                  styles.qualityFill,
                  {
                    width: `${depthQuality * 100}%`,
                    backgroundColor: qualityColor,
                  },
                ]}
              />
            </View>
          </View>
        )}

        {/* Distance Indicator */}
        {distanceToSubject !== undefined && (
          <View style={styles.distanceContainer}>
            <MaterialCommunityIcons
              name="tape-measure"
              size={20}
              color={AppColors.textSecondary}
            />
            <Text style={styles.distanceText}>
              Distance: {distanceToSubject.toFixed(2)}m
            </Text>
            {distanceToSubject < 0.2 && (
              <Text style={styles.distanceHint}>Move back</Text>
            )}
            {distanceToSubject > 0.8 && (
              <Text style={styles.distanceHint}>Move closer</Text>
            )}
          </View>
        )}

        {/* Instructions */}
        {status === 'scanning' && (
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>
              Keep the plate in view • Move slowly in a circle
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  topPanel: {
    backgroundColor: AppColors.surface + 'E6',
    paddingTop: 60,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusIcon: {
    marginBottom: Spacing.sm,
  },
  statusText: {
    ...Typography.h2,
    marginBottom: Spacing.xs,
  },
  statusSubtext: {
    ...Typography.body,
    color: AppColors.textSecondary,
  },
  progressContainer: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: AppColors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    ...Typography.caption,
    color: AppColors.text,
    fontWeight: '600',
    minWidth: 40,
  },
  centerGuide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: AppColors.primary,
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  gridIcon: {
    position: 'absolute',
  },
  bottomPanel: {
    backgroundColor: AppColors.surface + 'E6',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    gap: Spacing.md,
  },
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  qualityLabel: {
    ...Typography.caption,
    color: AppColors.text,
    fontWeight: '600',
  },
  qualityBar: {
    flex: 1,
    height: 6,
    backgroundColor: AppColors.backgroundSecondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  qualityFill: {
    height: '100%',
    borderRadius: 3,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  distanceText: {
    ...Typography.caption,
    color: AppColors.text,
  },
  distanceHint: {
    ...Typography.caption,
    color: AppColors.warning,
    fontStyle: 'italic',
  },
  instructionsContainer: {
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  instructionsText: {
    ...Typography.caption,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
});
