import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Typography, BorderRadius, Shadows } from '../../theme';

export interface DishCardData {
  id: string;
  name: string;
  description: string;
  calories: number;
  prepStyle: 'home' | 'restaurant';
  imageUrl?: string;
  estimatedProtein?: number;
  estimatedCarbs?: number;
  estimatedFat?: number;
}

interface DishCardProps {
  dish: DishCardData;
  onPress: () => void;
}

export const DishCard: React.FC<DishCardProps> = ({ dish, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Image or Placeholder */}
      <View style={styles.imageContainer}>
        {dish.imageUrl ? (
          <Image source={{ uri: dish.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imagePlaceholder}>
            <MaterialCommunityIcons
              name={dish.prepStyle === 'home' ? 'home' : 'silverware-fork-knife'}
              size={40}
              color={AppColors.accent}
            />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Dish Name */}
        <Text style={styles.dishName} numberOfLines={2}>
          {dish.name}
        </Text>

        {/* Description */}
        {dish.description && (
          <Text style={styles.description} numberOfLines={2}>
            {dish.description}
          </Text>
        )}

        {/* Metadata Row */}
        <View style={styles.metadataRow}>
          {/* Calories */}
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons name="fire" size={14} color={AppColors.accent} />
            <Text style={styles.metadataText}>{dish.calories} cal</Text>
          </View>

          {/* Prep Style */}
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons
              name={dish.prepStyle === 'home' ? 'home' : 'silverware-fork-knife'}
              size={14}
              color={AppColors.textSecondary}
            />
            <Text style={styles.metadataText}>
              {dish.prepStyle === 'home' ? 'Home' : 'Restaurant'}
            </Text>
          </View>
        </View>

        {/* Quick Macros (if available) */}
{(dish.estimatedProtein || dish.estimatedCarbs || dish.estimatedFat) && (
  <View style={styles.macrosRow}>
    {/* FIX: Use Boolean() to ensure 0 is treated as false, not rendered. */}
    {Boolean(dish.estimatedProtein) && (
      <Text style={styles.macroText}>P: {dish.estimatedProtein}g</Text>
    )}
    {Boolean(dish.estimatedCarbs) && (
      <Text style={styles.macroText}>C: {dish.estimatedCarbs}g</Text>
    )}
    {Boolean(dish.estimatedFat) && (
      <Text style={styles.macroText}>F: {dish.estimatedFat}g</Text>
    )}
  </View>
)}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.md,
    overflow: 'hidden',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: AppColors.background,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.background,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  content: {
    padding: Spacing.md,
  },
  dishName: {
    fontFamily: 'CrimsonPro_600SemiBold',
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
    marginBottom: Spacing.xs,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.md,
  },
  description: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.xs,
  },
  metadataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs / 2,
  },
  metadataText: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  macroText: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.accent,
    fontWeight: Typography.fontWeight.semibold,
  },
});
