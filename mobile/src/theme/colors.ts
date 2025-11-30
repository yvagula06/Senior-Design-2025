import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const AppColors = {
  // Primary Elite Colors
  primary: '#DC2626',          // Rich red
  primaryDark: '#991B1B',      // Deep crimson
  primaryLight: '#EF4444',     // Bright red
  
  // Gold Accent Colors
  accent: '#F59E0B',           // Luxurious gold
  accentLight: '#FEF3C7',      // Pale gold
  accentDark: '#D97706',       // Deep gold
  
  // Backgrounds
  background: '#0F0F0F',       // Almost black
  cardBackground: '#1A1A1A',   // Dark charcoal
  surface: '#1F1F1F',          // Elevated surface
  
  // Text Colors
  text: '#F9FAFB',             // Off-white for dark bg
  textSecondary: '#D1D5DB',    // Light gray text
  textTertiary: '#9CA3AF',     // Medium gray text
  
  // Semantic Colors
  success: '#10B981',          // Elite green
  warning: '#F59E0B',          // Gold warning
  error: '#DC2626',            // Red error
  info: '#3B82F6',             // Blue info
  
  // Elite Palette
  white: '#FFFFFF',
  black: '#000000',
  darkGray: '#1F1F1F',
  mediumGray: '#374151',
  lightGray: '#4B5563',
  
  // Borders & Dividers
  border: '#374151',
  divider: '#1F1F1F',
  
  // Overlays
  overlay: 'rgba(0, 0, 0, 0.85)',
  overlayLight: 'rgba(0, 0, 0, 0.6)',
  
  // Gradients - Red to Gold
  gradientStart: '#DC2626',
  gradientMid: '#F97316',
  gradientEnd: '#F59E0B',
  
  // Accent Gradients - Gold variations
  accentGradientStart: '#F59E0B',
  accentGradientEnd: '#FBBF24',
  
  // Status Colors
  online: '#10B981',
  offline: '#6B7280',
  
  // Shadow
  shadow: '#000000',
  
  // Special Elite Colors
  gold: '#F59E0B',
  darkRed: '#991B1B',
  brightGold: '#FBBF24',
};

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: AppColors.primary,
    accent: AppColors.accent,
    background: AppColors.background,
    surface: AppColors.surface,
    text: AppColors.text,
    error: AppColors.error,
    onSurface: AppColors.text,
    disabled: AppColors.mediumGray,
    placeholder: AppColors.textTertiary,
    backdrop: AppColors.overlay,
    notification: AppColors.accent,
    surfaceVariant: AppColors.cardBackground,
  },
  roundness: 16,
  dark: true,
};
