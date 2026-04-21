import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { loadSettings, saveSettings } from '../services/storage';
import { buildColors, AccentName } from '../theme/colors';

export type { AccentName };

export const ACCENT_OPTIONS: { name: AccentName; hex: string; label: string }[] = [
  { name: 'amber',   hex: '#F59E0B', label: 'Gold'    },
  { name: 'emerald', hex: '#10B981', label: 'Emerald' },
  { name: 'sky',     hex: '#3B82F6', label: 'Sky'     },
  { name: 'purple',  hex: '#8B5CF6', label: 'Violet'  },
  { name: 'rose',    hex: '#F43F5E', label: 'Rose'    },
];

export type AppColors = ReturnType<typeof buildColors>;

interface ThemeContextValue {
  isDark: boolean;
  accentName: AccentName;
  displayName: string;
  profilePicUri: string | null;
  colors: AppColors;
  toggleDark: () => void;
  setAccentName: (name: AccentName) => void;
  setDisplayName: (name: string) => void;
  setProfilePicUri: (uri: string | null) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(true);
  const [accentName, setAccentNameState] = useState<AccentName>('amber');
  const [displayName, setDisplayNameState] = useState('');
  const [profilePicUri, setProfilePicUriState] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await loadSettings();
        if (s.isDark !== undefined) setIsDark(s.isDark);
        if (s.accentColor)   setAccentNameState(s.accentColor as AccentName);
        if (s.displayName)   setDisplayNameState(s.displayName);
        if (s.profilePicUri) setProfilePicUriState(s.profilePicUri);
      } catch {}
    })();
  }, []);

  const colors = useMemo(() => buildColors(isDark, accentName), [isDark, accentName]);

  const toggleDark = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    await saveSettings({ isDark: next });
  }, [isDark]);

  const setAccentName = useCallback(async (name: AccentName) => {
    setAccentNameState(name);
    await saveSettings({ accentColor: name });
  }, []);

  const setDisplayName = useCallback(async (name: string) => {
    setDisplayNameState(name);
    await saveSettings({ displayName: name });
  }, []);

  const setProfilePicUri = useCallback(async (uri: string | null) => {
    setProfilePicUriState(uri);
    await saveSettings({ profilePicUri: uri ?? '' });
  }, []);

  return (
    <ThemeContext.Provider value={{
      isDark, accentName, displayName, profilePicUri, colors,
      toggleDark, setAccentName, setDisplayName, setProfilePicUri,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useAppTheme must be used inside ThemeProvider');
  return ctx;
}
