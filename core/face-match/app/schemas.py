from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class VectorizeRequest(BaseModel):
    image_base64: str = Field(..., min_length=8)


class VectorizeResponse(BaseModel):
    success: bool = True
    embedding: list[float]
    embedding_dim: int


class VerifyMatchRequest(BaseModel):
    image_base64: str = Field(..., min_length=8)
    stored_embedding: list[float] = Field(..., min_length=1)
    tolerance: Optional[float] = Field(default=None, gt=0)


class VerifyMatchResponse(BaseModel):
    success: bool = True
    match: bool
    distance: float
    tolerance: float
    cosine: float


class HealthResponse(BaseModel):
    status: str
    engine: str
    pack: str
    embedding_dim: int
    tolerance_default: float
    models_loaded: bool


class ErrorResponse(BaseModel):
    success: bool = False
    msg: str
