/**
 * Vision API Type Definitions
 * 
 * TypeScript types matching backend Pydantic schemas for camera-based
 * meal estimation feature. These correspond to app/schemas/vision.py.
 */

/**
 * ========================================
 * REQUEST TYPES
 * ========================================
 */

export type CaptureAngle = 'top' | 'side' | 'diagonal';
export type DeviceType = 'ios' | 'android' | 'unknown';
export type CaptureMode = 'single' | 'multi_angle' | 'reference_object';
export type EstimationMode = 'depth' | 'multi_angle' | 'reference_based';

export interface ImageData {
  data: string;              // base64 encoded image
  angle: CaptureAngle;       // capture angle
  timestamp?: string;        // ISO 8601 format (optional)
}

export interface DepthData {
  depth_map: string;         // base64 encoded depth map
  format: 'rawDepth' | 'disparityFloat';
  confidence?: number;       // 0.0 to 1.0
}

export interface CameraIntrinsics {
  focal_length_x: number;
  focal_length_y: number;
  principal_point_x: number;
  principal_point_y: number;
  image_width: number;
  image_height: number;
}

export interface ReferenceObject {
  object_type: string;       // e.g., "credit_card", "coin", "ruler"
  known_dimension_cm: number; // known dimension in cm
  pixel_dimension: number;   // measured dimension in pixels
}

export interface RequestMetadata {
  device_type: DeviceType;
  capture_mode: CaptureMode;
  device_model?: string;     // optional device model
}

export interface VisionRequest {
  images: ImageData[];
  depth_data?: DepthData;
  camera_intrinsics?: CameraIntrinsics;
  reference_object?: ReferenceObject;
  metadata: RequestMetadata;
}

/**
 * ========================================
 * RESPONSE TYPES
 * ========================================
 */

export interface DishPrediction {
  dish_id: string;
  dish_name: string;
  confidence: number;        // 0.0 to 1.0
  category?: string;         // optional category
}

export interface SelectedDish {
  dish_id: string;
  dish_name: string;
  confidence: number;
}

export interface CalorieRange {
  min: number;
  max: number;
}

export interface CalorieEstimate {
  value: number;
  range: CalorieRange;
  unit: string;              // "kcal"
}

export interface VolumeEstimate {
  value: number;
  unit: string;              // "ml" or "cm3"
  confidence: number;        // 0.0 to 1.0
}

export interface AccuracyScore {
  overall: number;           // 0.0 to 1.0
  factors: {
    image_quality: number;
    lighting_conditions: number;
    angle_coverage: number;
    volume_confidence: number;
  };
}

export interface ModelVersions {
  classifier: string;
  segmentation: string;
  volume_estimator: string;
}

export interface ResponseMetadata {
  processing_time_ms: number;
  model_versions: ModelVersions;
  warnings?: string[];
}

export interface VisionResponse {
  dish_predictions: DishPrediction[];
  selected_dish: SelectedDish;
  calorie_estimate: CalorieEstimate;
  accuracy_score: AccuracyScore | number;  // Can be simple number or full object
  estimation_mode: EstimationMode;  // At root level per API spec
  metadata: ResponseMetadata;
  volume_estimate?: VolumeEstimate;  // Optional field from API
  suggested_meal_log?: any;  // Optional field from API
}

/**
 * ========================================
 * UI HELPER TYPES
 * ========================================
 */

export interface CameraState {
  isCapturing: boolean;
  hasPermission: boolean | null;
  imageUri: string | null;
  imageBase64: string | null;
}

export interface EstimationState {
  isLoading: boolean;
  response: VisionResponse | null;
  error: string | null;
}
