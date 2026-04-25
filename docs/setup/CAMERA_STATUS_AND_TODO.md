# Camera Functionality - Current Status & TODO

**Date:** February 8, 2026  
**Status:** 🟡 Partially Implemented (UI Complete, Core Features Missing)

---

## 📊 Current State

### ✅ What's Working
- **UI/UX Complete**: Camera capture screens, AR scanning overlays, result displays
- **Basic Image Capture**: Using `expo-image-picker` for photos
- **API Integration**: Mobile app successfully calls backend vision API
- **Response Handling**: Properly displays estimation results
- **Error Handling**: Fixed TypeScript type mismatches, handles API errors gracefully

### ❌ What's NOT Working

#### 1. **Real AR/Depth Capture**
- **Current**: Simulated AR scanning (3-second animation)
- **Reality**: No actual ARKit (iOS) or ARCore (Android) integration
- **Data Sent**: `hasDepthData: false` always
- **Issue**: Uses `expo-image-picker` which doesn't support depth data

**To Fix:**
```typescript
// Need to integrate:
// iOS: expo-camera + ARKit depth (LiDAR)
// Android: expo-camera + ARCore depth API
```

#### 2. **Dish Classification**
- **Current**: Returns hardcoded fallback predictions
  - "Grilled Chicken Breast" (70% confidence)
  - "Caesar Salad" (60% confidence)
  - "Spaghetti Carbonara" (50% confidence)
- **APIs Available**: Clarifai (primary), OpenAI Vision (fallback)
- **Issue**: API keys likely not configured or APIs not working

**To Fix:**
```bash
# Add to .env or docker-compose.yml:
CLARIFAI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
```

#### 3. **Database Population**
- **Current**: Dishes with IDs "1", "2", "3" don't exist in database
- **Warning**: `"Nutrition mapping failed: Dish with id=1 not found or inactive"`
- **Result**: Using fallback calorie estimate (400 kcal)

**To Fix:**
```bash
# Start backend
docker-compose up -d --build

# Run migrations
docker-compose exec api alembic upgrade head

# Import dishes (~516 dishes, 2-3 minutes)
docker exec -it nutrition_api python /app/scripts/ingest_comprehensive.py

# Verify
docker-compose exec api python -c "from app.db.session import get_db; from app.db.models import Dish; db = next(get_db()); print(f'Total dishes: {db.query(Dish).count()}')"
```

---

## 🎯 Priority Action Items

### **Immediate Fixes (To Get It Working)**

#### 1. **Populate Database** (5 minutes)
```bash
cd Senior-Design-2025
docker-compose up -d --build
docker-compose exec api alembic upgrade head
docker exec -it nutrition_api python /app/scripts/ingest_comprehensive.py
```
✅ **Expected**: 516 dishes with embeddings, calorie estimates will match real dishes

#### 2. **Configure Classification APIs** (10 minutes)
Create or update `.env` file:
```env
# Option 1: Clarifai (preferred per plan)
CLARIFAI_API_KEY=your_clarifai_key
CLARIFAI_USER_ID=clarifai
CLARIFAI_APP_ID=main
CLARIFAI_MODEL_ID=food-item-recognition

# Option 2: OpenAI (fallback)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
```

Restart backend:
```bash
docker-compose restart api
```

✅ **Expected**: Real dish classification instead of mocks

### **Phase 2 Features (Requires Native Development)**

#### 3. **Implement Real AR/Depth Capture** (1-2 weeks)
**Options:**
1. **Upgrade to `expo-camera`** with custom native modules
2. **Use `react-native-vision-camera`** (better depth support)
3. **Create custom native module** for ARKit/ARCore

**Implementation Plan:**
- iOS: ARKit LiDAR depth capture (iPhone 12 Pro+, iPad Pro)
- Android: ARCore Depth API
- Capture depth map as base64
- Extract camera intrinsics
- Include in API request payload

**See:** [CAMERA_SETUP_GUIDE.md](CAMERA_SETUP_GUIDE.md) for detailed native implementation

---

## 🧪 Testing Current State

### Test 1: Is Backend Running?
```bash
curl http://localhost:8000/health
# Expected: {"status":"healthy"}
```

### Test 2: Are Dishes Loaded?
```bash
docker-compose exec api python -c "
from app.db.session import get_db
from app.db.models import Dish
db = next(get_db())
count = db.query(Dish).filter(Dish.is_active == True).count()
print(f'Active dishes: {count}')
"
# Expected: Active dishes: 516
```

### Test 3: Which Classification API is Active?
```bash
docker-compose exec api python -c "
import os
clarifai = os.getenv('CLARIFAI_API_KEY')
openai = os.getenv('OPENAI_API_KEY')
print(f'Clarifai: {\"✅\" if clarifai else \"❌\"}')
print(f'OpenAI: {\"✅\" if openai else \"❌\"}')
"
```

### Test 4: Test Classification Directly
```bash
# Take a photo and test
# Check logs for:
# - "✅ Clarifai predictions" (using Clarifai)
# - "⚠️ Using OpenAI Vision API" (fallback)
# - "⚠️ All vision APIs failed, using fallback" (mocks)
```

---

## 📝 Summary

**Your camera UI is complete**, but the underlying ML/AR features use fallbacks:

| Feature | Status | Fix Time | Priority |
|---------|--------|----------|----------|
| Camera UI | ✅ Complete | - | - |
| Basic Photo Capture | ✅ Working | - | - |
| Database Dishes | ❌ Empty | 5 min | 🔴 **HIGH** |
| Real Classification | ❌ Mocked | 10 min | 🔴 **HIGH** |
| AR/Depth Capture | ❌ Simulated | 1-2 weeks | 🟡 Medium |

**Next Steps:**
1. ✅ Fix database (5 min) → Get real calorie estimates
2. ✅ Configure API keys (10 min) → Get real dish classification  
3. 🔄 Plan AR/Depth implementation → True volume estimation

Once steps 1-2 are done, your app will provide **real dish classification and nutrition data** even without depth sensors. The depth/AR is an enhancement for more accurate portion sizes.
