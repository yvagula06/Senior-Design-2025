"""
Retrieval Service for Dish-Level Nutrition Estimation

This module provides semantic search capabilities using pgvector for similarity-based
dish retrieval. It generates embeddings for user queries and performs cosine similarity
search against dish variants to find matching canonical dishes with nutrition facts.

Key Features:
- Sentence-BERT embedding generation (all-MiniLM-L6-v2, 384-dim)
- pgvector cosine similarity search
- LRU cache to avoid re-embedding identical queries
- Returns dish_id, name, nutrition facts, and similarity scores
"""

from typing import List, Tuple
from functools import lru_cache
import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.schemas.label import Candidate, Nutrients
from app.db.session import engine
from app.utils.embeddings import embed_text


def retrieve_candidates(
    dish_name: str, 
    k: int = 5,
    similarity_threshold: float = 0.0
) -> List[Tuple[Candidate, Nutrients]]:
    """
    Retrieve top-k most similar dishes for a given query using pgvector similarity search.
    
    This function:
    1. Generates a 384-dim embedding for the input dish_name
    2. Performs pgvector cosine similarity search on embeddings table
    3. Joins to dishes and nutrients tables to retrieve full nutrition facts
    4. Returns top-k matches with similarity scores
    
    Args:
        dish_name: Raw user input (e.g., "grilled chicken salad", "tikka masala")
        k: Number of top matches to return (default: 5)
        similarity_threshold: Minimum similarity score to include (default: 0.0)
    
    Returns:
        List of (Candidate, Nutrients) tuples, sorted by similarity (descending)
        
    Example:
        >>> candidates = retrieve_candidates("chicken tikka masala", k=3)
        >>> for candidate, nutrients in candidates:
        >>>     print(f"{candidate.name}: {candidate.sim:.3f} similarity")
        >>>     print(f"Calories: {nutrients.calories}")
    
    Notes:
        - Uses LRU cache via embed_text() to avoid re-embedding identical queries
        - Cosine similarity: 1.0 = identical, 0.0 = orthogonal, -1.0 = opposite
        - pgvector operator <=> computes cosine distance (1 - similarity)
    """
    if not dish_name or not dish_name.strip():
        return []
    
    # Normalize input
    dish_name = dish_name.strip()
    
    # Generate embedding (cached via embed_text LRU cache)
    query_embedding = embed_text(dish_name)
    
    # Perform pgvector similarity search
    results = _search_similar_dishes(query_embedding, k, similarity_threshold)
    
    return results


def _search_similar_dishes(
    query_embedding: np.ndarray,
    k: int,
    similarity_threshold: float
) -> List[Tuple[Candidate, Nutrients]]:
    """
    Internal function to execute pgvector similarity query.
    
    Query Strategy:
    1. Search embeddings table using pgvector's <=> operator (cosine distance)
    2. Join to dishes and nutrients tables to get dish info + nutrition facts
    3. Order by similarity (descending)
    4. Limit to top-k results
    
    pgvector Similarity Formula:
        cosine_distance = embedding <=> query_vector
        similarity_score = 1 - cosine_distance
    
    Args:
        query_embedding: 384-dim numpy array from Sentence-BERT
        k: Number of results to return
        similarity_threshold: Minimum similarity to include
    
    Returns:
        List of (Candidate, Nutrients) tuples
    """
    # Convert numpy array to list for PostgreSQL
    query_vector_list = query_embedding.tolist()
    
    # pgvector similarity query
    # <=> is the cosine distance operator (0 = identical, 2 = opposite)
    # similarity = 1 - distance
    query = text("""
        SELECT 
            d.dish_id as id,
            d.name,
            n.kcal as calories,
            COALESCE(n.protein_g, 0.0) as protein_g,
            COALESCE(n.carbs_g, 0.0) as carbs_g,
            COALESCE(n.fat_g, 0.0) as fat_g,
            COALESCE(n.fiber_g, 0.0) as fiber_g,
            COALESCE(n.sugar_g, 0.0) as sugar_g,
            COALESCE(n.sodium_mg, 0.0) as sodium_mg,
            0.0 as saturated_fat_g,
            0.0 as cholesterol_mg,
            n.source as data_source,
            1.0 as confidence_score,
            e.text as variant_text,
            1 - (e.vector <=> CAST(:query_vector AS vector)) AS similarity
        FROM embeddings e
        JOIN dishes d ON e.dish_id = d.dish_id
        JOIN nutrients n ON d.dish_id = n.dish_id
        WHERE (1 - (e.vector <=> CAST(:query_vector AS vector))) >= :threshold
        ORDER BY e.vector <=> CAST(:query_vector AS vector)
        LIMIT :k
    """)
    
    with engine.connect() as conn:
        result = conn.execute(
            query,
            {
                "query_vector": query_vector_list,
                "k": k,
                "threshold": similarity_threshold
            }
        )
        rows = result.fetchall()
    
    # Process results into Candidate + Nutrients tuples
    candidates = []
    seen_dish_ids = set()  # Deduplicate if multiple variants match same dish
    
    for row in rows:
        dish_id = row[0]
        
        # Skip if we've already seen this dish (multiple variants matched)
        if dish_id in seen_dish_ids:
            continue
        seen_dish_ids.add(dish_id)
        
        # Extract fields
        (
            dish_id, name, calories, protein_g, carbs_g, fat_g,
            fiber_g, sugar_g, sodium_mg, saturated_fat_g, cholesterol_mg,
            data_source, confidence_score, variant_text, similarity
        ) = row
        
        # Create Candidate
        candidate = Candidate(
            dish_id=str(dish_id),
            name=name,
            sim=float(similarity)
        )
        
        # Create Nutrients
        nutrients = Nutrients(
            calories=float(calories),
            protein_g=float(protein_g) if protein_g is not None else None,
            carbs_g=float(carbs_g) if carbs_g is not None else None,
            fat_g=float(fat_g) if fat_g is not None else None,
            fiber_g=float(fiber_g) if fiber_g is not None else None,
            sugar_g=float(sugar_g) if sugar_g is not None else None,
            sodium_mg=float(sodium_mg) if sodium_mg is not None else None
        )
        
        candidates.append((candidate, nutrients))
    
    return candidates


def get_dish_by_id(dish_id: int) -> Tuple[Candidate, Nutrients]:
    """
    Retrieve a specific dish by ID (useful for feedback/refinement workflows).
    
    Args:
        dish_id: Primary key of the dish
    
    Returns:
        Tuple of (Candidate, Nutrients)
    
    Raises:
        ValueError: If dish_id not found or dish is inactive
    """
    query = text("""
        SELECT 
            d.id,
            d.name,
            d.calories,
            d.protein_g,
            d.carbs_g,
            d.fat_g,
            d.fiber_g,
            d.sugar_g,
            d.sodium_mg,
            d.confidence_score
        FROM dishes d
        WHERE d.id = :dish_id
          AND d.is_active = TRUE
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {"dish_id": dish_id})
        row = result.fetchone()
    
    if not row:
        raise ValueError(f"Dish with id={dish_id} not found or inactive")
    
    (
        dish_id, name, calories, protein_g, carbs_g, fat_g,
        fiber_g, sugar_g, sodium_mg, confidence_score
    ) = row
    
    candidate = Candidate(
        dish_id=str(dish_id),
        name=name,
        sim=1.0  # Direct lookup, not similarity-based
    )
    
    nutrients = Nutrients(
        calories=float(calories),
        protein_g=float(protein_g) if protein_g is not None else None,
        carbs_g=float(carbs_g) if carbs_g is not None else None,
        fat_g=float(fat_g) if fat_g is not None else None,
        fiber_g=float(fiber_g) if fiber_g is not None else None,
        sugar_g=float(sugar_g) if sugar_g is not None else None,
        sodium_mg=float(sodium_mg) if sodium_mg is not None else None
    )
    
    return candidate, nutrients


# Utility: Clear cache if needed (for testing or when embeddings change)
def clear_cache():
    """Clear the LRU cache for embed_text (useful when model changes)."""
    embed_text.cache_clear()