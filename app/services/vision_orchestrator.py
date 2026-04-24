"""
Vision Orchestrator Service

Orchestrates the entire vision-based meal estimation pipeline:
1. Mode detection (depth/multi_angle/reference_based)
2. Dish classification
3. Food segmentation
4. Volume estimation
5. Nutrition mapping
6. Confidence calculation
7. Response assembly
"""

from datetime import datetime
import time

from app.schemas.vision import (
    VisionRequest,
    VisionResponse,
    DishPrediction,
    SelectedDish,
    CalorieEstimate,
    CalorieRange,
    VolumeEstimate,
    EstimationMode,
    SuggestedMealLog,
    ResponseMetadata,
    ModelVersions
)
from app.services import (
    dish_classifier,
    segmentation_service,
    volume_estimator,
    nutrition_mapper,
    vision_confidence_adapter
)


class VisionOrchestrator:
    """Orchestrates vision-based meal estimation pipeline."""
    
    def __init__(self):
        """Initialize orchestrator."""
        self.model_versions = ModelVersions(
            classifier="mocked_v1.0",
            segmentation="mocked_v1.0",
            volume_estimator="mocked_v1.0"
        )
    
    def estimate_meal(self, request: VisionRequest) -> VisionResponse:
        """
        Execute full vision estimation pipeline.
        
        Args:
            request: VisionRequest with images and metadata
            
        Returns:
            VisionResponse with calorie estimate and metadata
        """
        start_time = time.time()
        warnings = []
        
        # STEP 1: Mode Detection
        estimation_mode = self._detect_mode(request)
        
        # STEP 2: Dish Classification
        # Use first image for classification
        primary_image = request.images[0].data
        predictions = dish_classifier.classify_dish(primary_image, top_k=3)
        
        # Convert to schema format
        dish_predictions = [
            DishPrediction(
                dish_id=p["dish_id"],
                dish_name=p["dish_name"],
                confidence=p["confidence"],
                category=p.get("category")
            )
            for p in predictions
        ]
        
        # Select top prediction
        selected = predictions[0]
        selected_dish = SelectedDish(
            dish_id=selected["dish_id"],
            dish_name=selected["dish_name"],
            confidence=selected["confidence"]
        )
        
        # STEP 3: Food Segmentation
        image_data_list = [img.data for img in request.images]
        masks = segmentation_service.segment_food(image_data_list)
        
        # Extract segmentation quality with defensive check
        if not masks or len(masks) == 0:
            warnings.append("Segmentation returned empty masks, using fallback quality")
            avg_segmentation_quality = 0.5  # Fallback to neutral quality
        else:
            avg_segmentation_quality = sum(m.get("segmentation_quality", 0.5) for m in masks) / len(masks)
        
        # STEP 4: Volume Estimation
        depth_data_dict = None
        if request.depth_data:
            depth_data_dict = {
                "depth_map": request.depth_data.depth_map,
                "format": request.depth_data.format.value,
                "scale": request.depth_data.scale
            }
        
        intrinsics_dict = None
        if request.camera_intrinsics:
            intrinsics_dict = {
                "focal_length_x": request.camera_intrinsics.focal_length_x,
                "focal_length_y": request.camera_intrinsics.focal_length_y,
                "principal_point_x": request.camera_intrinsics.principal_point_x,
                "principal_point_y": request.camera_intrinsics.principal_point_y,
                "image_width": request.camera_intrinsics.image_width,
                "image_height": request.camera_intrinsics.image_height
            }
        
        volume_result = volume_estimator.estimate_volume(
            estimation_mode=estimation_mode.value,
            images_base64=image_data_list,
            masks=masks,
            depth_data=depth_data_dict,
            camera_intrinsics=intrinsics_dict
        )
        
        # Defensive check for invalid volume
        if volume_result.get("volume_ml", 0) <= 0:
            warnings.append(f"Invalid volume estimate ({volume_result.get('volume_ml', 0)}ml), using fallback")
            volume_result["volume_ml"] = 250.0  # Fallback to typical single serving (~1 cup)
            volume_result["confidence"] = 0.3  # Low confidence for fallback
            volume_result["uncertainty"] = 0.5  # High uncertainty
        
        # STEP 5: Nutrition Mapping
        # The classifier returns a human-readable dish name, not a real DB
        # primary key. map_by_name resolves it via pgvector semantic search so
        # nutrient data always comes from the canonical dishes table.
        nutrition_result = nutrition_mapper.map_by_name(
            dish_name=selected_dish.dish_name,
            volume_ml=volume_result["volume_ml"]
        )
        
        # Defensive handling of nutrition mapping failures
        if not nutrition_result.get("success", False) or nutrition_result.get("calories", 0) <= 0:
            warnings.append(f"Nutrition mapping failed: {nutrition_result.get('error', 'Unknown error')}")
            # Fallback: estimate calories based on volume (rough approximation)
            # Typical food energy density: 0.5-2.0 kcal/ml, use 1.0 as middle ground
            fallback_calories = volume_result["volume_ml"] * 1.0
            nutrition_result["calories"] = fallback_calories
            nutrition_result["success"] = False  # Mark as fallback
            warnings.append(f"Using fallback calorie estimate: {fallback_calories:.1f} kcal")
        
        # STEP 6: Confidence Calculation
        confidence_result = vision_confidence_adapter.calculate_confidence(
            classification_confidence=selected_dish.confidence,
            estimation_mode=estimation_mode.value,
            volume_uncertainty=volume_result["uncertainty"],
            segmentation_quality=avg_segmentation_quality
        )
        
        accuracy_score = confidence_result["accuracy_score"]
        range_multiplier = confidence_result["range_multiplier"]
        
        # STEP 7: Calculate Calorie Range
        calories = max(0, nutrition_result.get("calories", 0))  # Ensure non-negative
        
        # Additional safety check
        if calories == 0:
            warnings.append("Zero calorie estimate, using minimum viable estimate")
            calories = 50.0  # Minimum viable meal calories
        
        calorie_min = calories * (1 - range_multiplier)
        calorie_max = calories * (1 + range_multiplier)
        
        calorie_estimate = CalorieEstimate(
            value=round(calories, 1),
            range=CalorieRange(
                min=round(calorie_min, 1),
                max=round(calorie_max, 1)
            ),
            unit="kcal"
        )
        
        # Volume estimate
        volume_estimate = VolumeEstimate(
            value=round(volume_result["volume_ml"], 1),
            unit=volume_result["unit"],
            confidence=volume_result["confidence"]
        )
        
        # Suggested meal log — use dish_id resolved from DB (not the fake
        # string ID that the classifier returns).
        suggested_meal_log = SuggestedMealLog(
            dish_id=nutrition_result.get("dish_id", selected_dish.dish_id),
            dish_name=nutrition_result.get("dish_name", selected_dish.dish_name),
            calories=round(calories, 1),
            serving_size=f"~{round(volume_result['volume_ml'])}ml",
            timestamp=datetime.now(),
            notes=f"Estimated via {estimation_mode.value} mode"
        )
        
        # Response metadata
        processing_time = int((time.time() - start_time) * 1000)
        metadata = ResponseMetadata(
            processing_time_ms=processing_time,
            model_versions=self.model_versions,
            warnings=warnings if warnings else None
        )
        
        # Assemble final response
        response = VisionResponse(
            dish_predictions=dish_predictions,
            selected_dish=selected_dish,
            calorie_estimate=calorie_estimate,
            volume_estimate=volume_estimate,
            estimation_mode=estimation_mode,
            accuracy_score=round(accuracy_score, 3),
            suggested_meal_log=suggested_meal_log,
            metadata=metadata,
            estimate_id=None
        )
        
        return response
    
    def _detect_mode(self, request: VisionRequest) -> EstimationMode:
        """
        Detect estimation mode based on request data.
        
        Decision tree:
        1. If depth_data AND camera_intrinsics → depth
        2. Elif multiple images with top + side/oblique → multi_angle
        3. Else → reference_based
        
        Args:
            request: VisionRequest
            
        Returns:
            EstimationMode enum
        """
        # Check for depth mode
        if request.depth_data and request.camera_intrinsics:
            return EstimationMode.DEPTH
        
        # Check for multi-angle mode
        if len(request.images) >= 2:
            angles = [img.angle.value for img in request.images]
            has_top = "top" in angles
            has_side_or_oblique = "side" in angles or "oblique" in angles
            
            if has_top and has_side_or_oblique:
                return EstimationMode.MULTI_ANGLE
        
        # Default to reference-based
        return EstimationMode.REFERENCE_BASED


# Singleton instance
_orchestrator_instance = None


def get_orchestrator() -> VisionOrchestrator:
    """Get or create singleton orchestrator instance."""
    global _orchestrator_instance
    if _orchestrator_instance is None:
        _orchestrator_instance = VisionOrchestrator()
    return _orchestrator_instance


def estimate_meal(request: VisionRequest) -> VisionResponse:
    """
    Execute vision estimation pipeline (convenience function).
    
    Args:
        request: VisionRequest
        
    Returns:
        VisionResponse
    """
    orchestrator = get_orchestrator()
    return orchestrator.estimate_meal(request)
