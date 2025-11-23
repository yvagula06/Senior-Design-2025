# Nutrition Estimator Mobile App

A modern React Native mobile application for tracking food intake and estimating nutrition using image recognition.

## Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **UI Library**: React Native Paper (Material Design)
- **Navigation**: React Navigation (Drawer + Bottom Tabs)
- **State Management**: React Context API
- **Image Handling**: Expo Image Picker
- **HTTP Client**: Axios
- **Backend**: FastAPI (Python) + PostgreSQL

## Features

✅ **Manual Food Entry** - Add food items with detailed macros (calories, protein, carbs, fats)
✅ **Camera Integration** - Take photos of food for automatic nutrition analysis
✅ **Daily Tracking** - View daily nutrition totals in a beautiful summary card
✅ **Swipe to Delete** - Easily remove food entries with tap-to-delete
✅ **Modern UI** - Clean, polished design inspired by DoorDash/Uber/Spotify
✅ **Drawer Navigation** - Settings, About, and Help screens
✅ **Bottom Tab Navigation** - Easy switching between Add Entry and Daily Consumer

## Project Structure

```
mobile/
├── src/
│   ├── context/
│   │   └── FoodContext.tsx       # Global state for food entries
│   ├── navigation/
│   │   ├── BottomTabNavigator.tsx
│   │   └── DrawerNavigator.tsx
│   ├── screens/
│   │   ├── AddEntryScreen.tsx
│   │   └── DailyConsumerScreen.tsx
│   ├── services/
│   │   └── api.ts                # Backend API integration
│   ├── theme/
│   │   └── colors.ts             # App-wide color palette & theme
│   └── types/
│       └── nutrition.ts          # TypeScript interfaces
├── App.tsx                       # Root component
├── app.json                      # Expo configuration
├── package.json
└── tsconfig.json
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your phone (iOS/Android) OR Android Studio/Xcode for emulators

### Installation

1. **Navigate to the mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on your device:**
   - Scan the QR code with Expo Go (Android) or Camera app (iOS)
   - Press `a` for Android emulator
   - Press `i` for iOS simulator (macOS only)
   - Press `w` for web browser

## Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser

## API Configuration

The app connects to your FastAPI backend. Update the API base URL in `src/services/api.ts`:

```typescript
const API_BASE_URL = 'YOUR_BACKEND_URL_HERE';
```

For local development with the FastAPI backend:
- Use your computer's local IP (e.g., `http://192.168.1.100:8000`)
- Don't use `localhost` when testing on physical devices

## Color Scheme

The app uses a fresh green palette inspired by the original Flutter design:

- **Background**: `#F9FBE7` (pale green/cream)
- **Primary**: `#81C784` (soft green)
- **Accent**: `#4CAF50` (darker green)
- **Text**: `#2E2E2E` (dark gray)

## Camera Permissions

The app requires camera permissions to take photos of food. Permissions are requested at runtime when you tap the camera button.

## Backend Integration

This mobile app works with the existing FastAPI backend located in the parent directory. The backend provides:

- Image analysis endpoint (`POST /analyzeImage`)
- Nutrition estimation using ML models
- PostgreSQL database with pgvector for embeddings

## Team

- Raj
- Harry
- Matthew
- Rached

## License

Senior Design Project 2025
