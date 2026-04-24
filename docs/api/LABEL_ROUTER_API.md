# Label Router API Documentation

## Overview

The `/label` endpoint generates nutrition labels using a retrieval-based pipeline with semantic search, mixture aggregation, calorie scaling, and confidence scoring.

## Pipeline Architecture

```
User Request
    ↓
[1. Retrieval Service]
    - Semantic search with pgvector
    - Retrieve top-k similar dishes
    - Filter by similarity threshold
    ↓
[2. Mixture Service]
    - Similarity-weighted averaging
    - Softmax normalization
    - Cap prevention (max 70% per candidate)
    ↓
[3. Scaling Service]
    - Calorie-aware portion adjustment
    - Linear scaling with clamping (0.1x-10x)
    - Proportional nutrient adjustment
    ↓
[4. Confidence Service]
    - Multi-factor scoring (similarity, consistency, scaling)
    - Human-readable explanations
    - Confidence tiers (High, Medium, Low)
    ↓
Structured Response
```

## Endpoint

### POST `/label`

Generate a nutrition label for a dish.

**Request Body:**

```json
{
  "dish_name": "chicken tikka masala",
  "calories": 600,           // Optional: target calories for scaling
  "style": "restaurant",     // Optional: cuisine/prep style hint
  "top_k": 5                 // Optional: number of candidates (1-20)
}
```

**Response:**

```json
{
  "nutrients": {
    "calories": 600.0,
    "protein_g": 35.2,
    "carbs_g": 45.8,
    "fat_g": 28.4,
    "fiber_g": 3.2,
    "sugar_g": 8.1,
    "sodium_mg": 890.0,
    "saturated_fat_g": 12.3,   // Optional fields
    "cholesterol_mg": 95.0,
    "potassium_mg": 420.0
  },
  "confidence": {
    "score": 0.87,
    "tier": "High",
    "explanation": "Excellent match with consistent candidates and reasonable portion size"
  },
  "candidates": [
    {
      "dish_id": "123",
      "name": "Chicken Tikka Masala",
      "similarity": 0.92,
      "weight": 0.65
    },
    {
      "dish_id": "456",
      "name": "Butter Chicken",
      "similarity": 0.88,
      "weight": 0.25
    }
  ],
  "metadata": {
    "scaling_factor": 1.94,
    "mixture_used": true,
    "num_candidates": 5,
    "base_calories": 309.3,
    "query_text": "restaurant chicken tikka masala"
  }
}
```

## Request Schema

### LabelRequest

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `dish_name` | string | Yes | 2-200 chars, non-empty | Dish name or description |
| `calories` | float | No | > 0, ≤ 10000 | Target calories for portion scaling |
| `style` | string | No | ≤ 50 chars | Cuisine or preparation style hint |
| `top_k` | integer | No | 1-20, default: 5 | Number of candidates to retrieve |

### Validation Rules

- **dish_name**: Cannot be empty or whitespace-only
- **calories**: Must be positive and realistic (≤ 10000)
- **style**: Optional hint appended to query (e.g., "indian curry")
- **top_k**: Controls retrieval breadth vs. precision

## Response Schema

### Nutrients

All nutritional values per serving. Macronutrients in grams, micronutrients in milligrams.

| Field | Type | Unit | Required | Description |
|-------|------|------|----------|-------------|
| `calories` | float | kcal | Yes | Energy content |
| `protein_g` | float | g | Yes | Protein content |
| `carbs_g` | float | g | Yes | Total carbohydrates |
| `fat_g` | float | g | Yes | Total fat |
| `fiber_g` | float | g | Yes | Dietary fiber |
| `sugar_g` | float | g | Yes | Total sugars |
| `sodium_mg` | float | mg | Yes | Sodium content |
| `saturated_fat_g` | float | g | No | Saturated fat |
| `cholesterol_mg` | float | mg | No | Cholesterol |
| `potassium_mg` | float | mg | No | Potassium |
| `calcium_mg` | float | mg | No | Calcium |
| `iron_mg` | float | mg | No | Iron |
| `vitamin_a_iu` | float | IU | No | Vitamin A |
| `vitamin_c_mg` | float | mg | No | Vitamin C |

### ConfidenceInfo

| Field | Type | Description |
|-------|------|-------------|
| `score` | float | Numeric confidence [0.0, 1.0] |
| `tier` | string | Human-readable tier: "High", "Medium", "Low" |
| `explanation` | string | Human-readable explanation of confidence level |

**Confidence Tiers:**
- **High (≥ 0.75)**: Excellent match, consistent candidates, reasonable portion
- **Medium (0.50-0.75)**: Good match with some uncertainty
- **Low (< 0.50)**: Weak match, high variance, or extreme scaling

### Candidate

| Field | Type | Description |
|-------|------|-------------|
| `dish_id` | string | Database ID or unique identifier |
| `name` | string | Canonical dish name |
| `similarity` | float | Cosine similarity score [0.0, 1.0] |
| `weight` | float | Contribution weight in mixture [0.0, 1.0] |

### Metadata

| Field | Type | Description |
|-------|------|-------------|
| `scaling_factor` | float | Applied scaling factor (target_cal / base_cal) |
| `mixture_used` | boolean | Whether multiple candidates were blended |
| `num_candidates` | integer | Number of retrieved candidates |
| `base_calories` | float | Pre-scaling calorie value |
| `query_text` | string | Actual query sent to retrieval (includes style) |
| `fallback` | boolean | (Optional) True if fallback response used |
| `reason` | string | (Optional) Reason for fallback |

## Usage Examples

### 1. Basic Query (No Scaling)

```bash
curl -X POST http://localhost:8000/label \
  -H "Content-Type: application/json" \
  -d '{
    "dish_name": "grilled chicken breast"
  }'
```

Returns nutrients for a standard serving (~165 calories).

### 2. Query with Target Calories

```bash
curl -X POST http://localhost:8000/label \
  -H "Content-Type: application/json" \
  -d '{
    "dish_name": "pasta carbonara",
    "calories": 800
  }'
```

Scales nutrients to match 800 calories.

### 3. Query with Style Hint

```bash
curl -X POST http://localhost:8000/label \
  -H "Content-Type: application/json" \
  -d '{
    "dish_name": "chicken curry",
    "calories": 600,
    "style": "indian"
  }'
```

Query becomes "indian chicken curry" for better retrieval.

### 4. Query with Custom top_k

```bash
curl -X POST http://localhost:8000/label \
  -H "Content-Type: application/json" \
  -d '{
    "dish_name": "pizza",
    "calories": 900,
    "top_k": 10
  }'
```

Retrieves 10 candidates for more robust mixture.

## Error Handling

### Validation Errors (400)

```json
{
  "detail": "Invalid request: Dish name cannot be empty"
}
```

**Common causes:**
- Empty or whitespace-only dish_name
- Negative or excessive calories
- Invalid top_k value

### Server Errors (500)

Returns fallback response with estimated nutrients:

```json
{
  "nutrients": {
    "calories": 500.0,
    "protein_g": 25.0,
    "carbs_g": 50.0,
    "fat_g": 16.7,
    "fiber_g": 5.0,
    "sugar_g": 10.0,
    "sodium_mg": 800.0
  },
  "confidence": {
    "score": 0.0,
    "tier": "Low",
    "explanation": "Processing error: [error message]"
  },
  "candidates": [
    {
      "dish_id": "fallback",
      "name": "requested dish name",
      "similarity": 0.0,
      "weight": 1.0
    }
  ],
  "metadata": {
    "fallback": true,
    "reason": "Processing error: [error message]",
    "scaling_factor": 1.0,
    "mixture_used": false
  }
}
```

## Fallback Behavior

The endpoint provides graceful degradation:

1. **No Matches Found**: Returns rough heuristic estimates
2. **Database Error**: Returns fallback with explanation
3. **Service Error**: Logs error, returns fallback response

Fallback heuristics (based on target calories):
- Protein: ~5% of calories (0.05 × cal / 4 cal/g)
- Carbs: ~10% of calories (0.10 × cal / 4 cal/g)
- Fat: ~3% of calories (0.03 × cal / 9 cal/g)
- Fiber: ~1% of calories
- Sugar: ~2% of calories
- Sodium: ~1.6 mg per calorie

## Performance

**Expected Response Times:**
- Cold start: < 2 seconds (includes embedding generation)
- Warm cache: < 500ms (embedding cache hit)
- Database query: < 100ms (HNSW index)

**Optimization Tips:**
1. Reduce `top_k` for faster responses (at cost of accuracy)
2. Preload common dishes into embedding cache
3. Use database connection pooling
4. Cache frequent query results

## Integration with Mobile App

### TypeScript Interface

```typescript
interface LabelRequest {
  dish_name: string;
  calories?: number;
  style?: string;
  top_k?: number;
}

interface LabelResponse {
  nutrients: Nutrients;
  confidence: ConfidenceInfo;
  candidates: Candidate[];
  metadata: Record<string, any>;
}

// Usage example
async function getNutritionLabel(
  dishName: string, 
  calories?: number
): Promise<LabelResponse> {
  const response = await fetch('http://localhost:8000/label', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dish_name: dishName, calories })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  
  return response.json();
}
```

### React Native Example

```typescript
import { useState } from 'react';

export function useNutritionLabel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const getLabel = async (dishName: string, calories?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('http://localhost:8000/label', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dish_name: dishName, calories })
      });
      
      const data = await response.json();
      
      // Check confidence level
      if (data.confidence.score < 0.5) {
        console.warn('Low confidence prediction:', data.confidence.explanation);
      }
      
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { getLabel, loading, error };
}
```

## Testing

Run the test suite:

```bash
# Unit tests
pytest app/tests/test_label_router.py -v

# Integration tests (requires database)
pytest app/tests/test_label_router.py -v -m integration

# Performance tests
pytest app/tests/test_label_router.py -v -m performance
```

## Monitoring & Debugging

### Metadata for Debugging

The `metadata` field provides insight into pipeline behavior:

```python
# Check if mixture was used
if response["metadata"]["mixture_used"]:
    print(f"Blended {response['metadata']['num_candidates']} candidates")

# Check scaling factor
scaling = response["metadata"]["scaling_factor"]
if scaling > 3.0 or scaling < 0.5:
    print("Warning: Large portion adjustment")

# Check query enhancement
if response["metadata"]["query_text"] != original_dish_name:
    print("Query was enhanced with style hint")
```

### Confidence Interpretation

```python
confidence = response["confidence"]

if confidence["tier"] == "High":
    # Safe to display without warnings
    pass
elif confidence["tier"] == "Medium":
    # Display with "estimated" label
    show_warning("Estimated nutrition values")
elif confidence["tier"] == "Low":
    # Display with strong disclaimer
    show_warning("Low confidence - values may be inaccurate")
    show_explanation(confidence["explanation"])
```

## Best Practices

1. **Always check confidence**: Display warnings for low-confidence predictions
2. **Show candidates**: Let users see what dishes were matched
3. **Expose metadata**: Help users understand scaling and mixture
4. **Handle fallbacks**: Gracefully handle errors with user-friendly messages
5. **Cache results**: Cache frequent queries to reduce latency
6. **Validate inputs**: Check dish_name and calories before sending request
7. **Use style hints**: Improve retrieval with cuisine/prep context
8. **Adjust top_k**: Balance accuracy (higher k) vs. speed (lower k)

## Future Enhancements

- [ ] Support for ingredient-level queries
- [ ] Batch prediction endpoint
- [ ] User feedback integration for model improvement
- [ ] Custom confidence thresholds
- [ ] Multi-language dish names
- [ ] Allergen and dietary restriction tagging
