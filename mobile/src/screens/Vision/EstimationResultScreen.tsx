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

      // Estimate macros based on calories (rough approximation)
      const estimatedProtein = Math.round(response.calorie_estimate.value * 0.25 / 4); // 25% of calories from protein
      const estimatedCarbs = Math.round(response.calorie_estimate.value * 0.45 / 4); // 45% from carbs
      const estimatedFats = Math.round(response.calorie_estimate.value * 0.30 / 9); // 30% from fats

      // Add to local FoodContext (appears in History)
      addFoodEntry({
        foodName: response.selected_dish.dish_name,
        calories: Math.round(response.calorie_estimate.value),
        protein: estimatedProtein,
        carbs: estimatedCarbs,
        fats: estimatedFats,
      });

      // Log to backend (stub implementation for now)
      await logMealEntry({
        dishName: response.selected_dish.dish_name,
        calories: Math.round(response.calorie_estimate.value),
        protein: estimatedProtein,
        carbs: estimatedCarbs,
        fats: estimatedFats,
        confidence: response.selected_dish.confidence,
        timestamp: new Date().toISOString(),
      });

      setIsLogged(true);
      Alert.alert(
        'Meal Logged! ✓',
        `${response.selected_dish.dish_name} (${Math.round(response.calorie_estimate.value)} kcal) has been added to your history.`,
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

  const modeInfo = getEstimationModeInfo(response.metadata.estimation_mode);

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
            {response.selected_dish.dish_name}
          </Text>
        </View>

        {/* Calorie Display */}
        <CalorieRangeDisplay
          calorieEstimate={response.calorie_estimate}
          accuracyScore={response.accuracy_score.overall}
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
