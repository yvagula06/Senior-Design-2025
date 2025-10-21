# scripts/embed_dishes.py
import time
from typing import List

import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import engine
from app.utils.embeddings import get_model
from app.db.models import Embedding  # assumes you created ORM models as in Prompt A


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
