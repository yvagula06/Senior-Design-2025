"""Test nutrition label generation with the new database"""
import requests
import json

def test_label(dish_name, target_calories=None):
    print(f"\n{'='*70}")
    print(f"🍽️  Testing: '{dish_name}'")
    if target_calories:
        print(f"🎯 Target calories: {target_calories}")
    print('='*70)
    
    payload = {"dish_name": dish_name}
    if target_calories:
        payload["target_calories"] = target_calories
    
    try:
        r = requests.post('http://localhost:8000/label/nutrition-label', json=payload)
        r.raise_for_status()
        result = r.json()
        
        print(f"\n✅ Matched: {result['matched_dish']}")
        print(f"🔍 Confidence: {result['confidence']*100:.1f}% - {result['explanation']}")
        print(f"\n📊 Nutrition Facts (per 100g):")
        nutrition = result['nutrition']
        print(f"   Calories:    {nutrition.get('calories', 'N/A')} kcal")
        print(f"   Protein:     {nutrition.get('protein_g', 'N/A')}g")
        print(f"   Carbs:       {nutrition.get('carbs_g', 'N/A')}g")
        print(f"   Fat:         {nutrition.get('fat_g', 'N/A')}g")
        if nutrition.get('fiber_g'):
            print(f"   Fiber:       {nutrition['fiber_g']}g")
        if nutrition.get('sugar_g'):
            print(f"   Sugar:       {nutrition['sugar_g']}g")
        if nutrition.get('sodium_mg'):
            print(f"   Sodium:      {nutrition['sodium_mg']}mg")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Response: {e.response.text}")

# Test various dishes
test_label("grilled chicken breast")
test_label("pepperoni pizza")
test_label("caesar salad with chicken")
test_label("chocolate chip cookie")
test_label("greek yogurt with honey")

# Test with target calories
print("\n" + "="*70)
print("Testing with target calories (portion scaling)")
print("="*70)
test_label("burger", target_calories=500)
