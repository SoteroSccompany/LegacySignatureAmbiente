from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.exceptions import FaceError


@pytest.fixture
def mock_pipeline():
    pipe = MagicMock()
    pipe.pack_name = "opencv_sface"
    pipe.embedding_dim = 128
    pipe.tolerance_default = 1.128
    embedding = [0.0] * 128
    embedding[0] = 1.0
    pipe.vectorize.return_value = embedding
    pipe.verify_match.return_value = {
        "match": True,
        "distance": 0.12,
        "tolerance": 1.128,
        "cosine": 0.99,
    }
    return pipe


@pytest.fixture
def client(monkeypatch, mock_pipeline):
    monkeypatch.setattr("app.main.FacePipeline.load", lambda pack_name=None: mock_pipeline)
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def face_error_client(monkeypatch, mock_pipeline):
    mock_pipeline.vectorize.side_effect = FaceError("Nenhum rosto detectado.")
    monkeypatch.setattr("app.main.FacePipeline.load", lambda pack_name=None: mock_pipeline)
    from app.main import app

    with TestClient(app) as test_client:
        yield test_client
