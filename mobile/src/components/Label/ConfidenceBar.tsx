import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

interface ConfidenceBarProps {
  confidence: number; // 0-100
  showDetails?: boolean;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  confidence,
  showDetails = true,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const getConfidenceColor = () => {
    if (confidence >= 80) return colors.success;
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

type C = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: C) {
  return StyleSheet.create({
    container: {
      backgroundColor: colors.cardBackground,
      borderRadius: BorderRadius.lg,
      padding: Spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
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
      color: colors.text,
    },
    barBackground: {
      height: 8,
      backgroundColor: colors.surface,
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
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.normal * Typography.fontSize.xs,
    },
  });
}
