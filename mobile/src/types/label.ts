/**
 * Label API Type Definitions
 * 
 * Types matching the POST /label endpoint contract.
 */

/**
 * Request payload for POST /label
 */
export interface LabelRequest {
  dish_name: string;
  target_calories?: number;
  style?: 'home' | 'restaurant' | 'fast_food';
}

/**
 * Response from POST /label
 */
export interface LabelResponse {
  matched_dish: string;
  nutrition: NutritionFacts;
  confidence: number;
  explanation: string;
}

/**
 * Nutrition facts dictionary
 * 
 * Some fields may be null if not available in database.
 */
export interface NutritionFacts {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  sugar_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  potassium_mg: number | null;
}
