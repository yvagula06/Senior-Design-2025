/**
 * CalorieRangeDisplay Component
 * 
 * Visual display of calorie estimate with range and confidence indicator.
 * Shows the estimated value prominently with min/max range below.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AppColors, Typography, Spacing, BorderRadius } from '../../theme';
import type { CalorieEstimate } from '../../types/vision';

interface CalorieRangeDisplayProps {
  calorieEstimate: CalorieEstimate;
  accuracyScore?: number;
}

export const CalorieRangeDisplay: React.FC<CalorieRangeDisplayProps> = ({
  calorieEstimate,
  accuracyScore,
}) => {
  const getAccuracyColor = (score?: number): string => {
    if (!score) return AppColors.textSecondary;
    if (score >= 0.8) return AppColors.success;
    if (score >= 0.6) return AppColors.warning;
    return AppColors.error;
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.surface,
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
    color: AppColors.primary,
    letterSpacing: -2,
  },
  calorieUnit: {
    ...Typography.h3,
    color: AppColors.textSecondary,
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
    backgroundColor: AppColors.backgroundSecondary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  rangeText: {
    ...Typography.body,
    color: AppColors.textSecondary,
    fontWeight: '600',
  },
  rangeLine: {
    flex: 1,
    height: 2,
    backgroundColor: AppColors.border,
    marginHorizontal: Spacing.xs,
  },
  rangeLabel: {
    ...Typography.caption,
    color: AppColors.textSecondary,
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
