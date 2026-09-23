from __future__ import annotations

from pathlib import Path

import cv2
import numpy as np

from app.config import BUFFALO_REC_PATH, SFACE_PATH
from app.core.align import align_face
from app.core.detector import DetectedFace, make_onnx_session
from app.core.matcher import l2_normalize
from app.exceptions import FaceError


class SFaceEmbedder:
    def __init__(self, model_path: Path | None = None):
        path = model_path or SFACE_PATH
        if not path.is_file():
            raise FaceError(f"Modelo ONNX ausente: {path.name}")
        self._recognizer = cv2.FaceRecognizerSF.create(str(path), "")

    def embed(self, bgr: np.ndarray, face: DetectedFace) -> np.ndarray:
        if face.raw is not None:
            aligned = self._recognizer.alignCrop(bgr, face.raw)
        else:
            aligned = align_face(bgr, face.kps, image_size=112)
        feature = self._recognizer.feature(aligned)
        return l2_normalize(np.asarray(feature, dtype=np.float32))


class MobileFaceNetEmbedder:
    """w600k_mbf via ONNX Runtime — pack buffalo_sc licenciado."""

    def __init__(self, model_path: Path | None = None):
        path = model_path or BUFFALO_REC_PATH
        self.session = make_onnx_session(path)
        self.input_name = self.session.get_inputs()[0].name
        self.output_name = self.session.get_outputs()[0].name

    def embed(self, bgr: np.ndarray, face: DetectedFace) -> np.ndarray:
        aligned = align_face(bgr, face.kps, image_size=112)
        rgb = aligned[:, :, ::-1].astype(np.float32)
        blob = (rgb - 127.5) / 127.5
        blob = np.expand_dims(blob.transpose(2, 0, 1), axis=0)
        out = self.session.run([self.output_name], {self.input_name: blob})[0]
        return l2_normalize(np.asarray(out, dtype=np.float32))
