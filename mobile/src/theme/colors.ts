import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const AppColors = {
  background: '#F0F4F8',     // soft blue-gray
  primary: '#66BB6A',        // vibrant green
  accent: '#4CAF50',         // material green
  text: '#1A202C',           // deep blue-gray
  white: '#FFFFFF',
  error: '#EF5350',          // modern red
  shadow: '#000000',
  lightGray: '#F7FAFC',
  mediumGray: '#A0AEC0',
  darkGray: '#2D3748',
  success: '#48BB78',        // success green
  cardBackground: '#FFFFFF',
  gradientStart: '#E8F5E9',  // light green
  gradientEnd: '#F1F8E9',    // pale yellow-green
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: AppColors.accent,
    accent: AppColors.primary,
    background: AppColors.background,
    surface: AppColors.white,
    text: AppColors.text,
    error: AppColors.error,
    onSurface: AppColors.text,
    disabled: AppColors.mediumGray,
    placeholder: AppColors.mediumGray,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: AppColors.accent,
    surfaceVariant: AppColors.lightGray,
  },
  roundness: 16,
};
