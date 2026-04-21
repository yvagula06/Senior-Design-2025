import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

// ── Accent palette ──────────────────────────────────────────────────────────
export type AccentName = 'amber' | 'emerald' | 'sky' | 'purple' | 'rose';

export const ACCENT_MAP: Record<AccentName, { base: string; dark: string; light: string }> = {
  amber:   { base: '#F59E0B', dark: '#D97706', light: '#FEF3C7' },
  emerald: { base: '#10B981', dark: '#059669', light: '#D1FAE5' },
  sky:     { base: '#3B82F6', dark: '#2563EB', light: '#DBEAFE' },
  purple:  { base: '#8B5CF6', dark: '#7C3AED', light: '#EDE9FE' },
  rose:    { base: '#F43F5E', dark: '#E11D48', light: '#FFE4E6' },
};

// ── Colour builder (called at runtime from ThemeContext) ─────────────────────
export function buildColors(isDark: boolean, accentName: AccentName) {
  const a = ACCENT_MAP[accentName];
  if (isDark) {
    return {
      primary: a.base,
      primaryDark: a.dark,
      primaryLight: a.light,
      accent: a.base,
      accentLight: a.light,
      accentDark: a.dark,
      background: '#0F0F0F',
      cardBackground: '#1A1A1A',
      surface: '#1F1F1F',
      text: '#F9FAFB',
      textSecondary: '#D1D5DB',
      textTertiary: '#9CA3AF',
      success: '#10B981',
      warning: a.base,
      error: '#DC2626',
      danger: '#DC2626',
      info: '#3B82F6',
      white: '#FFFFFF',
      black: '#000000',
      darkGray: '#1F1F1F',
      mediumGray: '#374151',
      lightGray: '#4B5563',
      border: '#374151',
      divider: '#1F1F1F',
      overlay: 'rgba(0, 0, 0, 0.85)',
      overlayLight: 'rgba(0, 0, 0, 0.6)',
      gradientStart: '#DC2626',
      gradientMid: '#F97316',
      gradientEnd: a.base,
      accentGradientStart: a.base,
      accentGradientEnd: a.light,
      online: '#10B981',
      offline: '#6B7280',
      shadow: '#000000',
      gold: '#F59E0B',
      darkRed: '#991B1B',
      brightGold: '#FBBF24',
      backgroundSecondary: '#161616',
    };
  } else {
    return {
      primary: a.dark,
      primaryDark: a.dark,
      primaryLight: a.base,
      accent: a.dark,
      accentLight: a.light,
      accentDark: a.dark,
      background: '#F5F5F5',
      cardBackground: '#FFFFFF',
      surface: '#EFEFEF',
      text: '#111827',
      textSecondary: '#374151',
      textTertiary: '#6B7280',
      success: '#059669',
      warning: a.dark,
      error: '#DC2626',
      danger: '#DC2626',
      info: '#2563EB',
      white: '#FFFFFF',
      black: '#000000',
      darkGray: '#E5E7EB',
      mediumGray: '#D1D5DB',
      lightGray: '#9CA3AF',
      border: '#E5E7EB',
      divider: '#F3F4F6',
      overlay: 'rgba(0, 0, 0, 0.6)',
      overlayLight: 'rgba(0, 0, 0, 0.4)',
      gradientStart: '#DC2626',
      gradientMid: '#F97316',
      gradientEnd: a.base,
      accentGradientStart: a.base,
      accentGradientEnd: a.light,
      online: '#059669',
      offline: '#9CA3AF',
      shadow: '#000000',
      gold: '#F59E0B',
      darkRed: '#991B1B',
      brightGold: '#FBBF24',
      backgroundSecondary: '#FAFAFA',
    };
  }
}

// Static dark/amber defaults — used by files that haven't adopted the ThemeContext yet
export const AppColors = buildColors(true, 'amber');

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
