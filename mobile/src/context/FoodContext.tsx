import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { FoodEntry } from '../types/nutrition';
import { MealCategory, saveFoodEntries, loadFoodEntries, StoredFoodEntry, loadSettings, saveSettings } from '../services/storage';

export interface MacroGoals {
  protein: number;
  carbs: number;
  fat: number;
}

export interface RecentEntry {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface FoodContextType {
  foodEntries: FoodEntry[];
  // Goals
  calorieGoal: number;
  macroGoals: MacroGoals;
  setCalorieGoal: (goal: number) => void;
  setMacroGoals: (goals: MacroGoals) => void;
  // Entries
  clearAllData: () => Promise<void>;
  addLabelEntry: (entry: {
    dishName: string;
    matchedDish: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    confidence: number;
    mealCategory?: MealCategory;
    fiber?: number | null;
    sugar?: number | null;
    sodium?: number | null;
  }) => void;
  deleteFoodEntry: (id: string) => void;
  getTotals: () => { calories: number; protein: number; carbs: number; fats: number };
  getTodayEntries: () => FoodEntry[];
  // Streak
  streak: number;
  // Recents
  recentEntries: RecentEntry[];
  isLoading: boolean;
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

const todayDate = () => new Date().toISOString().split('T')[0];

export const FoodProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [calorieGoal, setCalorieGoalState] = useState(2000);
  const [macroGoals, setMacroGoalsState] = useState<MacroGoals>({ protein: 150, carbs: 200, fat: 65 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, []);

  // Persist whenever entries change
  useEffect(() => {
    if (!isLoading) saveEntriesToStorage();
  }, [foodEntries, isLoading]);

  const loadAll = async () => {
    try {
      const [stored, settings] = await Promise.all([loadFoodEntries(), loadSettings()]);
      setCalorieGoalState(settings.calorieGoal ?? 2000);
      setMacroGoalsState({
        protein: settings.proteinGoal ?? 150,
        carbs: settings.carbsGoal ?? 200,
        fat: settings.fatGoal ?? 65,
      });
      const entries: FoodEntry[] = stored.map((item: StoredFoodEntry) => ({
        id: item.id,
        foodName: item.foodName,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fats: item.fats,
        mealCategory: item.mealCategory ?? 'snack',
        date: item.date ?? todayDate(),
        timestamp: item.timestamp ? new Date(item.timestamp).getTime() : Date.now(),
      }));
      setFoodEntries(entries);
    } catch (e) {
      console.error('❌ [FoodContext] loadAll failed:', e);
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
        mealCategory: entry.mealCategory,
        date: entry.date,
        timestamp: new Date(entry.timestamp).toISOString(),
      }));
      await saveFoodEntries(stored);
    } catch (e) {
      console.error('❌ [FoodContext] save failed:', e);
    }
  };

  const setCalorieGoal = async (goal: number) => {
    setCalorieGoalState(goal);
    try { await saveSettings({ calorieGoal: goal }); } catch {}
  };

  const setMacroGoals = async (goals: MacroGoals) => {
    setMacroGoalsState(goals);
    try { await saveSettings({ proteinGoal: goals.protein, carbsGoal: goals.carbs, fatGoal: goals.fat }); } catch {}
  };

  const addLabelEntry = useCallback((entry: {
    dishName: string;
    matchedDish: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    confidence: number;
    mealCategory?: MealCategory;
    fiber?: number | null;
    sugar?: number | null;
    sodium?: number | null;
  }) => {
    const now = Date.now();
    const newEntry: FoodEntry = {
      id: now.toString(),
      foodName: entry.matchedDish || entry.dishName,
      calories: entry.calories,
      protein: entry.protein,
      carbs: entry.carbs,
      fats: entry.fats,
      mealCategory: entry.mealCategory ?? guessCategory(),
      date: todayDate(),
      timestamp: now,
    };
    setFoodEntries((prev) => [...prev, newEntry]);
  }, []);

  const clearAllData = useCallback(async () => {
    setFoodEntries([]);
    setCalorieGoalState(2000);
    setMacroGoalsState({ protein: 150, carbs: 200, fat: 65 });
    try { await saveFoodEntries([]); } catch {}
  }, []);

  const deleteFoodEntry = useCallback((id: string) => {
    setFoodEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const getTotals = useCallback(() => {
    const today = todayDate();
    return foodEntries
      .filter((e) => e.date === today)
      .reduce(
        (acc, e) => ({ calories: acc.calories + e.calories, protein: acc.protein + e.protein, carbs: acc.carbs + e.carbs, fats: acc.fats + e.fats }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      );
  }, [foodEntries]);

  const getTodayEntries = useCallback(() => {
    const today = todayDate();
    return foodEntries.filter((e) => e.date === today);
  }, [foodEntries]);

  const contextValue = useMemo<FoodContextType>(() => {
    // Compute streak from foodEntries (no separate state needed)
    const days = new Set(foodEntries.map((e) => e.date));
    let streak = 0;
    const d = new Date();
    while (days.has(d.toISOString().split('T')[0])) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    // Compute recents from foodEntries (no separate state needed)
    const seen = new Set<string>();
    const recentEntries: RecentEntry[] = [];
    for (const e of [...foodEntries].sort((a, b) => b.timestamp - a.timestamp)) {
      if (!seen.has(e.foodName) && recentEntries.length < 5) {
        seen.add(e.foodName);
        recentEntries.push({ foodName: e.foodName, calories: e.calories, protein: e.protein, carbs: e.carbs, fats: e.fats });
      }
    }

    return {
      foodEntries, calorieGoal, macroGoals, setCalorieGoal, setMacroGoals,
      clearAllData, addLabelEntry, deleteFoodEntry, getTotals, getTodayEntries,
      streak, recentEntries, isLoading,
    };
  }, [foodEntries, calorieGoal, macroGoals, isLoading,
      setCalorieGoal, setMacroGoals, clearAllData, addLabelEntry, deleteFoodEntry, getTotals, getTodayEntries]);

  return (
    <FoodContext.Provider value={contextValue}>
      {children}
    </FoodContext.Provider>
  );
};

export const useFoodContext = () => {
  const context = useContext(FoodContext);
  if (!context) throw new Error('useFoodContext must be used within a FoodProvider');
  return context;
};

/** Guess meal category from current hour */
function guessCategory(): MealCategory {
  const h = new Date().getHours();
  if (h < 10) return 'breakfast';
  if (h < 14) return 'lunch';
  if (h < 19) return 'dinner';
  return 'snack';
}
