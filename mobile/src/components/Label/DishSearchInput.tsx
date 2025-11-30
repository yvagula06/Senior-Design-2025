import React from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppColors, Spacing, Typography, BorderRadius, Shadows } from '../../theme';

export type StyleOption = 'home' | 'restaurant' | 'unknown';

interface DishSearchInputProps {
  dishName: string;
  onDishNameChange: (text: string) => void;
  targetCalories: string;
  onTargetCaloriesChange: (text: string) => void;
  selectedStyle: StyleOption;
  onStyleChange: (style: StyleOption) => void;
  onGenerate: () => void;
  isGenerating?: boolean;
}

const QUICK_CALORIE_OPTIONS = [400, 600, 800];

export const DishSearchInput: React.FC<DishSearchInputProps> = ({
  dishName,
  onDishNameChange,
  targetCalories,
  onTargetCaloriesChange,
  selectedStyle,
  onStyleChange,
  onGenerate,
  isGenerating = false,
}) => {
  const handleQuickCalorie = (calories: number) => {
    onTargetCaloriesChange(calories.toString());
  };

  const canGenerate = dishName.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Dish Name Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Dish name</Text>
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons
            name="silverware-fork-knife"
            size={20}
            color={AppColors.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="e.g., Chicken tikka masala with rice"
            placeholderTextColor={AppColors.textTertiary}
            value={dishName}
            onChangeText={onDishNameChange}
            autoCapitalize="words"
          />
          {dishName.length > 0 && (
            <TouchableOpacity onPress={() => onDishNameChange('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={AppColors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Target Calories Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Target calories (optional)</Text>
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons
            name="fire"
            size={20}
            color={AppColors.accent}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="e.g., 500"
            placeholderTextColor={AppColors.textTertiary}
            value={targetCalories}
            onChangeText={onTargetCaloriesChange}
            keyboardType="numeric"
          />
        </View>

        {/* Quick Calorie Chips */}
        <View style={styles.quickChipsContainer}>
          <Text style={styles.quickChipsLabel}>Quick select:</Text>
          {QUICK_CALORIE_OPTIONS.map((calories) => (
            <TouchableOpacity
              key={calories}
              style={[
                styles.quickChip,
                targetCalories === calories.toString() && styles.quickChipActive,
              ]}
              onPress={() => handleQuickCalorie(calories)}
            >
              <Text
                style={[
                  styles.quickChipText,
                  targetCalories === calories.toString() && styles.quickChipTextActive,
                ]}
              >
                {calories}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Segmented Control - Style */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Preparation style</Text>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segment,
              styles.segmentLeft,
              selectedStyle === 'home' && styles.segmentActive,
            ]}
            onPress={() => onStyleChange('home')}
          >
            <MaterialCommunityIcons
              name="home"
              size={18}
              color={selectedStyle === 'home' ? AppColors.background : AppColors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                selectedStyle === 'home' && styles.segmentTextActive,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segment,
              styles.segmentMiddle,
              selectedStyle === 'restaurant' && styles.segmentActive,
            ]}
            onPress={() => onStyleChange('restaurant')}
          >
            <MaterialCommunityIcons
              name="silverware"
              size={18}
              color={selectedStyle === 'restaurant' ? AppColors.background : AppColors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                selectedStyle === 'restaurant' && styles.segmentTextActive,
              ]}
            >
              Restaurant
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segment,
              styles.segmentRight,
              selectedStyle === 'unknown' && styles.segmentActive,
            ]}
            onPress={() => onStyleChange('unknown')}
          >
            <MaterialCommunityIcons
              name="help-circle"
              size={18}
              color={selectedStyle === 'unknown' ? AppColors.background : AppColors.textSecondary}
            />
            <Text
              style={[
                styles.segmentText,
                selectedStyle === 'unknown' && styles.segmentTextActive,
              ]}
            >
              Unknown
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Generate Button */}
      <TouchableOpacity
        style={[styles.generateButton, !canGenerate && styles.generateButtonDisabled]}
        onPress={onGenerate}
        disabled={!canGenerate || isGenerating}
      >
        <MaterialCommunityIcons
          name={isGenerating ? 'loading' : 'lightning-bolt'}
          size={20}
          color={AppColors.white}
          style={styles.buttonIcon}
        />
        <Text style={styles.generateButtonText}>
          {isGenerating ? 'Generating...' : 'Generate Label'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.text,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.background,
    borderWidth: 1,
    borderColor: AppColors.border,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    color: AppColors.text,
    paddingVertical: Spacing.sm,
  },
  quickChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  quickChipsLabel: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.textSecondary,
    marginRight: Spacing.xs,
  },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: AppColors.border,
    backgroundColor: AppColors.background,
  },
  quickChipActive: {
    backgroundColor: AppColors.accent,
    borderColor: AppColors.accent,
  },
  quickChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: AppColors.text,
  },
  quickChipTextActive: {
    color: AppColors.white,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: AppColors.background,
    borderRadius: BorderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    gap: Spacing.xs,
  },
  segmentLeft: {
    borderTopLeftRadius: BorderRadius.md - 2,
    borderBottomLeftRadius: BorderRadius.md - 2,
  },
  segmentMiddle: {},
  segmentRight: {
    borderTopRightRadius: BorderRadius.md - 2,
    borderBottomRightRadius: BorderRadius.md - 2,
  },
  segmentActive: {
    backgroundColor: AppColors.accent,
  },
  segmentText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: AppColors.textSecondary,
  },
  segmentTextActive: {
    color: AppColors.background,
    fontWeight: Typography.fontWeight.semibold,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    ...Shadows.sm,
  },
  generateButtonDisabled: {
    backgroundColor: AppColors.border,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  generateButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.white,
  },
});
