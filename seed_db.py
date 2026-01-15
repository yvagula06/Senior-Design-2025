from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer
import os
import json

# Load embedding model
print("Loading embedding model...")
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

engine = create_engine(os.getenv('DATABASE_URL'))

# Sample dishes
dishes = [
    {'name': 'Pizza', 'calories': 266, 'protein': 11, 'fat': 10, 'carbs': 33, 'fiber': 2.5, 'sugar': 3.6, 'sodium': 598},
    {'name': 'Burger', 'calories': 295, 'protein': 17, 'fat': 14, 'carbs': 24, 'fiber': 1.5, 'sugar': 5, 'sodium': 497},
    {'name': 'Pasta', 'calories': 131, 'protein': 5, 'fat': 1, 'carbs': 25, 'fiber': 1.8, 'sugar': 0.6, 'sodium': 1},
    {'name': 'Salad', 'calories': 33, 'protein': 2.8, 'fat': 0.2, 'carbs': 6.5, 'fiber': 2.1, 'sugar': 2.9, 'sodium': 65},
    {'name': 'Chicken Tikka Masala', 'calories': 137, 'protein': 14, 'fat': 6, 'carbs': 7, 'fiber': 1.2, 'sugar': 3, 'sodium': 450}
]

with engine.begin() as conn:
    for dish in dishes:
        # Insert dish
        result = conn.execute(text('''
            INSERT INTO dishes (name, calories, protein_g, fat_g, carbs_g, fiber_g, sugar_g, sodium_mg, data_source, confidence_score, is_active, version)
            VALUES (:name, :cal, :protein, :fat, :carbs, :fiber, :sugar, :sodium, 'test', 0.9, TRUE, 1)
            RETURNING id
        '''), {
            'name': dish['name'], 
            'cal': dish['calories'], 
            'protein': dish['protein'], 
            'fat': dish['fat'], 
            'carbs': dish['carbs'],
            'fiber': dish.get('fiber', 0),
            'sugar': dish.get('sugar', 0),
            'sodium': dish.get('sodium', 0)
        })
        dish_id = result.fetchone()[0]
        
        # Generate embedding
        embedding = model.encode(dish['name'].lower()).tolist()
        
        # Insert variant
        conn.execute(text('''
            INSERT INTO dish_variants (dish_id, variant_text, embedding, language_code, search_count)
            VALUES (:id, :text, :emb, 'en', 0)
        '''), {'id': dish_id, 'text': dish['name'].lower(), 'emb': json.dumps(embedding)})
        
        print(f'✅ Added {dish["name"]}')

print('\n✅ Sample data inserted successfully')
