import React, { forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Modal, TouchableOpacity, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Typography, BorderRadius, Shadows } from '../../theme';

export interface CanonicalRecipe {
  id: string;
  name: string;
  similarity: number; // 0-1
  description?: string;
}

export interface VariantBottomSheetProps {
  assumedStyle: string;
  topRecipes: CanonicalRecipe[];
  uncertaintyExplanation: string;
}

export interface VariantBottomSheetRef {
  snapToIndex: (index: number) => void;
  close: () => void;
}

export const VariantBottomSheet = forwardRef<VariantBottomSheetRef, VariantBottomSheetProps>(
  ({ assumedStyle, topRecipes, uncertaintyExplanation }, ref) => {
    const [visible, setVisible] = useState(false);

    useImperativeHandle(ref, () => ({
      snapToIndex: (index: number) => {
        if (index >= 0) setVisible(true);
        else setVisible(false);
      },
      close: () => setVisible(false),
    }));

    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable 
          style={styles.backdrop} 
          onPress={() => setVisible(false)}
        >
          <Pressable style={styles.bottomSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handleBar} />
            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.header}>
              <MaterialCommunityIcons
                name="information-outline"
                size={28}
                color={AppColors.primary}
              />
              <Text style={styles.title}>Assumptions & Variants</Text>
            </View>

            {/* Assumed Style Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="chef-hat"
                  size={20}
                  color={AppColors.primary}
                />
                <Text style={styles.sectionTitle}>Assumed Preparation Style</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.assumedStyleText}>{assumedStyle}</Text>
              </View>
            </View>

            {/* Top Canonical Recipes Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="food-variant"
                  size={20}
                  color={AppColors.primary}
                />
                <Text style={styles.sectionTitle}>Top 3 Closest Recipes</Text>
              </View>
              <Text style={styles.sectionDescription}>
                These are the most similar dishes from our database
              </Text>
              {topRecipes.map((recipe, index) => (
                <View key={recipe.id} style={styles.recipeCard}>
                  <View style={styles.recipeHeader}>
                    <View style={styles.recipeTitleContainer}>
                      <View style={styles.rankBadge}>
                        <Text style={styles.rankText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.recipeName}>{recipe.name}</Text>
                    </View>
                    <View style={styles.similarityContainer}>
                      <MaterialCommunityIcons
                        name="chart-line"
                        size={16}
                        color={AppColors.success}
                      />
                      <Text style={styles.similarityText}>
                        {Math.round(recipe.similarity * 100)}%
                      </Text>
                    </View>
                  </View>
                  {recipe.description && (
                    <Text style={styles.recipeDescription}>{recipe.description}</Text>
                  )}
                  {/* Progress Bar */}
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${recipe.similarity * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* Uncertainty Explanation Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={20}
                  color={AppColors.warning}
                />
                <Text style={styles.sectionTitle}>Understanding Uncertainty</Text>
              </View>
              <View style={styles.uncertaintyCard}>
                <Text style={styles.uncertaintyText}>{uncertaintyExplanation}</Text>
              </View>
            </View>

            {/* Bottom Padding */}
            <View style={styles.bottomPadding} />
          </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  }
);

VariantBottomSheet.displayName = 'VariantBottomSheet';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '75%',
    ...Shadows.lg,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: AppColors.mediumGray,
    borderRadius: BorderRadius.full,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  bottomSheetBackground: {
    backgroundColor: AppColors.white,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  handleIndicator: {
    backgroundColor: AppColors.mediumGray,
    width: 40,
    height: 4,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
  title: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.darkGray,
    flex: 1,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.darkGray,
  },
  sectionDescription: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.mediumGray,
    marginBottom: Spacing.md,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  card: {
    backgroundColor: AppColors.lightGray,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.mediumGray,
  },
  assumedStyleText: {
    fontSize: Typography.fontSize.md,
    color: AppColors.darkGray,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
  },
  recipeCard: {
    backgroundColor: AppColors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.lightGray,
    ...Shadows.sm,
  },
  recipeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  recipeTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.full,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.white,
  },
  recipeName: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.darkGray,
    flex: 1,
  },
  similarityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: AppColors.accentLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
  },
  similarityText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.success,
  },
  recipeDescription: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.mediumGray,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: AppColors.lightGray,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.success,
    borderRadius: BorderRadius.full,
  },
  uncertaintyCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  uncertaintyText: {
    fontSize: Typography.fontSize.md,
    color: AppColors.darkGray,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.md,
  },
  bottomPadding: {
    height: Spacing.xl,
  },
});
