import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Typography, BorderRadius, Shadows } from '../../theme';

export interface HistoryEntry {
  id: string;
  dishName: string;
  calories: number;
  confidence: number;
  date: string;
  prepStyle: 'home' | 'restaurant' | 'unknown';
  isFavorite?: boolean;
  nutrition?: any; // Full nutrition data for detail view
}

interface HistoryItemCardProps {
  item: HistoryEntry;
  onPress: () => void;
}

export const HistoryItemCard: React.FC<HistoryItemCardProps> = ({ item, onPress }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const getConfidenceColor = () => {
    if (item.confidence >= 80) return AppColors.success;
    if (item.confidence >= 60) return '#FFA726';
    return '#EF5350';
  };

  const getPrepStyleIcon = () => {
    switch (item.prepStyle) {
      case 'home':
        return 'home';
      case 'restaurant':
        return 'silverware-fork-knife';
      default:
        return 'help-circle-outline';
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {/* Left Section */}
        <View style={styles.leftSection}>
          {/* Favorite Star */}
          {item.isFavorite && (
            <MaterialCommunityIcons
              name="star"
              size={16}
              color={AppColors.warning}
              style={styles.favoriteIcon}
            />
          )}

          {/* Dish Name */}
          <Text style={styles.dishName} numberOfLines={1}>
            {item.dishName}
          </Text>

          {/* Metadata Row */}
          <View style={styles.metadataRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={14}
              color={AppColors.mediumGray}
            />
            <Text style={styles.dateText}>{formatDate(item.date)}</Text>

            <MaterialCommunityIcons
              name={getPrepStyleIcon()}
              size={14}
              color={AppColors.mediumGray}
              style={styles.prepIcon}
            />
            <Text style={styles.prepText}>
              {item.prepStyle === 'home' ? 'Home' : item.prepStyle === 'restaurant' ? 'Restaurant' : 'Unknown'}
            </Text>
          </View>
        </View>

        {/* Right Section */}
        <View style={styles.rightSection}>
          {/* Calories */}
          <View style={styles.caloriesContainer}>
            <Text style={styles.caloriesValue}>{item.calories}</Text>
            <Text style={styles.caloriesLabel}>cal</Text>
          </View>

          {/* Confidence Badge */}
          <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor() }]}>
            <Text style={styles.confidenceText}>{item.confidence}%</Text>
          </View>

          {/* Chevron */}
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={AppColors.mediumGray}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardContent: {
    flexDirection: 'row',
    padding: Spacing.md,
    alignItems: 'center',
  },
  leftSection: {
    flex: 1,
    marginRight: Spacing.md,
  },
  favoriteIcon: {
    position: 'absolute',
    top: -2,
    left: -2,
  },
  dishName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.text,
    marginBottom: Spacing.xs,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dateText: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.textTertiary,
  },
  prepIcon: {
    marginLeft: Spacing.sm,
  },
  prepText: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.textTertiary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  caloriesContainer: {
    alignItems: 'center',
  },
  caloriesValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
  },
  caloriesLabel: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.mediumGray,
  },
  confidenceBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.md,
  },
  confidenceText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.white,
  },
});
