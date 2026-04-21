/**
 * DishPredictionList Component
 * 
 * List of predicted dishes with confidence scores.
 * Shows top N predictions from the vision model.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Typography, Spacing, BorderRadius } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';
import type { DishPrediction } from '../../types/vision';

interface DishPredictionListProps {
  predictions: DishPrediction[];
  selectedDishId: string;
}

export const DishPredictionList: React.FC<DishPredictionListProps> = ({
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  predictions,
  selectedDishId,
}) => {
  const renderPrediction = ({ item, index }: { item: DishPrediction; index: number }) => {
    const isSelected = item.dish_id === selectedDishId;
    const confidencePercent = Math.round(item.confidence * 100);

    return (
      <View
        style={[
          styles.predictionItem,
          isSelected && styles.predictionItemSelected,
        ]}
      >
        {/* Rank Badge */}
        <View style={styles.rankBadge}>
          <Text style={styles.rankText}>{index + 1}</Text>
        </View>

        {/* Dish Info */}
        <View style={styles.dishInfo}>
          <View style={styles.dishNameRow}>
            <Text style={styles.dishName}>{item.dish_name}</Text>
            {isSelected && (
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={colors.success}
                style={styles.selectedIcon}
              />
            )}
          </View>
          {item.category && (
            <Text style={styles.dishCategory}>{item.category}</Text>
          )}
        </View>

        {/* Confidence Bar */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceText}>{confidencePercent}%</Text>
          <View style={styles.confidenceBarBackground}>
            <View
              style={[
                styles.confidenceBarFill,
                {
                  width: `${confidencePercent}%`,
                  backgroundColor: getConfidenceColor(item.confidence),
                },
              ]}
            />
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Detected Dishes</Text>
      <FlatList
        data={predictions}
        renderItem={renderPrediction}
        keyExtractor={(item) => item.dish_id}
        scrollEnabled={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.8) return colors.success;
  if (confidence >= 0.6) return colors.warning;
  return colors.error;
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  title: {
    ...Typography.h3,
    color: colors.text,
    marginBottom: Spacing.md,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  predictionItemSelected: {
    backgroundColor: colors.primaryLight + '10',
    marginHorizontal: -Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  rankText: {
    ...Typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  dishInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  dishNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dishName: {
    ...Typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  selectedIcon: {
    marginLeft: Spacing.xs,
  },
  dishCategory: {
    ...Typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  confidenceContainer: {
    minWidth: 80,
    alignItems: 'flex-end',
  },
  confidenceText: {
    ...Typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  confidenceBarBackground: {
    width: 60,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: Spacing.xs,
  },
  });
}

