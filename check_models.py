"""Check available OpenAI models."""
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

print("📋 Checking available models...\n")

try:
    models = client.models.list()
    vision_models = []
    
    for model in models.data:
        model_id = model.id
        # Look for vision-capable models
        if any(keyword in model_id.lower() for keyword in ['vision', 'gpt-4', 'gpt-3.5']):
            vision_models.append(model_id)
    
    print("🔍 Vision-capable models:")
    for m in sorted(vision_models):
        print(f"  - {m}")
        
    if not vision_models:
        print("  (No vision models found, showing all models)")
        for model in sorted(models.data, key=lambda x: x.id):
            print(f"  - {model.id}")
            
except Exception as e:
    print(f"❌ Error: {e}")
