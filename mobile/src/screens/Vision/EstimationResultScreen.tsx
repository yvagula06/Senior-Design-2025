/**
 * EstimationResultScreen
 * 
 * Displays the results of meal estimation from the vision API.
 * Shows calorie estimate, dish predictions, accuracy score, and metadata.
 * 
 * FEATURES:
 * - Calorie estimate with range display
 * - Dish predictions list
 * - Accuracy score visualization
 * - Estimation mode indicator
 * - Option to save or retry
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { AppColors, Typography, Spacing, BorderRadius, Shadows } from '../../theme';
import {
  CalorieRangeDisplay,
  DishPredictionList,
} from '../../components/Vision';
import type { EstimationMode } from '../../types/vision';
import type { ExploreStackNavigationProp, ExploreStackParamList } from '../../navigation/types';
import { useFoodContext } from '../../context/FoodContext';
import { logMealEntry } from '../../services/visionApi';

type EstimationResultRouteProp = RouteProp<ExploreStackParamList, 'EstimationResult'>;

export const EstimationResultScreen: React.FC = () => {
  const navigation = useNavigation<ExploreStackNavigationProp>();
  const route = useRoute<EstimationResultRouteProp>();
  const { response } = route.params;
  const { addFoodEntry } = useFoodContext();
  const [isLogging, setIsLogging] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  
  // Helper function to get accuracy score value
  const getAccuracyScore = (): number => {
    if (typeof response.accuracy_score === 'number') {
      return response.accuracy_score;
    }
    return response.accuracy_score?.overall ?? 0;
  };

  // Check if detailed accuracy factors are available
  const hasAccuracyFactors = 
    typeof response.accuracy_score === 'object' && 
    response.accuracy_score?.factors !== undefined;
  
  // User adjustments
  const [selectedDishId, setSelectedDishId] = useState(response.selected_dish.dish_id);
  const [portionSize, setPortionSize] = useState<'small' | 'normal' | 'large'>('normal');
  
  // Phase 3: Plate size and feedback state
  const [plateSize, setPlateSize] = useState<'small_plate' | 'standard_plate' | 'large_plate' | 'bowl' | 'hand'>('standard_plate');
  const [quickFeedback, setQuickFeedback] = useState<'accurate' | 'too_high' | 'too_low' | 'wrong_dish' | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Get selected dish from predictions
  const getSelectedDish = () => {
    return response.dish_predictions.find(p => p.dish_id === selectedDishId) 
      || response.selected_dish;
  };
  
  // Calculate adjusted calories based on portion size
  const getAdjustedCalories = () => {
    const baseCalories = response.calorie_estimate.value;
    const multipliers = { small: 0.75, normal: 1.0, large: 1.25 };
    return Math.round(baseCalories * multipliers[portionSize]);
  };
  
  const getEstimationModeInfo = (mode: EstimationMode) => {
    switch (mode) {
      case 'depth':
        return {
          label: 'Depth Estimation',
          icon: 'cube-scan' as keyof typeof MaterialCommunityIcons.glyphMap,
          description: 'Used depth data for volume calculation',
        };
      case 'multi_angle':
        return {
          label: 'Multi-Angle',
          icon: 'camera-burst' as keyof typeof MaterialCommunityIcons.glyphMap,
          description: 'Analyzed multiple viewing angles',
        };
      case 'reference_based':
        return {
          label: 'Reference Object',
          icon: 'ruler' as keyof typeof MaterialCommunityIcons.glyphMap,
          description: 'Used reference object for scale',
        };
      default:
        return {
          label: mode,
          icon: 'camera' as keyof typeof MaterialCommunityIcons.glyphMap,
          description: 'Standard estimation',
        };
    }
  };

  const handleConfirmLog = async () => {
    if (isLogged) {
      Alert.alert('Already Logged', 'This meal has already been logged to your history.');
      return;
    }

    try {
      setIsLogging(true);

      const selectedDish = getSelectedDish();
      const adjustedCalories = getAdjustedCalories();

      // Estimate macros based on adjusted calories (rough approximation)
      const estimatedProtein = Math.round(adjustedCalories * 0.25 / 4); // 25% of calories from protein
      const estimatedCarbs = Math.round(adjustedCalories * 0.45 / 4); // 45% from carbs
      const estimatedFats = Math.round(adjustedCalories * 0.30 / 9); // 30% from fats

      // Add to local FoodContext (appears in History)
      addFoodEntry({
        foodName: selectedDish.dish_name,
        calories: adjustedCalories,
        protein: estimatedProtein,
        carbs: estimatedCarbs,
        fats: estimatedFats,
      });

      // Log to backend (stub implementation for now)
      await logMealEntry({
        dishName: selectedDish.dish_name,
        calories: adjustedCalories,
        protein: estimatedProtein,
        carbs: estimatedCarbs,
        fats: estimatedFats,
        confidence: selectedDish.confidence,
        timestamp: new Date().toISOString(),
      });

      setIsLogged(true);
      Alert.alert(
        'Meal Logged! ✓',
        `${selectedDish.dish_name} (${adjustedCalories} kcal, ${portionSize} portion) has been added to your history.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ [EstimationResult] Failed to log meal:', error);
      Alert.alert(
        'Logging Failed',
        error.message || 'Failed to log meal. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLogging(false);
    }
  };

  const handleRetry = () => {
    navigation.navigate('CameraCapture');
  };

  // Phase 3: Submit feedback to backend
  const handleSubmitFeedback = async (feedback: 'accurate' | 'too_high' | 'too_low' | 'wrong_dish') => {
    try {
      if (feedbackSubmitted) {
        Alert.alert('Feedback Already Submitted', 'Thank you for your feedback!');
        return;
      }

      setQuickFeedback(feedback);
      
      // Import submitVisionFeedback from visionApi
      const { submitVisionFeedback } = require('../../services/visionApi');
      
      const selectedDish = getSelectedDish();
      const adjustedCalories = getAdjustedCalories();
      const portionMultipliers = { small: 0.75, normal: 1.0, large: 1.25 };
      
      await submitVisionFeedback({
        estimate_id: null, // Not stored from response yet
        user_id: null, // Will be set when auth is implemented
        feedback_type: portionSize !== 'normal' ? 'corrected_portion' : 'confirmed',
        original_dish_name: response.selected_dish.dish_name,
        original_calories: response.calorie_estimate.value,
        original_mode: response.estimation_mode,
        confirmed_dish: selectedDish.dish_name,
        portion_adjustment: portionMultipliers[portionSize],
        plate_size: plateSize,
        quick_feedback: feedback,
        timestamp: new Date().toISOString(),
      });

      setFeedbackSubmitted(true);
      
      Alert.alert(
        'Thank You! 🎉',
        'Your feedback helps improve our estimates.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('❌ [EstimationResult] Failed to submit feedback:', error);
      // Don't show error to user - feedback is optional
    }
  };

  const modeInfo = getEstimationModeInfo(response.estimation_mode);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="check-circle"
            size={48}
            color={AppColors.success}
          />
          <Text style={styles.headerTitle}>Meal Estimated!</Text>
          <Text style={styles.headerSubtitle}>
            {getSelectedDish().dish_name}
          </Text>
        </View>

        {/* Dish Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Select Dish (if different)</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedDishId}
              onValueChange={(itemValue) => setSelectedDishId(itemValue)}
              style={styles.picker}
            >
              {response.dish_predictions.map((pred) => (
                <Picker.Item
                  key={pred.dish_id}
                  label={`${pred.dish_name} (${Math.round(pred.confidence * 100)}%)`}
                  value={pred.dish_id}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Portion Size Slider */}
        <View style={styles.portionContainer}>
          <Text style={styles.portionLabel}>Portion Size</Text>
          <View style={styles.portionButtons}>
            <TouchableOpacity
              style={[
                styles.portionButton,
                portionSize === 'small' && styles.portionButtonActive,
              ]}
              onPress={() => setPortionSize('small')}
            >
              <MaterialCommunityIcons
                name="numeric-1-circle"
                size={24}
                color={portionSize === 'small' ? AppColors.textInverse : AppColors.text}
              />
              <Text
                style={[
                  styles.portionButtonText,
                  portionSize === 'small' && styles.portionButtonTextActive,
                ]}
              >
                Small
              </Text>
              <Text style={styles.portionMultiplier}>×0.75</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.portionButton,
                portionSize === 'normal' && styles.portionButtonActive,
              ]}
              onPress={() => setPortionSize('normal')}
            >
              <MaterialCommunityIcons
                name="numeric-2-circle"
                size={24}
                color={portionSize === 'normal' ? AppColors.textInverse : AppColors.text}
              />
              <Text
                style={[
                  styles.portionButtonText,
                  portionSize === 'normal' && styles.portionButtonTextActive,
                ]}
              >
                Normal
              </Text>
              <Text style={styles.portionMultiplier}>×1.0</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.portionButton,
                portionSize === 'large' && styles.portionButtonActive,
              ]}
              onPress={() => setPortionSize('large')}
            >
              <MaterialCommunityIcons
                name="numeric-3-circle"
                size={24}
                color={portionSize === 'large' ? AppColors.textInverse : AppColors.text}
              />
              <Text
                style={[
                  styles.portionButtonText,
                  portionSize === 'large' && styles.portionButtonTextActive,
                ]}
              >
                Large
              </Text>
              <Text style={styles.portionMultiplier}>×1.25</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.portionHint}>
            Adjusted calories: {getAdjustedCalories()} kcal
          </Text>
        </View>

        {/* Phase 3: Plate Size Selector */}
        <View style={styles.plateSizeContainer}>
          <Text style={styles.plateSizeLabel}>Plate/Bowl Size (optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.plateScroll}>
            <View style={styles.plateSizeButtons}>
              <TouchableOpacity
                style={[
                  styles.plateSizeButton,
                  plateSize === 'small_plate' && styles.plateSizeButtonActive,
                ]}
                onPress={() => setPlateSize('small_plate')}
              >
                <MaterialCommunityIcons 
                  name="circle-outline" 
                  size={20} 
                  color={plateSize === 'small_plate' ? AppColors.textInverse : AppColors.text}
                />
                <Text style={[
                  styles.plateSizeText,
                  plateSize === 'small_plate' && styles.plateSizeTextActive,
                ]}>
                  Small (8")
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.plateSizeButton,
                  plateSize === 'standard_plate' && styles.plateSizeButtonActive,
                ]}
                onPress={() => setPlateSize('standard_plate')}
              >
                <MaterialCommunityIcons 
                  name="circle-medium" 
                  size={24} 
                  color={plateSize === 'standard_plate' ? AppColors.textInverse : AppColors.text}
                />
                <Text style={[
                  styles.plateSizeText,
                  plateSize === 'standard_plate' && styles.plateSizeTextActive,
                ]}>
                  Standard (10")
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.plateSizeButton,
                  plateSize === 'large_plate' && styles.plateSizeButtonActive,
                ]}
                onPress={() => setPlateSize('large_plate')}
              >
                <MaterialCommunityIcons 
                  name="circle" 
                  size={28} 
                  color={plateSize === 'large_plate' ? AppColors.textInverse : AppColors.text}
                />
                <Text style={[
                  styles.plateSizeText,
                  plateSize === 'large_plate' && styles.plateSizeTextActive,
                ]}>
                  Large (12")
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.plateSizeButton,
                  plateSize === 'bowl' && styles.plateSizeButtonActive,
                ]}
                onPress={() => setPlateSize('bowl')}
              >
                <MaterialCommunityIcons 
                  name="bowl" 
                  size={24} 
                  color={plateSize === 'bowl' ? AppColors.textInverse : AppColors.text}
                />
                <Text style={[
                  styles.plateSizeText,
                  plateSize === 'bowl' && styles.plateSizeTextActive,
                ]}>
                  Bowl
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.plateSizeButton,
                  plateSize === 'hand' && styles.plateSizeButtonActive,
                ]}
                onPress={() => setPlateSize('hand')}
              >
                <MaterialCommunityIcons 
                  name="hand-back-right" 
                  size={24} 
                  color={plateSize === 'hand' ? AppColors.textInverse : AppColors.text}
                />
                <Text style={[
                  styles.plateSizeText,
                  plateSize === 'hand' && styles.plateSizeTextActive,
                ]}>
                  Hand
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Phase 3: Quick Feedback */}
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackLabel}>How accurate is this estimate?</Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity
              style={[
                styles.feedbackButton,
                quickFeedback === 'accurate' && styles.feedbackButtonActive,
                feedbackSubmitted && styles.feedbackButtonDisabled,
              ]}
              onPress={() => handleSubmitFeedback('accurate')}
              disabled={feedbackSubmitted}
            >
              <MaterialCommunityIcons 
                name="thumb-up" 
                size={24} 
                color={quickFeedback === 'accurate' ? AppColors.success : AppColors.text}
              />
              <Text style={[
                styles.feedbackButtonText,
                quickFeedback === 'accurate' && { color: AppColors.success },
              ]}>
                Accurate
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.feedbackButton,
                quickFeedback === 'too_high' && styles.feedbackButtonActive,
                feedbackSubmitted && styles.feedbackButtonDisabled,
              ]}
              onPress={() => handleSubmitFeedback('too_high')}
              disabled={feedbackSubmitted}
            >
              <MaterialCommunityIcons 
                name="arrow-up-bold" 
                size={24} 
                color={quickFeedback === 'too_high' ? AppColors.error : AppColors.text}
              />
              <Text style={[
                styles.feedbackButtonText,
                quickFeedback === 'too_high' && { color: AppColors.error },
              ]}>
                Too High
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.feedbackButton,
                quickFeedback === 'too_low' && styles.feedbackButtonActive,
                feedbackSubmitted && styles.feedbackButtonDisabled,
              ]}
              onPress={() => handleSubmitFeedback('too_low')}
              disabled={feedbackSubmitted}
            >
              <MaterialCommunityIcons 
                name="arrow-down-bold" 
                size={24} 
                color={quickFeedback === 'too_low' ? AppColors.warning : AppColors.text}
              />
              <Text style={[
                styles.feedbackButtonText,
                quickFeedback === 'too_low' && { color: AppColors.warning },
              ]}>
                Too Low
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.feedbackButton,
                quickFeedback === 'wrong_dish' && styles.feedbackButtonActive,
                feedbackSubmitted && styles.feedbackButtonDisabled,
              ]}
              onPress={() => handleSubmitFeedback('wrong_dish')}
              disabled={feedbackSubmitted}
            >
              <MaterialCommunityIcons 
                name="close-circle" 
                size={24} 
                color={quickFeedback === 'wrong_dish' ? AppColors.error : AppColors.text}
              />
              <Text style={[
                styles.feedbackButtonText,
                quickFeedback === 'wrong_dish' && { color: AppColors.error },
              ]}>
                Wrong Dish
              </Text>
            </TouchableOpacity>
          </View>
          {feedbackSubmitted && (
            <Text style={styles.feedbackThankYou}>✓ Thank you for your feedback!</Text>
          )}
        </View>

        {/* Calorie Display */}
        <CalorieRangeDisplay
          calorieEstimate={{
            ...response.calorie_estimate,
            value: getAdjustedCalories(),
          }}
          accuracyScore={getAccuracyScore()}
        />

        {/* Estimation Mode */}
        <View style={styles.modeContainer}>
          <View style={styles.modeHeader}>
            <MaterialCommunityIcons
              name={modeInfo.icon}
              size={24}
              color={AppColors.primary}
            />
            <Text style={styles.modeLabel}>{modeInfo.label}</Text>
          </View>
          <Text style={styles.modeDescription}>{modeInfo.description}</Text>
        </View>

        {/* Accuracy Details */}
        {hasAccuracyFactors && (
          <View style={styles.accuracyDetails}>
            <Text style={styles.sectionTitle}>Accuracy Factors</Text>
            <View style={styles.factorsGrid}>
              <FactorItem
                label="Image Quality"
                value={response.accuracy_score.factors.image_quality}
              />
              <FactorItem
                label="Lighting"
                value={response.accuracy_score.factors.lighting_conditions}
              />
              <FactorItem
                label="Angle Coverage"
                value={response.accuracy_score.factors.angle_coverage}
              />
              <FactorItem
                label="Volume Confidence"
                value={response.accuracy_score.factors.volume_confidence}
              />
            </View>
          </View>
        )}

        {/* Dish Predictions */}
        <DishPredictionList
          predictions={response.dish_predictions}
          selectedDishId={response.selected_dish.dish_id}
        />

        {/* Metadata */}
        <View style={styles.metadataContainer}>
          <Text style={styles.metadataTitle}>Processing Details</Text>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Processing Time:</Text>
            <Text style={styles.metadataValue}>
              {response.metadata.processing_time_ms}ms
            </Text>
          </View>
          <View style={styles.metadataRow}>
            <Text style={styles.metadataLabel}>Model Versions:</Text>
            <Text style={styles.metadataValue}>
              Classifier {response.metadata.model_versions.classifier}
            </Text>
          </View>
          {response.metadata.warnings && response.metadata.warnings.length > 0 && (
            <View style={styles.warningsContainer}>
              <MaterialCommunityIcons
                name="alert"
                size={16}
                color={AppColors.warning}
              />
              <Text style={styles.warningText}>
                {response.metadata.warnings.join(', ')}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.buttonSecondary]}
          onPress={handleRetry}
          disabled={isLogging}
        >
          <MaterialCommunityIcons name="camera-retake" size={24} color={AppColors.text} />
          <Text style={styles.buttonTextSecondary}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.buttonPrimary,
            isLogged && styles.buttonSuccess,
            isLogging && styles.buttonDisabled,
          ]}
          onPress={handleConfirmLog}
          disabled={isLogging || isLogged}
        >
          {isLogging ? (
            <ActivityIndicator color={AppColors.textInverse} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons
                name={isLogged ? 'check-circle' : 'content-save'}
                size={24}
                color={AppColors.textInverse}
              />
              <Text style={styles.buttonTextPrimary}>
                {isLogged ? 'Logged ✓' : 'Confirm Log'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

/**
 * Factor Item Component
 */
interface FactorItemProps {
  label: string;
  value: number;
}

const FactorItem: React.FC<FactorItemProps> = ({ label, value }) => {
  const percentage = Math.round(value * 100);
  const color = value >= 0.7 ? AppColors.success : value >= 0.5 ? AppColors.warning : AppColors.error;

  return (
    <View style={styles.factorItem}>
      <Text style={styles.factorLabel}>{label}</Text>
      <View style={styles.factorBar}>
        <View
          style={[
            styles.factorBarFill,
            { width: `${percentage}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={[styles.factorValue, { color }]}>{percentage}%</Text>
    </View>
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
    paddingBottom: Spacing.xl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  headerTitle: {
    ...Typography.h1,
    color: AppColors.text,
    marginTop: Spacing.md,
  },
  headerSubtitle: {
    ...Typography.h3,
    color: AppColors.textSecondary,
    marginTop: Spacing.xs,
  },
  pickerContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  pickerLabel: {
    ...Typography.h3,
    color: AppColors.text,
    marginBottom: Spacing.sm,
  },
  pickerWrapper: {
    backgroundColor: AppColors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: AppColors.border,
    overflow: 'hidden',
  },
  picker: {
    width: '100%',
  },
  portionContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  portionLabel: {
    ...Typography.h3,
    color: AppColors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  portionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  portionButton: {
    flex: 1,
    backgroundColor: AppColors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: AppColors.border,
  },
  portionButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  portionButtonText: {
    ...Typography.caption,
    color: AppColors.text,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  portionButtonTextActive: {
    color: AppColors.textInverse,
  },
  portionMultiplier: {
    ...Typography.caption,
    color: AppColors.textSecondary,
    fontSize: 10,
    marginTop: 2,
  },
  portionHint: {
    ...Typography.caption,
    color: AppColors.primary,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontWeight: '600',
  },
  // Phase 3: Plate Size Styles
  plateSizeContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  plateSizeLabel: {
    ...Typography.h3,
    color: AppColors.text,
    marginBottom: Spacing.md,
  },
  plateScroll: {
    flexDirection: 'row',
  },
  plateSizeButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  plateSizeButton: {
    backgroundColor: AppColors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: AppColors.border,
    minWidth: 90,
  },
  plateSizeButtonActive: {
    backgroundColor: AppColors.primary,
    borderColor: AppColors.primary,
  },
  plateSizeText: {
    ...Typography.caption,
    color: AppColors.text,
    marginTop: Spacing.xs,
    fontSize: 11,
  },
  plateSizeTextActive: {
    color: AppColors.textInverse,
    fontWeight: '600',
  },
  // Phase 3: Feedback Styles
  feedbackContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.primary + '30',
  },
  feedbackLabel: {
    ...Typography.h3,
    color: AppColors.text,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  feedbackButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  feedbackButton: {
    backgroundColor: AppColors.backgroundSecondary,
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: AppColors.border,
    minWidth: 80,
    flex: 1,
    maxWidth: '48%',
  },
  feedbackButtonActive: {
    backgroundColor: AppColors.background,
    borderWidth: 2,
  },
  feedbackButtonDisabled: {
    opacity: 0.5,
  },
  feedbackButtonText: {
    ...Typography.caption,
    color: AppColors.text,
    marginTop: Spacing.xs,
    fontSize: 11,
    fontWeight: '600',
  },
  feedbackThankYou: {
    ...Typography.caption,
    color: AppColors.success,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontWeight: '600',
  },
  modeContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  modeLabel: {
    ...Typography.h3,
    color: AppColors.text,
    marginLeft: Spacing.sm,
  },
  modeDescription: {
    ...Typography.body,
    color: AppColors.textSecondary,
  },
  accuracyDetails: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h3,
    color: AppColors.text,
    marginBottom: Spacing.md,
  },
  factorsGrid: {
    gap: Spacing.md,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  factorLabel: {
    ...Typography.caption,
    color: AppColors.textSecondary,
    flex: 1,
  },
  factorBar: {
    width: 100,
    height: 8,
    backgroundColor: AppColors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  factorValue: {
    ...Typography.caption,
    fontWeight: '600',
    width: 40,
    textAlign: 'right',
  },
  metadataContainer: {
    backgroundColor: AppColors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  metadataTitle: {
    ...Typography.h3,
    color: AppColors.text,
    marginBottom: Spacing.md,
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  metadataLabel: {
    ...Typography.caption,
    color: AppColors.textSecondary,
  },
  metadataValue: {
    ...Typography.caption,
    color: AppColors.text,
    fontWeight: '600',
  },
  warningsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.warning + '20',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  warningText: {
    ...Typography.caption,
    color: AppColors.warning,
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    backgroundColor: AppColors.surface,
    gap: Spacing.md,
    ...Shadows.medium,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    minHeight: 56,
  },
  buttonPrimary: {
    backgroundColor: AppColors.primary,
    ...Shadows.small,
  },
  buttonSecondary: {
    backgroundColor: AppColors.backgroundSecondary,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  buttonSuccess: {
    backgroundColor: AppColors.success,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonTextPrimary: {
    ...Typography.button,
    color: AppColors.textInverse,
  },
  buttonTextSecondary: {
    ...Typography.button,
    color: AppColors.text,
  },
});
