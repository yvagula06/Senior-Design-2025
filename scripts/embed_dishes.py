"""Backfill dish_variants embeddings for dishes that have no variants.

Run this after bulk-inserting dishes without embeddings, or after importing
a CSV that skipped the variant step.

Usage:
    python scripts/embed_dishes.py [--batch-size 256]
"""

import json
import argparse
import time
from typing import List

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session
from sentence_transformers import SentenceTransformer

from app.db.session import engine

BATCH_SIZE = 256


def get_dishes_without_variants(session: Session, limit: int) -> list:
    return session.execute(
        text("""
            SELECT d.id, d.name
            FROM dishes d
            WHERE d.is_active = TRUE
              AND NOT EXISTS (
                SELECT 1 FROM dish_variants dv WHERE dv.dish_id = d.id
              )
            LIMIT :lim
        """),
        {"lim": limit},
    ).fetchall()


def main():
    parser = argparse.ArgumentParser(description='Backfill dish_variants embeddings')
    parser.add_argument('--batch-size', type=int, default=BATCH_SIZE)
    args = parser.parse_args()

    print("Loading embedding model ...")
    model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
    print("Model loaded.\n")

    total = 0
    start = time.time()

    while True:
        with Session(engine) as session:
            rows = get_dishes_without_variants(session, args.batch_size)

        if not rows:
            break

        names = [r[1].lower() for r in rows]
        vecs = model.encode(names, normalize_embeddings=False, show_progress_bar=False)
        if isinstance(vecs, np.ndarray):
            vecs = [v.astype(np.float32).tolist() for v in vecs]

        with Session(engine) as session:
            for (dish_id, dish_name), embedding in zip(rows, vecs):
                session.execute(
                    text("""
                        INSERT INTO dish_variants
                            (dish_id, variant_text, embedding, variant_type,
                             language_code, search_count)
                        VALUES
                            (:dish_id, :vt, CAST(:emb AS vector),
                             'original', 'en', 0)
                        ON CONFLICT DO NOTHING
                    """),
                    {
                        'dish_id': dish_id,
                        'vt': dish_name.lower(),
                        'emb': json.dumps(embedding),
                    },
                )
            session.commit()

        total += len(rows)
        elapsed = time.time() - start
        print(f"  Backfilled {len(rows)} dishes (total={total}, rate={total/elapsed:.1f}/s)")

    print(f"\n\u2705 Done \u2014 backfilled {total} dishes.")


if __name__ == "__main__":
    main()



BATCH_SIZE = 256

def encode_texts(texts: List[str]) -> List[List[float]]:
    model = get_model()  # singleton loader
    vecs = model.encode(texts, normalize_embeddings=False)
    # Ensure python lists of float (pgvector likes plain lists)
    if isinstance(vecs, np.ndarray):
        return [v.astype(np.float32).tolist() for v in vecs]
    return [list(map(float, v)) for v in vecs]

def batch_embed():
    total = 0
    start_all = time.time()

    while True:
        with Session(engine, expire_on_commit=False) as session:
            rows: List[Embedding] = (
                session.execute(
                    select(Embedding)
                    .where(Embedding.vector.is_(None))
                    .limit(BATCH_SIZE)
                )
                .scalars()
                .all()
            )

            if not rows:
                elapsed = time.time() - start_all
                print(f"No pending rows. Embedded {total} rows in {elapsed:.2f}s.")
                return

            texts = [r.text or "" for r in rows]
            t0 = time.time()
            vec_lists = encode_texts(texts)
            for r, v in zip(rows, vec_lists):
                r.vector = v  # pgvector Vector(384) column; list[float] is fine

            session.commit()
            dt = time.time() - t0
            total += len(rows)
            rate = len(rows) / max(dt, 1e-6)
            print(f"Updated {len(rows)} rows this batch in {dt:.2f}s ({rate:.1f} rows/s). Total={total}")

if __name__ == "__main__":
    batch_embed()
