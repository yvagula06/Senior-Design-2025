from functools import lru_cache
import numpy as np
from sentence_transformers import SentenceTransformer

_model = None

def get_model():
    global _model
    if _model is None:
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _model

@lru_cache(maxsize=2048)
def embed_text(text: str) -> np.ndarray:
    model = get_model()
    v = model.encode([text], normalize_embeddings=False)[0]
    return np.asarray(v, dtype=np.float32)

def warm():
    model = get_model()
    model.encode(["warmup"], normalize_embeddings=False)
