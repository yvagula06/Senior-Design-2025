import React, { useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Spacing, Typography, BorderRadius, Shadows } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

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
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
            color={colors.textSecondary}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="e.g., Chicken tikka masala with rice"
            placeholderTextColor={colors.textTertiary}
            value={dishName}
            onChangeText={onDishNameChange}
            autoCapitalize="words"
          />
          {dishName.length > 0 && (
            <TouchableOpacity onPress={() => onDishNameChange('')}>
              <MaterialCommunityIcons
                name="close-circle"
                size={20}
                color={colors.textSecondary}
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
            color={colors.accent}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="e.g., 500"
            placeholderTextColor={colors.textTertiary}
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
              color={selectedStyle === 'home' ? colors.background : colors.textSecondary}
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
              color={selectedStyle === 'restaurant' ? colors.background : colors.textSecondary}
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
              color={selectedStyle === 'unknown' ? colors.background : colors.textSecondary}
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
          color={colors.white}
          style={styles.buttonIcon}
        />
        <Text style={styles.generateButtonText}>
          {isGenerating ? 'Generating...' : 'Generate Label'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

type CV = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CV) {
  return StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    gap: Spacing.xs,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.text,
    marginBottom: Spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.text,
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
    color: colors.textSecondary,
    marginRight: Spacing.xs,
  },
  quickChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  quickChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  quickChipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: colors.text,
  },
  quickChipTextActive: {
    color: colors.white,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: BorderRadius.md,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.accent,
  },
  segmentText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  segmentTextActive: {
    color: colors.background,
    fontWeight: Typography.fontWeight.semibold,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    marginTop: Spacing.sm,
    ...Shadows.sm,
  },
  generateButtonDisabled: {
    backgroundColor: colors.border,
  },
  buttonIcon: {
    marginRight: Spacing.sm,
  },
  generateButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: colors.white,
  },
  });
}



