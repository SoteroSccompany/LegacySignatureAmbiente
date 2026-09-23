from __future__ import annotations

import os
from pathlib import Path


def _int_env(name: str, default: int) -> int:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return int(raw)


def _float_env(name: str, default: float) -> float:
    raw = os.environ.get(name)
    if raw is None or raw == "":
        return default
    return float(raw)


BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = Path(os.environ.get("MODELS_DIR") or (BASE_DIR / "models"))
FACE_MODEL_PACK = os.environ.get("FACE_MODEL_PACK", "opencv_sface").strip().lower()
MAX_IMAGE_BYTES = _int_env("MAX_IMAGE_BYTES", 4 * 1024 * 1024)
MAX_SIDE = _int_env("MAX_SIDE", 640)
MAX_IMAGE_PIXELS = _int_env("MAX_IMAGE_PIXELS", 25_000_000)
SCORE_THRESHOLD = _float_env("SCORE_THRESHOLD", 0.6)
NMS_THRESHOLD = _float_env("NMS_THRESHOLD", 0.3)
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = _int_env("PORT", 8080)
ONNX_INTRA_THREADS = _int_env("ONNX_INTRA_THREADS", 1)
ONNX_INTER_THREADS = _int_env("ONNX_INTER_THREADS", 1)

PACK_OPENCV_SFACE = "opencv_sface"
PACK_BUFFALO_SC = "buffalo_sc"

YUNET_PATH = MODELS_DIR / "yunet.onnx"
SFACE_PATH = MODELS_DIR / "sface.onnx"
BUFFALO_DET_PATH = MODELS_DIR / "det_500m.onnx"
BUFFALO_REC_PATH = MODELS_DIR / "w600k_mbf.onnx"

OPENCV_SFACE_DIM = 128
OPENCV_SFACE_TOLERANCE = 1.128
BUFFALO_SC_DIM = 512
BUFFALO_SC_TOLERANCE = 1.0
