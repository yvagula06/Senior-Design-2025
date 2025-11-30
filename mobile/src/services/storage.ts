/**
 * AsyncStorage Service for Settings Persistence
 * 
 * This file handles all local storage operations for user preferences
 * using React Native's AsyncStorage.
 * 
 * Settings are stored locally and synchronized with backend when needed.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  USER_SETTINGS: '@nutrilabel_user_settings',
  HISTORY_CACHE: '@nutrilabel_history_cache',
  EXPLORE_CACHE: '@nutrilabel_explore_cache',
  ONBOARDING_COMPLETE: '@nutrilabel_onboarding_complete',
} as const;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface UserSettings {
  // Units preference
  useMetric: boolean; // false = Imperial (oz, lb), true = Metric (g, kg)
  
  // Default meal style
  defaultPrepStyle: 'home' | 'restaurant' | 'ask';
  
  // Display preferences
  showDetailedView: boolean; // Default view style for labels
  
  // Notifications (future feature)
  notificationsEnabled: boolean;
  
  // Theme (future feature)
  darkMode: boolean;
  
  // Last sync timestamp
  lastSyncedAt?: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  useMetric: false,
  defaultPrepStyle: 'ask',
  showDetailedView: false,
  notificationsEnabled: true,
  darkMode: false,
};

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

/**
 * Load user settings from AsyncStorage
 * 
 * @returns UserSettings object or default if not found
 * 
 * Example:
 * ```
 * const settings = await loadSettings();
 * console.log('Units:', settings.useMetric ? 'Metric' : 'Imperial');
 * ```
 */
export async function loadSettings(): Promise<UserSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    
    if (!stored) {
      console.log('📦 [Storage] No settings found, using defaults');
      return DEFAULT_SETTINGS;
    }
    
    const parsed = JSON.parse(stored) as UserSettings;
    console.log('📦 [Storage] Settings loaded:', parsed);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error('❌ [Storage] Failed to load settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save user settings to AsyncStorage
 * 
 * @param settings - Complete or partial settings object
 * 
 * Example:
 * ```
 * await saveSettings({ useMetric: true, defaultPrepStyle: 'home' });
 * ```
 */
export async function saveSettings(
  settings: Partial<UserSettings>
): Promise<void> {
  try {
    // Load existing settings and merge
    const current = await loadSettings();
    const updated: UserSettings = {
      ...current,
      ...settings,
      lastSyncedAt: new Date().toISOString(),
    };
    
    await AsyncStorage.setItem(
      STORAGE_KEYS.USER_SETTINGS,
      JSON.stringify(updated)
    );
    
    console.log('✅ [Storage] Settings saved:', updated);
    
    // TODO: Sync with backend if user is authenticated
    // await syncSettingsWithBackend(updated);
  } catch (error) {
    console.error('❌ [Storage] Failed to save settings:', error);
    throw error;
  }
}

/**
 * Reset settings to defaults
 */
export async function resetSettings(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_SETTINGS);
    console.log('🔄 [Storage] Settings reset to defaults');
  } catch (error) {
    console.error('❌ [Storage] Failed to reset settings:', error);
    throw error;
  }
}

// ============================================================================
// HISTORY CACHE (for offline support)
// ============================================================================

/**
 * Cache history entries locally for offline access
 * 
 * @param entries - Array of history entries to cache
 */
export async function cacheHistoryEntries(entries: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.HISTORY_CACHE,
      JSON.stringify({
        data: entries,
        cachedAt: new Date().toISOString(),
      })
    );
    console.log('📦 [Storage] History cached:', entries.length, 'entries');
  } catch (error) {
    console.error('❌ [Storage] Failed to cache history:', error);
  }
}

/**
 * Load cached history entries
 * 
 * @returns Cached entries or empty array if none found
 */
export async function loadCachedHistory(): Promise<any[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY_CACHE);
    if (!stored) return [];
    
    const { data, cachedAt } = JSON.parse(stored);
    console.log('📦 [Storage] History loaded from cache:', data.length, 'entries');
    console.log('📦 [Storage] Cache timestamp:', cachedAt);
    return data;
  } catch (error) {
    console.error('❌ [Storage] Failed to load cached history:', error);
    return [];
  }
}

/**
 * Clear history cache
 */
export async function clearHistoryCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.HISTORY_CACHE);
    console.log('🗑️ [Storage] History cache cleared');
  } catch (error) {
    console.error('❌ [Storage] Failed to clear history cache:', error);
  }
}

// ============================================================================
// EXPLORE CACHE (for featured dishes)
// ============================================================================

/**
 * Cache featured dishes for Explore tab
 * 
 * @param dishes - Array of featured dishes
 */
export async function cacheFeaturedDishes(dishes: any[]): Promise<void> {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.EXPLORE_CACHE,
      JSON.stringify({
        data: dishes,
        cachedAt: new Date().toISOString(),
      })
    );
    console.log('📦 [Storage] Featured dishes cached:', dishes.length);
  } catch (error) {
    console.error('❌ [Storage] Failed to cache dishes:', error);
  }
}

/**
 * Load cached featured dishes
 * 
 * @returns Cached dishes or empty array if none found
 */
export async function loadCachedDishes(): Promise<any[]> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.EXPLORE_CACHE);
    if (!stored) return [];
    
    const { data, cachedAt } = JSON.parse(stored);
    console.log('📦 [Storage] Dishes loaded from cache:', data.length);
    console.log('📦 [Storage] Cache timestamp:', cachedAt);
    return data;
  } catch (error) {
    console.error('❌ [Storage] Failed to load cached dishes:', error);
    return [];
  }
}

// ============================================================================
// ONBOARDING STATE
// ============================================================================

/**
 * Check if user has completed onboarding
 * 
 * @returns true if onboarding is complete
 */
export async function isOnboardingComplete(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return value === 'true';
  } catch (error) {
    console.error('❌ [Storage] Failed to check onboarding status:', error);
    return false;
  }
}

/**
 * Mark onboarding as complete
 */
export async function markOnboardingComplete(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    console.log('✅ [Storage] Onboarding marked complete');
  } catch (error) {
    console.error('❌ [Storage] Failed to mark onboarding:', error);
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Clear all app data (for logout or reset)
 */
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_SETTINGS,
      STORAGE_KEYS.HISTORY_CACHE,
      STORAGE_KEYS.EXPLORE_CACHE,
      STORAGE_KEYS.ONBOARDING_COMPLETE,
    ]);
    console.log('🗑️ [Storage] All app data cleared');
  } catch (error) {
    console.error('❌ [Storage] Failed to clear all data:', error);
    throw error;
  }
}

/**
 * Get storage info (debugging purposes)
 */
export async function getStorageInfo(): Promise<{
  keys: readonly string[];
  totalSize: number;
}> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    
    // Estimate size (rough calculation)
    let totalSize = 0;
    for (const key of keys) {
      const value = await AsyncStorage.getItem(key);
      if (value) {
        totalSize += value.length;
      }
    }
    
    console.log('📊 [Storage] Info:', { keys: keys.length, totalSize });
    return { keys, totalSize };
  } catch (error) {
    console.error('❌ [Storage] Failed to get storage info:', error);
    return { keys: [], totalSize: 0 };
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Settings
  loadSettings,
  saveSettings,
  resetSettings,
  
  // History
  cacheHistoryEntries,
  loadCachedHistory,
  clearHistoryCache,
  
  // Explore
  cacheFeaturedDishes,
  loadCachedDishes,
  
  // Onboarding
  isOnboardingComplete,
  markOnboardingComplete,
  
  // Utility
  clearAllData,
  getStorageInfo,
};
