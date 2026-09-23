from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from app.config import (
    BUFFALO_DET_PATH,
    BUFFALO_REC_PATH,
    BUFFALO_SC_DIM,
    BUFFALO_SC_TOLERANCE,
    FACE_MODEL_PACK,
    OPENCV_SFACE_DIM,
    OPENCV_SFACE_TOLERANCE,
    PACK_BUFFALO_SC,
    PACK_OPENCV_SFACE,
    SFACE_PATH,
    YUNET_PATH,
)
from app.core.decode import decode_image
from app.core.detector import ScrfdDetector, YuNetDetector
from app.core.embedder import MobileFaceNetEmbedder, SFaceEmbedder
from app.core.matcher import compare, l2_normalize
from app.exceptions import FaceError


@dataclass
class PackSpec:
    name: str
    embedding_dim: int
    tolerance_default: float
    detector: object
    embedder: object


def load_pack(pack_name: str | None = None) -> PackSpec:
    name = (pack_name or FACE_MODEL_PACK).strip().lower()
    if name == PACK_OPENCV_SFACE:
        if not YUNET_PATH.is_file() or not SFACE_PATH.is_file():
            raise FaceError("Modelos YuNet/SFace ausentes em models/.")
        return PackSpec(
            name=PACK_OPENCV_SFACE,
            embedding_dim=OPENCV_SFACE_DIM,
            tolerance_default=OPENCV_SFACE_TOLERANCE,
            detector=YuNetDetector(),
            embedder=SFaceEmbedder(),
        )
    if name == PACK_BUFFALO_SC:
        if not BUFFALO_DET_PATH.is_file() or not BUFFALO_REC_PATH.is_file():
            raise FaceError(
                "Pack buffalo_sc exige det_500m.onnx e w600k_mbf.onnx em models/ (licença comercial)."
            )
        return PackSpec(
            name=PACK_BUFFALO_SC,
            embedding_dim=BUFFALO_SC_DIM,
            tolerance_default=BUFFALO_SC_TOLERANCE,
            detector=ScrfdDetector(),
            embedder=MobileFaceNetEmbedder(),
        )
    raise FaceError("Pack de modelo inválido.")


class FacePipeline:
    def __init__(self, pack: PackSpec):
        self.pack = pack

    @classmethod
    def load(cls, pack_name: str | None = None) -> "FacePipeline":
        return cls(load_pack(pack_name))

    @property
    def embedding_dim(self) -> int:
        return self.pack.embedding_dim

    @property
    def tolerance_default(self) -> float:
        return self.pack.tolerance_default

    @property
    def pack_name(self) -> str:
        return self.pack.name

    def vectorize(self, image_base64: str) -> list[float]:
        embedding = None
        try:
            with decode_image(image_base64) as image:
                if image.bgr is None:
                    raise FaceError("Imagem inválida.")
                faces = self.pack.detector.detect(image.bgr)
                if not faces:
                    raise FaceError("Nenhum rosto detectado.")
                if len(faces) > 1:
                    raise FaceError("Mais de um rosto detectado.")
                embedding = self.pack.embedder.embed(image.bgr, faces[0])
                if embedding.size != self.embedding_dim:
                    raise FaceError("Vetor biométrico com dimensão inválida.")
                return [float(x) for x in embedding.tolist()]
        finally:
            del embedding

    def verify_match(
        self,
        image_base64: str,
        stored_embedding: list[float],
        tolerance: float | None = None,
    ) -> dict:
        stored = np.asarray(stored_embedding, dtype=np.float32).reshape(-1)
        if stored.size != self.embedding_dim:
            raise FaceError("Vetor biométrico com dimensão inválida.")
        stored_norm = l2_normalize(stored)
        live = np.asarray(self.vectorize(image_base64), dtype=np.float32)
        limit = float(self.tolerance_default if tolerance is None else tolerance)
        distance, cosine = compare(live, stored_norm)
        return {
            "match": bool(distance <= limit),
            "distance": float(distance),
            "tolerance": limit,
            "cosine": float(cosine),
        }
