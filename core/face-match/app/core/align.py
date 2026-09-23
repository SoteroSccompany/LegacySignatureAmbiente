from __future__ import annotations

import cv2
import numpy as np

from app.exceptions import FaceError

# Template ArcFace 112x112: olho esquerdo, olho direito, nariz, boca esquerda, boca direita.
ARCFACE_DST = np.array(
    [
        [38.2946, 51.6963],
        [73.5318, 51.5014],
        [56.0252, 71.7366],
        [41.5493, 92.3655],
        [70.7299, 92.2041],
    ],
    dtype=np.float32,
)


def align_face(bgr: np.ndarray, kps: np.ndarray, image_size: int = 112) -> np.ndarray:
    src = np.asarray(kps, dtype=np.float32).reshape(5, 2)
    dst = ARCFACE_DST if image_size == 112 else ARCFACE_DST * (image_size / 112.0)
    matrix, _ = cv2.estimateAffinePartial2D(src, dst, method=cv2.LMEDS)
    if matrix is None:
        raise FaceError("Falha ao alinhar o rosto.")
    return cv2.warpAffine(bgr, matrix, (image_size, image_size), borderValue=0.0)
