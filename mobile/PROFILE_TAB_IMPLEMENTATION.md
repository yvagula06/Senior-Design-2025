# Profile Tab - Complete Implementation

Production-ready React Native + TypeScript implementation of the Profile tab with settings management, app information, and modal selection UI.

---

## 📦 Components Created

### 1. **SettingsItem** (`src/components/Profile/SettingsItem.tsx`)

Flexible settings row component supporting toggle switches, selectable options, and info links.

#### Features:
- ✅ **Three Types**:
  - `toggle` - Switch component for boolean settings
  - `select` - Navigable option with current value display
  - `info` - Info link with chevron
- ✅ **Icon Container** - Circular background with category icon
- ✅ **Dynamic Right Content** - Switch, value + chevron, or chevron only
- ✅ **Touch Feedback** - Active opacity for selectable items
- ✅ **Type-Safe Icons** - Properly typed MaterialCommunityIcons

#### Props:
```typescript
interface SettingsItemProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  type: 'toggle' | 'select' | 'info';
  value?: string | boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}
```

#### Usage Examples:
```tsx
// Toggle switch
<SettingsItem
  icon="ruler"
  label="Units"
  type="toggle"
  value={useMetric}
  onToggle={(val) => setUseMetric(val)}
/>

// Selectable option
<SettingsItem
  icon="chef-hat"
  label="Default Meal Style"
  type="select"
  value="Home Cooked"
  onPress={() => openModal()}
/>

// Info link
<SettingsItem
  icon="information"
  label="About NutriLabelAI"
  type="info"
  onPress={() => showAbout()}
/>
```

---

### 2. **SectionHeader** (`src/components/Profile/SectionHeader.tsx`)

Section header component for grouping settings.

#### Features:
- ✅ **Uppercase Title** - All caps with letter spacing
- ✅ **Gray Background** - Matches iOS Settings style
- ✅ **Proper Spacing** - Top/bottom padding

#### Props:
```typescript
interface SectionHeaderProps {
  title: string;
}
```

#### Styling:
- **Font Size**: 14px (sm)
- **Font Weight**: 600 (semibold)
- **Color**: Medium gray
- **Text Transform**: Uppercase
- **Letter Spacing**: 0.5px

---

### 3. **InfoCard** (`src/components/Profile/InfoCard.tsx`)

Information card component for "How It Works" section.

#### Features:
- ✅ **Icon Container** - Large circular background
- ✅ **Title + Description** - Multi-line description support
- ✅ **Shadow Styling** - Elevated card appearance
- ✅ **Flexible Content** - Wraps long text

#### Props:
```typescript
interface InfoCardProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description: string;
}
```

#### Layout:
```
┌─────────────────────────────────┐
│ ┌────┐                          │
│ │Icon│ Title                    │
│ └────┘                          │
│        Description text that    │
│        wraps across multiple    │
│        lines...                 │
└─────────────────────────────────┘
```

---

## 📱 Screen Implementation

### **ProfileScreen** (`src/screens/ProfileScreen.tsx`)

Main Profile screen with settings, about, and model information.

#### Layout Structure:

```
┌─────────────────────────────────────┐
│      👤                             │ ← Header
│   User Profile                      │
│   Manage your preferences           │
├─────────────────────────────────────┤
│ PREFERENCES                         │ ← Section Header
│ ┌─────────────────────────────────┐│
│ │ 📏 Units               [Switch] ││ ← Toggle Setting
│ ├─────────────────────────────────┤│
│ │ 👨‍🍳 Default Meal Style  Home >   ││ ← Select Setting
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│ ABOUT                               │
│ ┌─────────────────────────────────┐│
│ │ ℹ️ About NutriLabelAI         > ││ ← Info Link
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│ HOW IT WORKS                        │
│ ┌─────────────────────────────────┐│
│ │ 🗄️  Smart Recipe Database        ││
│ │    We use PostgreSQL with...    ││ ← Info Card
│ └─────────────────────────────────┘│
│ ┌─────────────────────────────────┐│
│ │ 🧠  AI-Powered Analysis          ││
│ │    Our machine learning model...││
│ └─────────────────────────────────┘│
│ ┌─────────────────────────────────┐│
│ │ 📊  Confidence Scoring           ││
│ │    Every nutrition estimate...  ││
│ └─────────────────────────────────┘│
├─────────────────────────────────────┤
│    NutriLabelAI v1.0.0              │ ← Footer
│    Senior Design Project 2025       │
└─────────────────────────────────────┘
```

---

## ⚙️ Settings Configuration

### 1. **Units Toggle** (Imperial / Metric)

```typescript
const [useMetric, setUseMetric] = useState(false);

const handleUnitToggle = (value: boolean) => {
  setUseMetric(value);
  // TODO: Persist to AsyncStorage
};
```

**States:**
- `false` → Imperial (oz, lb, fl oz)
- `true` → Metric (g, kg, ml)

**Implementation Notes:**
- Currently stored in state only
- TODO: Persist to AsyncStorage
- TODO: Apply to nutrition display throughout app

---

### 2. **Default Meal Style** (Home / Restaurant / Ask)

```typescript
type DefaultStyle = 'home' | 'restaurant' | 'ask';
const [defaultStyle, setDefaultStyle] = useState<DefaultStyle>('ask');

const handleStyleSelect = (style: DefaultStyle) => {
  setDefaultStyle(style);
  setStyleModalVisible(false);
  // TODO: Persist to AsyncStorage
};
```

**Options:**
- **Home Cooked** - Analyze dishes as homemade meals
- **Restaurant** - Analyze dishes as restaurant meals
- **Ask Every Time** - Prompt user on each analysis (default)

**Modal UI:**
- Bottom sheet style modal
- Three options with icons:
  - 🏠 Home
  - 🍴 Restaurant
  - ❓ Ask Every Time
- Selected option highlighted with green background
- Check mark icon on selected

---

## 📋 Modal Implementation

### Style Selection Modal:

```tsx
<Modal
  visible={styleModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setStyleModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>Default Meal Style</Text>
        <TouchableOpacity onPress={() => setStyleModalVisible(false)}>
          <MaterialCommunityIcons name="close" size={24} />
        </TouchableOpacity>
      </View>

      {/* Options... */}
    </View>
  </View>
</Modal>
```

#### Modal Features:
- **Bottom Sheet Animation** - Slides up from bottom
- **Semi-Transparent Overlay** - 50% black background
- **Close Button** - X icon in header
- **Visual Feedback** - Selected option highlighted
- **Touch Outside** - Closes modal (onRequestClose)

#### Modal Option Layout:
```
┌───────────────────────────────────┐
│ [Icon] Home Cooked           [✓] │
│        Analyze dishes as...       │
└───────────────────────────────────┘
```

---

## 📖 About & Model Information

### About Alert:

```typescript
const handleAboutPress = () => {
  Alert.alert(
    'About NutriLabelAI',
    'NutriLabelAI is an intelligent nutrition analysis app that helps you understand the nutritional content of your meals.\n\nVersion 1.0.0\nDeveloped by Senior Design Team 2025',
    [{ text: 'OK' }]
  );
};
```

**Content:**
- App description
- Version number
- Team credit

---

### Model Info Cards:

#### 1. Smart Recipe Database
```tsx
<InfoCard
  icon="database"
  title="Smart Recipe Database"
  description="We use PostgreSQL with pgvector extension to store and search through thousands of recipes efficiently using semantic embeddings."
/>
```

**Key Points:**
- PostgreSQL database
- pgvector extension for vector search
- Semantic embeddings for similarity
- Thousands of recipes

#### 2. AI-Powered Analysis
```tsx
<InfoCard
  icon="brain"
  title="AI-Powered Analysis"
  description="Our machine learning model analyzes dish descriptions and uses vector similarity search to find the best matching recipes for accurate nutrition estimation."
/>
```

**Key Points:**
- Machine learning model
- Dish description analysis
- Vector similarity search
- Accurate nutrition estimation

#### 3. Confidence Scoring
```tsx
<InfoCard
  icon="chart-box"
  title="Confidence Scoring"
  description="Every nutrition estimate comes with a confidence score based on recipe similarity, helping you understand the reliability of the analysis."
/>
```

**Key Points:**
- Confidence scores for all estimates
- Based on recipe similarity
- Transparency in reliability
- Helps users make informed decisions

---

## 🎨 Design Elements

### Header:
- **Avatar**: 80px account-circle icon
- **Title**: "User Profile" (24px, bold)
- **Subtitle**: "Manage your preferences" (14px, medium gray)
- **Background**: White
- **Padding**: 32px top, 24px bottom

### Settings Groups:
- **Background**: White
- **Border Radius**: 12px (lg)
- **Margin**: 24px horizontal
- **Overflow**: Hidden (clips borders)

### Settings Items:
- **Icon Size**: 22px
- **Icon Container**: 36px circle, light green background
- **Label**: 16px medium font
- **Border**: Bottom border between items
- **Padding**: 16px vertical, 24px horizontal

### Info Cards:
- **Icon Container**: 50px square, rounded corners, light green background
- **Icon Size**: 28px
- **Title**: 16px semibold
- **Description**: 14px regular, line height 20px
- **Shadow**: Small elevation
- **Margin**: 24px horizontal, 16px bottom

### Footer:
- **Alignment**: Center
- **Padding**: 32px vertical
- **Text**: 14px medium gray
- **Subtext**: 12px light gray

---

## 🔄 State Management

### Current Implementation:
```typescript
// Local state only
const [useMetric, setUseMetric] = useState(false);
const [defaultStyle, setDefaultStyle] = useState<DefaultStyle>('ask');
const [styleModalVisible, setStyleModalVisible] = useState(false);
```

### Future Persistence:
```typescript
// TODO: Implement AsyncStorage persistence
import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@nutrilabel_settings';

// Save settings
const saveSettings = async () => {
  try {
    const settings = {
      useMetric,
      defaultStyle,
    };
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Failed to save settings:', error);
  }
};

// Load settings on mount
useEffect(() => {
  const loadSettings = async () => {
    try {
      const value = await AsyncStorage.getItem(SETTINGS_KEY);
      if (value) {
        const settings = JSON.parse(value);
        setUseMetric(settings.useMetric);
        setDefaultStyle(settings.defaultStyle);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };
  loadSettings();
}, []);
```

---

## 🚀 Integration Points

### 1. **Apply Units Throughout App**

```typescript
// In nutrition display components
const displayWeight = (grams: number) => {
  if (useMetric) {
    return `${grams}g`;
  } else {
    const ounces = grams / 28.35;
    return `${ounces.toFixed(1)}oz`;
  }
};
```

### 2. **Use Default Style in Label Screen**

```typescript
// In LabelHomeScreen
const [prepStyle, setPrepStyle] = useState<'home' | 'restaurant' | 'unknown'>(
  defaultStyle === 'ask' ? 'unknown' : defaultStyle
);
```

### 3. **Context API (Future)**

```typescript
// Create SettingsContext
export const SettingsContext = createContext({
  useMetric: false,
  defaultStyle: 'ask' as DefaultStyle,
  updateSettings: (settings: Partial<Settings>) => {},
});

// Wrap app with provider
<SettingsContext.Provider value={settingsValue}>
  {children}
</SettingsContext.Provider>

// Use in any component
const { useMetric, defaultStyle } = useContext(SettingsContext);
```

---

## ✨ Key Features

### 1. **Clean Settings UI**
- iOS Settings-style layout
- Clear section organization
- Intuitive controls (toggle, select, info)

### 2. **Modal Selection**
- Bottom sheet animation
- Visual feedback for selected option
- Easy to dismiss

### 3. **Educational Content**
- Clear explanation of app functionality
- Technical details (PostgreSQL, pgvector)
- Transparency about ML approach

### 4. **User Control**
- Units preference
- Default behavior control
- Flexibility with "Ask Every Time"

---

## 🔧 Technical Implementation

### Typography Usage:
```typescript
// Fixed to use Typography.fontSize
userName: {
  fontSize: Typography.fontSize.xxl,
  fontWeight: Typography.fontWeight.bold,
  color: AppColors.darkGray,
}
```

### Icon Type Safety:
```typescript
// Proper Material Community Icons typing
icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
```

### Modal Overlay:
```typescript
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  justifyContent: 'flex-end',
}
```

---

## 📝 File Structure

```
src/
├── components/
│   └── Profile/
│       ├── SettingsItem.tsx       (120 lines)
│       ├── SectionHeader.tsx      (30 lines)
│       ├── InfoCard.tsx           (60 lines)
│       └── index.ts               (Exports)
│
├── screens/
│   └── ProfileScreen.tsx          (310 lines)
│
└── navigation/
    └── RootTabNavigator.tsx       (Profile tab configured)
```

**Total:** ~520 lines of production-ready code

---

## ✅ Implementation Checklist

### Components:
- [x] SettingsItem (toggle, select, info types)
- [x] SectionHeader with uppercase styling
- [x] InfoCard with icon and description
- [x] Type-safe Material Icons
- [x] Fixed Typography usage

### ProfileScreen:
- [x] Header with avatar and title
- [x] Preferences section
- [x] Units toggle (Imperial/Metric)
- [x] Default style selector
- [x] About section
- [x] Model info cards (3 cards)
- [x] Footer with version info
- [x] Style selection modal
- [x] Alert for About info

### Settings:
- [x] Units state management
- [x] Default style state management
- [x] Modal visibility state
- [x] Helper functions (getStyleLabel)
- [x] TODO comments for persistence

### Styling:
- [x] Proper spacing and padding
- [x] White background for cards
- [x] Light green accent containers
- [x] Shadows on info cards
- [x] Border separators
- [x] Modal bottom sheet style

---

## 🎉 Summary

✅ **Complete Profile Tab Implementation:**
- Header with user profile
- Preferences section (Units, Default Style)
- About section with app info
- Model info cards explaining technology
- Style selection modal
- Version footer

✅ **Component Reusability:**
- SettingsItem for all settings types
- SectionHeader for grouping
- InfoCard for educational content

✅ **User Experience:**
- Clear settings organization
- Intuitive controls
- Educational content about ML/database
- Professional appearance

✅ **Production Features:**
- TypeScript type safety
- Proper icon typing
- Fixed Typography usage
- Clean code structure
- TODO comments for future features

**All four main tabs (Label, History, Explore, Profile) are now complete!** 🚀
