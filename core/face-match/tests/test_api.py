from __future__ import annotations

from pathlib import Path

import pytest

from app.core.pipeline import load_pack
from app.exceptions import FaceError


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["engine"] == "onnx-insightface-pipeline"
    assert body["pack"] == "opencv_sface"
    assert body["embedding_dim"] == 128
    assert body["tolerance_default"] == 1.128
    assert body["models_loaded"] is True


def test_vectorize(client, mock_pipeline):
    response = client.post("/vectorize", json={"image_base64": "data:image/jpeg;base64," + "a" * 32})
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["embedding_dim"] == 128
    assert len(body["embedding"]) == 128
    mock_pipeline.vectorize.assert_called_once()


def test_verify_match(client):
    response = client.post(
        "/verify-match",
        json={
            "image_base64": "data:image/jpeg;base64," + "a" * 32,
            "stored_embedding": [0.1] * 128,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["match"] is True
    assert "distance" in body
    assert "cosine" in body
    assert body["tolerance"] == 1.128


def test_vectorize_no_face_is_400(face_error_client):
    response = face_error_client.post("/vectorize", json={"image_base64": "a" * 32})
    assert response.status_code == 400
    body = response.json()
    assert body["success"] is False
    assert body["msg"] == "Nenhum rosto detectado."


def test_invalid_payload_is_400(client):
    response = client.post("/vectorize", json={})
    assert response.status_code == 400
    assert response.json()["success"] is False


def test_load_pack_invalid_name():
    with pytest.raises(FaceError, match="inválido"):
        load_pack("desconhecido")


def test_buffalo_slot_requires_licensed_weights(tmp_path, monkeypatch):
    monkeypatch.setattr("app.core.pipeline.BUFFALO_DET_PATH", tmp_path / "det_500m.onnx")
    monkeypatch.setattr("app.core.pipeline.BUFFALO_REC_PATH", tmp_path / "w600k_mbf.onnx")
    with pytest.raises(FaceError, match="buffalo_sc"):
        load_pack("buffalo_sc")


def test_opencv_pack_requires_weights(monkeypatch):
    missing = Path("/tmp/nao-existe-yunet.onnx")
    monkeypatch.setattr("app.core.pipeline.YUNET_PATH", missing)
    monkeypatch.setattr("app.core.pipeline.SFACE_PATH", missing)
    with pytest.raises(FaceError, match="YuNet/SFace"):
        load_pack("opencv_sface")
