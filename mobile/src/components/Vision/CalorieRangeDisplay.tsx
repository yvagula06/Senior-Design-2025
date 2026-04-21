/**
 * CalorieRangeDisplay Component
 * 
 * Visual display of calorie estimate with range and confidence indicator.
 * Shows the estimated value prominently with min/max range below.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Typography, Spacing, BorderRadius } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import type { CalorieEstimate } from '../../types/vision';

interface CalorieRangeDisplayProps {
  calorieEstimate: CalorieEstimate;
  accuracyScore?: number;
}

export const CalorieRangeDisplay: React.FC<CalorieRangeDisplayProps> = ({
  calorieEstimate,
  accuracyScore,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const getAccuracyColor = (score?: number): string => {
    if (!score) return colors.textSecondary;
    if (score >= 0.8) return colors.success;
    if (score >= 0.6) return colors.warning;
    return colors.error;
  };

  const getAccuracyLabel = (score?: number): string => {
    if (!score) return 'Unknown';
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <View style={styles.container}>
      {/* Main Calorie Value */}
      <View style={styles.mainValueContainer}>
        <Text style={styles.calorieValue}>
          {Math.round(calorieEstimate.value)}
        </Text>
        <Text style={styles.calorieUnit}>{calorieEstimate.unit}</Text>
      </View>

      {/* Range Display */}
      <View style={styles.rangeContainer}>
        <View style={styles.rangeBar}>
          <View style={styles.rangeMinMax}>
            <Text style={styles.rangeText}>
              {Math.round(calorieEstimate.range.min)}
            </Text>
          </View>
          <View style={styles.rangeLine} />
          <View style={styles.rangeMinMax}>
            <Text style={styles.rangeText}>
              {Math.round(calorieEstimate.range.max)}
            </Text>
          </View>
        </View>
        <Text style={styles.rangeLabel}>Estimated Range</Text>
      </View>

      {/* Accuracy Score */}
      {accuracyScore !== undefined && (
        <View style={styles.accuracyContainer}>
          <View
            style={[
              styles.accuracyBadge,
              { backgroundColor: getAccuracyColor(accuracyScore) + '20' },
            ]}
          >
            <Text
              style={[
                styles.accuracyText,
                { color: getAccuracyColor(accuracyScore) },
              ]}
            >
              {getAccuracyLabel(accuracyScore)} ({Math.round(accuracyScore * 100)}%)
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  mainValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.md,
  },
  calorieValue: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -2,
  },
  calorieUnit: {
    ...Typography.h3,
    color: colors.textSecondary,
    marginLeft: Spacing.xs,
  },
  rangeContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  rangeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginBottom: Spacing.xs,
  },
  rangeMinMax: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  rangeText: {
    ...Typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  rangeLine: {
    flex: 1,
    height: 2,
    backgroundColor: colors.border,
    marginHorizontal: Spacing.xs,
  },
  rangeLabel: {
    ...Typography.caption,
    color: colors.textSecondary,
  },
  accuracyContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  accuracyBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  accuracyText: {
    ...Typography.caption,
    fontWeight: '600',
  },
  });
}

