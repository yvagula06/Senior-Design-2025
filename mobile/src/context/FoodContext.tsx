import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FoodEntry, NutritionInfo } from '../types/nutrition';

interface FoodContextType {
  foodEntries: FoodEntry[];
  addFoodEntry: (entry: NutritionInfo) => void;
  deleteFoodEntry: (id: string) => void;
  getTotals: () => {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
}

const FoodContext = createContext<FoodContextType | undefined>(undefined);

export const FoodProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);

  const addFoodEntry = (entry: NutritionInfo) => {
    const newEntry: FoodEntry = {
      ...entry,
      id: Date.now().toString(),
    };
    setFoodEntries((prev) => [...prev, newEntry]);
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
    <FoodContext.Provider value={{ foodEntries, addFoodEntry, deleteFoodEntry, getTotals }}>
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
