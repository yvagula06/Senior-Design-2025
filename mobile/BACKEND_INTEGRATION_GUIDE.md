# Backend API Integration Guide

Comprehensive guide for connecting the NutriLabelAI mobile app to the FastAPI backend.

---

## 📋 Overview

This document outlines all backend integration points, API endpoints, and implementation steps for connecting the React Native mobile app to the Python FastAPI backend.

**Backend Repository Structure:**
```
app/
├── api/
│   ├── label_router.py      # POST /api/label/generate
│   ├── dishes_router.py     # GET /api/dishes/*
│   ├── feedback_router.py   # POST /api/feedback
│   └── history_router.py    # CRUD /api/history/*
├── services/
│   ├── retrieval_service.py # Vector similarity search
│   ├── mixture_service.py   # Recipe mixing logic
│   ├── scaling_service.py   # Calorie scaling
│   ├── rebalance_service.py # Nutrition rebalancing
│   └── confidence_service.py # Confidence scoring
├── db/
│   ├── models.py            # SQLAlchemy models
│   └── session.py           # Database session
└── schemas/
    └── label.py             # Pydantic schemas
```

---

## 🔌 API Endpoints

### Base URL

- **Development**: `http://localhost:8000`
- **Production**: Update `mobile/src/services/api.ts` with deployed URL

### Endpoints Overview

| Endpoint | Method | Purpose | Status |
|----------|--------|---------|--------|
| `/health` | GET | Health check | ✅ Implemented |
| `/api/label/generate` | POST | Generate nutrition label | ⏳ Ready for integration |
| `/api/history` | GET | List history entries | 🔜 TODO |
| `/api/history` | POST | Create history entry | 🔜 TODO |
| `/api/history/:id` | PUT | Update history entry | 🔜 TODO |
| `/api/history/:id` | DELETE | Delete history entry | 🔜 TODO |
| `/api/dishes/featured` | GET | Featured dishes catalog | 🔜 TODO |
| `/api/dishes/search` | GET | Search dishes | 🔜 TODO |
| `/api/feedback` | POST | Submit user feedback | 🔜 TODO |

---

## 🎯 Integration Points

### 1. Label Generation (Label Tab)

**File**: `mobile/src/screens/Label/LabelHomeScreen.tsx`

**Current Implementation:**
```typescript
const handleGenerate = async () => {
  if (!dishName.trim()) return;
  
  setIsGenerating(true);
  
  try {
    // ✅ API call is ready
    const response = await generateNutritionLabel(
      dishName.trim(),
      targetCalories ? parseFloat(targetCalories) : undefined,
      prepStyle === 'unknown' ? 'unknown' : prepStyle
    );
    
    // Navigate to result screen
    navigation.navigate('LabelResult', {
      dishName: response.dish_name,
      calories: response.nutrition.calories,
      style: 'standard',
    });
    
  } catch (error) {
    console.error('❌ [Label] Failed to generate label:', error);
    Alert.alert('Error', 'Failed to generate nutrition label.');
  } finally {
    setIsGenerating(false);
  }
};
```

**Backend Endpoint:** `POST /api/label/generate`

**Request Schema:**
```python
class LabelRequest(BaseModel):
    dish_name: str
    target_calories: Optional[float] = None
    prep_style: Literal['home', 'restaurant', 'unknown'] = 'unknown'
    image_data: Optional[str] = None  # Base64 encoded (future)
```

**Response Schema:**
```python
class LabelResponse(BaseModel):
    dish_name: str
    confidence_score: float  # 0-100
    nutrition: NutritionData
    top_recipes: List[CanonicalRecipe]
    assumptions: List[str]
    uncertainty_factors: List[str]
    metadata: Optional[dict] = None
```

**TODO Steps:**
1. ✅ API service function created (`generateNutritionLabel`)
2. ✅ Type definitions match backend schema
3. ⏳ Remove mock data from `api.ts`
4. ⏳ Test with local backend (ensure CORS configured)
5. ⏳ Handle error cases (network, validation, server errors)
6. ⏳ Add retry logic for failed requests
7. ⏳ Implement request caching for identical queries

---

### 2. History Management (History Tab)

**File**: `mobile/src/screens/History/HistoryListScreen.tsx`

**Integration Functions:**

#### a) Fetch History
```typescript
/**
 * Load history entries from backend or cache
 */
const loadHistory = async () => {
  try {
    setIsLoading(true);
    
    // Load from cache first (offline support)
    const cached = await loadCachedHistory();
    if (cached.length > 0) {
      setHistoryData(mapHistoryData(cached));
    }
    
    // Fetch from API
    const entries = await fetchHistoryEntries();
    setHistoryData(mapHistoryData(entries));
    await cacheHistoryEntries(entries);
    
  } catch (error) {
    console.error('❌ [History] Failed to load history:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Backend Endpoint:** `GET /api/history`

**Response:**
```python
[
    {
        "id": "hist_123",
        "dish_name": "Butter Chicken",
        "date": "2025-11-29T10:30:00Z",
        "calories": 520,
        "confidence": 78,
        "prep_style": "restaurant",
        "is_favorite": true,
        "nutrition_data": {...},
        "created_at": "2025-11-29T10:30:00Z",
        "updated_at": "2025-11-29T10:30:00Z"
    }
]
```

#### b) Save History Entry
```typescript
/**
 * Save a new history entry after label generation
 */
const saveToHistory = async (labelResponse: GenerateLabelResponse) => {
  try {
    await saveHistoryEntry({
      dish_name: labelResponse.dish_name,
      date: new Date().toISOString(),
      calories: labelResponse.nutrition.calories,
      confidence: labelResponse.confidence_score,
      prep_style: prepStyle,
      is_favorite: false,
      nutrition_data: labelResponse.nutrition,
    });
    console.log('✅ [History] Entry saved');
  } catch (error) {
    console.error('❌ [History] Failed to save:', error);
  }
};
```

**Backend Endpoint:** `POST /api/history`

**TODO Steps:**
1. 🔜 Create history router in backend
2. 🔜 Implement SQLAlchemy model for HistoryEntry
3. 🔜 Add database migration
4. 🔜 Implement API endpoints (GET, POST, PUT, DELETE)
5. 🔜 Add user authentication (if needed)
6. ⏳ Remove mock data from `HistoryListScreen`
7. ⏳ Test CRUD operations
8. ⏳ Implement pull-to-refresh
9. ⏳ Add pagination for large history lists

#### c) Toggle Favorite
```typescript
/**
 * Toggle favorite status
 */
const handleToggleFavorite = async (id: string) => {
  try {
    // Optimistic update
    setHistoryData(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
    
    // API call
    const item = historyData.find(h => h.id === id);
    if (item) {
      await updateHistoryEntry(id, { is_favorite: !item.isFavorite });
    }
  } catch (error) {
    // Revert on error
    console.error('❌ [History] Failed to toggle favorite:', error);
    setHistoryData(prev =>
      prev.map(item =>
        item.id === id ? { ...item, isFavorite: !item.isFavorite } : item
      )
    );
  }
};
```

**Backend Endpoint:** `PUT /api/history/:id`

#### d) Delete Entry
```typescript
/**
 * Delete a history entry
 */
const handleDelete = async (id: string) => {
  Alert.alert('Delete Entry', 'Are you sure?', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: async () => {
        try {
          // Optimistic update
          setHistoryData(prev => prev.filter(item => item.id !== id));
          
          // API call
          await deleteHistoryEntry(id);
          await cacheHistoryEntries(historyData.filter(item => item.id !== id));
        } catch (error) {
          console.error('❌ [History] Failed to delete:', error);
          await loadHistory(); // Reload to restore
        }
      },
    },
  ]);
};
```

**Backend Endpoint:** `DELETE /api/history/:id`

---

### 3. Featured Dishes (Explore Tab)

**File**: `mobile/src/screens/ExploreScreen.tsx`

**Integration:**
```typescript
/**
 * Load featured dishes from backend
 */
const loadFeaturedDishes = async () => {
  try {
    setIsLoading(true);
    
    // Load from cache first
    const cached = await loadCachedDishes();
    if (cached.length > 0) {
      const { restaurant, home } = categorizeDishes(cached);
      setRestaurantDishes(mapDishData(restaurant));
      setHomeCookedMeals(mapDishData(home));
    }
    
    // Fetch from API
    const allDishes = await fetchFeaturedDishes();
    const { restaurant, home } = categorizeDishes(allDishes);
    setRestaurantDishes(mapDishData(restaurant));
    setHomeCookedMeals(mapDishData(home));
    await cacheFeaturedDishes(allDishes);
    
  } catch (error) {
    console.error('❌ [Explore] Failed to load dishes:', error);
  } finally {
    setIsLoading(false);
  }
};
```

**Backend Endpoint:** `GET /api/dishes/featured`

**Response:**
```python
[
    {
        "id": "dish_123",
        "name": "Chicken Tikka Masala",
        "description": "Creamy tomato curry with chicken",
        "category": "restaurant",
        "calories": 580,
        "prep_style": "restaurant",
        "image_url": "https://...",
        "estimated_macros": {
            "protein": 24,
            "carbs": 52,
            "fat": 28
        },
        "popularity_score": 0.95,
        "tags": ["indian", "chicken", "curry"]
    }
]
```

**TODO Steps:**
1. 🔜 Create dishes router in backend
2. 🔜 Seed database with featured dishes (use `data/seed_dishes.csv`)
3. 🔜 Implement popularity scoring algorithm
4. 🔜 Add image URLs (or use placeholders)
5. 🔜 Implement category filtering
6. ⏳ Remove mock data from `ExploreScreen`
7. ⏳ Add search functionality
8. ⏳ Implement "See All" navigation

---

### 4. Settings Persistence (Profile Tab)

**File**: `mobile/src/screens/ProfileScreen.tsx`

**Current Implementation:**
```typescript
// ✅ Already integrated with AsyncStorage
const loadUserSettings = async () => {
  const settings = await loadSettings();
  setUseMetric(settings.useMetric);
  setDefaultStyle(settings.defaultPrepStyle);
};

const handleUnitToggle = async (value: boolean) => {
  setUseMetric(value);
  await saveSettings({ useMetric: value });
};

const handleStyleSelect = async (style: DefaultStyle) => {
  setDefaultStyle(style);
  await saveSettings({ defaultPrepStyle: style });
};
```

**Storage Service:** `mobile/src/services/storage.ts`

**Features:**
- ✅ AsyncStorage integration
- ✅ Default settings
- ✅ Error handling
- ✅ Cache management for history/dishes
- ⏳ Multi-device sync (future: backend API)

**TODO Steps:**
1. ⏳ Apply units throughout app (nutrition display)
2. ⏳ Use defaultPrepStyle in Label screen
3. 🔜 Add backend user preferences API (for multi-device sync)
4. 🔜 Implement settings sync on login

---

## 🔧 Implementation Checklist

### Phase 1: Core Label Generation (Priority 1)
- [x] Create API service file (`api.ts`)
- [x] Define TypeScript interfaces matching backend schemas
- [x] Implement `generateNutritionLabel` function
- [ ] Remove mock data from API service
- [ ] Configure CORS in backend for mobile client
- [ ] Test label generation flow end-to-end
- [ ] Handle error cases gracefully
- [ ] Add loading states and retry logic

### Phase 2: History Management (Priority 2)
- [ ] Create backend history router
- [ ] Implement database models (SQLAlchemy)
- [ ] Create history API endpoints (CRUD)
- [ ] Integrate history loading in mobile app
- [ ] Implement optimistic updates
- [ ] Add pull-to-refresh
- [ ] Test offline caching
- [ ] Implement pagination

### Phase 3: Explore Tab Integration (Priority 3)
- [ ] Create dishes router in backend
- [ ] Seed database with featured dishes
- [ ] Implement featured dishes endpoint
- [ ] Integrate featured dishes in mobile app
- [ ] Add search functionality
- [ ] Implement category filtering
- [ ] Add dish images (CDN or placeholders)

### Phase 4: Settings & Preferences (Priority 4)
- [x] Implement AsyncStorage service
- [x] Integrate settings in Profile screen
- [ ] Apply units throughout app
- [ ] Use default prep style in Label screen
- [ ] Create backend user preferences API
- [ ] Implement multi-device sync

### Phase 5: Advanced Features (Future)
- [ ] Image upload for dish recognition
- [ ] User authentication (OAuth, JWT)
- [ ] Social features (share labels)
- [ ] Meal planning
- [ ] Nutrition goals tracking
- [ ] Push notifications
- [ ] Offline mode improvements

---

## 🐛 Error Handling

### Network Errors
```typescript
try {
  const response = await generateNutritionLabel(dishName);
} catch (error) {
  if (error.message.includes('Network request failed')) {
    Alert.alert(
      'No Internet Connection',
      'Please check your connection and try again.'
    );
  } else {
    Alert.alert('Error', error.message);
  }
}
```

### Validation Errors (400)
```typescript
// Backend returns: { detail: "Dish name is required" }
catch (error) {
  // Parse error message from backend
  Alert.alert('Invalid Input', error.message);
}
```

### Server Errors (500)
```typescript
catch (error) {
  console.error('Server error:', error);
  Alert.alert(
    'Server Error',
    'Something went wrong on our end. Please try again later.'
  );
}
```

---

## 🧪 Testing

### Manual Testing Steps

1. **Start Backend:**
   ```bash
   cd Senior-Design-2025
   make run  # or: uvicorn app.main:app --reload
   ```

2. **Update API URL:**
   ```typescript
   // mobile/src/services/api.ts
   const API_BASE_URL = 'http://YOUR_IP:8000';  // Use actual IP for device testing
   ```

3. **Test Health Endpoint:**
   ```typescript
   import { checkHealth } from './services/api';
   
   // In App.tsx or testing component
   useEffect(() => {
     checkHealth()
       .then(health => console.log('✅ Backend connected:', health))
       .catch(err => console.error('❌ Backend unreachable:', err));
   }, []);
   ```

4. **Test Label Generation:**
   - Enter dish name: "Chicken tikka masala"
   - Optional calories: 650
   - Prep style: Restaurant
   - Tap "Generate Label"
   - Verify response matches expected schema

5. **Test History:**
   - Generate a label
   - Check History tab
   - Toggle favorite
   - Delete entry
   - Pull to refresh

6. **Test Explore:**
   - View featured dishes
   - Tap a dish card
   - Verify prefill in Label tab
   - Generate label

---

## 📊 Database Schema

### HistoryEntry Table
```sql
CREATE TABLE history_entries (
    id VARCHAR PRIMARY KEY,
    dish_name VARCHAR NOT NULL,
    date TIMESTAMP NOT NULL,
    calories FLOAT NOT NULL,
    confidence FLOAT NOT NULL,
    prep_style VARCHAR(20) NOT NULL,
    is_favorite BOOLEAN DEFAULT FALSE,
    nutrition_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_history_date ON history_entries(date DESC);
CREATE INDEX idx_history_favorite ON history_entries(is_favorite);
```

### DishCatalog Table
```sql
CREATE TABLE dish_catalog (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    category VARCHAR(20) NOT NULL,
    calories FLOAT NOT NULL,
    prep_style VARCHAR(20) NOT NULL,
    image_url VARCHAR,
    estimated_macros JSONB,
    popularity_score FLOAT DEFAULT 0,
    tags VARCHAR[] DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_catalog_category ON dish_catalog(category);
CREATE INDEX idx_catalog_popularity ON dish_catalog(popularity_score DESC);
```

---

## 🔐 Security Considerations

1. **CORS Configuration:**
   ```python
   # app/main.py
   from fastapi.middleware.cors import CORSMiddleware
   
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["*"],  # Update for production
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )
   ```

2. **API Rate Limiting:**
   - Implement rate limiting to prevent abuse
   - Use slowapi or similar library

3. **Input Validation:**
   - Pydantic models handle validation
   - Sanitize dish names to prevent injection

4. **Authentication (Future):**
   - JWT tokens for user sessions
   - OAuth for social login
   - Secure storage of tokens (Keychain/KeyStore)

---

## 📝 API Documentation

Generate API docs using FastAPI's built-in Swagger UI:

```
http://localhost:8000/docs
```

Interactive testing available at:
```
http://localhost:8000/redoc
```

---

## 🚀 Deployment

### Backend Deployment
- Deploy to cloud provider (AWS, GCP, Heroku, etc.)
- Update `API_BASE_URL` in mobile app
- Configure environment variables
- Set up database (PostgreSQL + pgvector)

### Mobile App Deployment
- Update API URL for production
- Build release version
- Test on physical devices
- Submit to App Store / Play Store

---

## 📚 Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **React Native Networking**: https://reactnative.dev/docs/network
- **AsyncStorage**: https://react-native-async-storage.github.io/async-storage/
- **TypeScript Type Safety**: https://www.typescriptlang.org/docs/

---

## ✅ Quick Start

1. Start backend:
   ```bash
   cd Senior-Design-2025
   make run
   ```

2. Update mobile API URL:
   ```typescript
   // mobile/src/services/api.ts (line 16)
   const API_BASE_URL = 'http://YOUR_IP:8000';
   ```

3. Start mobile app:
   ```bash
   cd mobile
   npm start
   ```

4. Test health check:
   - Open app
   - Check console for "✅ Backend connected"

5. Test label generation:
   - Go to Label tab
   - Enter "Chicken tikka masala"
   - Tap "Generate Label"
   - Verify results

**All integration points are documented with clear TODO markers throughout the codebase!** 🎉
