# Camera Functionality Implementation Guide

## Overview

This guide covers the implementation of the camera-based meal estimation feature as specified in `Camera_Functionality_Plan.md`. The implementation includes:

- ✅ Clarifai API integration for dish classification and segmentation
- ✅ Multi-angle capture mode (top + side photos)
- ✅ Single image quick mode
- ✅ Portion size adjustment (Small/Normal/Large)
- ✅ Dish selection from top-K predictions
- ✅ Volume estimation and calorie calculation
- ✅ Meal logging integration

## Architecture

### Backend Services

**Core Files:**
- `app/services/vision_api_client.py` - Clarifai API client with retry logic
- `app/services/dish_classifier.py` - Clarifai (primary) + OpenAI (fallback) dish classification
- `app/services/segmentation_service.py` - Clarifai segmentation integration
- `app/services/volume_estimator.py` - Volume estimation (mocked for Phase 1)
- `app/services/nutrition_mapper.py` - Calorie calculation from volume + dish DB
- `app/services/vision_confidence_adapter.py` - Accuracy score calculation
- `app/services/vision_orchestrator.py` - Full pipeline orchestration
- `app/api/vision_router.py` - FastAPI endpoint: POST /vision/estimate
- `app/schemas/vision.py` - Pydantic schemas for request/response

**Pipeline Flow:**
1. Client sends multi-part images to POST /vision/estimate
2. Mode detection (depth/multi_angle/reference_based)
3. Clarifai dish classification (top-K predictions)
4. Clarifai segmentation (food region masks)
5. Volume estimation from images + masks
6. Nutrition mapping (volume → calories via DB)
7. Confidence calculation (accuracy score + calorie range)
8. Response assembly with suggestions

### Mobile App

**Core Files:**
- `mobile/src/screens/Vision/CameraCaptureScreen.tsx` - Multi-angle capture flow
- `mobile/src/screens/Vision/EstimationResultScreen.tsx` - Results with adjustments
- `mobile/src/services/visionApi.ts` - API client for /vision/estimate
- `mobile/src/types/vision.ts` - TypeScript types
- `mobile/src/components/Vision/*` - Reusable components

**Capture Flow:**
1. Mode selection (Quick vs Multi-Angle)
2. Step-by-step image capture (top photo required, side photo optional)
3. Preview with mode indicator
4. API call with base64-encoded images
5. Results display with:
   - Top-K dish predictions (picker/dropdown)
   - Portion size slider (Small/Normal/Large)
   - Adjusted calorie display
   - Accuracy score breakdown
6. Confirm → Log meal to history

## Installation & Setup

### 1. Backend Setup

#### Install Dependencies

```bash
# From project root
cd Senior-Design-2025

# Install Python dependencies (includes clarifai-grpc)
pip install -e .
```

#### Configure Environment Variables

Copy `.env.example` to `.env` and fill in API keys:

```bash
cp .env.example .env
```

Required variables:
```env
# Database
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/nutrition

# Vision APIs
CLARIFAI_API_KEY=your_clarifai_pat_key_here
OPENAI_API_KEY=your_openai_api_key_here  # Optional fallback
OPENAI_MODEL=gpt-4o-mini

# Embedding model (existing)
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

#### Get Clarifai API Key

1. Sign up at https://clarifai.com/
2. Go to Settings → Security → Personal Access Tokens
3. Create a new PAT with scope: `Predict` on models
4. Copy the token to `CLARIFAI_API_KEY` in `.env`

#### Run Backend

```bash
# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

Test vision endpoint:
```bash
curl http://localhost:8000/vision/health
# Expected: {"status": "ok", "service": "vision", "models_loaded": true}
```

### 2. Mobile App Setup

#### Install Dependencies

```bash
cd mobile

# Install npm packages (includes @react-native-picker/picker)
npm install
```

#### Configure API Endpoint

Update `mobile/src/services/api.ts` with your backend URL:
```typescript
const API_BASE_URL = 'http://localhost:8000';  // Or your deployed URL
```

#### Run Mobile App

```bash
# Start Expo dev server
npm start

# Or run directly on device/emulator
npm run android  # Android
npm run ios      # iOS
```

### 3. Testing the Feature

#### Quick Test Flow

1. Open mobile app
2. Navigate to Vision/Camera tab
3. Choose **Quick Mode**
4. Take a photo from above
5. Wait for estimation
6. Adjust portion size if needed
7. Select different dish if incorrect
8. Tap **Confirm Log**
9. Check History tab for logged meal

#### Multi-Angle Test Flow

1. Open mobile app
2. Navigate to Vision/Camera tab
3. Choose **Multi-Angle Mode**
4. Take top photo (directly above)
5. Take side photo (from the side)
6. Review preview with both images
7. Tap **Estimate Meal**
8. Adjust dish and portion as needed
9. Confirm and log

## API Usage

### Request Format

```typescript
POST /vision/estimate

{
  "images": [
    {
      "data": "base64_encoded_image_data",
      "angle": "top",  // "top" | "side" | "oblique"
      "timestamp": "2026-02-08T10:30:00Z"
    },
    {
      "data": "base64_encoded_image_data",
      "angle": "side",
      "timestamp": "2026-02-08T10:30:05Z"
    }
  ],
  "metadata": {
    "device_type": "ios",  // "ios" | "android"
    "capture_mode": "multi_angle",  // "single" | "multi_angle" | "depth"
    "device_model": "iPhone 14 Pro"
  },
  "depth_data": null,  // Optional for Phase 2
  "camera_intrinsics": null  // Optional for Phase 2
}
```

### Response Format

```typescript
{
  "dish_predictions": [
    {
      "dish_id": "ai21_0001",
      "dish_name": "Grilled Chicken Caesar Salad",
      "confidence": 0.89,
      "category": "salad"
    },
    {
      "dish_id": "ai21_0002",
      "dish_name": "Green Salad",
      "confidence": 0.75,
      "category": "salad"
    }
  ],
  "selected_dish": {
    "dish_id": "ai21_0001",
    "dish_name": "Grilled Chicken Caesar Salad",
    "confidence": 0.89
  },
  "calorie_estimate": {
    "value": 420.0,
    "range": {
      "min": 315.0,
      "max": 525.0
    },
    "unit": "kcal"
  },
  "volume_estimate": {
    "value": 380.0,
    "unit": "ml",
    "confidence": 0.70
  },
  "estimation_mode": "multi_angle",
  "accuracy_score": {
    "overall": 0.75,
    "factors": {
      "image_quality": 0.85,
      "lighting_conditions": 0.80,
      "angle_coverage": 0.90,
      "volume_confidence": 0.70
    }
  },
  "suggested_meal_log": {
    "dish_id": "ai21_0001",
    "dish_name": "Grilled Chicken Caesar Salad",
    "calories": 420.0,
    "serving_size": "~380ml",
    "timestamp": "2026-02-08T10:30:00Z",
    "notes": "Estimated via multi_angle mode"
  },
  "metadata": {
    "processing_time_ms": 2450,
    "estimation_mode": "multi_angle",
    "model_versions": {
      "classifier": "clarifai_food_v1.0",
      "segmentation": "clarifai_segment_v1.0",
      "volume_estimator": "mocked_v1.0"
    },
    "warnings": null
  }
}
```

## Error Handling

### Clarifai API Failures

If Clarifai API is unavailable:
1. Falls back to OpenAI Vision API (if configured)
2. Falls back to mocked predictions (last resort)
3. Client receives reduced accuracy_score

### OpenAI Fallback

If OpenAI is used for dish classification:
- Accuracy score is slightly reduced (penalized for using fallback)
- Response includes warning in metadata
- Calorie range is wider to account for uncertainty

### Network Errors

Mobile handles:
- Connection timeouts (shows retry option)
- Invalid API responses (shows error + retry)
- Image encoding failures (local validation before upload)

## Phase 1 MVP Limitations

**Mocked/Placeholder Components:**
- Volume estimation (returns fixed estimates based on mode)
- Segmentation (Clarifai doesn't provide pixel masks yet)
- Depth/AR capture (UI exists but not implemented)

**To Be Implemented in Phase 2:**
- Real depth-based volume estimation (using Open3D)
- Pixel-level segmentation (using SAM or Clarifai's segmentation models)
- LLM-based dish name normalization
- Feedback loop for accuracy improvement

## Troubleshooting

### Backend Issues

**"Clarifai client not initialized"**
- Check `CLARIFAI_API_KEY` in `.env`
- Verify API key has `Predict` permissions
- Test with: `python -c "import clarifai_grpc; print('OK')"`

**"Model does not support vision"**
- Using OpenAI fallback with incorrect model
- Update `OPENAI_MODEL=gpt-4o-mini` (or gpt-4-vision-preview)

### Mobile Issues

**"Network Error"**
- Check backend is running (`curl http://localhost:8000/health`)
- Update API URL in `mobile/src/services/api.ts`
- Check device/emulator can reach localhost (use 10.0.2.2 on Android emulator)

**"Picker not rendering"**
- Run `npm install` to ensure `@react-native-picker/picker` is installed
- For iOS: `cd ios && pod install`

## Future Enhancements (Phase 2+)

1. **Depth/AR Mode**: Use iPhone LiDAR or ARCore for accurate volume
2. **Real Segmentation**: Integrate Segment Anything Model (SAM)
3. **Multi-food Detection**: Identify multiple dishes in one image
4. **Personalization**: Learn user's typical portion sizes
5. **Feedback Loop**: Improve estimates based on user corrections
6. **Offline Mode**: Cache common dishes for offline estimation

## Support & Resources

- **Plan Document**: `Camera_Functionality_Plan.md`
- **Clarifai Docs**: https://docs.clarifai.com/
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Native Picker**: https://github.com/react-native-picker/picker

## License

See project root LICENSE file.
