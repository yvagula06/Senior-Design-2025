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
      normalCameraMode: request.normal_camera_mode,
      plateType: request.plate_type,
      referenceObjectType: request.reference_object_type,
    });

    // Vision processing can take longer (model loading, segmentation, etc.)
    // Use extended timeout of 60 seconds for vision API calls
    const response = await apiClient.post<VisionResponse>('/vision/estimate', request, {
      timeout: 60000, // 60 seconds for vision processing
    });

    const accuracyScore = typeof response.data.accuracy_score === 'number' 
      ? response.data.accuracy_score 
      : response.data.accuracy_score?.overall;

    console.log('✅ [VisionAPI] Received response:', {
      selectedDish: response.data.selected_dish.dish_name,
      calories: response.data.calorie_estimate.value,
      accuracyScore,
      estimationMode: response.data.estimation_mode,
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

/**
 * Submit vision feedback to backend (Phase 3)
 * 
 * @param feedbackData - Feedback data including corrections, portion adjustments, plate size, etc.
 * @returns Feedback response with confirmation
 * 
 * Phase 3: Enables data-driven improvements and personalization
 * Endpoint: POST /vision/feedback
 */
export const submitVisionFeedback = async (feedbackData: {
  estimate_id: string | null;
  user_id: string | null;
  feedback_type: 'confirmed' | 'corrected_dish' | 'corrected_portion' | 'quick_correction';
  original_dish_name: string;
  original_calories: number;
  original_mode: string;
  confirmed_dish?: string;
  portion_adjustment?: number;
  plate_size?: string;
  quick_feedback?: 'accurate' | 'too_high' | 'too_low' | 'wrong_dish';
  corrected_calories?: number;
  notes?: string;
  timestamp?: string;
}): Promise<{
  success: boolean;
  feedback_id: string;
  message: string;
  personalization_updated?: boolean;
  new_portion_factor?: number;
}> => {
  try {
    console.log('📬 [VisionAPI] Submitting feedback:', {
      feedbackType: feedbackData.feedback_type,
      quickFeedback: feedbackData.quick_feedback,
      portionAdjustment: feedbackData.portion_adjustment,
      plateSize: feedbackData.plate_size,
    });

    const response = await apiClient.post('/vision/feedback', feedbackData);

    console.log('✅ [VisionAPI] Feedback submitted:', {
      feedbackId: response.data.feedback_id,
      personalizationUpdated: response.data.personalization_updated,
      newPortionFactor: response.data.new_portion_factor,
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ [VisionAPI] Failed to submit feedback:', error);
    
    // Extract error message from API response
    if (error.response?.data?.detail) {
      throw new Error(`Feedback submission failed: ${error.response.data.detail}`);
    }
    
    throw new Error(`Failed to submit feedback: ${error.message}`);
  }
};

/**
 * Get user's personalization profile (Phase 3)
 * 
 * @param userId - User identifier
 * @returns Personalization profile with portion preferences
 * 
 * Phase 3: Retrieves user's learned portion preferences
 * Endpoint: GET /vision/personalization/{userId}
 */
export const getPersonalizationProfile = async (userId: string): Promise<{
  user_id: string;
  avg_portion_factor: number;
  feedback_count: number;
  confidence_score: number;
  dish_preferences?: Record<string, any>;
  category_preferences?: Record<string, any>;
  last_updated: string;
  created_at: string;
}> => {
  try {
    console.log(`🔍 [VisionAPI] Fetching personalization profile for user: ${userId}`);

    const response = await apiClient.get(`/vision/personalization/${userId}`);

    console.log('✅ [VisionAPI] Personalization profile retrieved:', {
      avgPortionFactor: response.data.avg_portion_factor,
      feedbackCount: response.data.feedback_count,
      confidenceScore: response.data.confidence_score,
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ [VisionAPI] Failed to fetch personalization profile:', error);
    
    // If profile not found, return default
    if (error.response?.status === 404) {
      console.log('ℹ️ [VisionAPI] No personalization profile found (new user)');
      throw new Error('Profile not found');
    }
    
    throw new Error(`Failed to fetch personalization: ${error.message}`);
  }
};

/**
 * Get feedback statistics (Phase 3)
 * 
 * @param userId - Optional user ID to filter by
 * @param days - Number of days to look back (default: 30)
 * @returns Feedback statistics
 * 
 * Phase 3: Get aggregated feedback metrics
 * Endpoint: GET /vision/feedback/stats
 */
export const getFeedbackStats = async (
  userId?: string,
  days: number = 30
): Promise<{
  total_feedback: number;
  unique_users: number;
  avg_portion_adjustment: number;
  confirmations: number;
  dish_corrections: number;
  portion_corrections: number;
  thumbs_up: number;
  thumbs_down: number;
  accuracy_rate: number;
}> => {
  try {
    console.log(`📊 [VisionAPI] Fetching feedback stats (userId: ${userId}, days: ${days})`);

    const params: any = { days };
    if (userId) {
      params.user_id = userId;
    }

    const response = await apiClient.get('/vision/feedback/stats', { params });

    console.log('✅ [VisionAPI] Feedback stats retrieved:', {
      totalFeedback: response.data.total_feedback,
      accuracyRate: response.data.accuracy_rate,
      thumbsUp: response.data.thumbs_up,
      thumbsDown: response.data.thumbs_down,
    });

    return response.data;
  } catch (error: any) {
    console.error('❌ [VisionAPI] Failed to fetch feedback stats:', error);
    throw new Error(`Failed to fetch feedback stats: ${error.message}`);
  }
};

