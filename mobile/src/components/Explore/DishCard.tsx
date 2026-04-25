import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius, Shadows } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

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

export const DishCard: React.FC<DishCardProps> = ({
  dish,
  onPress,
}) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
              color={colors.accent}
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
            <MaterialCommunityIcons name="fire" size={14} color={colors.accent} />
            <Text style={styles.metadataText}>{dish.calories} cal</Text>
          </View>

          {/* Prep Style */}
          <View style={styles.metadataItem}>
            <MaterialCommunityIcons
              name={dish.prepStyle === 'home' ? 'home' : 'silverware-fork-knife'}
              size={14}
              color={colors.textSecondary}
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

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  card: {
    width: 200,
    backgroundColor: colors.cardBackground,
    borderRadius: BorderRadius.lg,
    marginRight: Spacing.md,
    overflow: 'hidden',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: '100%',
    height: 120,
    backgroundColor: colors.background,
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
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  content: {
    padding: Spacing.md,
  },
  dishName: {
    fontFamily: 'CrimsonPro_600SemiBold',
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: colors.text,
    marginBottom: Spacing.xs,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.md,
  },
  description: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
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
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  macrosRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  macroText: {
    fontSize: Typography.fontSize.xs,
    color: colors.accent,
    fontWeight: Typography.fontWeight.semibold,
  },
  });
}

