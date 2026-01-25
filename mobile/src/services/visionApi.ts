/**
 * Vision API Service
 * 
 * Service for camera-based meal estimation using /vision/estimate endpoint.
 * Handles image encoding, request payload construction, and API communication.
 * 
 * USAGE:
 * import { estimateMeal } from './visionApi';
 * const response = await estimateMeal(visionRequest);
 */

import { apiClient } from './api';
import type { VisionRequest, VisionResponse } from '../types/vision';

/**
 * Call POST /vision/estimate endpoint
 * 
 * @param request - VisionRequest payload with images and metadata
 * @returns VisionResponse with dish predictions and calorie estimate
 * @throws Error if API call fails
 */
export const estimateMeal = async (request: VisionRequest): Promise<VisionResponse> => {
  try {
    console.log('📸 [VisionAPI] Calling POST /vision/estimate');
    console.log('📸 [VisionAPI] Request payload:', {
      imageCount: request.images.length,
      captureMode: request.metadata.capture_mode,
      deviceType: request.metadata.device_type,
      hasDepthData: !!request.depth_data,
      hasReferenceObject: !!request.reference_object,
    });

    const response = await apiClient.post<VisionResponse>('/vision/estimate', request);

    console.log('✅ [VisionAPI] Received response:', {
      selectedDish: response.data.selected_dish.dish_name,
      calories: response.data.calorie_estimate.value,
      accuracyScore: response.data.accuracy_score.overall,
      estimationMode: response.data.metadata.estimation_mode,
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ [VisionAPI] Failed to estimate meal:', error);
    
    // Extract error message from API response
    if (error.response?.data?.detail) {
      throw new Error(`Vision API Error: ${error.response.data.detail}`);
    }
    
    throw new Error(`Failed to estimate meal: ${error.message}`);
  }
};

/**
 * Health check for vision endpoint
 * 
 * @returns true if endpoint is reachable
 */
export const checkVisionHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get('/vision/health');
    return response.status === 200;
  } catch (error) {
    console.error('❌ [VisionAPI] Health check failed:', error);
    return false;
  }
};

/**
 * Log meal entry to backend
 * 
 * @param mealData - Meal data to log (dish name, calories, macros, etc.)
 * @returns Logged meal entry with ID
 * 
 * TODO: Implement backend endpoint for meal logging
 * Suggested endpoint: POST /api/meals/log
 * Expected payload: { dishName, calories, protein, carbs, fats, timestamp, source: 'vision' }
 */
export const logMealEntry = async (mealData: {
  dishName: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  confidence?: number;
  timestamp?: string;
}): Promise<{ id: string; success: boolean }> => {
  try {
    console.log('📝 [VisionAPI] Logging meal entry:', mealData);
    
    // TODO: Replace with actual backend endpoint when implemented
    // const response = await apiClient.post('/api/meals/log', {
    //   ...mealData,
    //   source: 'vision',
    //   timestamp: mealData.timestamp || new Date().toISOString(),
    // });
    // return { id: response.data.id, success: true };
    
    // Stub implementation - logs locally but doesn't call backend
    console.log('⚠️ [VisionAPI] Backend meal logging not yet implemented');
    console.log('⚠️ [VisionAPI] Meal data:', mealData);
    
    return {
      id: `local_${Date.now()}`,
      success: true,
    };
  } catch (error: any) {
    console.error('❌ [VisionAPI] Failed to log meal entry:', error);
    throw new Error(`Failed to log meal: ${error.message}`);
  }
};
