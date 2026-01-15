# Mobile App Integration Guide

## POST /label Endpoint

**Base URL**: `http://your-api-domain.com/label`

### Request Format

```json
{
  "dish_name": "chicken tikka masala",
  "calories": 600,          // Optional
  "style": "restaurant",    // Optional
  "top_k": 5               // Optional, default: 5
}
```

### Response Format

**Stable JSON structure** for mobile consumption:

```json
{
  "matched_dish": "Chicken Tikka Masala",
  "nutrition": {
    "calories": 600.0,
    "protein_g": 35.2,
    "carbs_g": 45.8,
    "fat_g": 28.4,
    "fiber_g": 3.2,
    "sugar_g": 8.1,
    "sodium_mg": 890.0
  },
  "confidence": 0.87,
  "explanation": "Excellent match with consistent candidates and reasonable portion size"
}
```

## TypeScript/React Native Integration

### Type Definitions

```typescript
interface LabelRequest {
  dish_name: string;
  calories?: number;
  style?: string;
  top_k?: number;
}

interface LabelResponse {
  matched_dish: string;
  nutrition: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sugar_g: number;
    sodium_mg: number;
  };
  confidence: number;  // [0.0, 1.0]
  explanation: string;
}
```

### API Service

```typescript
const API_BASE_URL = 'http://localhost:8000';

export async function getNutritionLabel(
  dishName: string,
  calories?: number,
  style?: string
): Promise<LabelResponse> {
  const request: LabelRequest = {
    dish_name: dishName,
    ...(calories && { calories }),
    ...(style && { style })
  };

  const response = await fetch(`${API_BASE_URL}/label`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}
```

### React Native Hook

```typescript
import { useState } from 'react';

export function useNutritionLabel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LabelResponse | null>(null);

  const getLabel = async (
    dishName: string,
    calories?: number,
    style?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await getNutritionLabel(dishName, calories, style);
      setData(result);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { getLabel, loading, error, data };
}
```

### Usage Example

```typescript
import React, { useState } from 'react';
import { View, TextInput, Button, Text, ActivityIndicator } from 'react-native';
import { useNutritionLabel } from './hooks/useNutritionLabel';

export function NutritionScreen() {
  const [dishName, setDishName] = useState('');
  const [calories, setCalories] = useState('');
  const { getLabel, loading, error, data } = useNutritionLabel();

  const handleSubmit = async () => {
    try {
      await getLabel(
        dishName,
        calories ? parseFloat(calories) : undefined
      );
    } catch (err) {
      console.error('Failed to get nutrition label:', err);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TextInput
        placeholder="Enter dish name"
        value={dishName}
        onChangeText={setDishName}
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      
      <TextInput
        placeholder="Target calories (optional)"
        value={calories}
        onChangeText={setCalories}
        keyboardType="numeric"
        style={{ borderWidth: 1, padding: 10, marginBottom: 10 }}
      />
      
      <Button
        title="Get Nutrition Info"
        onPress={handleSubmit}
        disabled={loading || !dishName}
      />

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {error && (
        <Text style={{ color: 'red', marginTop: 10 }}>
          Error: {error}
        </Text>
      )}

      {data && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            {data.matched_dish}
          </Text>
          
          <Text style={{ fontSize: 14, color: 'gray', marginTop: 5 }}>
            Confidence: {(data.confidence * 100).toFixed(0)}%
          </Text>
          
          <Text style={{ fontSize: 12, color: 'gray', marginBottom: 10 }}>
            {data.explanation}
          </Text>

          <View style={{ marginTop: 10 }}>
            <Text>Calories: {data.nutrition.calories}</Text>
            <Text>Protein: {data.nutrition.protein_g}g</Text>
            <Text>Carbs: {data.nutrition.carbs_g}g</Text>
            <Text>Fat: {data.nutrition.fat_g}g</Text>
            <Text>Fiber: {data.nutrition.fiber_g}g</Text>
            <Text>Sugar: {data.nutrition.sugar_g}g</Text>
            <Text>Sodium: {data.nutrition.sodium_mg}mg</Text>
          </View>
        </View>
      )}
    </View>
  );
}
```

## Request Examples

### Basic Query (No Scaling)

```bash
curl -X POST http://localhost:8000/label \
  -H "Content-Type: application/json" \
  -d '{"dish_name": "grilled chicken breast"}'
```

Response:
```json
{
  "matched_dish": "Grilled Chicken Breast",
  "nutrition": {
    "calories": 165.0,
    "protein_g": 31.0,
    "carbs_g": 0.0,
    "fat_g": 3.6,
    "fiber_g": 0.0,
    "sugar_g": 0.0,
    "sodium_mg": 74.0
  },
  "confidence": 0.92,
  "explanation": "Excellent match with consistent candidates"
}
```

### With Target Calories

```bash
curl -X POST http://localhost:8000/label \
  -H "Content-Type: application/json" \
  -d '{
    "dish_name": "chicken tikka masala",
    "calories": 600
  }'
```

Response:
```json
{
  "matched_dish": "Chicken Tikka Masala",
  "nutrition": {
    "calories": 600.0,
    "protein_g": 35.2,
    "carbs_g": 45.8,
    "fat_g": 28.4,
    "fiber_g": 3.2,
    "sugar_g": 8.1,
    "sodium_mg": 890.0
  },
  "confidence": 0.87,
  "explanation": "Excellent match with consistent candidates and reasonable portion size"
}
```

### With Style Hint

```bash
curl -X POST http://localhost:8000/label \
  -H "Content-Type: application/json" \
  -d '{
    "dish_name": "curry",
    "calories": 500,
    "style": "indian"
  }'
```

Response:
```json
{
  "matched_dish": "Chicken Curry",
  "nutrition": {
    "calories": 500.0,
    "protein_g": 28.5,
    "carbs_g": 35.2,
    "fat_g": 22.8,
    "fiber_g": 4.5,
    "sugar_g": 6.2,
    "sodium_mg": 720.0
  },
  "confidence": 0.78,
  "explanation": "Good match with moderate variance across candidates"
}
```

## Error Handling

### Validation Errors (422)

```json
{
  "detail": [
    {
      "loc": ["body", "dish_name"],
      "msg": "Dish name cannot be empty",
      "type": "value_error"
    }
  ]
}
```

### No Matches Found (200 with fallback)

```json
{
  "matched_dish": "xyz unknown dish",
  "nutrition": {
    "calories": 500.0,
    "protein_g": 25.0,
    "carbs_g": 50.0,
    "fat_g": 16.7,
    "fiber_g": 5.0,
    "sugar_g": 10.0,
    "sodium_mg": 800.0
  },
  "confidence": 0.0,
  "explanation": "No matching dishes found in database. Showing rough estimates."
}
```

## Confidence Interpretation

Display confidence levels to users:

```typescript
function getConfidenceLevel(confidence: number): string {
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.50) return 'Medium';
  return 'Low';
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.75) return '#4CAF50';  // Green
  if (confidence >= 0.50) return '#FF9800';  // Orange
  return '#F44336';  // Red
}

// In your component:
<View style={{
  backgroundColor: getConfidenceColor(data.confidence),
  padding: 5,
  borderRadius: 5
}}>
  <Text style={{ color: 'white' }}>
    {getConfidenceLevel(data.confidence)} Confidence
  </Text>
</View>
```

## Best Practices

### 1. Always Show Confidence

```typescript
if (data.confidence < 0.5) {
  // Show warning badge
  <Text style={{ color: 'orange' }}>⚠️ Low Confidence</Text>
}
```

### 2. Display Explanation

```typescript
<Text style={{ fontSize: 12, color: 'gray' }}>
  {data.explanation}
</Text>
```

### 3. Cache Results

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

async function getCachedOrFetch(dishName: string, calories?: number) {
  const cacheKey = `label_${dishName}_${calories || 'default'}`;
  
  // Check cache
  const cached = await AsyncStorage.getItem(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Fetch from API
  const result = await getNutritionLabel(dishName, calories);
  
  // Cache for 1 hour
  await AsyncStorage.setItem(cacheKey, JSON.stringify(result));
  
  return result;
}
```

### 4. Handle Loading States

```typescript
{loading && (
  <View style={{ alignItems: 'center', padding: 20 }}>
    <ActivityIndicator size="large" />
    <Text style={{ marginTop: 10 }}>Analyzing nutrition...</Text>
  </View>
)}
```

### 5. Debounce Search

```typescript
import { useDebounce } from 'use-debounce';

const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch] = useDebounce(searchTerm, 500);

useEffect(() => {
  if (debouncedSearch) {
    getLabel(debouncedSearch);
  }
}, [debouncedSearch]);
```

## Testing

### Test with curl

```bash
# Health check
curl http://localhost:8000/health

# Basic request
curl -X POST http://localhost:8000/label \
  -H "Content-Type: application/json" \
  -d '{"dish_name": "pizza"}'

# With all parameters
curl -X POST http://localhost:8000/label \
  -H "Content-Type: application/json" \
  -d '{
    "dish_name": "chicken curry",
    "calories": 600,
    "style": "indian",
    "top_k": 10
  }'
```

### Test Response Structure

```typescript
import { expect, test } from '@jest/globals';

test('label response has correct structure', async () => {
  const response = await getNutritionLabel('chicken breast', 300);
  
  expect(response).toHaveProperty('matched_dish');
  expect(response).toHaveProperty('nutrition');
  expect(response).toHaveProperty('confidence');
  expect(response).toHaveProperty('explanation');
  
  expect(response.nutrition).toHaveProperty('calories');
  expect(response.nutrition).toHaveProperty('protein_g');
  expect(response.nutrition).toHaveProperty('carbs_g');
  expect(response.nutrition).toHaveProperty('fat_g');
  
  expect(response.confidence).toBeGreaterThanOrEqual(0);
  expect(response.confidence).toBeLessThanOrEqual(1);
});
```

## CORS Configuration

CORS is enabled in `app/main.py` with:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For production, update to specific origins:

```python
allow_origins=[
    "https://your-app.com",
    "https://your-mobile-app.com"
]
```

## Troubleshooting

### Issue: "Network request failed"

**Solution**: Check API URL is correct and server is running.

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000'  // Development
  : 'https://api.yourapp.com';  // Production
```

### Issue: "Low confidence (0.0) always returned"

**Solution**: Database might be empty. Seed dishes:

```bash
python scripts/ingest_seed.py
python scripts/embed_dishes.py
```

### Issue: "CORS error in browser"

**Solution**: CORS is enabled. If still failing, check server logs.

## Summary

✅ **Endpoint**: POST /label  
✅ **Request**: `{dish_name, calories?, style?, top_k?}`  
✅ **Response**: `{matched_dish, nutrition, confidence, explanation}`  
✅ **CORS**: Enabled for mobile apps  
✅ **Validation**: Pydantic validates all inputs  
✅ **Fallback**: Graceful handling when no matches  
✅ **Deterministic**: Same input → same output  
✅ **Confidence**: [0,1] score with explanation
