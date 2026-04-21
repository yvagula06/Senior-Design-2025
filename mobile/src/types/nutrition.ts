import { MealCategory } from '../services/storage';

export interface NutritionInfo {
  foodName: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface FoodEntry extends NutritionInfo {
  id: string;
  mealCategory: MealCategory;
  date: string; // YYYY-MM-DD
  timestamp: number;
}
