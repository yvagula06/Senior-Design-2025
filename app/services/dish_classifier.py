"""
Dish Classification Service

Uses OpenAI Vision API (GPT-4o-mini) for real-time dish classification.
Falls back to mocked predictions if API fails or is unavailable.
"""

from typing import List, Dict
import base64
import os
import logging
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class DishClassifier:
    """OpenAI Vision-powered dish classifier with fallback."""
    
    def __init__(self):
        """Initialize OpenAI client and fallback predictions."""
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.client = None
        
        if self.api_key:
            try:
                self.client = OpenAI(api_key=self.api_key)
                logger.info(f"✅ OpenAI Vision API initialized with model: {self.model}")
            except Exception as e:
                logger.warning(f"⚠️ Failed to initialize OpenAI client: {e}")
                self.client = None
        else:
            logger.warning("⚠️ OPENAI_API_KEY not found, using fallback predictions")
        
        # Fallback predictions if API fails
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
    ) -> List[Dict[str, any]]:
        """
        Classify dish from base64-encoded image using OpenAI Vision API.
        
        Args:
            image_base64: Base64-encoded image data
            top_k: Number of top predictions to return
            
        Returns:
            List of predictions with dish_id, dish_name, confidence, category
        """
        # Try OpenAI Vision API first
        if self.client:
            try:
                return self._classify_with_openai(image_base64, top_k)
            except Exception as e:
                logger.error(f"❌ OpenAI API failed: {e}, using fallback")
        
        # Fallback to mocked predictions
        logger.warning(f"Using fallback predictions for dish classification")
        return self.fallback_predictions[:top_k]
    
    def _classify_with_openai(self, image_base64: str, top_k: int) -> List[Dict[str, any]]:
        """
        Use OpenAI Vision API to classify dish.
        
        Args:
            image_base64: Base64-encoded image
            top_k: Number of predictions
            
        Returns:
            List of dish predictions
        """
        # Prepare prompt for OpenAI
        prompt = f"""Analyze this food image and identify the dish(es). Return exactly {top_k} dish predictions.

For each dish, provide:
1. dish_name: The specific name of the dish (e.g., "Grilled Chicken Caesar Salad", "Spaghetti Carbonara")
2. confidence: Your confidence score from 0.0 to 1.0 (be realistic, usually 0.6-0.9)
3. category: Primary food category (e.g., "salad", "pasta", "meat", "seafood", "vegetarian", "dessert", "soup")

Return ONLY valid JSON in this exact format:
{{
  "predictions": [
    {{"dish_name": "...", "confidence": 0.85, "category": "..."}},
    {{"dish_name": "...", "confidence": 0.75, "category": "..."}},
    {{"dish_name": "...", "confidence": 0.65, "category": "..."}}
  ]
}}

Be specific with dish names. If you see multiple components, name the main dish."""

        # Call OpenAI Vision API
        response = self.client.chat.completions.create(
            model=self.model,
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
    
    def _parse_natural_language(self, content: str, top_k: int) -> List[Dict[str, any]]:
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


def classify_dish(image_base64: str, top_k: int = 3) -> List[Dict[str, any]]:
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
