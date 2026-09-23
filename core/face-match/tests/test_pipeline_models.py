from __future__ import annotations

import base64
import io

import pytest
from PIL import Image

from app.config import SFACE_PATH, YUNET_PATH
from app.core.pipeline import FacePipeline
from app.exceptions import FaceError

pytestmark = pytest.mark.skipif(
    not YUNET_PATH.is_file() or not SFACE_PATH.is_file(),
    reason="modelos YuNet/SFace ausentes",
)


def _jpeg_b64() -> str:
    buffer = io.BytesIO()
    Image.new("RGB", (64, 64), (30, 30, 30)).save(buffer, format="JPEG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


def test_opencv_pack_loads_and_rejects_image_without_face():
    pipeline = FacePipeline.load("opencv_sface")
    assert pipeline.embedding_dim == 128
    assert pipeline.tolerance_default == 1.128
    with pytest.raises(FaceError, match="Nenhum rosto"):
        pipeline.vectorize(_jpeg_b64())
