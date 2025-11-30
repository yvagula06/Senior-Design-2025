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
import { generateNutritionLabel } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

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
   * 
   * TODO: Backend Integration Steps:
   * 1. Ensure backend is running at http://localhost:8000
   * 2. Test endpoint: POST /api/label/generate
   * 3. Verify response matches GenerateLabelResponse interface
   * 4. Handle errors gracefully (network issues, invalid input, etc.)
   * 5. Add loading states and retry logic
   * 
   * Backend endpoint: POST /api/label/generate
   * Request body: { dish_name, target_calories?, prep_style, image_data? }
   * Response: { dish_name, confidence_score, nutrition, top_recipes, assumptions, uncertainty_factors }
   */
  const handleGenerate = async () => {
    if (!dishName.trim()) return;

    setIsGenerating(true);

    try {
      // Call backend API to generate nutrition label
      // TODO: Remove mock data from api.ts and enable real API calls
      const response = await generateNutritionLabel(
        dishName.trim(),
        targetCalories ? parseFloat(targetCalories) : undefined,
        prepStyle === 'unknown' ? 'unknown' : prepStyle,
        undefined // imageData - future feature for image upload
      );

      console.log('✅ [Label] Generated label:', response);

      // Navigate to result screen with API response
      navigation.navigate('LabelResult', {
        dishName: response.dish_name,
        calories: response.nutrition.calories,
        style: 'standard',
      });

      // TODO: Save to history after successful generation
      // await saveHistoryEntry({
      //   dish_name: response.dish_name,
      //   date: new Date().toISOString(),
      //   calories: response.nutrition.calories,
      //   confidence: response.confidence_score,
      //   prep_style: prepStyle,
      //   is_favorite: false,
      //   nutrition_data: response.nutrition,
      // });

    } catch (error) {
      console.error('❌ [Label] Failed to generate label:', error);
      Alert.alert(
        'Error',
        'Failed to generate nutrition label. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsGenerating(false);
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
});
