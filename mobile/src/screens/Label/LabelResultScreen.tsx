import React, { useState, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert, // Added Alert for user feedback
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
import { Spacing, Typography, BorderRadius, Shadows } from '../../theme';
import { useAppTheme } from '../../context/ThemeContext';

// Import API and type definitions
// NOTE: saveHistoryEntry and deleteHistoryEntry must be implemented in '../../services/api.ts'
import { saveHistoryEntry, deleteHistoryEntry } from '../../services/api';
import { type HistoryEntry } from '../../components/History';
import { useFoodContext } from '../../context/FoodContext';

type LabelResultRouteProp = RouteProp<LabelStackParamList, 'LabelResult'>;

export const LabelResultScreen: React.FC = () => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const route = useRoute<LabelResultRouteProp>();
  const navigation = useNavigation();
  const { dishName, calories } = route.params;
  const [isSaved, setIsSaved] = useState(false);
  const bottomSheetRef = useRef<VariantBottomSheetRef>(null);
  const { addFoodEntry } = useFoodContext();

  // --- MOCK DATA (Should be replaced by data received from LabelHomeScreen API call) ---
  // The full response structure needed to save to history
  const prepStyle = 'restaurant'; // Mock preparation style from input screen
  const savedHistoryId = useRef<string | null>(null); // To store the ID for deletion

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

  const confidence = 78;

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

  // --- CORE FIX: History Save/Unsave Logic ---
  const handleSave = async () => {
    if (isSaved) {
      // Logic for UNSAVING (Deleting the entry)
      if (!savedHistoryId.current) {
        setIsSaved(false);
        return;
      }
      try {
        // TODO: Implement deleteHistoryEntry when backend is ready
        // await deleteHistoryEntry(savedHistoryId.current);
        
        setIsSaved(false);
        savedHistoryId.current = null;
        Alert.alert('Unsaved', `${dishName} removed from history.`);
      } catch (error) {
        console.error('âŒ Failed to delete history entry:', error);
        Alert.alert('Error', 'Failed to remove entry from history.');
      }
    } else {
      // Logic for SAVING (Creating a new entry)
      try {
        // Add to FoodContext so it appears in History
        addFoodEntry({
          foodName: dishName,
          calories: nutritionData.calories,
          protein: nutritionData.protein,
          carbs: nutritionData.totalCarbohydrate,
          fats: nutritionData.totalFat,
        });

        // TODO: Also save to backend when ready
        // const historyEntry: Partial<HistoryEntry> = {
        //   dishName: dishName,
        //   calories: nutritionData.calories,
        //   confidence: confidence,
        //   date: new Date().toISOString(),
        //   prepStyle: prepStyle as HistoryEntry['prepStyle'],
        //   nutrition: nutritionData,
        //   isFavorite: false,
        // };
        // const savedEntry = await saveHistoryEntry(historyEntry);
        // savedHistoryId.current = savedEntry.id;

        setIsSaved(true);
        Alert.alert('Saved', `${dishName} added to history!`);

      } catch (error) {
        console.error('âŒ Failed to save history entry:', error);
        Alert.alert('Error', 'Failed to save entry to history.');
      }
    }
  };
  // --- END CORE FIX ---

  const handleViewVariants = () => {
    bottomSheetRef.current?.snapToIndex(0);
  };

  const handleNewSearch = () => {
    navigation.goBack();
  };

  // Helper to get confidence color and label
  const getConfidenceColor = () => {
    if (confidence > 80) return colors.success;
    if (confidence > 60) return colors.warning;
    return colors.error;
  };

  const getConfidenceLabel = () => {
    if (confidence > 80) return 'High Confidence';
    if (confidence > 60) return 'Medium Confidence';
    return 'Low Confidence';
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Dish Name Header with Confidence Badge */}
      <View style={styles.headerCard}>
        <Text style={styles.dishName}>{dishName}</Text>
        <View style={[styles.confidenceBadge, { backgroundColor: getConfidenceColor() }]}>
          <MaterialCommunityIcons name="shield-check" size={16} color={colors.white} />
          <Text style={styles.confidenceBadgeText}>
            {confidence}% Â· {getConfidenceLabel()}
          </Text>
        </View>
      </View>

      {/* HERO SECTION - Calories */}
      <View style={styles.heroSection}>
        <MaterialCommunityIcons name="fire" size={48} color={colors.primary} />
        <Text style={styles.heroValue}>{nutritionData.calories}</Text>
        <Text style={styles.heroLabel}>CALORIES</Text>
      </View>

      {/* MACRO GROUPING - Protein, Carbs, Fat */}
      <View style={styles.macroSection}>
        <Text style={styles.sectionTitle}>Macronutrients</Text>
        <View style={styles.macroGrid}>
          <View style={styles.macroCard}>
            <MaterialCommunityIcons name="food-steak" size={32} color={colors.accent} />
            <Text style={styles.macroValue}>{nutritionData.protein}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macroCard}>
            <MaterialCommunityIcons name="barley" size={32} color={colors.warning} />
            <Text style={styles.macroValue}>{nutritionData.totalCarbohydrate}g</Text>
            <Text style={styles.macroLabel}>Carbs</Text>
          </View>
          <View style={styles.macroCard}>
            <MaterialCommunityIcons name="water" size={32} color={colors.info} />
            <Text style={styles.macroValue}>{nutritionData.totalFat}g</Text>
            <Text style={styles.macroLabel}>Fat</Text>
          </View>
        </View>
      </View>

      {/* SECONDARY STATS - Micronutrients */}
      <View style={styles.microSection}>
        <Text style={styles.sectionTitle}>Micronutrients</Text>
        <View style={styles.microList}>
          <View style={styles.microRow}>
            <View style={styles.microIcon}>
              <MaterialCommunityIcons name="grain" size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.microName}>Dietary Fiber</Text>
            <Text style={styles.microValue}>{nutritionData.dietaryFiber}g</Text>
          </View>
          <View style={styles.microRow}>
            <View style={styles.microIcon}>
              <MaterialCommunityIcons name="cube-outline" size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.microName}>Total Sugars</Text>
            <Text style={styles.microValue}>{nutritionData.totalSugars}g</Text>
          </View>
          <View style={styles.microRow}>
            <View style={styles.microIcon}>
              <MaterialCommunityIcons name="shaker-outline" size={20} color={colors.textSecondary} />
            </View>
            <Text style={styles.microName}>Sodium</Text>
            <Text style={styles.microValue}>{nutritionData.sodium}mg</Text>
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
            color={colors.white}
          />
          <Text style={styles.actionButtonText}>
            {isSaved ? 'Saved' : 'Save to History'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.newSearchButton]}
          onPress={handleNewSearch}
        >
          <MaterialCommunityIcons name="magnify" size={20} color={colors.accent} />
          <Text style={[styles.actionButtonText, styles.newSearchButtonText]}>
            New Search
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Variant Bottom Sheet */}
      <VariantBottomSheet
        ref={bottomSheetRef}
        assumedStyle={"Restaurant-style preparation with moderate cream and butter, served with basmati rice."}
        topRecipes={topRecipes}
        uncertaintyExplanation={"The nutritional values shown are estimates based on similar dishes in our database."}
      />
    </ScrollView>
  );
};
// ... (styles remain the same)

type CR = ReturnType<typeof useAppTheme>['colors'];
function createStyles(colors: CR) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  headerCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
    alignItems: 'center',
  },
  dishName: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  confidenceBadgeText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.white,
  },
  // HERO SECTION - Calories
  heroSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    alignItems: 'center',
    ...Shadows.md,
  },
  heroValue: {
    fontSize: 72,
    fontWeight: Typography.fontWeight.bold,
    color: colors.primary,
    marginTop: Spacing.sm,
    lineHeight: 80,
  },
  heroLabel: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textSecondary,
    letterSpacing: 2,
    marginTop: Spacing.xs,
  },
  // MACRO SECTION
  macroSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.text,
    marginBottom: Spacing.md,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  macroCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  macroValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: colors.text,
  },
  macroLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // MICRO SECTION
  microSection: {
    backgroundColor: colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  microList: {
    gap: Spacing.sm,
  },
  microRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: colors.background,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  microIcon: {
    width: 32,
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  microName: {
    flex: 1,
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.medium,
    color: colors.text,
  },
  microValue: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.bold,
    color: colors.textSecondary,
  },
  // ACTION BUTTONS
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
    backgroundColor: colors.accent,
  },
  savedButton: {
    backgroundColor: colors.success,
  },
  actionButtonText: {
    fontSize: Typography.fontSize.md,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.white,
  },
  newSearchButton: {
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  newSearchButtonText: {
    color: colors.accent,
  },
  });
}

