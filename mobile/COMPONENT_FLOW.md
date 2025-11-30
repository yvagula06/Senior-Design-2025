# Component Integration Flow

## 🔄 Complete Label Tab Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LabelHomeScreen                          │
│  ┌───────────────────────────────────────────────────────┐ │
│  │          DishSearchInput Component                    │ │
│  │  • Dish name input                                    │ │
│  │  • Target calories (optional)                         │ │
│  │  • Quick chips: 400 | 600 | 800                       │ │
│  │  • Segmented control: Home | Restaurant | Unknown     │ │
│  │  • [Generate Label] button                            │ │
│  └───────────────────────────────────────────────────────┘ │
│                          ↓                                  │
│                   navigation.navigate()                     │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   LabelResultScreen                         │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  1. ConfidenceBar Component                          │ │
│  │     ┌──────────────────────────────────────────────┐ │ │
│  │     │ ✓ High confidence            78%            │ │ │
│  │     │ ████████████████░░░░░░░░                    │ │ │
│  │     │ Based on strong similarity...               │ │ │
│  │     └──────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  2. Quick Summary Panel                              │ │
│  │     🔥      🥩      🍞      💧                        │ │
│  │    520cal  28g    45g    24g                         │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  3. NutritionLabelCard Component                     │ │
│  │     ╔══════════════════════════════════════════════╗ │ │
│  │     ║ Nutrition Facts                              ║ │ │
│  │     ║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║ │ │
│  │     ║ 1 serving (350g)                             ║ │ │
│  │     ║                                              ║ │ │
│  │     ║ Calories                             520     ║ │ │
│  │     ║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║ │ │
│  │     ║                             % Daily Value*   ║ │ │
│  │     ║ ────────────────────────────────────────────║ │ │
│  │     ║ MACRONUTRIENTS                               ║ │ │
│  │     ║ Protein 28g                                  ║ │ │
│  │     ║ Total Carbohydrate 45g                       ║ │ │
│  │     ║   Dietary Fiber 3g                           ║ │ │
│  │     ║   Total Sugars 12g                           ║ │ │
│  │     ║     Includes Added Sugars 6g                 ║ │ │
│  │     ║ Total Fat 24g                                ║ │ │
│  │     ║   Saturated Fat 8g                           ║ │ │
│  │     ║   Trans Fat 0.5g                             ║ │ │
│  │     ║ ────────────────────────────────────────────║ │ │
│  │     ║ MICRONUTRIENTS                               ║ │ │
│  │     ║ Sodium 890mg                                 ║ │ │
│  │     ║ Cholesterol 75mg                             ║ │ │
│  │     ║ ────────────────────────────────────────────║ │ │
│  │     ║ VITAMINS & MINERALS                          ║ │ │
│  │     ║ Vitamin D 2.5mcg                             ║ │ │
│  │     ║ Calcium 180mg                                ║ │ │
│  │     ║ Iron 3.2mg                                   ║ │ │
│  │     ║ Potassium 650mg                              ║ │ │
│  │     ║ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ║ │ │
│  │     ║ * The % Daily Value tells you...             ║ │ │
│  │     ╚══════════════════════════════════════════════╝ │ │
│  │     ↕ Scrollable                                     │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  4. VariantDrawerButton (Trigger)                    │ │
│  │     ┌──────────────────────────────────────────────┐ │ │
│  │     │ ℹ️  View assumptions and variants           │ │ │
│  │     │    3 ingredient variations available    ➡   │ │ │
│  │     └──────────────────────────────────────────────┘ │ │
│  │                      ↓ (onPress)                      │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  5. Action Buttons                                   │ │
│  │     [❤️ Save to History]  [🔍 New Search]            │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│         VariantBottomSheet Component (Modal)                │
│  ╔═══════════════════════════════════════════════════════╗ │
│  ║  ─────                                                ║ │
│  ║                                                       ║ │
│  ║  ℹ️  Assumptions & Variants                          ║ │
│  ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║ │
│  ║                                                       ║ │
│  ║  👨‍🍳 Assumed Preparation Style                        ║ │
│  ║  ┌─────────────────────────────────────────────────┐ ║ │
│  ║  │ Restaurant-style preparation with moderate      │ ║ │
│  ║  │ cream and butter, served with basmati rice.     │ ║ │
│  ║  │ Standard North Indian cooking method...         │ ║ │
│  ║  └─────────────────────────────────────────────────┘ ║ │
│  ║                                                       ║ │
│  ║  🍽️ Top 3 Closest Recipes                           ║ │
│  ║  These are the most similar dishes from our database║ │
│  ║                                                       ║ │
│  ║  ┌─────────────────────────────────────────────────┐ ║ │
│  ║  │ ① Traditional Butter Chicken            📈 92% │ ║ │
│  ║  │ Classic North Indian curry with tomato-cream... │ ║ │
│  ║  │ ████████████████████████████████████░░░░        │ ║ │
│  ║  └─────────────────────────────────────────────────┘ ║ │
│  ║                                                       ║ │
│  ║  ┌─────────────────────────────────────────────────┐ ║ │
│  ║  │ ② Butter Chicken with Naan              📈 87% │ ║ │
│  ║  │ Similar preparation with bread instead of rice  │ ║ │
│  ║  │ ███████████████████████████████░░░░░░░░░        │ ║ │
│  ║  └─────────────────────────────────────────────────┘ ║ │
│  ║                                                       ║ │
│  ║  ┌─────────────────────────────────────────────────┐ ║ │
│  ║  │ ③ Homestyle Butter Chicken              📈 81% │ ║ │
│  ║  │ Lighter version with less cream and butter      │ ║ │
│  ║  │ ████████████████████████████░░░░░░░░░░░░        │ ║ │
│  ║  └─────────────────────────────────────────────────┘ ║ │
│  ║                                                       ║ │
│  ║  ⚠️ Understanding Uncertainty                        ║ │
│  ║  ┌─────────────────────────────────────────────────┐ ║ │
│  ║  │ The nutritional values shown are estimates      │ ║ │
│  ║  │ based on similar dishes in our database.        │ ║ │
│  ║  │ Actual values may vary depending on specific    │ ║ │
│  ║  │ ingredients, portion sizes, and preparation...  │ ║ │
│  ║  └─────────────────────────────────────────────────┘ ║ │
│  ║  ↕ Scrollable                                        ║ │
│  ╚═══════════════════════════════════════════════════════╝ │
│           ↓ Pan down to close / Tap backdrop              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Component Props Summary

### ConfidenceBar
```typescript
{
  confidence: number;      // 0-100
  showDetails?: boolean;   // Default: true
}
```

### NutritionLabelCard
```typescript
{
  dishName: string;
  nutrition: NutritionData;
  compact?: boolean;       // Default: false
  scrollable?: boolean;    // Default: true
}
```

### VariantBottomSheet
```typescript
{
  ref: VariantBottomSheetRef;
  assumedStyle: string;
  topRecipes: CanonicalRecipe[];
  uncertaintyExplanation: string;
}
```

---

## 🎨 Visual Design Elements

### Color Coding:
- **Confidence Bar**:
  - 🟢 Green (≥80%): High confidence
  - 🟠 Orange (60-79%): Medium confidence
  - 🔴 Red (<60%): Low confidence

- **Quick Summary**:
  - 🔥 Fire icon: Calories (Red)
  - 🥩 Steak icon: Protein (Green)
  - 🍞 Bread icon: Carbs (Orange)
  - 💧 Water icon: Fat (Blue)

- **Recipe Similarity**:
  - Rank badges: Circular with numbers (1, 2, 3)
  - Progress bars: Green fill showing similarity %
  - Success badge: Green background with chart icon

### Typography Hierarchy:
1. **Screen Title**: xxxl (28px), bold
2. **Section Headers**: lg (18px), semibold
3. **Card Titles**: xxl (24px), bold
4. **Label Text**: md (16px), medium
5. **Value Text**: xl (20px), bold
6. **Helper Text**: xs (12px), regular

### Spacing Patterns:
- **Card padding**: lg (24px)
- **Section gaps**: md (16px)
- **Icon spacing**: xs (4px) / sm (8px)
- **Button padding**: md (16px)

---

## 🔄 State Management

### Component States:
```typescript
// LabelResultScreen
const [isSaved, setIsSaved] = useState(false);
const bottomSheetRef = useRef<VariantBottomSheetRef>(null);

// ConfidenceBar (internal)
const confidenceColor = getConfidenceColor(confidence);
const confidenceLabel = getConfidenceLabel(confidence);
const confidenceIcon = getConfidenceIcon(confidence);

// VariantBottomSheet (internal)
const snapPoints = useMemo(() => ['75%'], []);
```

### User Interactions:
1. **Generate Label**: Navigate to results screen
2. **Save to History**: Toggle heart icon, persist data
3. **View Variants**: Open bottom sheet (snapToIndex(0))
4. **Close Bottom Sheet**: Pan down or tap backdrop
5. **New Search**: Navigate back to input screen

---

## 📊 Data Structure Example

```typescript
// Complete nutrition result from API
interface LabelResult {
  dishName: string;
  confidence: number;
  nutrition: NutritionData;
  topRecipes: CanonicalRecipe[];
  assumedStyle: string;
  uncertaintyExplanation: string;
  timestamp: string;
}

// Example API response
const apiResponse: LabelResult = {
  dishName: "Butter Chicken",
  confidence: 78,
  nutrition: {
    servingSize: "1 serving (350g)",
    calories: 520,
    protein: 28,
    totalCarbohydrate: 45,
    totalFat: 24,
    saturatedFat: 8,
    transFat: 0.5,
    sodium: 890,
    totalSugars: 12,
    addedSugars: 6,
    dietaryFiber: 3,
    cholesterol: 75,
    vitaminD: 2.5,
    calcium: 180,
    iron: 3.2,
    potassium: 650,
  },
  topRecipes: [
    {
      id: "1",
      name: "Traditional Butter Chicken (Restaurant Style)",
      similarity: 0.92,
      description: "Classic North Indian curry...",
    },
    // ... 2 more recipes
  ],
  assumedStyle: "Restaurant-style preparation...",
  uncertaintyExplanation: "The nutritional values shown...",
  timestamp: "2025-11-29T10:30:00Z",
};
```

---

## 🚀 Performance Optimizations

### Implemented:
- ✅ **Memoized snap points** for bottom sheet
- ✅ **Conditional rendering** for vitamins/minerals
- ✅ **ScrollView optimization** with showsVerticalScrollIndicator={false}
- ✅ **Gesture handler** wrapped at App level
- ✅ **TypeScript strict mode** for compile-time checks

### Future Enhancements:
- [ ] **React.memo** for expensive components
- [ ] **useMemo** for computed confidence values
- [ ] **Animated.View** for smooth progress bars
- [ ] **VirtualizedList** for long recipe lists
- [ ] **Image caching** for recipe thumbnails

---

## 🎯 Testing Scenarios

1. **High Confidence (>80%)**:
   - Green bar, check icon
   - "High confidence" label
   - Strong similarity description

2. **Medium Confidence (60-79%)**:
   - Orange bar, alert icon
   - "Medium confidence" label
   - Moderate similarity description

3. **Low Confidence (<60%)**:
   - Red bar, info icon
   - "Low confidence" label
   - Limited similarity description

4. **Bottom Sheet**:
   - Tap "View variants" → Sheet opens
   - Pan down → Sheet closes
   - Tap backdrop → Sheet closes
   - Scroll content → Smooth scrolling

5. **Nutrition Label**:
   - Long labels → Scrollable content
   - Compact mode → Hides vitamins
   - All dividers → Proper thickness

---

**All components are production-ready and fully integrated!** ✅
