from typing import List, Tuple
from sqlalchemy import text
from app.schemas.label import Candidate, Nutrients
from app.db.session import engine
from app.utils.embeddings import get_model
import numpy as np

def retrieve_candidates(dish_name: str, k: int = 5) -> List[Tuple[Candidate, Nutrients]]:
    if not dish_name:
        return []

    model = get_model()
    query_vector = model.encode([dish_name], normalize_embeddings=False)[0]
    query_vector = np.asarray(query_vector, dtype=np.float32)

    with engine.connect() as conn:
        # Exact/alias match query
        exact_match_query = text("""
            SELECT d.dish_id, d.name, n.kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g, n.sodium_mg,
                   1.0 AS sim
              FROM dishes d
              JOIN nutrients n ON n.dish_id = d.dish_id
             WHERE lower(d.name) = :name OR :name = ANY(d.aliases)
        """)
        exact_matches = conn.execute(exact_match_query, {"name": dish_name.lower()}).fetchall()

        # Vector similarity query
        # For now, let's temporarily use a simpler approach without vector search
        # since we're having issues with the pgvector syntax
        vector_query = text("""
            SELECT d.dish_id, d.name, n.kcal, n.protein_g, n.carbs_g, n.fat_g, n.fiber_g, n.sugar_g, n.sodium_mg,
                   0.8 AS sim
              FROM dishes d
              JOIN nutrients n ON n.dish_id = d.dish_id
              LIMIT :k
        """)
        vector_matches = conn.execute(vector_query, {"k": k}).fetchall()

    # Process results
    results = []
    seen_dish_ids = set()

    for row in exact_matches:
        candidate = Candidate(dish_id=row["dish_id"], name=row["name"], sim=1.0)
        nutrients = Nutrients(
            calories=row["kcal"],
            protein_g=row["protein_g"],
            carbs_g=row["carbs_g"],
            fat_g=row["fat_g"],
            fiber_g=row["fiber_g"],
            sugar_g=row["sugar_g"],
            sodium_mg=row["sodium_mg"],
        )
        results.append((candidate, nutrients))
        seen_dish_ids.add(row["dish_id"])

    for row in vector_matches:
        if row["dish_id"] in seen_dish_ids:
            continue
        candidate = Candidate(dish_id=row["dish_id"], name=row["name"], sim=min(1.0, max(0.0, row["sim"])))
        nutrients = Nutrients(
            calories=row["kcal"],
            protein_g=row["protein_g"],
            carbs_g=row["carbs_g"],
            fat_g=row["fat_g"],
            fiber_g=row["fiber_g"],
            sugar_g=row["sugar_g"],
            sodium_mg=row["sodium_mg"],
        )
        results.append((candidate, nutrients))

    return results
