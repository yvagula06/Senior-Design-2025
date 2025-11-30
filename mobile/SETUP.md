# Mobile App Setup Guide

This guide will help you set up and run the NutriLabelAI mobile app using Expo.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Expo Go** app on your mobile device:
  - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
  - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

## Installation Steps

1. **Navigate to the mobile directory:**
   ```bash
   cd mobile
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install custom fonts:**
   ```bash
   npm install @expo-google-fonts/crimson-pro @expo-google-fonts/space-grotesk
   ```

## Running the App

1. **Start the Expo development server:**
   ```bash
   npx expo start
   ```

   Or if you want to clear the cache:
   ```bash
   npx expo start --clear
   ```

2. **Open the app on your device:**
   - Scan the QR code displayed in the terminal using:
     - **iOS**: Camera app (will prompt to open in Expo Go)
     - **Android**: Expo Go app (use the "Scan QR Code" option)

3. **Alternative options:**
   - Press `i` in the terminal to open iOS simulator (requires Xcode on macOS)
   - Press `a` in the terminal to open Android emulator (requires Android Studio)
   - Press `w` in the terminal to open in web browser

## Troubleshooting

### Port Already in Use
If you encounter a "port already in use" error, stop any running Node processes:
```bash
# Windows PowerShell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

### Cache Issues
If you encounter unexpected behavior, try clearing the cache:
```bash
npx expo start --clear
```

### Font Loading Issues
If custom fonts don't load, ensure the font packages are installed:
```bash
npm install @expo-google-fonts/crimson-pro @expo-google-fonts/space-grotesk
```

## Project Structure

```
mobile/
├── src/
│   ├── components/      # Reusable UI components
│   ├── config/          # Configuration files (fonts, etc.)
│   ├── context/         # React context providers
│   ├── navigation/      # Navigation setup
│   ├── screens/         # Screen components
│   ├── services/        # API and storage services
│   ├── theme/           # Theme configuration (colors, typography, animations)
│   └── types/           # TypeScript type definitions
├── App.tsx              # Main app entry point
├── app.json             # Expo configuration
└── package.json         # Project dependencies
```

## Development Tips

- **Hot Reload**: The app will automatically reload when you save changes to files
- **Debug Menu**: Shake your device or press `Cmd+D` (iOS) / `Cmd+M` (Android) to open the debug menu
- **Console Logs**: View console output in the terminal where you ran `npx expo start`

## Additional Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
