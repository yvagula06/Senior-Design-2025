import requests

tests = [
    {"dish_name": "pepperoni pizza"},
    {"dish_name": "chocolate chip cookie"},
    {"dish_name": "greek yogurt"},
    {"dish_name": "burger", "target_calories": 500},
    {"dish_name": "pasta with marinara sauce"},
]

print("\n" + "="*80)
print("NUTRITION LABEL CALCULATION TEST")
print("="*80)

for test in tests:
    dish = test["dish_name"]
    target_cal = test.get("target_calories")
    
    print(f"\n🍽️  {dish.upper()}" + (f" (target: {target_cal} cal)" if target_cal else ""))
    print("-" * 80)
    
    r = requests.post('http://localhost:8000/label', json=test)
    result = r.json()
    
    print(f"✅ Matched: {result['matched_dish']}")
    print(f"🎯 Confidence: {result['confidence']*100:.1f}% - {result['explanation']}")
    
    n = result['nutrition']
    print("\n📊 Nutrition (per 100g unless scaled):")
    print(f"   Calories:  {n['calories']} kcal")
    print(f"   Protein:   {n['protein_g']}g")
    print(f"   Carbs:     {n['carbs_g']}g")
    print(f"   Fat:       {n['fat_g']}g")
    if n.get('fiber_g'):
        print(f"   Fiber:     {n['fiber_g']}g")
    if n.get('sugar_g'):
        print(f"   Sugar:     {n['sugar_g']}g")
    if n.get('sodium_mg'):
        print(f"   Sodium:    {n['sodium_mg']}mg")
    
    # Verify macros add up reasonably (protein=4cal/g, carbs=4cal/g, fat=9cal/g)
    calc_cal = n['protein_g'] * 4 + n['carbs_g'] * 4 + n['fat_g'] * 9
    print(f"\n🔍 Verification: Calculated calories from macros = {calc_cal:.1f} kcal")
    diff = abs(n['calories'] - calc_cal)
    if diff < n['calories'] * 0.15:  # Within 15% is reasonable (fiber, rounding, etc.)
        print(f"   ✅ PASS - Difference: {diff:.1f} kcal ({diff/n['calories']*100:.1f}%)")
    else:
        print(f"   ⚠️  WARN - Difference: {diff:.1f} kcal ({diff/n['calories']*100:.1f}%)")

print("\n" + "="*80)
print("TEST COMPLETE")
print("="*80 + "\n")
