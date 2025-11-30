import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Typography, BorderRadius } from '../../theme';

interface ConfidenceBarProps {
  confidence: number; // 0-100
  showDetails?: boolean;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  confidence,
  showDetails = true,
}) => {
  const getConfidenceColor = () => {
    if (confidence >= 80) return AppColors.success;
    if (confidence >= 60) return '#FFA726'; // Orange
    return '#EF5350'; // Red
  };

  const getConfidenceLabel = () => {
    if (confidence >= 80) return 'High confidence';
    if (confidence >= 60) return 'Medium confidence';
    return 'Low confidence';
  };

  const getConfidenceIcon = () => {
    if (confidence >= 80) return 'check-circle';
    if (confidence >= 60) return 'alert-circle';
    return 'information';
  };

  const confidenceColor = getConfidenceColor();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelContainer}>
          <MaterialCommunityIcons
            name={getConfidenceIcon()}
            size={20}
            color={confidenceColor}
          />
          <Text style={[styles.label, { color: confidenceColor }]}>
            {getConfidenceLabel()}
          </Text>
        </View>
        <Text style={styles.percentage}>{confidence}%</Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.barBackground}>
        <View
          style={[
            styles.barFill,
            {
              width: `${confidence}%`,
              backgroundColor: confidenceColor,
            },
          ]}
        />
      </View>

      {showDetails && (
        <Text style={styles.description}>
          Based on {confidence >= 80 ? 'strong' : confidence >= 60 ? 'moderate' : 'limited'}{' '}
          similarity to known dishes in our database
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.lightGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  percentage: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.darkGray,
  },
  barBackground: {
    height: 8,
    backgroundColor: AppColors.lightGray,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  barFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  description: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.mediumGray,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.xs,
  },
});
