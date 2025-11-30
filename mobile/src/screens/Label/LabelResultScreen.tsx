import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { LabelStackParamList } from '../../navigation/types';
import {
  ConfidenceBar,
  NutritionLabelCard,
  VariantDrawerButton,
  VariantBottomSheet,
  type NutritionData,
  type VariantBottomSheetRef,
  type CanonicalRecipe,
} from '../../components/Label';
import { AppColors, Spacing, Typography, BorderRadius, Shadows } from '../../theme';

type LabelResultRouteProp = RouteProp<LabelStackParamList, 'LabelResult'>;

export const LabelResultScreen: React.FC = () => {
  const route = useRoute<LabelResultRouteProp>();
  const navigation = useNavigation();
  const { dishName, calories } = route.params;
  const [isSaved, setIsSaved] = useState(false);
  const bottomSheetRef = useRef<VariantBottomSheetRef>(null);

  // Mock nutrition data - replace with actual API response
  const nutritionData: NutritionData = {
    servingSize: '1 serving (approx. 350g)',
    calories: calories || 520,
    protein: 28,
    totalCarbohydrate: 45,
    totalFat: 24,
    saturatedFat: 8,
    transFat: 0.5,
    sodium: 890,
    totalSugars: 12,
    addedSugars: 6,
    dietaryFiber: 3,
    cholesterol: 75,
    vitaminD: 2.5,
    calcium: 180,
    iron: 3.2,
    potassium: 650,
  };

  // Mock confidence score - replace with actual API response
  const confidence = 78;

  // Mock top recipes - replace with actual API response
  const topRecipes: CanonicalRecipe[] = [
    {
      id: '1',
      name: 'Traditional Butter Chicken (Restaurant Style)',
      similarity: 0.92,
      description: 'Classic North Indian curry with tomato-cream sauce, served with basmati rice',
    },
    {
      id: '2',
      name: 'Butter Chicken with Naan',
      similarity: 0.87,
      description: 'Similar preparation with bread instead of rice',
    },
    {
      id: '3',
      name: 'Homestyle Butter Chicken',
      similarity: 0.81,
      description: 'Lighter version with less cream and butter',
    },
  ];

  const handleSave = () => {
    // TODO: Implement actual save functionality
    setIsSaved(!isSaved);
  };

  const handleViewVariants = () => {
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleNewSearch = () => {
    navigation.goBack();
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Dish Name Header */}
      <View style={styles.headerCard}>
        <Text style={styles.dishName}>{dishName}</Text>
      </View>

      {/* Confidence Bar */}
      <ConfidenceBar confidence={confidence} showDetails={true} />

      {/* Summary Panel */}
      <View style={styles.summaryPanel}>
        <Text style={styles.summaryTitle}>Quick Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="fire" size={24} color={AppColors.accent} />
            <Text style={styles.summaryValue}>{nutritionData.calories}</Text>
            <Text style={styles.summaryLabel}>Calories</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="food-steak" size={24} color={AppColors.accent} />
            <Text style={styles.summaryValue}>{nutritionData.protein}g</Text>
            <Text style={styles.summaryLabel}>Protein</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="bread-slice" size={24} color={AppColors.accent} />
            <Text style={styles.summaryValue}>{nutritionData.totalCarbohydrate}g</Text>
            <Text style={styles.summaryLabel}>Carbs</Text>
          </View>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons name="water" size={24} color={AppColors.accent} />
            <Text style={styles.summaryValue}>{nutritionData.totalFat}g</Text>
            <Text style={styles.summaryLabel}>Fat</Text>
          </View>
        </View>
      </View>

      {/* FDA Nutrition Label */}
      <NutritionLabelCard dishName={dishName} nutrition={nutritionData} />

      {/* Variant Drawer Button */}
      <VariantDrawerButton onPress={handleViewVariants} variantCount={3} />

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.saveButton, isSaved && styles.savedButton]}
          onPress={handleSave}
        >
          <MaterialCommunityIcons
            name={isSaved ? 'heart' : 'heart-outline'}
            size={20}
            color={AppColors.white}
          />
          <Text style={styles.actionButtonText}>
            {isSaved ? 'Saved' : 'Save to History'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.newSearchButton]}
          onPress={handleNewSearch}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={AppColors.accent} />
          <Text style={[styles.actionButtonText, styles.newSearchButtonText]}>
            New Search
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  headerCard: {
    backgroundColor: AppColors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  dishName: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.primary,
    textAlign: 'center',
  },
  summaryPanel: {
    backgroundColor: AppColors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginVertical: Spacing.md,
    ...Shadows.md,
  },
  summaryTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.darkGray,
    marginBottom: Spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.darkGray,
  },
  summaryLabel: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.mediumGray,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  saveButton: {
    backgroundColor: AppColors.accent,
  },
  savedButton: {
    backgroundColor: AppColors.success,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.white,
  },
  newSearchButton: {
    backgroundColor: AppColors.white,
    borderWidth: 2,
    borderColor: AppColors.accent,
  },
  newSearchButtonText: {
    color: AppColors.accent,
  },
});
