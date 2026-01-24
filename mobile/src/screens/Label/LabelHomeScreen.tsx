import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { LabelStackNavigationProp, LabelStackParamList } from '../../navigation/types';
import { DishSearchInput, StyleOption } from '../../components/Label';
import { AppColors, Spacing, Typography, BorderRadius, Shadows, fadeIn, slideIn, scaleIn } from '../../theme';
import { requestLabel } from '../../services/label';
import type { LabelResponse } from '../../types/label';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator } from 'react-native';
import { useFoodContext } from '../../context/FoodContext';

type LabelHomeRouteProp = RouteProp<LabelStackParamList, 'LabelHome'>;

const PRO_TIPS = [
  'Be specific: "Grilled chicken breast with steamed broccoli"',
  'Include cooking method: grilled, fried, steamed',
  'Mention portions: "2 cups rice" or "6 oz salmon"',
  'Add target calories for better estimates',
  'Describe sauces and toppings for accuracy',
  'Include side dishes: "with rice" or "with fries"',
  'Specify preparation: homemade vs restaurant style',
  'Mention ingredients: "with cheese" or "extra vegetables"',
];

export const LabelHomeScreen: React.FC = () => {
  const navigation = useNavigation<LabelStackNavigationProp>();
  const route = useRoute<LabelHomeRouteProp>();
  const [dishName, setDishName] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [prepStyle, setPrepStyle] = useState<StyleOption>('home');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  
  // API response state
  const [labelResult, setLabelResult] = useState<LabelResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  
  // Food context for saving entries
  const { addLabelEntry } = useFoodContext();

  // Animation values
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const infoFade = useRef(new Animated.Value(0)).current;
  const tipScale = useRef(new Animated.Value(1)).current;

  // Initialize animations on mount
  useEffect(() => {
    Animated.parallel([
      fadeIn(headerFade, 400),
      slideIn(headerSlide, -50, 400),
      scaleIn(cardScale, 500, 200),
      fadeIn(infoFade, 400, 300),
    ]).start();
  }, []);

  // Handle prefill from Explore tab
  useEffect(() => {
    if (route.params?.prefillDish) {
      const { dishName: prefillName, targetCalories: prefillCals, prepStyle: prefillStyle } = route.params.prefillDish;
      setDishName(prefillName);
      if (prefillCals) {
        setTargetCalories(prefillCals.toString());
      }
      if (prefillStyle) {
        setPrepStyle(prefillStyle);
      }
    }
  }, [route.params?.prefillDish]);

  /**
   * Generate nutrition label using backend API
   */
  const handleGenerate = async () => {
    if (!dishName.trim()) return;

    // Clear previous results/errors
    setLabelResult(null);
    setApiError(null);
    setIsSaved(false);
    setIsGenerating(true);

    try {
      // Call real backend API
      const response = await requestLabel(
        dishName.trim(),
        targetCalories ? parseFloat(targetCalories) : undefined,
        prepStyle === 'unknown' ? undefined : (prepStyle as 'home' | 'restaurant' | 'fast_food')
      );

      console.log('✅ [Label] Generated label:', response);
      
      // Store result for display
      setLabelResult(response);

    } catch (error) {
      console.error('❌ [Label] Failed to generate label:', error);
      
      // Set user-friendly error message
      setApiError(String(error));
    } finally {
      setIsGenerating(false);
    }
  };

  /**
   * Save label result to daily totals
   */
  const handleSave = () => {
    if (!labelResult) return;

    try {
      addLabelEntry({
        dishName: dishName,
        matchedDish: labelResult.matched_dish,
        calories: labelResult.nutrition.calories,
        protein: labelResult.nutrition.protein_g,
        carbs: labelResult.nutrition.carbs_g,
        fats: labelResult.nutrition.fat_g,
        confidence: labelResult.confidence,
        fiber: labelResult.nutrition.fiber_g,
        sugar: labelResult.nutrition.sugar_g,
        sodium: labelResult.nutrition.sodium_mg,
      });

      setIsSaved(true);
      Alert.alert(
        'Saved!',
        `Added "${labelResult.matched_dish}" to your daily totals.`,
        [{ text: 'OK' }]
      );
      console.log('✅ [Label] Saved to daily totals');
    } catch (error) {
      console.error('❌ [Label] Failed to save:', error);
      Alert.alert(
        'Error',
        'Failed to save entry. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTipPress = () => {
    // Animate out
    Animated.sequence([
      Animated.timing(tipScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(tipScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Change tip
    setCurrentTipIndex((prev) => (prev + 1) % PRO_TIPS.length);
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Animated Header Section */}
      <Animated.View 
        style={[
          styles.header,
          {
            opacity: headerFade,
            transform: [{ translateY: headerSlide }],
          },
        ]}
      >
        <View style={styles.titleRow}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name="food-apple" size={36} color={AppColors.accent} />
          </View>
          <View style={styles.titleContent}>
            <Text style={styles.title}>NutriLabelAI</Text>
            <Text style={styles.subtitle}>
              AI-powered nutrition insights
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* Stats Row - Moved outside header */}
      <Animated.View style={[styles.statsRowContainer, { opacity: headerFade }]}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>10k+</Text>
            <Text style={styles.statLabel}>Dishes</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>95%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>Fast</Text>
            <Text style={styles.statLabel}>Results</Text>
          </View>
        </View>
      </Animated.View>

      {/* Animated Input Card */}
      <Animated.View style={[{ transform: [{ scale: cardScale }] }, styles.inputSection]}>
        <DishSearchInput
          dishName={dishName}
          onDishNameChange={setDishName}
          targetCalories={targetCalories}
          onTargetCaloriesChange={setTargetCalories}
          selectedStyle={prepStyle}
          onStyleChange={setPrepStyle}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
        />
      </Animated.View>

      {/* LOADING STATE - Centered overlay with large spinner */}
      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={AppColors.accent} />
            <Text style={styles.loadingTitle}>Analyzing your food...</Text>
            <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
          </View>
        </View>
      )}

      {/* ERROR STATE - User-friendly error card with retry */}
      {apiError && !isGenerating && (
        <View style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color={AppColors.error} />
          <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
          <Text style={styles.errorMessage}>{apiError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleGenerate}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#FFF" />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* EMPTY STATE - Welcoming initial view */}
      {!isGenerating && !labelResult && !apiError && !dishName.trim() && (
        <View style={styles.emptyStateCard}>
          <View style={styles.emptyStateIcon}>
            <MaterialCommunityIcons name="food-apple-outline" size={80} color={AppColors.primary} />
          </View>
          <Text style={styles.emptyStateTitle}>Ready to Analyze!</Text>
          <Text style={styles.emptyStateText}>
            Enter a dish name above to discover its complete nutritional breakdown powered by AI.
          </Text>
          <View style={styles.emptyStateFeatures}>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={20} color={AppColors.success} />
              <Text style={styles.featureText}>10,000+ dishes in our database</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={20} color={AppColors.success} />
              <Text style={styles.featureText}>Accurate macro & micro nutrients</Text>
            </View>
            <View style={styles.featureRow}>
              <MaterialCommunityIcons name="check-circle" size={20} color={AppColors.success} />
              <Text style={styles.featureText}>Instant confidence scoring</Text>
            </View>
          </View>
        </View>
      )}

      {/* Nutrition Label Result Card */}
      {labelResult && !isGenerating && (
        <View style={styles.resultContainer}>
          {/* Matched Dish Header */}
          <View style={styles.resultHeader}>
            <MaterialCommunityIcons name="check-circle" size={28} color={AppColors.success} />
            <View style={styles.resultHeaderText}>
              <Text style={styles.resultTitle}>Matched Dish</Text>
              <Text style={styles.matchedDish}>{labelResult.matched_dish}</Text>
            </View>
          </View>

          {/* Confidence Score */}
          <View style={styles.confidenceContainer}>
            <View style={styles.confidenceHeader}>
              <MaterialCommunityIcons name="speedometer" size={20} color={AppColors.accent} />
              <Text style={styles.confidenceLabel}>Confidence Score</Text>
            </View>
            <View style={styles.confidenceBar}>
              <View 
                style={[
                  styles.confidenceFill, 
                  { 
                    width: `${labelResult.confidence * 100}%`,
                    backgroundColor: labelResult.confidence > 0.7 
                      ? AppColors.success 
                      : labelResult.confidence > 0.5 
                        ? AppColors.warning 
                        : AppColors.error
                  }
                ]} 
              />
            </View>
            <Text style={styles.confidenceValue}>
              {(labelResult.confidence * 100).toFixed(0)}% confidence
            </Text>
          </View>

          {/* Macronutrients Card */}
          <View style={styles.macrosCard}>
            <Text style={styles.macrosTitle}>Nutrition Facts</Text>
            
            <View style={styles.caloriesRow}>
              <Text style={styles.caloriesLabel}>Calories</Text>
              <Text style={styles.caloriesValue}>{labelResult.nutrition.calories.toFixed(0)}</Text>
            </View>

            <View style={styles.macrosDivider} />

            <View style={styles.macrosGrid}>
              <View style={styles.macroItem}>
                <MaterialCommunityIcons name="food-drumstick" size={20} color={AppColors.accent} />
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>{labelResult.nutrition.protein_g.toFixed(1)}g</Text>
              </View>

              <View style={styles.macroItem}>
                <MaterialCommunityIcons name="bread-slice" size={20} color={AppColors.accent} />
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>{labelResult.nutrition.carbs_g.toFixed(1)}g</Text>
              </View>

              <View style={styles.macroItem}>
                <MaterialCommunityIcons name="butter" size={20} color={AppColors.accent} />
                <Text style={styles.macroLabel}>Fat</Text>
                <Text style={styles.macroValue}>{labelResult.nutrition.fat_g.toFixed(1)}g</Text>
              </View>
            </View>

            <View style={styles.macrosDivider} />

            <View style={styles.micronutrientsRow}>
              {labelResult.nutrition.fiber_g !== null && (
                <View style={styles.microItem}>
                  <Text style={styles.microLabel}>Fiber</Text>
                  <Text style={styles.microValue}>{labelResult.nutrition.fiber_g.toFixed(1)}g</Text>
                </View>
              )}
              {labelResult.nutrition.sugar_g !== null && (
                <View style={styles.microItem}>
                  <Text style={styles.microLabel}>Sugar</Text>
                  <Text style={styles.microValue}>{labelResult.nutrition.sugar_g.toFixed(1)}g</Text>
                </View>
              )}
              {labelResult.nutrition.sodium_mg !== null && (
                <View style={styles.microItem}>
                  <Text style={styles.microLabel}>Sodium</Text>
                  <Text style={styles.microValue}>{labelResult.nutrition.sodium_mg.toFixed(0)}mg</Text>
                </View>
              )}
              {labelResult.nutrition.potassium_mg !== null && (
                <View style={styles.microItem}>
                  <Text style={styles.microLabel}>Potassium</Text>
                  <Text style={styles.microValue}>{labelResult.nutrition.potassium_mg.toFixed(0)}mg</Text>
                </View>
              )}
            </View>
          </View>

          {/* Explanation Card */}
          <View style={styles.explanationCard}>
            <View style={styles.explanationHeader}>
              <MaterialCommunityIcons name="information" size={20} color={AppColors.accent} />
              <Text style={styles.explanationTitle}>How We Calculated This</Text>
            </View>
            <Text style={styles.explanationText}>{labelResult.explanation}</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              isSaved && styles.saveButtonSaved
            ]}
            onPress={handleSave}
            disabled={isSaved}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons 
              name={isSaved ? "check-circle" : "content-save"} 
              size={24} 
              color="#FFF" 
            />
            <Text style={styles.saveButtonText}>
              {isSaved ? 'Saved to Daily Totals' : 'Save to Daily Totals'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Animated Info Section */}
      <Animated.View style={[styles.infoSection, { opacity: infoFade }]}>
        <View style={styles.infoHeader}>
          <MaterialCommunityIcons name="lightbulb-on" size={24} color={AppColors.accent} />
          <Text style={styles.infoTitle}>Pro Tip</Text>
          <Text style={styles.tipCounter}>{currentTipIndex + 1}/{PRO_TIPS.length}</Text>
        </View>
        <TouchableOpacity 
          style={styles.tipCard}
          onPress={handleTipPress}
          activeOpacity={0.8}
        >
          <Animated.View style={[styles.tipContent, { transform: [{ scale: tipScale }] }]}>
            <MaterialCommunityIcons name="gesture-tap" size={20} color={AppColors.accent} />
            <Text style={styles.infoText}>{PRO_TIPS[currentTipIndex]}</Text>
          </Animated.View>
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>Tap for next tip</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.md,
    backgroundColor: AppColors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  statsRowContainer: {
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  inputSection: {
    paddingHorizontal: Spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.xl,
    backgroundColor: AppColors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
    ...Shadows.md,
    borderWidth: 1,
    borderColor: AppColors.accent,
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontFamily: 'CrimsonPro_700Bold',
    fontSize: Typography.fontSize.xxxl,
    fontWeight: Typography.fontWeight.extrabold,
    color: AppColors.text,
    marginBottom: 2,
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: AppColors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontFamily: 'CrimsonPro_700Bold',
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.extrabold,
    color: AppColors.accent,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: AppColors.border,
  },
  infoSection: {
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.xl,
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.base,
    gap: Spacing.sm,
  },
  infoTitle: {
    fontFamily: 'CrimsonPro_600SemiBold',
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
    flex: 1,
  },
  tipCounter: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.accent,
    backgroundColor: AppColors.background,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: AppColors.accent,
  },
  tipCard: {
    backgroundColor: AppColors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  tipContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tapHint: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: AppColors.border,
  },
  tapHintText: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.textTertiary,
    fontWeight: Typography.fontWeight.medium,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: AppColors.text,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
  },
  // LOADING STATE - Centered overlay
  loadingOverlay: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingCard: {
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xxl,
    alignItems: 'center',
    width: '100%',
    ...Shadows.lg,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  loadingTitle: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: Spacing.xs,
    fontSize: Typography.fontSize.sm,
    color: AppColors.textSecondary,
    textAlign: 'center',
  },
  // ERROR STATE - User-friendly card
  errorCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    padding: Spacing.xxl,
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    ...Shadows.md,
    borderWidth: 2,
    borderColor: AppColors.error,
  },
  errorTitle: {
    marginTop: Spacing.lg,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
    textAlign: 'center',
  },
  errorMessage: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: AppColors.error,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
  // EMPTY STATE - Welcoming initial view
  emptyStateCard: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    padding: Spacing.xxl,
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    ...Shadows.md,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  emptyStateIcon: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.full,
    backgroundColor: AppColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: AppColors.primary,
  },
  emptyStateTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: Typography.fontSize.base,
    color: AppColors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    marginBottom: Spacing.lg,
  },
  emptyStateFeatures: {
    width: '100%',
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  featureText: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.text,
    fontWeight: Typography.fontWeight.medium,
  },
  // Result styles
  resultContainer: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  resultHeaderText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  resultTitle: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  matchedDish: {
    fontSize: Typography.fontSize.lg,
    color: AppColors.text,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
  },
  confidenceContainer: {
    backgroundColor: AppColors.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  confidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  confidenceLabel: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: AppColors.background,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginVertical: Spacing.sm,
  },
  confidenceFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  confidenceValue: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.text,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'right',
  },
  macrosCard: {
    backgroundColor: AppColors.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  macrosTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
    marginBottom: Spacing.md,
  },
  caloriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  caloriesLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.text,
  },
  caloriesValue: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: Typography.fontWeight.extrabold,
    color: AppColors.accent,
    fontFamily: 'CrimsonPro_700Bold',
  },
  macrosDivider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginVertical: Spacing.md,
  },
  macrosGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: Spacing.sm,
  },
  macroItem: {
    alignItems: 'center',
    flex: 1,
  },
  macroLabel: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  macroValue: {
    fontSize: Typography.fontSize.lg,
    color: AppColors.text,
    fontWeight: Typography.fontWeight.bold,
    marginTop: 2,
  },
  micronutrientsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  microItem: {
    alignItems: 'center',
    minWidth: 80,
    marginVertical: Spacing.xs,
  },
  microLabel: {
    fontSize: Typography.fontSize.xs,
    color: AppColors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  microValue: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.text,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: 2,
  },
  explanationCard: {
    backgroundColor: AppColors.cardBackground,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  explanationTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: AppColors.text,
  },
  explanationText: {
    fontSize: Typography.fontSize.sm,
    color: AppColors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
  },
  // Save button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.accent,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.xl,
    marginTop: Spacing.md,
    gap: Spacing.sm,
    ...Shadows.md,
  },
  saveButtonSaved: {
    backgroundColor: AppColors.success,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
  },
});
