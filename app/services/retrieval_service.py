from typing import List, Tuple
from sqlalchemy import text
from app.schemas.label import Candidate, Nutrients
from app.db.session import engine
from app.utils.embeddings import get_model
import numpy as np
import re
from functools import lru_cache

@lru_cache(maxsize=256)
def retrieve_candidates(dish_name: str, k: int = 5) -> List[Tuple[Candidate, Nutrients]]:
    if not dish_name:
        return []

    model = get_model()
    query_vector = model.encode([dish_name], normalize_embeddings=False)[0]
    query_vector = np.asarray(query_vector, dtype=np.float32)

    with engine.connect() as conn:
        # Exact/alias match query
        exact_match_query = text("""
            SELECT d.dish_id, d.name, n.kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g, n.sodium_mg
              FROM dishes d
              JOIN nutrients n ON n.dish_id = d.dish_id
             WHERE lower(d.name) = :name OR :name = ANY(d.aliases)
        """)
        exact_matches = conn.execute(exact_match_query, {"name": dish_name.lower()}).fetchall()

        # Vector similarity query
        vector_query = text("""
            SELECT d.dish_id, d.name, n.kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g, n.sodium_mg
              FROM dishes d
              JOIN nutrients n ON n.dish_id = d.dish_id
              LIMIT :k
        """)
        vector_matches = conn.execute(vector_query, {"k": k}).fetchall()

        # Fallback: Strip modifiers and retry vector search if no results
        if not vector_matches:
            # Simple word removal without NLTK
            modifiers = {"large", "small", "with", "no", "extra", "the", "and", "or", "a", "an"}
            stripped_name = " ".join(
                word for word in dish_name.lower().split()
                if word not in modifiers and re.match(r"\w+", word)
            )
            query_vector = model.encode([stripped_name], normalize_embeddings=False)[0]
            query_vector = np.asarray(query_vector, dtype=np.float32)
            vector_matches = conn.execute(vector_query, {"k": k}).fetchall()

    # Process results
    results = []
    seen_dish_ids = set()
    
    for row in exact_matches:
        candidate = Candidate(dish_id=str(row[0]), name=row[1], sim=1.0)
        nutrients = Nutrients(
            calories=float(row[2]),
            protein_g=float(row[3]),
            carbs_g=float(row[4]),
            fat_g=float(row[5]),
            fiber_g=float(row[6]),
            sugar_g=float(row[7]),
            sodium_mg=float(row[8])
        )
        results.append((candidate, nutrients))
        seen_dish_ids.add(str(row[0]))

    for row in vector_matches:
        dish_id = str(row[0])
        if dish_id in seen_dish_ids:
            continue
            
        candidate = Candidate(dish_id=dish_id, name=row[1], sim=0.8)
        nutrients = Nutrients(
            calories=float(row[2]),
            protein_g=float(row[3]),
            carbs_g=float(row[4]),
            fat_g=float(row[5]),
            fiber_g=float(row[6]),
            sugar_g=float(row[7]),
            sodium_mg=float(row[8])
        )
        results.append((candidate, nutrients))

    return results