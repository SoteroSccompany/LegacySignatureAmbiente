from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class ImageBuffer:
    bgr: np.ndarray | None

    def close(self) -> None:
        self.bgr = None

    def __enter__(self) -> "ImageBuffer":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()
