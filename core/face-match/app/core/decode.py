from __future__ import annotations

import base64
import io
import re

import cv2
import numpy as np
from PIL import Image, ImageOps, UnidentifiedImageError
from PIL.Image import DecompressionBombError

from app.config import MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS, MAX_SIDE
from app.core.memory import ImageBuffer
from app.exceptions import FaceError

Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS

_DATA_URI = re.compile(r"^data:image/(?:jpeg|jpg|png|webp);base64,", re.IGNORECASE)
_ALLOWED = {"JPEG", "PNG", "WEBP"}


def _strip_data_uri(raw: str) -> str:
    value = (raw or "").strip()
    if not value:
        raise FaceError("Imagem inválida.")
    return _DATA_URI.sub("", value, count=1)


def _decode_base64(payload: str) -> bytes:
    try:
        blob = base64.b64decode(payload, validate=False)
    except Exception:
        raise FaceError("Imagem inválida.")
    if not blob:
        raise FaceError("Imagem inválida.")
    if len(blob) > MAX_IMAGE_BYTES:
        raise FaceError("Imagem excede o tamanho máximo.")
    return blob


def _resize_max_side(bgr: np.ndarray, max_side: int) -> np.ndarray:
    height, width = bgr.shape[:2]
    longest = max(height, width)
    if longest <= max_side:
        return bgr
    scale = max_side / float(longest)
    new_size = (max(1, int(round(width * scale))), max(1, int(round(height * scale))))
    return cv2.resize(bgr, new_size, interpolation=cv2.INTER_AREA)


def decode_image(image_base64: str) -> ImageBuffer:
    payload = _strip_data_uri(image_base64)
    blob = _decode_base64(payload)
    buffer = io.BytesIO(blob)
    image = None
    rgb = None
    bgr = None
    try:
        try:
            image = Image.open(buffer)
            image = ImageOps.exif_transpose(image)
            image.load()
        except (UnidentifiedImageError, OSError, ValueError, DecompressionBombError):
            raise FaceError("Imagem inválida.")
        if image.format is not None and image.format not in _ALLOWED:
            raise FaceError("Imagem inválida.")
        width, height = image.size
        if width <= 0 or height <= 0:
            raise FaceError("Imagem inválida.")
        if width * height > MAX_IMAGE_PIXELS:
            raise FaceError("Imagem excede o tamanho máximo.")
        rgb = np.asarray(image.convert("RGB"), dtype=np.uint8)
        if rgb.ndim != 3 or rgb.shape[2] != 3:
            raise FaceError("Imagem inválida.")
        bgr = rgb[:, :, ::-1].copy()
        bgr = _resize_max_side(bgr, MAX_SIDE)
        return ImageBuffer(bgr=bgr)
    finally:
        if image is not None:
            image.close()
        buffer.close()
        del rgb
        del blob
        del payload
