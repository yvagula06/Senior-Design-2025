/**
 * API Service for NutriLabelAI Backend Integration
 * 
 * This file contains all API endpoint definitions and helper functions
 * for communicating with the FastAPI backend.
 * 
 * Backend Base URL: http://localhost:8000 (development)
 * Production: Update with deployed backend URL
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * TODO: Update these URLs based on environment
 * Development: http://localhost:8000
 * Production: https://api.nutrilabelai.com (or your deployed URL)
 */
const API_BASE_URL = __DEV__ 
  ? 'http://localhost:8000' 
  : 'https://api.nutrilabelai.com';

// API endpoints
const ENDPOINTS = {
  // Label generation
  GENERATE_LABEL: '/api/label/generate',
  
  // History management
  HISTORY_LIST: '/api/history',
  HISTORY_DETAIL: '/api/history/:id',
  HISTORY_CREATE: '/api/history',
  HISTORY_DELETE: '/api/history/:id',
  HISTORY_UPDATE: '/api/history/:id',
  
  // Dishes catalog
  DISHES_LIST: '/api/dishes',
  DISHES_SEARCH: '/api/dishes/search',
  DISHES_FEATURED: '/api/dishes/featured',
  
  // Feedback
  FEEDBACK_SUBMIT: '/api/feedback',
  
  // Health check
  HEALTH: '/health',
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Request payload for generating nutrition label
 * Corresponds to backend LabelRequest schema
 */
export interface GenerateLabelRequest {
  dish_name: string;
  target_calories?: number;
  prep_style: 'home' | 'restaurant' | 'unknown';
  image_data?: string; // Base64 encoded image (future feature)
}

/**
 * Response from nutrition label generation
 * Corresponds to backend LabelResponse schema
 */
export interface GenerateLabelResponse {
  dish_name: string;
  confidence_score: number;
  nutrition: {
    serving_size: string;
    calories: number;
    protein: number;
    total_carbohydrate: number;
    total_fat: number;
    saturated_fat: number;
    trans_fat: number;
    sodium: number;
    total_sugars: number;
    added_sugars: number;
    dietary_fiber: number;
    cholesterol: number;
    vitamin_d: number;
    calcium: number;
    iron: number;
    potassium: number;
  };
  top_recipes: Array<{
    id: string;
    name: string;
    similarity: number;
    estimated_calories: number;
  }>;
  assumptions: string[];
  uncertainty_factors: string[];
  metadata?: {
    model_version: string;
    processing_time_ms: number;
    embedding_model: string;
  };
}

/**
 * History entry interface
 * Corresponds to backend HistoryEntry schema
 */
export interface HistoryEntry {
  id: string;
  dish_name: string;
  date: string; // ISO 8601 format
  calories: number;
  confidence: number;
  prep_style: 'home' | 'restaurant' | 'unknown';
  is_favorite: boolean;
  nutrition_data: GenerateLabelResponse['nutrition'];
  created_at: string;
  updated_at: string;
}

/**
 * Dish catalog entry
 * For Explore tab featured dishes
 */
export interface DishCatalogEntry {
  id: string;
  name: string;
  description: string;
  category: 'restaurant' | 'home';
  calories: number;
  prep_style: 'home' | 'restaurant';
  image_url?: string;
  estimated_macros?: {
    protein: number;
    carbs: number;
    fat: number;
  };
  popularity_score: number;
  tags: string[];
}

/**
 * Feedback submission
 */
export interface FeedbackSubmission {
  dish_name: string;
  label_id?: string;
  feedback_type: 'accurate' | 'inaccurate' | 'suggestion';
  comments?: string;
  user_corrections?: {
    actual_calories?: number;
    actual_protein?: number;
    // ... other nutrients
  };
}

// ============================================================================
// API CLIENT FUNCTIONS
// ============================================================================

/**
 * Helper function to make API requests
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'An error occurred',
    }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// LABEL GENERATION
// ============================================================================

/**
 * Generate nutrition label for a dish
 * 
 * Backend endpoint: POST /api/label/generate
 * 
 * @param dishName - Name of the dish to analyze
 * @param targetCalories - Optional calorie target for scaling
 * @param prepStyle - Preparation style (home/restaurant/unknown)
 * @param imageData - Optional base64 encoded image (future feature)
 * @returns Nutrition label data with confidence score
 * 
 * Example:
 * ```
 * const result = await generateNutritionLabel(
 *   'Chicken tikka masala with rice',
 *   650,
 *   'restaurant'
 * );
 * ```
 */
export async function generateNutritionLabel(
  dishName: string,
  targetCalories?: number,
  prepStyle: 'home' | 'restaurant' | 'unknown' = 'unknown',
  imageData?: string
): Promise<GenerateLabelResponse> {
  // TODO: Remove mock data when backend is ready
  console.log('🚀 [API] generateNutritionLabel called with:', {
    dishName,
    targetCalories,
    prepStyle,
    hasImage: !!imageData,
  });

  // Mock delay to simulate API call
  await new Promise(resolve => setTimeout(resolve, 1500));

  // TODO: Replace with actual API call:
  /*
  return apiRequest<GenerateLabelResponse>(ENDPOINTS.GENERATE_LABEL, {
    method: 'POST',
    body: JSON.stringify({
      dish_name: dishName,
      target_calories: targetCalories,
      prep_style: prepStyle,
      image_data: imageData,
    }),
  });
  */

  // Mock response (remove when backend integrated)
  return {
    dish_name: dishName,
    confidence_score: 78,
    nutrition: {
      serving_size: '1 serving (approx. 350g)',
      calories: targetCalories || 520,
      protein: 28,
      total_carbohydrate: 45,
      total_fat: 24,
      saturated_fat: 8,
      trans_fat: 0.5,
      sodium: 890,
      total_sugars: 12,
      added_sugars: 6,
      dietary_fiber: 3,
      cholesterol: 75,
      vitamin_d: 2.5,
      calcium: 180,
      iron: 3.2,
      potassium: 650,
    },
    top_recipes: [
      {
        id: '1',
        name: 'Traditional Butter Chicken (Restaurant Style)',
        similarity: 0.92,
        estimated_calories: 550,
      },
      {
        id: '2',
        name: 'Homemade Chicken Tikka Masala',
        similarity: 0.88,
        estimated_calories: 480,
      },
      {
        id: '3',
        name: 'Chicken Curry with Rice',
        similarity: 0.85,
        estimated_calories: 520,
      },
    ],
    assumptions: [
      'Standard restaurant serving size (~350g)',
      'Moderate oil/butter usage',
      'Includes rice portion (1 cup)',
    ],
    uncertainty_factors: [
      'Exact spice blend unknown',
      'Cream amount may vary',
      'Rice type not specified',
    ],
  };
}

// ============================================================================
// HISTORY MANAGEMENT
// ============================================================================

/**
 * Fetch all history entries for the user
 * 
 * Backend endpoint: GET /api/history
 * 
 * @returns Array of history entries sorted by date (newest first)
 */
export async function fetchHistoryEntries(): Promise<HistoryEntry[]> {
  // TODO: Implement actual API call
  console.log('🚀 [API] fetchHistoryEntries called');
  
  // TODO: Replace with actual API call:
  /*
  return apiRequest<HistoryEntry[]>(ENDPOINTS.HISTORY_LIST, {
    method: 'GET',
  });
  */

  // Mock data (remove when backend integrated)
  return [];
}

/**
 * Save a new history entry
 * 
 * Backend endpoint: POST /api/history
 * 
 * @param entry - History entry data to save
 * @returns Saved entry with generated ID
 */
export async function saveHistoryEntry(
  entry: Omit<HistoryEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<HistoryEntry> {
  // TODO: Implement actual API call
  console.log('🚀 [API] saveHistoryEntry called with:', entry);

  // TODO: Replace with actual API call:
  /*
  return apiRequest<HistoryEntry>(ENDPOINTS.HISTORY_CREATE, {
    method: 'POST',
    body: JSON.stringify(entry),
  });
  */

  // Mock response (remove when backend integrated)
  return {
    ...entry,
    id: `hist_${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Update an existing history entry
 * 
 * Backend endpoint: PUT /api/history/:id
 * 
 * @param id - History entry ID
 * @param updates - Fields to update (e.g., is_favorite)
 * @returns Updated entry
 */
export async function updateHistoryEntry(
  id: string,
  updates: Partial<HistoryEntry>
): Promise<HistoryEntry> {
  // TODO: Implement actual API call
  console.log('🚀 [API] updateHistoryEntry called:', { id, updates });

  // TODO: Replace with actual API call:
  /*
  return apiRequest<HistoryEntry>(
    ENDPOINTS.HISTORY_UPDATE.replace(':id', id),
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    }
  );
  */

  throw new Error('Not implemented - mock only');
}

/**
 * Delete a history entry
 * 
 * Backend endpoint: DELETE /api/history/:id
 * 
 * @param id - History entry ID to delete
 */
export async function deleteHistoryEntry(id: string): Promise<void> {
  // TODO: Implement actual API call
  console.log('🚀 [API] deleteHistoryEntry called with:', id);

  // TODO: Replace with actual API call:
  /*
  await apiRequest(ENDPOINTS.HISTORY_DELETE.replace(':id', id), {
    method: 'DELETE',
  });
  */

  // Mock success
  return Promise.resolve();
}

// ============================================================================
// DISHES CATALOG (Explore Tab)
// ============================================================================

/**
 * Fetch featured dishes for Explore tab
 * 
 * Backend endpoint: GET /api/dishes/featured
 * 
 * @param category - Filter by category ('restaurant' or 'home')
 * @param limit - Maximum number of dishes to return
 * @returns Array of featured dishes
 */
export async function fetchFeaturedDishes(
  category?: 'restaurant' | 'home',
  limit: number = 10
): Promise<DishCatalogEntry[]> {
  // TODO: Implement actual API call
  console.log('🚀 [API] fetchFeaturedDishes called:', { category, limit });

  // TODO: Replace with actual API call:
  /*
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  params.append('limit', limit.toString());
  
  return apiRequest<DishCatalogEntry[]>(
    `${ENDPOINTS.DISHES_FEATURED}?${params.toString()}`,
    { method: 'GET' }
  );
  */

  // Mock data (remove when backend integrated)
  return [];
}

/**
 * Search dishes catalog
 * 
 * Backend endpoint: GET /api/dishes/search?q={query}
 * 
 * @param query - Search query string
 * @param limit - Maximum results to return
 * @returns Array of matching dishes
 */
export async function searchDishes(
  query: string,
  limit: number = 20
): Promise<DishCatalogEntry[]> {
  // TODO: Implement actual API call
  console.log('🚀 [API] searchDishes called:', { query, limit });

  // TODO: Replace with actual API call:
  /*
  const params = new URLSearchParams({ q: query, limit: limit.toString() });
  return apiRequest<DishCatalogEntry[]>(
    `${ENDPOINTS.DISHES_SEARCH}?${params.toString()}`,
    { method: 'GET' }
  );
  */

  // Mock data (remove when backend integrated)
  return [];
}

// ============================================================================
// FEEDBACK
// ============================================================================

/**
 * Submit user feedback for a nutrition estimate
 * 
 * Backend endpoint: POST /api/feedback
 * 
 * @param feedback - Feedback data
 */
export async function submitFeedback(
  feedback: FeedbackSubmission
): Promise<void> {
  // TODO: Implement actual API call
  console.log('🚀 [API] submitFeedback called:', feedback);

  // TODO: Replace with actual API call:
  /*
  await apiRequest(ENDPOINTS.FEEDBACK_SUBMIT, {
    method: 'POST',
    body: JSON.stringify(feedback),
  });
  */

  // Mock success
  return Promise.resolve();
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

/**
 * Check if backend API is available
 * 
 * Backend endpoint: GET /health
 * 
 * @returns Health status
 */
export async function checkHealth(): Promise<{ status: string; version?: string }> {
  try {
    return await apiRequest<{ status: string; version?: string }>(
      ENDPOINTS.HEALTH,
      { method: 'GET' }
    );
  } catch (error) {
    console.error('❌ [API] Health check failed:', error);
    throw error;
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  // Label
  generateNutritionLabel,
  
  // History
  fetchHistoryEntries,
  saveHistoryEntry,
  updateHistoryEntry,
  deleteHistoryEntry,
  
  // Dishes
  fetchFeaturedDishes,
  searchDishes,
  
  // Feedback
  submitFeedback,
  
  // Health
  checkHealth,
};
