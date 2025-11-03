# Placeholder NNLS mixture; will be implemented later
from typing import List, Tuple
from app.schemas.label import Candidate, Nutrients
import numpy as np
from scipy.optimize import nnls

def blend_candidates(cands: List[Tuple[Candidate, Nutrients]]) -> List[Candidate]:
    # For MVP, just return candidates with equal weights
    if not cands:
        return []
    w = 1.0 / len(cands)
    out = []
    for c, _ in cands:
        c.weight = w
        out.append(c)
    return out

def solve_weights(
    macros: List[Tuple[float, float, float]],
    y: Tuple[float, float, float],
    epsilon: float = 1e-6
) -> List[float]:
    """
    Solve for non-negative weights that best approximate the target macros.

    Args:
        macros (List[Tuple[float, float, float]]): List of candidate macro tuples (P, C, F).
        y (Tuple[float, float, float]): Target macro tuple (P, C, F).
        epsilon (float): Small ridge regularization to handle singular matrices. Default is 1e-6.

    Returns:
        List[float]: Normalized weights summing to 1. If solver fails, returns [1.0].
    """
    if len(macros) == 1:
        return [1.0]

    # Build matrix A and vector y
    A = np.array(macros, dtype=float)
    y = np.array(y, dtype=float)

    # Add ridge regularization to A
    A += epsilon * np.eye(A.shape[0], A.shape[1])

    try:
        # Solve Aw ≈ y with non-negative least squares
        w, _ = nnls(A, y)
        # Normalize weights to sum to 1
        w_sum = np.sum(w)
        if w_sum > 0:
            return (w / w_sum).tolist()
        else:
            return [1.0]
    except Exception:
        # If solver fails, return uniform weight
        return [1.0]

if __name__ == "__main__":
    # Example test cases
    candidates = [(10, 20, 30), (15, 25, 35), (20, 30, 40)]
    target = (18, 28, 38)

    weights = solve_weights(candidates, target)
    print("Weights:", weights)
