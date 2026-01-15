# Label API Integration - Implementation Guide

## Overview

This guide shows exactly how to wire the `requestLabel` API call into the **LabelHomeScreen** to display real backend nutrition data.

## File to Edit

**File:** `mobile/src/screens/Label/LabelHomeScreen.tsx`

---

## Step 1: Import the New API Service

**Location:** Top of file (after existing imports)

**FIND:**
```typescript
import { generateNutritionLabel } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
```

**REPLACE WITH:**
```typescript
import { generateNutritionLabel } from '../../services/api';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { requestLabel } from '../../services/labelApi';
import type { LabelResponse, LabelError } from '../../types/label';
```

**Why:** Import the new API service and response types.

---

## Step 2: Add State for API Response and Error

**Location:** Inside `LabelHomeScreen` component (after existing state declarations)

**FIND:**
```typescript
  const [prepStyle, setPrepStyle] = useState<StyleOption>('home');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
```

**ADD AFTER:**
```typescript
  // API response state
  const [labelResult, setLabelResult] = useState<LabelResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
```

**Why:** Store the API response and error messages for display.

---

## Step 3: Replace the `handleGenerate` Function

**Location:** Replace entire `handleGenerate` function

**FIND (entire function, lines 82-127):**
```typescript
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
```

**REPLACE WITH:**
```typescript
  /**
   * Generate nutrition label using real backend API
   */
  const handleGenerate = async () => {
    if (!dishName.trim()) return;

    // Clear previous results/errors
    setLabelResult(null);
    setApiError(null);
    setIsGenerating(true);

    try {
      // Call real backend API
      const response = await requestLabel(
        dishName.trim(),
        targetCalories ? parseFloat(targetCalories) : undefined,
        prepStyle === 'unknown' ? undefined : prepStyle,
        5 // top_k: retrieve top 5 similar dishes
      );

      console.log('✅ [Label] Generated label:', response);
      
      // Store result for display
      setLabelResult(response);

    } catch (error) {
      console.error('❌ [Label] Failed to generate label:', error);
      const labelError = error as LabelError;
      
      // Set user-friendly error message
      setApiError(labelError.message || 'Failed to generate nutrition label. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };
```

**Why:** 
- Uses new `requestLabel` API instead of old `generateNutritionLabel`
- Stores response in state for rendering
- User-friendly error handling with LabelError type
- No navigation - results display on same screen

---

## Step 4: Add Result Display Section

**Location:** Inside `return` statement, after the `DishSearchInput` component

**FIND:**
```tsx
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
```

**ADD BETWEEN (before Info Section):**
```tsx
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

      {/* Loading Spinner */}
      {isGenerating && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={AppColors.accent} />
          <Text style={styles.loadingText}>Analyzing nutrition...</Text>
        </View>
      )}

      {/* Error Message */}
      {apiError && !isGenerating && (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={24} color={AppColors.error} />
          <Text style={styles.errorText}>{apiError}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={handleGenerate}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
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
              <View style={styles.microItem}>
                <Text style={styles.microLabel}>Fiber</Text>
                <Text style={styles.microValue}>{labelResult.nutrition.fiber_g.toFixed(1)}g</Text>
              </View>
              <View style={styles.microItem}>
                <Text style={styles.microLabel}>Sugar</Text>
                <Text style={styles.microValue}>{labelResult.nutrition.sugar_g.toFixed(1)}g</Text>
              </View>
              <View style={styles.microItem}>
                <Text style={styles.microLabel}>Sodium</Text>
                <Text style={styles.microValue}>{labelResult.nutrition.sodium_mg.toFixed(0)}mg</Text>
              </View>
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
        </View>
      )}

      {/* Animated Info Section */}
```

**Why:** 
- Shows loading spinner during API call
- Displays error message with retry button if API fails
- Renders nutrition label card with matched dish, confidence, macros, and explanation
- Clean UI matching existing design system

---

## Step 5: Add Styles

**Location:** End of `StyleSheet.create()` (before closing brace)

**FIND (last style in stylesheet):**
```typescript
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: AppColors.text,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
  },
});
```

**ADD BEFORE CLOSING `});`:**
```typescript
  infoText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: AppColors.text,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.regular,
  },
  // Loading styles
  loadingContainer: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    padding: Spacing.xxl,
    backgroundColor: AppColors.cardBackground,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: AppColors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  // Error styles
  errorContainer: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: '#FEE',
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: AppColors.error,
  },
  errorText: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: AppColors.error,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.medium,
  },
  retryButton: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: AppColors.error,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
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
  },
  microItem: {
    alignItems: 'center',
    flex: 1,
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
});
```

**Why:** Complete styling matching existing design system with proper spacing, colors, shadows, and typography.

---

## Step 6: Add Missing Import (ActivityIndicator)

**Location:** Top of file, in React Native imports

**FIND:**
```typescript
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  TouchableOpacity,
} from 'react-native';
```

**REPLACE WITH:**
```typescript
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
```

**Why:** Need ActivityIndicator for loading spinner.

---

## Testing Checklist

After implementing changes, test:

1. **Backend Running:**
   ```bash
   cd c:\Users\Yuvar\Desktop\VSProjects\Senior-Design-2025
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

2. **Mobile App:**
   ```bash
   cd mobile
   npm start
   ```

3. **Test Scenarios:**
   - ✅ Enter "Chicken Tikka Masala" → See matched dish, nutrition, confidence
   - ✅ Enter with target calories (e.g., 600) → See scaled nutrition
   - ✅ Stop backend → See network error with retry button
   - ✅ Empty dish name → Should not call API
   - ✅ Loading spinner shows during API call
   - ✅ Explanation text displays reasoning

4. **Device-Specific Testing:**
   - Android Emulator: Should auto-connect to `10.0.2.2:8000`
   - iOS Simulator: Should auto-connect to `localhost:8000`
   - Physical Device: Update IP in `labelApi.ts` line 33

---

## Example API Response Flow

**Input:**
```
Dish: "Chicken Tikka Masala"
Calories: 600
Style: "restaurant"
```

**Backend Response:**
```json
{
  "matched_dish": "Chicken Tikka Masala",
  "nutrition": {
    "calories": 600,
    "protein_g": 45.2,
    "carbs_g": 38.5,
    "fat_g": 25.8,
    "fiber_g": 3.2,
    "sugar_g": 5.1,
    "sodium_mg": 890
  },
  "confidence": 0.92,
  "explanation": "Matched 5 similar recipes with high similarity (0.85-0.95). Scaled to target 600 calories. High confidence based on consistent ingredient profiles."
}
```

**UI Display:**
- ✅ Matched Dish: "Chicken Tikka Masala" with green checkmark
- ✅ Confidence: 92% with green progress bar
- ✅ Calories: 600 in large accent text
- ✅ Macros: Protein 45.2g, Carbs 38.5g, Fat 25.8g with icons
- ✅ Micronutrients: Fiber 3.2g, Sugar 5.1g, Sodium 890mg
- ✅ Explanation: Full text explaining calculation method

---

## Summary

**Changes Required:**
1. Import new API service and types (2 lines)
2. Add state for result and error (2 lines)
3. Replace `handleGenerate` function (~25 lines)
4. Add result display JSX (~150 lines)
5. Add styles (~200 lines)
6. Add ActivityIndicator import (1 line)

**Total:** ~380 lines added/modified in **1 file** (`LabelHomeScreen.tsx`)

**Result:** Fully functional API integration with loading, error handling, and beautiful nutrition label display matching existing design system.
