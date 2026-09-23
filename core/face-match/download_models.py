#!/usr/bin/env python3
"""Baixa YuNet e SFace (Apache/MIT) e valida SHA-256. Nao baixa buffalo_sc."""
from __future__ import annotations

import hashlib
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MODELS_DIR = ROOT / "models"
SUMS_FILE = MODELS_DIR / "SHA256SUMS"

URLS = {
    "yunet.onnx": "https://huggingface.co/opencv/face_detection_yunet/resolve/main/face_detection_yunet_2023mar.onnx",
    "sface.onnx": "https://huggingface.co/opencv/face_recognition_sface/resolve/main/face_recognition_sface_2021dec.onnx",
}


def parse_sums(path: Path) -> dict[str, str]:
    expected: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        digest, name = line.split()
        expected[name] = digest
    return expected


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(dest.suffix + ".tmp")
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "legacy-signature-face-match/1.0"},
    )
    with urllib.request.urlopen(request, timeout=120) as response, tmp.open("wb") as out:
        while True:
            chunk = response.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
    tmp.replace(dest)


def main() -> int:
    if not SUMS_FILE.is_file():
        print(f"arquivo de checksums ausente: {SUMS_FILE}", file=sys.stderr)
        return 1
    expected = parse_sums(SUMS_FILE)
    for name, digest in expected.items():
        dest = MODELS_DIR / name
        url = URLS.get(name)
        if dest.is_file() and sha256_file(dest) == digest:
            print(f"ok (cache) {name}")
            continue
        if not url:
            print(f"url ausente para {name}", file=sys.stderr)
            return 1
        print(f"baixando {name}")
        download(url, dest)
        got = sha256_file(dest)
        if got != digest:
            dest.unlink(missing_ok=True)
            print(f"checksum invalido para {name}: {got}", file=sys.stderr)
            return 1
        print(f"ok {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
