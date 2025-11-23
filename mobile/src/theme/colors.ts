import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const AppColors = {
  background: '#F9FBE7',     // pale green/cream
  primary: '#81C784',        // soft green
  accent: '#4CAF50',         // darker green
  text: '#2E2E2E',           // dark gray
  white: '#FFFFFF',
  error: '#F44336',
  shadow: '#000000',
  lightGray: '#F5F5F5',
  mediumGray: '#9E9E9E',
  darkGray: '#424242',
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
  },
  roundness: 12,
};
