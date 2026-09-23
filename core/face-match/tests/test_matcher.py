from __future__ import annotations

import numpy as np
import pytest

from app.core.matcher import compare, l2_normalize
from app.exceptions import FaceError


def test_identical_vectors_distance_zero():
    vector = l2_normalize(np.arange(128, dtype=np.float32) + 1.0)
    distance, cosine = compare(vector, vector)
    assert distance == pytest.approx(0.0, abs=1e-5)
    assert cosine == pytest.approx(1.0, abs=1e-5)


def test_opposite_vectors():
    left = np.zeros(128, dtype=np.float32)
    left[0] = 1.0
    right = np.zeros(128, dtype=np.float32)
    right[0] = -1.0
    distance, cosine = compare(left, right)
    assert cosine == pytest.approx(-1.0, abs=1e-5)
    assert distance == pytest.approx(2.0, abs=1e-5)


def test_l2_normalize_unit_norm():
    vector = l2_normalize(np.ones(128, dtype=np.float32))
    assert float(np.linalg.norm(vector)) == pytest.approx(1.0, abs=1e-5)


def test_zero_vector_rejected():
    with pytest.raises(FaceError, match="biométrico"):
        l2_normalize(np.zeros(8, dtype=np.float32))


def test_dimension_mismatch():
    with pytest.raises(FaceError, match="dimensão"):
        compare(np.ones(128, dtype=np.float32), np.ones(64, dtype=np.float32))
