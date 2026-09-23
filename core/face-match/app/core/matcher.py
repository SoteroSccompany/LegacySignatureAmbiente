from __future__ import annotations

import numpy as np

from app.exceptions import FaceError

_EPS = 1e-12


def l2_normalize(vector: np.ndarray) -> np.ndarray:
    flat = np.asarray(vector, dtype=np.float32).reshape(-1)
    norm = float(np.linalg.norm(flat))
    if norm < _EPS:
        raise FaceError("Falha ao extrair o vetor biométrico.")
    return (flat / norm).astype(np.float32)


def compare(live: np.ndarray, stored: np.ndarray) -> tuple[float, float]:
    a = l2_normalize(live)
    b = l2_normalize(stored)
    if a.size != b.size:
        raise FaceError("Vetor biométrico com dimensão inválida.")
    cosine = float(np.dot(a, b))
    cosine = max(-1.0, min(1.0, cosine))
    distance = float(np.linalg.norm(a - b))
    return distance, cosine
