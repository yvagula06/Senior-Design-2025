# API Integration Summary

Quick reference for all backend integration points with stubs and placeholders.

---

## 📍 Integration Status

| Feature | File | Status | TODO |
|---------|------|--------|------|
| **Label Generation** | `screens/Label/LabelHomeScreen.tsx` | ✅ Ready | Remove mock data from `api.ts` |
| **History Loading** | `screens/History/HistoryListScreen.tsx` | ⏳ Stubbed | Implement backend endpoints |
| **History Save** | `screens/Label/LabelResultScreen.tsx` | ⏳ Stubbed | Call `saveHistoryEntry` after generation |
| **History Update** | `screens/History/HistoryListScreen.tsx` | ⏳ Stubbed | Enable `updateHistoryEntry` calls |
| **History Delete** | `screens/History/HistoryListScreen.tsx` | ⏳ Stubbed | Enable `deleteHistoryEntry` calls |
| **Featured Dishes** | `screens/ExploreScreen.tsx` | ⏳ Stubbed | Implement backend dishes API |
| **Settings Persistence** | `screens/ProfileScreen.tsx` | ✅ Complete | AsyncStorage working |

---

## 🔌 Key Integration Files

### 1. API Service (`src/services/api.ts`)
**Purpose**: All backend API calls

**Functions:**
- `generateNutritionLabel(dishName, calories, prepStyle)` - Generate label
- `fetchHistoryEntries()` - Load history
- `saveHistoryEntry(entry)` - Save to history
- `updateHistoryEntry(id, updates)` - Update entry
- `deleteHistoryEntry(id)` - Delete entry
- `fetchFeaturedDishes(category, limit)` - Get featured dishes
- `searchDishes(query, limit)` - Search dishes
- `submitFeedback(feedback)` - Submit feedback
- `checkHealth()` - Health check

**Current State**: All functions stubbed with mock data and console logs

**Action Required**:
1. Remove mock data
2. Uncomment actual API calls
3. Test with running backend

---

### 2. Storage Service (`src/services/storage.ts`)
**Purpose**: AsyncStorage for local persistence

**Functions:**
- `loadSettings()` - Load user settings
- `saveSettings(settings)` - Save settings
- `cacheHistoryEntries(entries)` - Cache history offline
- `loadCachedHistory()` - Load cached history
- `cacheFeaturedDishes(dishes)` - Cache dishes
- `loadCachedDishes()` - Load cached dishes

**Current State**: ✅ Fully implemented and working

---

## 🎯 Label Tab Integration

**File**: `mobile/src/screens/Label/LabelHomeScreen.tsx`

```typescript
// ✅ API call is ready - just remove mock data
const handleGenerate = async () => {
  try {
    const response = await generateNutritionLabel(
      dishName.trim(),
      targetCalories ? parseFloat(targetCalories) : undefined,
      prepStyle
    );
    
    navigation.navigate('LabelResult', {
      dishName: response.dish_name,
      calories: response.nutrition.calories,
      style: 'standard',
    });
    
    // TODO: Save to history
    // await saveHistoryEntry({...});
    
  } catch (error) {
    Alert.alert('Error', 'Failed to generate nutrition label.');
  }
};
```

**Backend Endpoint**: `POST /api/label/generate`

**TODO**:
- [ ] Remove mock data from `api.ts` line 190-250
- [ ] Test with backend running
- [ ] Add save to history after successful generation

---

## 📜 History Tab Integration

**File**: `mobile/src/screens/History/HistoryListScreen.tsx`

### Load History
```typescript
// ⏳ Stubbed - enable API call
const loadHistory = async () => {
  const entries = await fetchHistoryEntries();  // Uncomment this
  setHistoryData(mapHistoryData(entries));
  await cacheHistoryEntries(entries);
};
```

**Backend Endpoint**: `GET /api/history`

**TODO**:
- [ ] Create backend `/api/history` router
- [ ] Implement database model
- [ ] Enable API call in `loadHistory()`

### Toggle Favorite
```typescript
// ⏳ Stubbed - enable API call
const handleToggleFavorite = async (id: string) => {
  await updateHistoryEntry(id, { is_favorite: !isFavorite });  // Uncomment
};
```

**Backend Endpoint**: `PUT /api/history/:id`

### Delete Entry
```typescript
// ⏳ Stubbed - enable API call
const handleDelete = async (id: string) => {
  await deleteHistoryEntry(id);  // Uncomment
};
```

**Backend Endpoint**: `DELETE /api/history/:id`

**TODO**:
- [ ] Implement CRUD endpoints in backend
- [ ] Enable API calls
- [ ] Test optimistic updates

---

## 🔍 Explore Tab Integration

**File**: `mobile/src/screens/ExploreScreen.tsx`

```typescript
// ⏳ Stubbed - enable API call
const loadFeaturedDishes = async () => {
  const allDishes = await fetchFeaturedDishes();  // Uncomment
  const { restaurant, home } = categorizeDishes(allDishes);
  setRestaurantDishes(mapDishData(restaurant));
  setHomeCookedMeals(mapDishData(home));
  await cacheFeaturedDishes(allDishes);
};
```

**Backend Endpoint**: `GET /api/dishes/featured?category=restaurant&limit=10`

**TODO**:
- [ ] Create dishes router in backend
- [ ] Seed database with dishes from `data/seed_dishes.csv`
- [ ] Enable API call
- [ ] Add image URLs

---

## ⚙️ Profile Tab Integration

**File**: `mobile/src/screens/ProfileScreen.tsx`

```typescript
// ✅ AsyncStorage already working
const loadUserSettings = async () => {
  const settings = await loadSettings();
  setUseMetric(settings.useMetric);
  setDefaultStyle(settings.defaultPrepStyle);
};

const handleUnitToggle = async (value: boolean) => {
  setUseMetric(value);
  await saveSettings({ useMetric: value });
};
```

**Storage**: AsyncStorage (local)

**TODO**:
- [ ] Apply units throughout app (nutrition display)
- [ ] Use defaultPrepStyle in Label screen
- [ ] Add backend sync for multi-device (future)

---

## 🔧 Quick Integration Steps

### Step 1: Start Backend
```bash
cd Senior-Design-2025
make run
# or: uvicorn app.main:app --reload
```

### Step 2: Update API URL
```typescript
// mobile/src/services/api.ts (line 16)
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_COMPUTER_IP:8000'  // Use actual IP for testing on device
  : 'https://api.nutrilabelai.com';
```

### Step 3: Test Health Check
```bash
# In mobile app console, you should see:
🚀 [API] checkHealth called
✅ Backend connected: { status: 'ok', version: '1.0.0' }
```

### Step 4: Enable Label Generation
```typescript
// mobile/src/services/api.ts (line 190)
// Remove this block:
/*
await new Promise(resolve => setTimeout(resolve, 1500));
return {
  dish_name: dishName,
  confidence_score: 78,
  // ... mock data
};
*/

// Uncomment this:
return apiRequest<GenerateLabelResponse>(ENDPOINTS.GENERATE_LABEL, {
  method: 'POST',
  body: JSON.stringify({
    dish_name: dishName,
    target_calories: targetCalories,
    prep_style: prepStyle,
    image_data: imageData,
  }),
});
```

### Step 5: Test Label Generation
1. Open mobile app
2. Go to Label tab
3. Enter "Chicken tikka masala"
4. Target calories: 650
5. Prep style: Restaurant
6. Tap "Generate Label"
7. Check console for:
   ```
   🚀 [API] generateNutritionLabel called with: { dishName: 'Chicken tikka masala', ... }
   ✅ [Label] Generated label: { dish_name: 'Chicken tikka masala', confidence_score: 78, ... }
   ```

### Step 6: Implement History Backend
```python
# app/api/history_router.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import HistoryEntry
from app.schemas.history import HistoryEntryCreate, HistoryEntryResponse

router = APIRouter(prefix="/api/history", tags=["history"])

@router.get("/", response_model=List[HistoryEntryResponse])
def get_history(db: Session = Depends(get_db)):
    entries = db.query(HistoryEntry).order_by(HistoryEntry.date.desc()).all()
    return entries

@router.post("/", response_model=HistoryEntryResponse)
def create_history_entry(entry: HistoryEntryCreate, db: Session = Depends(get_db)):
    db_entry = HistoryEntry(**entry.dict())
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.put("/{entry_id}", response_model=HistoryEntryResponse)
def update_history_entry(entry_id: str, updates: dict, db: Session = Depends(get_db)):
    entry = db.query(HistoryEntry).filter(HistoryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for key, value in updates.items():
        setattr(entry, key, value)
    db.commit()
    db.refresh(entry)
    return entry

@router.delete("/{entry_id}")
def delete_history_entry(entry_id: str, db: Session = Depends(get_db)):
    entry = db.query(HistoryEntry).filter(HistoryEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"message": "Deleted successfully"}
```

---

## 📋 Complete TODO Checklist

### Backend Tasks
- [ ] Ensure `/health` endpoint works
- [ ] Test `/api/label/generate` with various inputs
- [ ] Create `HistoryEntry` database model
- [ ] Implement history CRUD endpoints
- [ ] Create `DishCatalog` database model
- [ ] Seed dishes from CSV
- [ ] Implement featured dishes endpoint
- [ ] Implement search endpoint
- [ ] Configure CORS for mobile client
- [ ] Add error handling and validation

### Mobile Tasks
- [ ] Remove mock data from `api.ts`
- [ ] Update API_BASE_URL with deployed URL (or local IP for testing)
- [ ] Test label generation end-to-end
- [ ] Enable history API calls
- [ ] Test history CRUD operations
- [ ] Enable featured dishes API call
- [ ] Test offline caching (airplane mode)
- [ ] Apply units setting throughout app
- [ ] Use defaultPrepStyle in Label screen
- [ ] Add image upload functionality (future)

---

## 🐛 Debugging Tips

### Check API Connection
```typescript
// Add to App.tsx temporarily
useEffect(() => {
  checkHealth()
    .then(health => console.log('✅ Backend connected:', health))
    .catch(err => console.error('❌ Backend unreachable:', err));
}, []);
```

### Check Request/Response
```typescript
// In api.ts apiRequest function, add logging:
console.log('📤 Request:', method, url, body);
console.log('📥 Response:', response.status, await response.json());
```

### Check AsyncStorage
```typescript
// In Profile screen or any screen
import { getStorageInfo } from '../services/storage';

const debugStorage = async () => {
  const info = await getStorageInfo();
  console.log('💾 Storage info:', info);
};
```

---

## 🎉 Integration Complete When...

- [ ] Label generation works with real backend
- [ ] History loads from database
- [ ] History CRUD operations work
- [ ] Featured dishes load from database
- [ ] Offline caching works
- [ ] Settings persist across app restarts
- [ ] Error handling works gracefully
- [ ] All console logs show successful API calls

**See `BACKEND_INTEGRATION_GUIDE.md` for detailed documentation!**
