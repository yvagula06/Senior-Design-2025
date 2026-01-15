# Mobile API Integration - Usage Guide

## Files Created

1. **[mobile/src/services/api.ts](mobile/src/services/api.ts)** - Axios client configuration
2. **[mobile/src/services/label.ts](mobile/src/services/label.ts)** - Label API service
3. **[mobile/src/types/label.ts](mobile/src/types/label.ts)** - TypeScript type definitions

---

## Quick Start

### Basic Usage

```typescript
import { requestLabel } from './src/services/label';

// Simple request (dish name only)
try {
  const result = await requestLabel('chicken tikka masala');
  console.log(`Matched: ${result.matched_dish}`);
  console.log(`Calories: ${result.nutrition.calories}`);
  console.log(`Protein: ${result.nutrition.protein_g}g`);
  console.log(`Confidence: ${result.confidence}`);
} catch (error) {
  alert(error); // User-friendly message
}
```

### With Target Calories

```typescript
import { requestLabel } from './src/services/label';

// Request with target calories for scaling
const result = await requestLabel('grilled salmon', 400);
// Nutrition will be scaled to approximately 400 calories
```

### With Style Hint

```typescript
import { requestLabel } from './src/services/label';

// Request with style hint
const result = await requestLabel('burger', 800, 'restaurant');
// Searches for restaurant-style burger
```

---

## Integration Example

```typescript
import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { requestLabel } from './src/services/label';
import type { LabelResponse } from './src/types/label';

export function LabelScreen() {
  const [dishName, setDishName] = useState('');
  const [targetCalories, setTargetCalories] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LabelResponse | null>(null);

  const handleGenerate = async () => {
    if (!dishName.trim()) return;

    setLoading(true);
    setResult(null);

    try {
      const calories = targetCalories ? parseFloat(targetCalories) : undefined;
      const data = await requestLabel(dishName, calories);
      setResult(data);
    } catch (error) {
      Alert.alert('Error', String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Enter dish name"
        value={dishName}
        onChangeText={setDishName}
      />
      <TextInput
        placeholder="Target calories (optional)"
        value={targetCalories}
        onChangeText={setTargetCalories}
        keyboardType="numeric"
      />
      <Button 
        title={loading ? 'Loading...' : 'Generate Label'} 
        onPress={handleGenerate}
        disabled={loading}
      />

      {result && (
        <View>
          <Text>Matched: {result.matched_dish}</Text>
          <Text>Calories: {result.nutrition.calories}</Text>
          <Text>Protein: {result.nutrition.protein_g}g</Text>
          <Text>Carbs: {result.nutrition.carbs_g}g</Text>
          <Text>Fat: {result.nutrition.fat_g}g</Text>
          {result.nutrition.fiber_g && (
            <Text>Fiber: {result.nutrition.fiber_g}g</Text>
          )}
          {result.nutrition.sugar_g && (
            <Text>Sugar: {result.nutrition.sugar_g}g</Text>
          )}
          {result.nutrition.sodium_mg && (
            <Text>Sodium: {result.nutrition.sodium_mg}mg</Text>
          )}
          <Text>Confidence: {(result.confidence * 100).toFixed(0)}%</Text>
          <Text>Explanation: {result.explanation}</Text>
        </View>
      )}
    </View>
  );
}
```

---

## Error Handling

The `requestLabel` function throws user-friendly error strings:

```typescript
try {
  const result = await requestLabel('pizza');
  // Use result...
} catch (error) {
  // error is a string with user-friendly message:
  // - "Dish not found" (404)
  // - "Server error. Please try again later." (500)
  // - "Network error. Please check your connection." (network failure)
  // - "Request timed out. Please try again." (timeout)
  alert(String(error));
}
```

---

## Development Setup

### Android Emulator
✅ **Works automatically** - uses `http://10.0.2.2:8000`

### iOS Simulator
✅ **Works automatically** - uses `http://localhost:8000`

### Physical Device
⚙️ **Requires configuration:**

1. Find your computer's LAN IP:
   ```bash
   # Windows
   ipconfig
   
   # Mac/Linux
   ifconfig
   ```
   Look for address like `192.168.1.100`

2. Update [mobile/src/services/api.ts](mobile/src/services/api.ts#L39):
   ```typescript
   const PHYSICAL_DEVICE_IP = '192.168.1.100'; // Your IP here
   ```

3. Start backend on all interfaces:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

4. Ensure device and computer on same WiFi network

---

## API Response Structure

```typescript
{
  matched_dish: "Chicken Tikka Masala",
  nutrition: {
    calories: 600,
    protein_g: 45.2,
    carbs_g: 38.5,
    fat_g: 25.8,
    sugar_g: 5.1,        // May be null
    fiber_g: 3.2,        // May be null
    sodium_mg: 890,      // May be null
    potassium_mg: null   // May be null
  },
  confidence: 0.87,      // 0.0 to 1.0
  explanation: "High confidence match based on 5 similar recipes"
}
```

---

## Configuration

### Change Base URL

Edit [mobile/src/services/api.ts](mobile/src/services/api.ts):

```typescript
// For production
return 'https://api.nutrilabelai.com';

// For custom development URL
return 'http://192.168.1.50:8000';
```

### Change Timeout

Edit [mobile/src/services/api.ts](mobile/src/services/api.ts):

```typescript
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000, // 20 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

## Testing

### Test Backend Connectivity

```typescript
import { apiClient } from './src/services/api';

async function testConnection() {
  try {
    const response = await apiClient.get('/health');
    console.log('Backend connected:', response.data);
    return true;
  } catch (error) {
    console.error('Backend not accessible:', error);
    return false;
  }
}
```

### Test Label Request

```typescript
import { requestLabel } from './src/services/label';

async function testLabel() {
  try {
    const result = await requestLabel('pizza', 500);
    console.log('✅ Success:', result);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}
```

---

## Troubleshooting

### "Network error. Please check your connection."
- Backend not running
- Wrong IP address for physical device
- Device and computer not on same WiFi
- Firewall blocking connection

**Fix:**
```bash
# Ensure backend running
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Test from browser on device
# Navigate to: http://YOUR_IP:8000/health
```

### "Dish not found" (404)
- No matching dish in database
- Similarity threshold too high

**Fix:**
- Try more common dish names
- Seed database: `python scripts/ingest_seed.py`

### "Request timed out. Please try again."
- Backend slow or unresponsive
- Network latency high

**Fix:**
- Increase timeout in [api.ts](mobile/src/services/api.ts)
- Check backend logs for slow queries

---

## Architecture

```
┌─────────────────────────────────────┐
│  React Native Component             │
│  (Label Screen)                     │
└───────────┬─────────────────────────┘
            │
            ├─> import { requestLabel }
            │
┌───────────▼─────────────────────────┐
│  label.ts                           │
│  - requestLabel()                   │
│  - handleError()                    │
└───────────┬─────────────────────────┘
            │
            ├─> import { apiClient }
            │
┌───────────▼─────────────────────────┐
│  api.ts                             │
│  - axios client                     │
│  - platform-aware baseURL           │
│  - timeout: 10s                     │
└───────────┬─────────────────────────┘
            │
            │ HTTP POST /label
            ▼
┌─────────────────────────────────────┐
│  FastAPI Backend                    │
│  POST /label                        │
│  - Retrieval (pgvector)             │
│  - Mixture (top-k aggregation)      │
│  - Scaling (calorie adjustment)     │
│  - Confidence (quality score)       │
└─────────────────────────────────────┘
```

---

## Summary

✅ **Created:**
- `mobile/src/services/api.ts` - Axios client with platform-aware URL
- `mobile/src/services/label.ts` - `requestLabel()` function with error handling
- `mobile/src/types/label.ts` - TypeScript types matching backend

✅ **Features:**
- Automatic platform detection (Android/iOS/Physical)
- 10 second timeout
- User-friendly error messages
- 404 → "Dish not found"
- 500 → "Server error"
- Network errors → "Network error"
- Nullable nutrition fields supported

✅ **Ready to use:**
```typescript
import { requestLabel } from './src/services/label';
const result = await requestLabel('chicken', 600, 'restaurant');
```
