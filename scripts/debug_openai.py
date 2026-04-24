"""
Debug OpenAI response to see exact format.
"""
import base64
import sys
from pathlib import Path
from PIL import Image
import io
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

def create_test_image() -> str:
    """Create simple test image."""
    img = Image.new('RGB', (300, 300), color=(200, 100, 50))
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    buffer.seek(0)
    return base64.b64encode(buffer.read()).decode('utf-8')


print("🔍 Debug: Testing raw OpenAI API call...\n")

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
image_base64 = create_test_image()

prompt = """Analyze this food image and identify the dish(es). Return exactly 3 dish predictions.

For each dish, provide:
1. dish_name: The specific name
2. confidence: Score from 0.0 to 1.0
3. category: Primary category

Return ONLY valid JSON in this format:
{
  "predictions": [
    {"dish_name": "...", "confidence": 0.85, "category": "..."},
    {"dish_name": "...", "confidence": 0.75, "category": "..."},
    {"dish_name": "...", "confidence": 0.65, "category": "..."}
  ]
}"""

try:
    response = client.chat.completions.create(
        model="gpt-5-nano",
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
        max_completion_tokens=500
    )
    
    content = response.choices[0].message.content
    print("=" * 60)
    print("RAW RESPONSE:")
    print("=" * 60)
    print(content)
    print("=" * 60)
    print(f"\nResponse type: {type(content)}")
    print(f"Response length: {len(content)} chars")
    
except Exception as e:
    print(f"❌ Error: {e}")
