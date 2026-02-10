"""Quick test of dish search API"""
import requests

def test_search(query):
    print(f"\n🔍 Searching for: '{query}'")
    print("=" * 70)
    
    r = requests.get(f'http://localhost:8000/dishes/search?q={query}&k=5')
    dishes = r.json()
    
    if dishes:
        for i, dish in enumerate(dishes, 1):
            sim_score = dish.get('sim', 0) * 100
            print(f"{i}. {dish['name'][:65]}")
            print(f"   Similarity: {sim_score:.1f}%")
    else:
        print("No results found")
    
    print(f"\nTotal results: {len(dishes)}")

# Test various searches
test_search("pizza")
test_search("chicken breast")
test_search("chocolate chip cookies")
test_search("greek yogurt")
test_search("oatmeal")
