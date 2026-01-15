/**
 * Label API Service
 * 
 * Handles POST /label requests for nutrition estimation.
 * 
 * USAGE:
 * import { requestLabel } from './label';
 * 
 * try {
 *   const result = await requestLabel('chicken tikka masala', 600, 'restaurant');
 *   console.log(result.matched_dish, result.nutrition);
 * } catch (error) {
 *   alert(error); // User-friendly error message
 * }
 */

import { AxiosError } from 'axios';
import { apiClient } from './api';
import type { LabelRequest, LabelResponse } from '../types/label';

/**
 * Request nutrition label estimation
 * 
 * @param dishName - Dish name or description (required)
 * @param targetCalories - Optional target calories for scaling
 * @param style - Optional style: "home", "restaurant", or "fast_food"
 * @returns Promise<LabelResponse> with matched_dish, nutrition, confidence, explanation
 * @throws string with user-friendly error message
 * 
 * @example
 * const result = await requestLabel('grilled salmon', 400);
 * console.log(`Matched: ${result.matched_dish}`);
 * console.log(`Calories: ${result.nutrition.calories}`);
 * console.log(`Confidence: ${result.confidence}`);
 */
export async function requestLabel(
  dishName: string,
  targetCalories?: number,
  style?: 'home' | 'restaurant' | 'fast_food'
): Promise<LabelResponse> {
  try {
    // Build request payload
    const payload: LabelRequest = {
      dish_name: dishName,
    };
    
    if (targetCalories !== undefined) {
      payload.target_calories = targetCalories;
    }
    
    if (style !== undefined) {
      payload.style = style;
    }

    // Make POST request
    const response = await apiClient.post<LabelResponse>('/label', payload);
    
    return response.data;
    
  } catch (error) {
    // Transform error to user-friendly message
    throw handleError(error);
  }
}

/**
 * Transform axios errors into user-friendly messages
 * 
 * @param error - Original error object
 * @returns User-friendly error message string
 */
function handleError(error: unknown): string {
  if (!error) {
    return 'An unexpected error occurred';
  }

  // Network error (no internet, backend down)
  if ((error as AxiosError).code === 'ECONNABORTED') {
    return 'Request timed out. Please try again.';
  }
  
  if ((error as AxiosError).code === 'ERR_NETWORK') {
    return 'Network error. Please check your connection.';
  }

  // HTTP errors
  const axiosError = error as AxiosError;
  if (axiosError.response) {
    const status = axiosError.response.status;
    
    if (status === 404) {
      return 'Dish not found';
    }
    
    if (status === 500 || status === 502 || status === 503) {
      return 'Server error. Please try again later.';
    }
    
    if (status === 422 || status === 400) {
      // Try to extract detail message from backend
      const detail = (axiosError.response.data as any)?.detail;
      if (typeof detail === 'string') {
        return detail;
      }
      return 'Invalid request. Please check your input.';
    }
    
    return `Error: ${status}`;
  }

  // Unknown error
  if (error instanceof Error) {
    return error.message || 'An error occurred';
  }
  
  return 'An unexpected error occurred';
}
