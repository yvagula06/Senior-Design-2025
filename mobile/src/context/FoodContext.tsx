import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { FoodEntry, NutritionInfo } from '../types/nutrition';
import { saveFoodEntries, loadFoodEntries, StoredFoodEntry, loadSettings, saveSettings } from '../services/storage';

interface FoodContextType {
  foodEntries: FoodEntry[];
  calorieGoal: number;
  setCalorieGoal: (goal: number) => void;
  addFoodEntry: (entry: NutritionInfo) => void;
  addLabelEntry: (entry: {
    dishName: string;
    matchedDish: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    confidence: number;
    fiber?: number | null;
    sugar?: number | null;
    sodium?: number | null;
  }) => void;
  deleteFoodEntry: (id: string) => void;
  getTotals: () => {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  isLoading: boolean;
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

export const FoodProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [calorieGoal, setCalorieGoalState] = useState(2000);
  const [isLoading, setIsLoading] = useState(true);

  // Load entries from AsyncStorage on mount
  useEffect(() => {
    loadEntriesFromStorage();
    loadCalorieGoal();
  }, []);

  const loadCalorieGoal = async () => {
    try {
      const settings = await loadSettings();
      setCalorieGoalState(settings.calorieGoal ?? 2000);
    } catch {}
  };

  const setCalorieGoal = async (goal: number) => {
    setCalorieGoalState(goal);
    try {
      await saveSettings({ calorieGoal: goal });
    } catch (e) {
      console.error('❌ [FoodContext] Failed to save calorieGoal:', e);
    }
  };

  // Save entries to AsyncStorage whenever they change
  useEffect(() => {
    if (!isLoading) {
      saveEntriesToStorage();
    }
  }, [foodEntries, isLoading]);

  const loadEntriesFromStorage = async () => {
    try {
      const stored = await loadFoodEntries();
      const entries: FoodEntry[] = stored.map((item: StoredFoodEntry) => ({
        id: item.id,
        foodName: item.foodName,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
      }));
      setFoodEntries(entries);
      console.log('✅ [FoodContext] Loaded', entries.length, 'entries from storage');
    } catch (error) {
      console.error('❌ [FoodContext] Failed to load entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntriesToStorage = async () => {
    try {
      const stored: StoredFoodEntry[] = foodEntries.map((entry) => ({
        id: entry.id,
        foodName: entry.foodName,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fats: entry.fats,
        timestamp: new Date().toISOString(),
      }));
      await saveFoodEntries(stored);
      console.log('✅ [FoodContext] Saved', stored.length, 'entries to storage');
    } catch (error) {
      console.error('❌ [FoodContext] Failed to save entries:', error);
    }
  };

  const addFoodEntry = (entry: NutritionInfo) => {
    const newEntry: FoodEntry = {
      ...entry,
      id: Date.now().toString(),
    };
    setFoodEntries((prev) => [...prev, newEntry]);
  };

  const addLabelEntry = (entry: {
    dishName: string;
    matchedDish: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    confidence: number;
    fiber?: number | null;
    sugar?: number | null;
    sodium?: number | null;
  }) => {
    const newEntry: FoodEntry = {
      id: Date.now().toString(),
      foodName: entry.matchedDish || entry.dishName,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fats: entry.fats,
    };
    setFoodEntries((prev) => [...prev, newEntry]);
    console.log('✅ [FoodContext] Added label entry:', newEntry.foodName);
  };

  const deleteFoodEntry = (id: string) => {
    setFoodEntries((prev) => prev.filter((entry) => entry.id !== id));
  };

  const getTotals = () => {
    return foodEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fats: acc.fats + entry.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  };

  return (
    <FoodContext.Provider value={{ foodEntries, calorieGoal, setCalorieGoal, addFoodEntry, addLabelEntry, deleteFoodEntry, getTotals, isLoading }}>
      {children}
    </FoodContext.Provider>
  );
};

export const useFoodContext = () => {
  const context = useContext(FoodContext);
  if (!context) {
    throw new Error('useFoodContext must be used within a FoodProvider');
  }
  return context;
};
