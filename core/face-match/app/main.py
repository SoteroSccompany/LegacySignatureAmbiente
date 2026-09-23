from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.pipeline import FacePipeline
from app.exceptions import FaceError
from app.schemas import (
    ErrorResponse,
    HealthResponse,
    VectorizeRequest,
    VectorizeResponse,
    VerifyMatchRequest,
    VerifyMatchResponse,
)

pipeline: FacePipeline | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pipeline
    pipeline = FacePipeline.load()
    yield
    pipeline = None


app = FastAPI(
    title="Face Match",
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


def _pipeline() -> FacePipeline:
    if pipeline is None:
        raise HTTPException(
            status_code=503,
            detail={"success": False, "msg": "Modelos ainda não carregados."},
        )
    return pipeline


def _http_error(status: int, msg: str) -> HTTPException:
    return HTTPException(status_code=status, detail={"success": False, "msg": msg})


@app.exception_handler(FaceError)
async def face_error_handler(_: Request, exc: FaceError):
    return JSONResponse(status_code=400, content={"success": False, "msg": exc.msg})


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    return JSONResponse(status_code=400, content={"success": False, "msg": "Payload inválido."})


@app.exception_handler(HTTPException)
async def http_exception_handler(_: Request, exc: HTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "msg" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    return JSONResponse(status_code=exc.status_code, content={"success": False, "msg": str(detail)})


@app.get("/health", response_model=HealthResponse)
async def health():
    current = _pipeline()
    return HealthResponse(
        status="ok",
        engine="onnx-insightface-pipeline",
        pack=current.pack_name,
        embedding_dim=current.embedding_dim,
        tolerance_default=current.tolerance_default,
        models_loaded=True,
    )


@app.post("/vectorize", response_model=VectorizeResponse, responses={400: {"model": ErrorResponse}})
async def vectorize(body: VectorizeRequest):
    current = _pipeline()
    embedding = await asyncio.to_thread(current.vectorize, body.image_base64)
    return VectorizeResponse(success=True, embedding=embedding, embedding_dim=len(embedding))


@app.post("/verify-match", response_model=VerifyMatchResponse, responses={400: {"model": ErrorResponse}})
async def verify_match(body: VerifyMatchRequest):
    current = _pipeline()
    result = await asyncio.to_thread(
        current.verify_match,
        body.image_base64,
        body.stored_embedding,
        body.tolerance,
    )
    return VerifyMatchResponse(success=True, **result)
