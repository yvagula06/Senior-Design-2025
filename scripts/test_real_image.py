"""
Test OpenAI Vision with a realistic food image.
"""
import base64
import sys
from pathlib import Path
from PIL import Image
import io

sys.path.insert(0, str(Path(__file__).parent))

from app.services.dish_classifier import DishClassifier


def create_test_food_image() -> str:
    """Create a simple test food image (red/green pattern simulating a plate)."""
    # Create a 300x300 image with gradient (simulate a food photo)
    img = Image.new('RGB', (300, 300))
    pixels = img.load()
    
    # Create a circular "plate" pattern
    for x in range(300):
        for y in range(300):
            # Distance from center
            dx = x - 150
            dy = y - 150
            dist = (dx*dx + dy*dy) ** 0.5
            
            if dist < 100:
                # Center "food" area - reddish/orange
                pixels[x, y] = (200, 100, 50)
            elif dist < 120:
                # Edge - brown (crust/edge)
                pixels[x, y] = (139, 90, 60)
            else:
                # Background - white plate
                pixels[x, y] = (240, 240, 240)
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=85)
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


def test_with_real_image():
    """Test OpenAI Vision API with a realistic food-like image."""
    print("🧪 Testing OpenAI Vision with realistic food image...")
    
    # Create test image
    print("📸 Creating test food image...")
    image_base64 = create_test_food_image()
    print(f"✅ Image created ({len(image_base64)} bytes base64)")
    
    # Initialize classifier
    classifier = DishClassifier()
    
    if not classifier.client:
        print("❌ OpenAI client not initialized")
        return False
    
    print(f"✅ Using model: {classifier.model}")
    
    # Try classification
    try:
        print("\n🔍 Calling OpenAI Vision API...")
        predictions = classifier.classify_dish(image_base64, top_k=3)
        
        print("\n📊 Top Predictions:")
        for i, pred in enumerate(predictions, 1):
            conf_bar = "█" * int(pred['confidence'] * 20)
            print(f"  {i}. {pred['dish_name']}")
            print(f"     Category: {pred['category']}")
            print(f"     Confidence: {conf_bar} {pred['confidence']:.1%}")
        
        print("\n✅ OpenAI Vision integration working!")
        return True
        
    except Exception as e:
        print(f"\n❌ Failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_with_real_image()
    sys.exit(0 if success else 1)
