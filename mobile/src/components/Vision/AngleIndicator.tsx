/**
 * AngleIndicator Component
 * 
 * Visual indicator showing current capture angle for multi-angle mode.
 * Displays which angles have been captured and which are remaining.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Typography, Spacing } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import type { CaptureAngle } from '../../types/vision';

interface AngleIndicatorProps {
  capturedAngles: CaptureAngle[];
  currentAngle?: CaptureAngle;
}

export const AngleIndicator: React.FC<AngleIndicatorProps> = ({
  capturedAngles,
  currentAngle,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const angles: CaptureAngle[] = ['top', 'side', 'diagonal'];

  const getAngleIcon = (angle: CaptureAngle): keyof typeof MaterialCommunityIcons.glyphMap => {
    switch (angle) {
      case 'top':
        return 'arrow-down';
      case 'side':
        return 'arrow-right';
      case 'diagonal':
        return 'arrow-top-right';
      default:
        return 'camera';
    }
  };

  const getAngleLabel = (angle: CaptureAngle): string => {
    switch (angle) {
      case 'top':
        return 'Top View';
      case 'side':
        return 'Side View';
      case 'diagonal':
        return 'Diagonal';
      default:
        return angle;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Capture Angles</Text>
      <View style={styles.anglesRow}>
        {angles.map((angle) => {
          const isCaptured = capturedAngles.includes(angle);
          const isCurrent = currentAngle === angle;

          return (
            <View
              key={angle}
              style={[
                styles.angleItem,
                isCaptured && styles.angleItemCaptured,
                isCurrent && styles.angleItemCurrent,
              ]}
            >
              <MaterialCommunityIcons
                name={getAngleIcon(angle)}
                size={24}
                color={isCaptured ? colors.success : colors.textSecondary}
              />
              <Text
                style={[
                  styles.angleLabel,
                  isCaptured && styles.angleLabelCaptured,
                ]}
              >
                {getAngleLabel(angle)}
              </Text>
              {isCaptured && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={16}
                  color={colors.success}
                  style={styles.checkIcon}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
  },
  title: {
    ...Typography.caption,
    color: colors.textInverse,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  anglesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  angleItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    minWidth: 80,
  },
  angleItemCaptured: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
  },
  angleItemCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  angleLabel: {
    ...Typography.caption,
    color: colors.textSecondary,
    marginTop: Spacing.xs,
    fontSize: 11,
  },
  angleLabelCaptured: {
    color: colors.success,
    fontWeight: '600',
  },
  checkIcon: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  });
}

