import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { LabelStackNavigationProp, LabelStackParamList } from '../../navigation/types';
import { DishSearchInput, StyleOption } from '../../components/Label';
import { AppColors, Spacing, Typography, BorderRadius, Shadows, fadeIn, slideIn, scaleIn } from '../../theme';
import { generateNutritionLabel } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type LabelHomeRouteProp = RouteProp<LabelStackParamList, 'LabelHome'>;

export const LabelHomeScreen: React.FC = () => {
  const navigation = useNavigation<LabelStackNavigationProp>();
  const route = useRoute<LabelHomeRouteProp>();
  const [dishName, setDishName] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [prepStyle, setPrepStyle] = useState<StyleOption>('home');
  const [isGenerating, setIsGenerating] = useState(false);

  // Animation values
  const headerFade = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-50)).current;
  const cardScale = useRef(new Animated.Value(0.9)).current;
  const infoFade = useRef(new Animated.Value(0)).current;

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
            <MaterialCommunityIcons name="food-apple" size={36} color={AppColors.primary} />
          </View>
          <View style={styles.titleContent}>
            <Text style={styles.title}>NutriLabelAI</Text>
            <Text style={styles.subtitle}>
              AI-powered nutrition insights
            </Text>
          </View>
        </View>
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
      <Animated.View style={{ transform: [{ scale: cardScale }] }}>
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
          <Text style={styles.infoTitle}>Pro Tips</Text>
        </View>
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="check-circle" size={18} color={AppColors.accent} />
          <Text style={styles.infoText}>
            Be specific: "Grilled chicken breast with steamed broccoli"
          </Text>
        </View>
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="check-circle" size={18} color={AppColors.accent} />
          <Text style={styles.infoText}>
            Include cooking method: grilled, fried, steamed
          </Text>
        </View>
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="check-circle" size={18} color={AppColors.accent} />
          <Text style={styles.infoText}>
            Mention portions: "2 cups rice" or "6 oz salmon"
          </Text>
        </View>
        <View style={styles.tipCard}>
          <MaterialCommunityIcons name="check-circle" size={18} color={AppColors.accent} />
          <Text style={styles.infoText}>
            Add target calories for better estimates
          </Text>
        </View>
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
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    marginBottom: Spacing.xl,
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
    borderColor: AppColors.primary,
  },
  titleContent: {
    flex: 1,
  },
  title: {
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
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: AppColors.text,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: AppColors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: AppColors.text,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
  },
});
