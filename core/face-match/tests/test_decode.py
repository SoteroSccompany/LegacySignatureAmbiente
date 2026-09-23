from __future__ import annotations

import base64
import io

import numpy as np
import pytest
from PIL import Image

from app.core.decode import decode_image
from app.exceptions import FaceError


def _jpeg_b64(size=(48, 32), color=(12, 80, 200)) -> str:
    buffer = io.BytesIO()
    Image.new("RGB", size, color).save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def test_decode_jpeg_bgr_in_memory():
    with decode_image(_jpeg_b64()) as image:
        assert image.bgr is not None
        assert image.bgr.ndim == 3
        assert image.bgr.shape[2] == 3
        assert image.bgr.dtype == np.uint8


def test_decode_data_uri():
    raw = _jpeg_b64()
    with decode_image(f"data:image/jpeg;base64,{raw}") as image:
        assert image.bgr is not None
        assert image.bgr.shape[0] > 0


def test_decode_png_data_uri():
    buffer = io.BytesIO()
    Image.new("RGB", (16, 16), (1, 2, 3)).save(buffer, format="PNG")
    payload = base64.b64encode(buffer.getvalue()).decode("ascii")
    with decode_image(f"data:image/png;base64,{payload}") as image:
        assert image.bgr.shape[0] == 16


def test_buffer_released_after_context():
    ctx = decode_image(_jpeg_b64())
    with ctx:
        assert ctx.bgr is not None
    assert ctx.bgr is None


def test_reject_empty():
    with pytest.raises(FaceError, match="inválida"):
        decode_image("")


def test_reject_garbage():
    with pytest.raises(FaceError, match="inválida"):
        decode_image("@@@@")


def test_reject_too_large_bytes(monkeypatch):
    monkeypatch.setattr("app.core.decode.MAX_IMAGE_BYTES", 16)
    with pytest.raises(FaceError, match="tamanho máximo"):
        decode_image(_jpeg_b64())


def test_resize_max_side(monkeypatch):
    monkeypatch.setattr("app.core.decode.MAX_SIDE", 20)
    with decode_image(_jpeg_b64(size=(80, 40))) as image:
        assert image.bgr is not None
        assert max(image.bgr.shape[0], image.bgr.shape[1]) <= 20
