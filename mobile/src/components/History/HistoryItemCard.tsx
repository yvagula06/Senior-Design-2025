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
  protein?: number; // Protein in grams
  carbs?: number; // Carbs in grams
  fats?: number; // Fats in grams
  nutrition?: any; // Full nutrition data for detail view
  timestamp?: number; // For sorting entries with same date
}

interface HistoryItemCardProps {
  item: HistoryEntry;
  onPress: () => void;
}

export const HistoryItemCard: React.FC<HistoryItemCardProps> = ({ item, onPress }) => {
  const formatDate = (dateString: string) => {
    // Parse date in local timezone to avoid UTC conversion issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
      return 'Today';
    } else if (compareDate.getTime() === yesterday.getTime()) {
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
        {/* Top Row - Dish Name and Confidence */}
        <View style={styles.topRow}>
          <View style={styles.dishNameContainer}>
            {item.isFavorite && (
              <MaterialCommunityIcons
                name="star"
                size={20}
                color={AppColors.warning}
                style={styles.favoriteIcon}
              />
            )}
            <Text style={styles.dishName} numberOfLines={2}>
              {item.dishName}
            </Text>
          </View>
          <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor() }]}>
            <MaterialCommunityIcons name="shield-check" size={14} color="#FFF" />
            <Text style={styles.confidenceText}>{item.confidence}%</Text>
          </View>
        </View>

        {/* Bottom Row - Calories, Date, Prep Style */}
        <View style={styles.bottomRow}>
          {/* Calories - Most Prominent */}
          <View style={styles.caloriesSection}>
            <MaterialCommunityIcons name="fire" size={24} color={AppColors.accent} />
            <View style={styles.caloriesTextContainer}>
              <Text style={styles.caloriesValue}>{item.calories}</Text>
              <Text style={styles.caloriesLabel}>calories</Text>
            </View>
          </View>

          {/* Date and Prep Style */}
          <View style={styles.metadataSection}>
            <View style={styles.metadataRow}>
              <MaterialCommunityIcons
                name="calendar-outline"
                size={16}
                color={AppColors.textTertiary}
              />
              <Text style={styles.dateText}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.metadataRow}>
              <MaterialCommunityIcons
                name={getPrepStyleIcon()}
                size={16}
                color={AppColors.textTertiary}
              />
              <Text style={styles.prepText}>
                {item.prepStyle === 'home' ? 'Home' : item.prepStyle === 'restaurant' ? 'Restaurant' : 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Chevron */}
          <MaterialCommunityIcons
            name="chevron-right"
            size={28}
            color={AppColors.textTertiary}
            style={styles.chevron}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.xl,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  cardContent: {
    padding: Spacing.lg,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  dishNameContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: Spacing.sm,
  },
  favoriteIcon: {
    marginRight: Spacing.xs,
    marginTop: 2,
  },
  dishName: {
    flex: 1,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.xl,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  confidenceText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: '#FFF',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caloriesSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  caloriesTextContainer: {
    flexDirection: 'column',
  },
  caloriesValue: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.extrabold,
    color: AppColors.accent,
    lineHeight: Typography.fontSize.xxl * 1.1,
  },
  caloriesLabel: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  metadataSection: {
    flex: 1,
    marginLeft: Spacing.md,
    gap: Spacing.xs / 2,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  dateText: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.textTertiary,
    fontWeight: Typography.fontWeight.medium,
  },
  prepText: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.textTertiary,
    fontWeight: Typography.fontWeight.medium,
  },
  chevron: {
    marginLeft: Spacing.xs,
  },
});
