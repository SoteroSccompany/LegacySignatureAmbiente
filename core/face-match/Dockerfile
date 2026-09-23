FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    NUMEXPR_NUM_THREADS=1 \
    ORT_INTRA_OP_NUM_THREADS=1 \
    TZ=America/Sao_Paulo \
    FACE_MODEL_PACK=opencv_sface \
    MODELS_DIR=/app/models

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY download_models.py /app/download_models.py
COPY models/SHA256SUMS /app/models/SHA256SUMS
RUN python /app/download_models.py \
    && rm -f /app/download_models.py

COPY app /app/app

EXPOSE 8085

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8085", "--workers", "1"]
