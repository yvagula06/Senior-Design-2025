"""
Dish Classification Service

Uses Clarifai API for dish classification as per Camera_Functionality_Plan.md.
Falls back to OpenAI Vision API, then to mocked predictions if both fail.
"""

from typing import Any, List, Dict
import os
import logging
from openai import OpenAI
from dotenv import load_dotenv

# Import Clarifai client
try:
    from app.services.vision_api_client import get_clarifai_client
    CLARIFAI_AVAILABLE = True
except ImportError as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"⚠️ Clarifai client not available: {e}")
    CLARIFAI_AVAILABLE = False

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class DishClassifier:
    """
    Dish classifier using Clarifai (primary) with OpenAI (fallback).
    
    Hierarchy:
    1. Clarifai API (preferred as per plan)
    2. OpenAI Vision API (fallback)
    3. Mocked predictions (last resort)
    """
    
    def __init__(self):
        """Initialize Clarifai and OpenAI clients with fallback predictions."""
        # Initialize Clarifai client
        self.clarifai_client = None
        if CLARIFAI_AVAILABLE:
            try:
                self.clarifai_client = get_clarifai_client()
                if self.clarifai_client.stub:
                    logger.info("✅ Clarifai client initialized (primary)")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize Clarifai: {e}")
        
        # Initialize OpenAI client (fallback)
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.openai_client = None
        
        if self.openai_api_key:
            try:
                self.openai_client = OpenAI(api_key=self.openai_api_key)
                logger.info(f"✅ OpenAI Vision API initialized (fallback) with model: {self.openai_model}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize OpenAI client: {e}")
                self.openai_client = None
        else:
            logger.warning("⚠️ OPENAI_API_KEY not found")
        
        # Fallback predictions if all APIs fail
        self.fallback_predictions = [
            {
                "dish_id": "1",
                "dish_name": "Grilled Chicken Breast",
                "confidence": 0.70,
                "category": "meat"
            },
            {
                "dish_id": "2",
                "dish_name": "Caesar Salad",
                "confidence": 0.60,
                "category": "salad"
            },
            {
                "dish_id": "3",
                "dish_name": "Spaghetti Carbonara",
                "confidence": 0.50,
                "category": "pasta"
            }
        ]
    
    def classify_dish(
        self,
        image_base64: str,
        top_k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Classify dish from base64-encoded image.
        
        Tries in order:
        1. Clarifai API (primary)
        2. OpenAI Vision API (fallback)
        3. Mocked predictions (last resort)
        
        Args:
            image_base64: Base64-encoded image data
            top_k: Number of top predictions to return
            
        Returns:
            List of predictions with dish_id, dish_name, confidence, category
        """
        # Try Clarifai first (per Camera_Functionality_Plan.md)
        if self.clarifai_client and self.clarifai_client.stub:
            try:
                logger.info("🔍 Trying Clarifai API for dish classification...")
                predictions = self.clarifai_client.predict_dish(image_base64, top_k)
                if predictions:
                    logger.info(f"✅ Clarifai classified: {[p['dish_name'] for p in predictions]}")
                    return predictions
            except Exception as e:
                logger.warning(f"⚠️ Clarifai API failed: {e}, trying OpenAI fallback")
        
        # Try OpenAI Vision API as fallback
        if self.openai_client:
            try:
                logger.info("🔍 Trying OpenAI Vision API (fallback)...")
                return self._classify_with_openai(image_base64, top_k)
            except Exception as e:
                logger.error(f"❌ OpenAI API also failed: {e}, using mocked fallback")
        
        # Last resort: return mocked predictions
        logger.warning("Using mocked fallback predictions for dish classification")
        return self.fallback_predictions[:top_k]
    
    def _classify_with_openai(self, image_base64: str, top_k: int) -> List[Dict[str, Any]]:
        """
        Use OpenAI Vision API to classify dish.
        
        Args:
            image_base64: Base64-encoded image
            top_k: Number of predictions
            
        Returns:
            List of dish predictions
        """
        # Prepare prompt for OpenAI
        prompt = f"""First, determine whether this image shows food or a meal that someone would eat.
Non-food items include: beverages in sealed containers (bottles, cans, cartons), empty plates, household objects, people, scenery, etc.

If the image does NOT show food/a meal, return:
{{
  "is_food": false,
  "predictions": []
}}

If the image DOES show food/a meal, identify the dish(es) and return exactly {top_k} predictions:
{{
  "is_food": true,
  "predictions": [
    {{"dish_name": "...", "confidence": 0.85, "category": "..."}},
    {{"dish_name": "...", "confidence": 0.75, "category": "..."}},
    {{"dish_name": "...", "confidence": 0.65, "category": "..."}}
  ]
}}

For each dish provide:
- dish_name: specific name (e.g., "Grilled Chicken Caesar Salad")
- confidence: 0.0–1.0 (be realistic, usually 0.6–0.9)
- category: food category (e.g., "salad", "pasta", "meat", "seafood", "vegetarian", "dessert", "soup")

Return ONLY valid JSON. Be specific with dish names."""

        # Call OpenAI Vision API
        response = self.openai_client.chat.completions.create(
            model=self.openai_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_completion_tokens=500  # Use max_completion_tokens for newer models
        )
        
        # Parse response
        content = response.choices[0].message.content
        
        # Check if response is empty (model doesn't support vision)
        if not content or len(content.strip()) == 0:
            logger.warning("⚠️ OpenAI returned empty response - model may not support vision")
            raise ValueError("Model does not support vision or returned empty response")
        
        logger.info(f"OpenAI Vision Response (full): {content}")
        
        # Extract JSON from response
        import json
        import re
        try:
            # Try to parse as direct JSON first
            try:
                data = json.loads(content)
            except json.JSONDecodeError:
                # Try to find JSON block in markdown or text
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', content, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                    data = json.loads(json_str)
                else:
                    # Try to find raw JSON object
                    start = content.find('{')
                    end = content.rfind('}') + 1
                    if start >= 0 and end > start:
                        json_str = content[start:end]
                        data = json.loads(json_str)
                    else:
                        # Parse natural language response
                        logger.info("Parsing natural language response...")
                        return self._parse_natural_language(content, top_k)
            
            predictions = data.get("predictions", [])

            # Non-food detection: classifier explicitly says it's not food
            if not data.get("is_food", True):
                logger.warning("🚫 OpenAI flagged image as non-food")
                raise ValueError("non_food_detected")
            
            # Format predictions with IDs
            formatted = []
            for i, pred in enumerate(predictions[:top_k], 1):
                formatted.append({
                    "dish_id": str(i),
                    "dish_name": pred.get("dish_name", "Unknown Dish"),
                    "confidence": float(pred.get("confidence", 0.5)),
                    "category": pred.get("category", "unknown")
                })
            
            logger.info(f"✅ OpenAI classified: {[p['dish_name'] for p in formatted]}")
            return formatted
                
        except Exception as e:
            logger.error(f"Failed to parse OpenAI response: {e}")
            raise
    
    def _parse_natural_language(self, content: str, top_k: int) -> List[Dict[str, Any]]:
        """
        Parse natural language response from OpenAI when JSON not returned.
        
        Args:
            content: Natural language response
            top_k: Number of predictions
            
        Returns:
            List of predictions
        """
        import re
        
        predictions = []
        
        # Try to extract dish names and confidence from natural language
        # Look for patterns like "1. Dish Name (category) - 0.85"
        pattern = r'(\d+)\.\s*([^(\n]+?)\s*(?:\(([^)]+)\))?\s*(?:-\s*([0-9.]+))?'
        matches = re.findall(pattern, content)
        
        for i, match in enumerate(matches[:top_k], 1):
            _, dish_name, category, confidence = match
            predictions.append({
                "dish_id": str(i),
                "dish_name": dish_name.strip(),
                "confidence": float(confidence) if confidence else 0.7,
                "category": category.strip().lower() if category else "unknown"
            })
        
        if not predictions:
            # Fallback: extract any capitalized words as dish names
            logger.warning("Could not parse structured response, using basic extraction")
            words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', content)
            for i, word in enumerate(words[:top_k], 1):
                predictions.append({
                    "dish_id": str(i),
                    "dish_name": word,
                    "confidence": 0.6,
                    "category": "unknown"
                })
        
        logger.info(f"✅ Parsed natural language: {[p['dish_name'] for p in predictions]}")
        return predictions


# Singleton instance
_classifier_instance = None


def get_classifier() -> DishClassifier:
    """Get or create singleton classifier instance."""
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = DishClassifier()
    return _classifier_instance


def classify_dish(image_base64: str, top_k: int = 3) -> List[Dict[str, Any]]:
    """
    Classify dish from image (convenience function).
    
    Args:
        image_base64: Base64-encoded image data
        top_k: Number of top predictions to return
        
    Returns:
        List of predictions
    """
    classifier = get_classifier()
    return classifier.classify_dish(image_base64, top_k)
