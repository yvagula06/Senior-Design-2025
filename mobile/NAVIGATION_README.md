# NutriLabelAI Mobile App - Navigation Structure

## 📁 File Structure

```
mobile/src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── TextInput.tsx
│   ├── LoadingSpinner.tsx
│   └── index.ts
│
├── navigation/          # Navigation setup
│   ├── types.ts                    # Navigation type definitions
│   ├── RootTabNavigator.tsx        # Main bottom tab navigator
│   ├── LabelStackNavigator.tsx     # Label stack with screens
│   ├── HistoryStackNavigator.tsx   # History stack with screens
│   └── BottomTabNavigator.tsx      # (Legacy - can be removed)
│
├── screens/            # All app screens
│   ├── Label/
│   │   ├── LabelHomeScreen.tsx     # Main label input screen
│   │   └── LabelResultScreen.tsx   # Nutrition results display
│   │
│   ├── History/
│   │   ├── HistoryListScreen.tsx   # Saved dishes list
│   │   └── HistoryDetailScreen.tsx # Dish detail view
│   │
│   ├── ExploreScreen.tsx           # Curated dishes & presets
│   ├── ProfileScreen.tsx           # User settings & preferences
│   └── index.ts
│
├── theme/              # Design system
│   ├── colors.ts       # Color palette & theme
│   ├── constants.ts    # Spacing, typography, etc.
│   └── index.ts
│
├── services/           # API and business logic
│   └── api.ts
│
├── types/              # TypeScript type definitions
│   └── nutrition.ts
│
└── context/            # React Context providers
    └── FoodContext.tsx
```

## 🎨 Navigation Architecture

### Bottom Tab Navigator (4 tabs)
- **Label** - Nutrition label generator (Stack Navigator)
- **History** - Saved dishes history (Stack Navigator)
- **Explore** - Curated dishes and presets (Single Screen)
- **Profile** - Settings and preferences (Single Screen)

### Label Stack
1. **LabelHome** - Input screen for dish name, calories, style toggle
2. **LabelResult** - Displays nutrition facts (standard or detailed view)

### History Stack
1. **HistoryList** - List of saved dishes with search & filters
2. **HistoryDetail** - Detailed view of a saved dish

## 🧩 Reusable Components

### Button
Multi-variant button component with loading state
```tsx
<Button 
  title="Analyze" 
  onPress={handlePress} 
  variant="primary"  // primary | secondary | outline | danger
  loading={isLoading}
/>
```

### Card / NutritionCard
Card containers for content display
```tsx
<Card onPress={handlePress}>
  {/* Content */}
</Card>

<NutritionCard 
  dishName="Chipotle Bowl"
  calories={650}
  protein={32}
  carbs={68}
  fats={24}
/>
```

### TextInput
Labeled input with icons and error states
```tsx
<TextInput 
  label="Dish Name"
  icon="food"
  value={value}
  onChangeText={setValue}
  error={errorMessage}
/>
```

### LoadingSpinner
Full-screen loading indicator
```tsx
<LoadingSpinner size="large" />
```

## 🎨 Theme System

### Colors
```tsx
import { AppColors } from '@/theme';

AppColors.primary      // #66BB6A (green)
AppColors.accent       // #4CAF50 (material green)
AppColors.accentLight  // #E8F5E9 (light green tint)
AppColors.background   // #F0F4F8 (soft blue-gray)
AppColors.white        // #FFFFFF
AppColors.error        // #EF5350
// ... and more
```

### Spacing
```tsx
import { Spacing } from '@/theme';

Spacing.xs   // 4
Spacing.sm   // 8
Spacing.md   // 16
Spacing.lg   // 24
Spacing.xl   // 32
Spacing.xxl  // 48
```

### Typography
```tsx
import { Typography } from '@/theme';

Typography.fontSize.md    // 16
Typography.fontWeight.bold // '700'
Typography.lineHeight.normal // 1.5
```

### Shadows
```tsx
import { Shadows } from '@/theme';

style={[styles.card, Shadows.md]}
```

## 📱 Screen Features

### LabelHomeScreen
- Dish name input
- Optional calories input
- Standard/Detailed view toggle
- "Analyze Nutrition" button
- Info tip section

### LabelResultScreen
- Displays nutrition facts
- Two view modes: Standard & Detailed
- "Save to History" button
- "New Search" button

### HistoryListScreen
- Search bar for filtering dishes
- Filter buttons: All, Standard, Detailed
- List of saved dishes with cards
- Each card shows: name, calories, date, badge

### HistoryDetailScreen
- Full dish information
- Complete nutrition facts with icons
- Share button
- Delete button

### ExploreScreen
- Search bar
- Category chips (horizontal scroll)
- Preset dishes cards with:
  - Icon
  - Name
  - Category
  - Calories
- Tap to populate label screen

### ProfileScreen
- User avatar and info
- Preferences section:
  - Units toggle (Metric/Imperial)
  - Default label style
  - Notifications
- App information:
  - About
  - Model information
  - Privacy policy
  - Help & support
- Version information

## 🔧 TypeScript Types

### Navigation Types
All navigation types are defined in `src/navigation/types.ts`:
- `RootTabParamList` - Bottom tab params
- `LabelStackParamList` - Label stack params
- `HistoryStackParamList` - History stack params

### Usage in Screens
```tsx
import { useNavigation } from '@react-navigation/native';
import type { LabelStackNavigationProp } from '@/navigation/types';

const navigation = useNavigation<LabelStackNavigationProp>();
navigation.navigate('LabelResult', { dishName: 'Pasta', style: 'detailed' });
```

## 🚀 Getting Started

1. **Install dependencies**
   ```bash
   cd mobile
   npm install
   ```

2. **Start development server**
   ```bash
   npm start
   ```

3. **Run on device/simulator**
   - Press `a` for Android
   - Press `i` for iOS
   - Press `w` for Web
   - Scan QR code with Expo Go app

## 📝 Next Steps (TODOs)

1. **API Integration**
   - Connect label screens to backend ML model
   - Implement actual nutrition analysis

2. **Data Persistence**
   - Add AsyncStorage or SQLite for history
   - Implement save/delete functionality

3. **State Management**
   - Add context or Redux for global state
   - Manage user preferences

4. **Additional Features**
   - Image upload for dishes
   - Barcode scanning
   - Meal planning
   - Daily tracking

5. **Testing**
   - Add unit tests for components
   - Add integration tests for navigation
   - E2E tests with Detox

## 🎯 Design Principles

- **Functional Components** - All components use React hooks
- **TypeScript** - Full type safety throughout
- **Clean Architecture** - Clear separation of concerns
- **Reusability** - Shared components for consistency
- **Scalability** - Easy to add new features/screens

## 📦 Key Dependencies

- `@react-navigation/native` - Navigation framework
- `@react-navigation/bottom-tabs` - Bottom tab navigation
- `@react-navigation/native-stack` - Stack navigation
- `react-native-paper` - Material Design components
- `@tanstack/react-query` - Data fetching/caching
- `expo` - React Native framework

---

**Built for NutriLabelAI - Senior Design 2025**
