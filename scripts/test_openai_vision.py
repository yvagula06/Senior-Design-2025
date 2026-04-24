"""
Quick test script for OpenAI Vision integration.
"""
import base64
import sys
from pathlib import Path

# Add app directory to path
sys.path.insert(0, str(Path(__file__).parent))

from app.services.dish_classifier import DishClassifier


def test_openai_vision():
    """Test OpenAI Vision API with a simple food image."""
    print("🧪 Testing OpenAI Vision Integration...")
    
    # Create a simple 1x1 pixel image (red pixel) as test
    # In real usage, this would be a real food photo
    red_pixel_png = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01'
        b'\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0'
        b'\x00\x00\x00\x03\x00\x01\x00\x00\x00\x18\xdd\x8d\xb4\x00\x00\x00\x00'
        b'IEND\xaeB`\x82'
    )
    
    # Encode to base64
    image_base64 = base64.b64encode(red_pixel_png).decode('utf-8')
    
    # Initialize classifier
    classifier = DishClassifier()
    
    if not classifier.client:
        print("❌ OpenAI client not initialized. Check your API key in .env")
        return False
    
    print(f"✅ OpenAI client initialized with model: {classifier.model}")
    
    # Try classification
    try:
        predictions = classifier.classify_dish(image_base64, top_k=3)
        
        print("\n📊 Predictions:")
        for pred in predictions:
            print(f"  - {pred['dish_name']} ({pred['category']}) - {pred['confidence']:.2f}")
        
        print("\n✅ OpenAI Vision integration successful!")
        return True
        
    except Exception as e:
        print(f"\n❌ Classification failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_openai_vision()
    sys.exit(0 if success else 1)
