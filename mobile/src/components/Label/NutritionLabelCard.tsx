import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { AppColors, Spacing, Typography, BorderRadius, Shadows } from '../../theme';

export interface NutritionData {
  servingSize: string;
  calories: number;
  // Macros
  protein: number;
  totalCarbohydrate: number;
  totalFat: number;
  saturatedFat: number;
  transFat: number;
  // Micros
  sodium: number;
  totalSugars: number;
  addedSugars: number;
  dietaryFiber: number;
  cholesterol: number;
  // Optional vitamins/minerals
  vitaminD?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
}

interface NutritionLabelCardProps {
  dishName: string;
  nutrition: NutritionData;
  compact?: boolean;
  scrollable?: boolean;
}

export const NutritionLabelCard: React.FC<NutritionLabelCardProps> = ({
  dishName,
  nutrition,
  compact = false,
  scrollable = true,
}) => {
  const renderNutrientRow = (
    label: string,
    value: string | number,
    unit: string = 'g',
    bold: boolean = false,
    indent: number = 0,
  ) => (
    <View style={[styles.nutrientRow, { paddingLeft: indent * Spacing.md }]}>
      <Text style={bold ? styles.nutrientLabelBold : styles.nutrientLabel}>
        {label}
      </Text>
      <Text style={bold ? styles.nutrientValueBold : styles.nutrientValue}>
        {value}{unit}
      </Text>
    </View>
  );

  const renderSectionHeader = (title: string) => (
    <View style={styles.sectionHeaderContainer}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const renderNutrientsContent = () => (
    <>
      {/* Macros Section */}
      {renderSectionHeader('MACRONUTRIENTS')}
      {renderNutrientRow('Protein', nutrition.protein, 'g', true)}
      <View style={styles.thinDivider} />
      {renderNutrientRow('Total Carbohydrate', nutrition.totalCarbohydrate, 'g', true)}
      <View style={styles.thinDivider} />
      {renderNutrientRow('Dietary Fiber', nutrition.dietaryFiber, 'g', false, 1)}
      <View style={styles.thinDivider} />
      {renderNutrientRow('Total Sugars', nutrition.totalSugars, 'g', false, 1)}
      <View style={styles.thinDivider} />
      {renderNutrientRow('Includes Added Sugars', nutrition.addedSugars, 'g', false, 2)}
      <View style={styles.thinDivider} />
      {renderNutrientRow('Total Fat', nutrition.totalFat, 'g', true)}
      <View style={styles.thinDivider} />
      {renderNutrientRow('Saturated Fat', nutrition.saturatedFat, 'g', false, 1)}
      <View style={styles.thinDivider} />
      {renderNutrientRow('Trans Fat', nutrition.transFat, 'g', false, 1)}

      {/* Micros Section */}
      <View style={styles.mediumDivider} />
      {renderSectionHeader('MICRONUTRIENTS')}
      {renderNutrientRow('Sodium', nutrition.sodium, 'mg', true)}
      <View style={styles.thinDivider} />
      {renderNutrientRow('Cholesterol', nutrition.cholesterol, 'mg', true)}

      {!compact && nutrition.vitaminD !== undefined && (
        <>
          <View style={styles.mediumDivider} />
          {renderSectionHeader('VITAMINS & MINERALS')}
          {renderNutrientRow('Vitamin D', nutrition.vitaminD, 'mcg', false)}
          <View style={styles.thinDivider} />
          {nutrition.calcium !== undefined &&
            renderNutrientRow('Calcium', nutrition.calcium, 'mg', false)}
          <View style={styles.thinDivider} />
          {nutrition.iron !== undefined &&
            renderNutrientRow('Iron', nutrition.iron, 'mg', false)}
          <View style={styles.thinDivider} />
          {nutrition.potassium !== undefined &&
            renderNutrientRow('Potassium', nutrition.potassium, 'mg', false)}
        </>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      {/* FDA Label Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Nutrition Facts</Text>
        <View style={styles.headerDivider} />
        <View style={styles.servingRow}>
          <Text style={styles.servingLabel}>{nutrition.servingSize}</Text>
        </View>
      </View>

      <View style={styles.thickDivider} />

      {/* Calories */}
      <View style={styles.caloriesSection}>
        <View style={styles.caloriesRow}>
          <Text style={styles.caloriesLabel}>Calories</Text>
          <Text style={styles.caloriesValue}>{nutrition.calories}</Text>
        </View>
      </View>

      <View style={styles.mediumDivider} />

      {/* Daily Value Header */}
      <View style={styles.dvHeader}>
        <Text style={styles.dvHeaderText}>% Daily Value*</Text>
      </View>

      <View style={styles.thinDivider} />

      {/* Nutrients - Wrap in ScrollView if scrollable */}
      {scrollable ? (
        <ScrollView style={styles.nutrientsContainer} showsVerticalScrollIndicator={false}>
          {renderNutrientsContent()}
        </ScrollView>
      ) : (
        <View style={styles.nutrientsContainer}>
          {renderNutrientsContent()}
        </View>
      )}

      <View style={styles.thickDivider} />

      {/* Footer Note */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          * The % Daily Value tells you how much a nutrient in a serving of food
          contributes to a daily diet. 2,000 calories a day is used for general
          nutrition advice.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: AppColors.darkGray,
    overflow: 'hidden',
    ...Shadows.md,
  },
  header: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.darkGray,
  },
  headerDivider: {
    height: 1,
    backgroundColor: AppColors.darkGray,
    marginVertical: Spacing.xs,
  },
  servingRow: {
    marginTop: Spacing.xs,
  },
  servingLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    color: AppColors.darkGray,
  },
  thickDivider: {
    height: 10,
    backgroundColor: AppColors.darkGray,
  },
  mediumDivider: {
    height: 5,
    backgroundColor: AppColors.darkGray,
  },
  thinDivider: {
    height: 1,
    backgroundColor: AppColors.darkGray,
  },
  caloriesSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  caloriesLabel: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.darkGray,
  },
  caloriesValue: {
    fontSize: Typography.fontSize.display,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.darkGray,
  },
  dvHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignItems: 'flex-end',
  },
  dvHeaderText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.darkGray,
  },
  nutrientsContainer: {
    maxHeight: 400,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  nutrientLabel: {
    fontSize: Typography.fontSize.md,
    color: AppColors.darkGray,
    flex: 1,
  },
  nutrientLabelBold: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.darkGray,
    flex: 1,
  },
  nutrientValue: {
    fontSize: Typography.fontSize.md,
    color: AppColors.darkGray,
  },
  nutrientValueBold: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.darkGray,
  },
  footer: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  footerText: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.mediumGray,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.xs,
  },
  sectionHeaderContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: AppColors.lightGray,
  },
  sectionHeaderText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.mediumGray,
    letterSpacing: 0.5,
  },
});
