/**
 * CameraGuide Component
 * 
 * Visual guide overlay for camera capture showing optimal framing.
 * Displays a target frame with instructions for best results.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography, Spacing } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface CameraGuideProps {
  captureMode: 'single' | 'multi_angle' | 'reference_object';
}

export const CameraGuide: React.FC<CameraGuideProps> = ({
  captureMode,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const getInstructions = () => {
    switch (captureMode) {
      case 'single':
        return 'Center your meal in the frame';
      case 'multi_angle':
        return 'Capture from multiple angles for better accuracy';
      case 'reference_object':
        return 'Include a reference object (credit card, coin, etc.)';
      default:
        return 'Position your meal in the center';
    }
  };

  return (
    <View style={styles.container}>
      {/* Target Frame */}
      <View style={styles.targetFrame}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>{getInstructions()}</Text>
      </View>
    </View>
  );
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: colors.primary,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 60,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 8,
  },
  instructionsText: {
    ...Typography.body,
    color: colors.textInverse,
    textAlign: 'center',
  },
  });
}

