import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { AppColors, Spacing, Typography } from '../theme';

interface MacroPieChartProps {
  protein: number;
  carbs: number;
  fats: number;
  size?: number;
}

export const MacroPieChart: React.FC<MacroPieChartProps> = ({
  protein,
  carbs,
  fats,
  size = 200,
}) => {
  // Calculate total and percentages
  const total = protein + carbs + fats;
  
  if (total === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  const proteinPercent = (protein / total) * 100;
  const carbsPercent = (carbs / total) * 100;
  const fatsPercent = (fats / total) * 100;

  // SVG Circle properties
  const radius = (size - 40) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Calculate stroke dash offsets for each segment
  const proteinDash = (proteinPercent / 100) * circumference;
  const carbsDash = (carbsPercent / 100) * circumference;
  const fatsDash = (fatsPercent / 100) * circumference;

  // Colors for each macro
  const proteinColor = '#4CAF50'; // Green
  const carbsColor = '#FF9800'; // Orange
  const fatsColor = '#2196F3'; // Blue

  // Starting rotation angles (clockwise from top)
  const proteinRotation = -90; // Start at top
  const carbsRotation = proteinRotation + (proteinPercent / 100) * 360;
  const fatsRotation = carbsRotation + (carbsPercent / 100) * 360;

  return (
    <View style={styles.container}>
      <View style={[styles.chartContainer, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <G rotation={proteinRotation} origin={`${center}, ${center}`}>
            {/* Protein segment */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={proteinColor}
              strokeWidth={30}
              fill="transparent"
              strokeDasharray={`${proteinDash} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
          <G rotation={carbsRotation} origin={`${center}, ${center}`}>
            {/* Carbs segment */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={carbsColor}
              strokeWidth={30}
              fill="transparent"
              strokeDasharray={`${carbsDash} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
          <G rotation={fatsRotation} origin={`${center}, ${center}`}>
            {/* Fats segment */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={fatsColor}
              strokeWidth={30}
              fill="transparent"
              strokeDasharray={`${fatsDash} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>

        {/* Center label */}
        <View style={styles.centerLabel}>
          <Text style={styles.centerTitle}>Macros</Text>
          <Text style={styles.centerSubtitle}>{total.toFixed(0)}g</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: proteinColor }]} />
          <Text style={styles.legendText}>
            Protein {proteinPercent.toFixed(0)}% ({protein.toFixed(1)}g)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: carbsColor }]} />
          <Text style={styles.legendText}>
            Carbs {carbsPercent.toFixed(0)}% ({carbs.toFixed(1)}g)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: fatsColor }]} />
          <Text style={styles.legendText}>
            Fats {fatsPercent.toFixed(0)}% ({fats.toFixed(1)}g)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  chartContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerLabel: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.white,
  },
  centerSubtitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.white,
    marginTop: Spacing.xs / 2,
  },
  emptyText: {
    fontSize: Typography.fontSize.md,
    color: AppColors.white,
  },
  legend: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.white,
    fontWeight: Typography.fontWeight.medium,
  },
});
