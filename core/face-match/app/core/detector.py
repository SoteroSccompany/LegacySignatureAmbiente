from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
import onnxruntime as ort

from app.config import (
    BUFFALO_DET_PATH,
    NMS_THRESHOLD,
    ONNX_INTER_THREADS,
    ONNX_INTRA_THREADS,
    SCORE_THRESHOLD,
    YUNET_PATH,
)
from app.exceptions import FaceError


@dataclass
class DetectedFace:
    bbox: np.ndarray
    kps: np.ndarray
    score: float
    raw: np.ndarray | None = None


def make_onnx_session(model_path: Path) -> ort.InferenceSession:
    if not model_path.is_file():
        raise FaceError(f"Modelo ONNX ausente: {model_path.name}")
    options = ort.SessionOptions()
    options.intra_op_num_threads = ONNX_INTRA_THREADS
    options.inter_op_num_threads = ONNX_INTER_THREADS
    options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
    return ort.InferenceSession(
        str(model_path),
        sess_options=options,
        providers=["CPUExecutionProvider"],
    )


def _nms(dets: np.ndarray, thresh: float) -> list[int]:
    if dets.size == 0:
        return []
    x1, y1, x2, y2, scores = dets[:, 0], dets[:, 1], dets[:, 2], dets[:, 3], dets[:, 4]
    areas = (x2 - x1 + 1) * (y2 - y1 + 1)
    order = scores.argsort()[::-1]
    keep: list[int] = []
    while order.size > 0:
        i = int(order[0])
        keep.append(i)
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        w = np.maximum(0.0, xx2 - xx1 + 1)
        h = np.maximum(0.0, yy2 - yy1 + 1)
        overlap = (w * h) / (areas[i] + areas[order[1:]] - w * h + 1e-12)
        remaining = np.where(overlap <= thresh)[0]
        order = order[remaining + 1]
    return keep


class YuNetDetector:
    def __init__(self, model_path: Path | None = None, score_threshold: float | None = None):
        path = model_path or YUNET_PATH
        if not path.is_file():
            raise FaceError(f"Modelo ONNX ausente: {path.name}")
        self._detector = cv2.FaceDetectorYN.create(
            str(path),
            "",
            (320, 320),
            float(SCORE_THRESHOLD if score_threshold is None else score_threshold),
            float(NMS_THRESHOLD),
            5000,
        )

    def detect(self, bgr: np.ndarray) -> list[DetectedFace]:
        height, width = bgr.shape[:2]
        self._detector.setInputSize((width, height))
        _, faces = self._detector.detect(bgr)
        if faces is None or len(faces) == 0:
            return []
        result: list[DetectedFace] = []
        for row in faces:
            x, y, box_w, box_h = row[:4]
            kps_yunet = row[4:14].reshape(5, 2)
            # YuNet: olho dir, olho esq, nariz, boca dir, boca esq → ordem ArcFace.
            kps = np.stack(
                [kps_yunet[1], kps_yunet[0], kps_yunet[2], kps_yunet[4], kps_yunet[3]],
                axis=0,
            ).astype(np.float32)
            result.append(
                DetectedFace(
                    bbox=np.array([x, y, x + box_w, y + box_h], dtype=np.float32),
                    kps=kps,
                    score=float(row[14]),
                    raw=np.asarray(row, dtype=np.float32),
                )
            )
        return result


class ScrfdDetector:
    """SCRFD (det_500m) via ONNX Runtime — pack buffalo_sc licenciado."""

    def __init__(self, model_path: Path | None = None, score_threshold: float | None = None):
        path = model_path or BUFFALO_DET_PATH
        self.session = make_onnx_session(path)
        self.det_thresh = float(SCORE_THRESHOLD if score_threshold is None else score_threshold)
        self.nms_thresh = float(NMS_THRESHOLD)
        self.input_name = self.session.get_inputs()[0].name
        input_shape = self.session.get_inputs()[0].shape
        if isinstance(input_shape[2], int) and isinstance(input_shape[3], int):
            self.input_size = (int(input_shape[3]), int(input_shape[2]))
        else:
            self.input_size = (640, 640)
        outputs = self.session.get_outputs()
        self.output_names = [item.name for item in outputs]
        self.use_kps = len(outputs) == 9
        self.fmc = 3
        self.feat_stride = (8, 16, 32)
        self.num_anchors = 2
        self._center_cache: dict[tuple[int, int, int], np.ndarray] = {}

    def detect(self, bgr: np.ndarray) -> list[DetectedFace]:
        blob, det_scale = self._preprocess(bgr)
        net_outs = self.session.run(self.output_names, {self.input_name: blob})
        scores_list, bboxes_list, kps_list = self._decode(net_outs, det_scale)
        if not scores_list:
            return []
        scores = np.vstack(scores_list).reshape(-1)
        bboxes = np.vstack(bboxes_list)
        kps = np.vstack(kps_list) if kps_list else None
        order = scores.argsort()[::-1]
        pre_det = np.hstack([bboxes, scores[:, None]])[order]
        keep = _nms(pre_det, self.nms_thresh)
        result: list[DetectedFace] = []
        for idx in keep:
            row = pre_det[idx]
            points = kps[order[idx]].reshape(5, 2).astype(np.float32) if kps is not None else np.zeros((5, 2), dtype=np.float32)
            result.append(
                DetectedFace(
                    bbox=row[:4].astype(np.float32),
                    kps=points,
                    score=float(row[4]),
                    raw=None,
                )
            )
        return result

    def _preprocess(self, bgr: np.ndarray) -> tuple[np.ndarray, float]:
        input_w, input_h = self.input_size
        height, width = bgr.shape[:2]
        im_ratio = height / float(width)
        model_ratio = input_h / float(input_w)
        if im_ratio > model_ratio:
            new_height = input_h
            new_width = int(new_height / im_ratio)
        else:
            new_width = input_w
            new_height = int(new_width * im_ratio)
        det_scale = new_height / float(height)
        resized = cv2.resize(bgr, (new_width, new_height))
        blob = np.zeros((1, 3, input_h, input_w), dtype=np.float32)
        rgb = resized[:, :, ::-1].astype(np.float32)
        rgb = (rgb - 127.5) / 128.0
        blob[0, :, :new_height, :new_width] = rgb.transpose(2, 0, 1)
        return blob, det_scale

    def _decode(self, net_outs: list[np.ndarray], det_scale: float) -> tuple[list, list, list]:
        scores_list: list[np.ndarray] = []
        bboxes_list: list[np.ndarray] = []
        kps_list: list[np.ndarray] = []
        input_w, input_h = self.input_size
        fmc = self.fmc
        for idx, stride in enumerate(self.feat_stride):
            scores = net_outs[idx]
            bbox_preds = net_outs[idx + fmc] * stride
            if self.use_kps:
                kps_preds = net_outs[idx + fmc * 2] * stride
            if scores.ndim == 3:
                scores = scores[0]
                bbox_preds = bbox_preds[0]
                if self.use_kps:
                    kps_preds = kps_preds[0]
            height = input_h // stride
            width = input_w // stride
            anchor_centers = self._anchor_centers(height, width, stride)
            pos = np.where(scores.reshape(-1) >= self.det_thresh)[0]
            if pos.size == 0:
                continue
            scores_sel = scores.reshape(-1)[pos]
            bboxes = self._distance2bbox(anchor_centers, bbox_preds.reshape(-1, 4))[pos] / det_scale
            scores_list.append(scores_sel.reshape(-1, 1))
            bboxes_list.append(bboxes)
            if self.use_kps:
                kps = self._distance2kps(anchor_centers, kps_preds.reshape(-1, 10))[pos] / det_scale
                kps_list.append(kps)
        return scores_list, bboxes_list, kps_list

    def _anchor_centers(self, height: int, width: int, stride: int) -> np.ndarray:
        key = (height, width, stride)
        cached = self._center_cache.get(key)
        if cached is not None:
            return cached
        anchor_centers = np.stack(np.mgrid[:height, :width][::-1], axis=-1).astype(np.float32)
        anchor_centers = (anchor_centers * stride).reshape((-1, 2))
        if self.num_anchors > 1:
            anchor_centers = np.stack([anchor_centers] * self.num_anchors, axis=1).reshape((-1, 2))
        self._center_cache[key] = anchor_centers
        return anchor_centers

    @staticmethod
    def _distance2bbox(points: np.ndarray, distance: np.ndarray) -> np.ndarray:
        x1 = points[:, 0] - distance[:, 0]
        y1 = points[:, 1] - distance[:, 1]
        x2 = points[:, 0] + distance[:, 2]
        y2 = points[:, 1] + distance[:, 3]
        return np.stack([x1, y1, x2, y2], axis=-1)

    @staticmethod
    def _distance2kps(points: np.ndarray, distance: np.ndarray) -> np.ndarray:
        preds = []
        for i in range(0, distance.shape[1], 2):
            px = points[:, 0] + distance[:, i]
            py = points[:, 1] + distance[:, i + 1]
            preds.append(px)
            preds.append(py)
        return np.stack(preds, axis=-1)
