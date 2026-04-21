"""
Clarifai API Client for Vision Services

Provides dish classification and food segmentation using Clarifai's API.
Centralizes all external vision API calls with retry logic and error handling.

According to Camera_Functionality_Plan.md:
- Dish identification (top-1 + top-K labels + confidence)
- Segmentation (food region mask)
"""

import os
import base64
import logging
from typing import List, Dict, Optional, Tuple
from dotenv import load_dotenv
from clarifai_grpc.channel.clarifai_channel import ClarifaiChannel

load_dotenv()
from clarifai_grpc.grpc.api import resources_pb2, service_pb2, service_pb2_grpc
from clarifai_grpc.grpc.api.status import status_code_pb2
import time

logger = logging.getLogger(__name__)


class ClarifaiClient:
    """
    Clarifai API client for dish classification and segmentation.
    
    Uses Clarifai's food recognition models for:
    - Dish identification with confidence scores
    - Food region segmentation
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Clarifai client.
        
        Args:
            api_key: Clarifai PAT (Personal Access Token). If None, reads from env.
        """
        self.api_key = api_key or os.getenv("CLARIFAI_API_KEY")
        if not self.api_key:
            logger.warning("⚠️ CLARIFAI_API_KEY not found, client will fail on actual calls")
            self.stub = None
            return
        
        # Initialize Clarifai gRPC stub
        try:
            channel = ClarifaiChannel.get_grpc_channel()
            self.stub = service_pb2_grpc.V2Stub(channel)
            logger.info("✅ Clarifai client initialized")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Clarifai client: {e}")
            self.stub = None
        
        # Clarifai model IDs for food recognition
        # Using Clarifai's public food-item-recognition model
        self.food_model_id = "food-item-recognition"
        self.food_model_version_id = ""  # Empty string uses latest version
        
        # User and app IDs (using Clarifai's public models)
        self.user_id = "clarifai"
        self.app_id = "main"
        
        # Request configuration
        self.max_retries = 3
        self.retry_delay = 1.0  # seconds
        self.request_timeout = 10.0  # seconds
    
    def predict_dish(
        self,
        image_base64: str,
        top_k: int = 3
    ) -> List[Dict[str, any]]:
        """
        Classify dish from base64-encoded image using Clarifai.
        
        Args:
            image_base64: Base64-encoded image data (JPEG or PNG)
            top_k: Number of top predictions to return
            
        Returns:
            List of predictions with dish_id, dish_name, confidence, category
            Format: [
                {
                    "dish_id": "concept_id",
                    "dish_name": "Pizza",
                    "confidence": 0.95,
                    "category": "italian"
                },
                ...
            ]
            
        Raises:
            ValueError: If API key is missing or image data is invalid
            RuntimeError: If API call fails after retries
        """
        if not self.stub:
            raise ValueError("Clarifai client not initialized (missing API key)")
        
        if not image_base64:
            raise ValueError("Image data cannot be empty")

        # Strip data URI prefix if present (e.g. "data:image/jpeg;base64,...")
        if "," in image_base64:
            image_base64 = image_base64.split(",", 1)[1]

        # Decode base64 to bytes
        try:
            image_bytes = base64.b64decode(image_base64)
        except Exception as e:
            raise ValueError(f"Invalid base64 image data: {e}")
        
        # Build Clarifai request
        metadata = (("authorization", f"Key {self.api_key}"),)
        
        request = service_pb2.PostModelOutputsRequest(
            user_app_id=resources_pb2.UserAppIDSet(
                user_id=self.user_id,
                app_id=self.app_id
            ),
            model_id=self.food_model_id,
            version_id=self.food_model_version_id,
            inputs=[
                resources_pb2.Input(
                    data=resources_pb2.Data(
                        image=resources_pb2.Image(
                            base64=image_bytes
                        )
                    )
                )
            ]
        )
        
        # Call API with retries
        for attempt in range(self.max_retries):
            try:
                response = self.stub.PostModelOutputs(
                    request,
                    metadata=metadata,
                    timeout=self.request_timeout
                )
                
                # Check response status
                if response.status.code != status_code_pb2.SUCCESS:
                    error_msg = f"Clarifai API error: {response.status.description}"
                    logger.error(f"❌ {error_msg}")
                    
                    if attempt < self.max_retries - 1:
                        logger.info(f"Retrying... (attempt {attempt + 2}/{self.max_retries})")
                        time.sleep(self.retry_delay)
                        continue
                    else:
                        raise RuntimeError(error_msg)
                
                # Parse predictions
                predictions = []
                if response.outputs:
                    output = response.outputs[0]
                    concepts = output.data.concepts[:top_k]
                    
                    for idx, concept in enumerate(concepts):
                        # Extract dish info
                        dish_name = concept.name
                        confidence = concept.value
                        
                        # Infer category from dish name (simple heuristics)
                        category = self._infer_category(dish_name)
                        
                        predictions.append({
                            "dish_id": concept.id,
                            "dish_name": dish_name,
                            "confidence": round(confidence, 3),
                            "category": category
                        })
                
                logger.info(f"✅ Clarifai predicted {len(predictions)} dishes")
                return predictions
                
            except Exception as e:
                logger.error(f"❌ Clarifai API call failed (attempt {attempt + 1}): {e}")
                
                if attempt < self.max_retries - 1:
                    time.sleep(self.retry_delay)
                else:
                    raise RuntimeError(f"Clarifai API failed after {self.max_retries} attempts: {e}")
        
        return []
    
    def segment_food(
        self,
        image_base64: str
    ) -> Dict[str, any]:
        """
        Segment food regions from image using Clarifai.
        
        NOTE: Clarifai's food models primarily provide classification, not pixel-level
        segmentation. This method returns bounding box data if available, or placeholder
        mask metadata for Phase 1 MVP.
        
        For true pixel-level segmentation, consider:
        - Clarifai's general segmentation models (if available)
        - Self-hosted Segment Anything Model (SAM)
        - Other segmentation services
        
        Args:
            image_base64: Base64-encoded image data
            
        Returns:
            Dict with mask metadata:
            {
                "mask_available": bool,
                "segmentation_quality": float (0-1),
                "food_region_pixels": int,
                "total_pixels": int,
                "coverage_ratio": float,
                "bounding_boxes": List[Dict] (if available)
            }
        """
        # For Phase 1, return placeholder segmentation data
        # Clarifai's food model doesn't provide pixel masks out of the box
        
        logger.warning("⚠️ Using placeholder segmentation data (Clarifai food model doesn't provide pixel masks)")
        
        return {
            "mask_available": False,
            "segmentation_quality": 0.75,  # Assumed quality
            "food_region_pixels": 0,
            "total_pixels": 0,
            "coverage_ratio": 0.6,  # Assumed coverage
            "bounding_boxes": [],
            "method": "placeholder"
        }
    
    def _infer_category(self, dish_name: str) -> str:
        """
        Infer food category from dish name using simple heuristics.
        
        Args:
            dish_name: Name of the dish
            
        Returns:
            Category string
        """
        dish_lower = dish_name.lower()
        
        # Category mappings (expand as needed)
        category_keywords = {
            "pizza": ["pizza"],
            "pasta": ["pasta", "spaghetti", "fettuccine", "penne", "linguine"],
            "rice": ["rice", "biryani", "risotto", "paella"],
            "salad": ["salad", "greens"],
            "soup": ["soup", "broth", "chowder", "bisque"],
            "sandwich": ["sandwich", "burger", "sub", "wrap"],
            "meat": ["chicken", "beef", "pork", "steak", "lamb"],
            "seafood": ["fish", "salmon", "tuna", "shrimp", "lobster"],
            "dessert": ["cake", "pie", "ice cream", "cookie", "brownie"],
            "breakfast": ["pancake", "waffle", "eggs", "omelette"],
        }
        
        for category, keywords in category_keywords.items():
            if any(keyword in dish_lower for keyword in keywords):
                return category
        
        return "other"
    
    def health_check(self) -> bool:
        """
        Check if Clarifai API is accessible.
        
        Returns:
            True if API is reachable and authenticated
        """
        if not self.stub:
            return False
        
        try:
            # Simple health check: list models (minimal API call)
            metadata = (("authorization", f"Key {self.api_key}"),)
            request = service_pb2.ListModelsRequest(
                user_app_id=resources_pb2.UserAppIDSet(
                    user_id=self.user_id,
                    app_id=self.app_id
                ),
                per_page=1
            )
            
            response = self.stub.ListModels(
                request,
                metadata=metadata,
                timeout=5.0
            )
            
            return response.status.code == status_code_pb2.SUCCESS
        except Exception as e:
            logger.error(f"❌ Clarifai health check failed: {e}")
            return False


# Singleton instance
_clarifai_client = None


def get_clarifai_client() -> ClarifaiClient:
    """Get or create singleton Clarifai client instance."""
    global _clarifai_client
    if _clarifai_client is None:
        _clarifai_client = ClarifaiClient()
    return _clarifai_client


# Convenience functions
def predict_dish(image_base64: str, top_k: int = 3) -> List[Dict[str, any]]:
    """Predict dish from image (convenience function)."""
    client = get_clarifai_client()
    return client.predict_dish(image_base64, top_k)


def segment_food(image_base64: str) -> Dict[str, any]:
    """Segment food from image (convenience function)."""
    client = get_clarifai_client()
    return client.segment_food(image_base64)


def check_health() -> bool:
    """Check Clarifai API health (convenience function)."""
    client = get_clarifai_client()
    return client.health_check()
