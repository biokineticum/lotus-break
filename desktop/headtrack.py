import json
import math
import os
import sys
import time
import urllib.request

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["GLOG_minloglevel"] = "3"

LIB = "yolo"
MODEL_NAME = "yolov8n-face.onnx"
MODEL_URL = "https://github.com/yakhyo/yolov8-face-onnx-inference/releases/download/weights/yolov8n-face.onnx"
IMGSZ = 320
CONF = 0.30
IOU = 0.45
JPG_EVERY = 8


def emit(ok, x=0.5, y=0.5, pts=None, err="", jpg="", lib=LIB):
    sys.stdout.write(json.dumps({
        "type": "head",
        "ok": bool(ok),
        "x": float(x),
        "y": float(y),
        "pts": pts or [],
        "err": err or "",
        "jpg": jpg or "",
        "lib": lib,
    }, separators=(",", ":")) + "\n")
    sys.stdout.flush()


emit(False, err="YOLO loading…")

import base64
import cv2
import numpy as np
import onnxruntime as ort

COLORS = (
    (80, 180, 255),
    (80, 180, 255),
    (60, 220, 120),
    (220, 160, 60),
    (220, 160, 60),
)


class OneEuro:
    def __init__(self, min_cutoff=3.2, beta=0.85, dcutoff=1.2):
        self.min_cutoff = float(min_cutoff)
        self.beta = float(beta)
        self.dcutoff = float(dcutoff)
        self.x_prev = None
        self.dx_prev = 0.0
        self.t_prev = None

    def reset(self, x):
        self.x_prev = float(x)
        self.dx_prev = 0.0
        self.t_prev = time.perf_counter()
        return self.x_prev

    def __call__(self, x):
        t = time.perf_counter()
        x = float(x)
        if self.x_prev is None:
            return self.reset(x)
        dt = t - self.t_prev
        if dt <= 1e-4:
            return self.x_prev
        if dt > 0.25:
            return self.reset(x)
        dx = (x - self.x_prev) / dt
        ad = self._alpha(dt, self.dcutoff)
        dx_hat = ad * dx + (1.0 - ad) * self.dx_prev
        cutoff = self.min_cutoff + self.beta * abs(dx_hat)
        a = self._alpha(dt, cutoff)
        x_hat = a * x + (1.0 - a) * self.x_prev
        self.x_prev, self.dx_prev, self.t_prev = x_hat, dx_hat, t
        return x_hat

    @staticmethod
    def _alpha(dt, cutoff):
        tau = 1.0 / (2.0 * math.pi * cutoff)
        return 1.0 / (1.0 + tau / dt)


def open_cam():
    for api in (cv2.CAP_DSHOW, cv2.CAP_MSMF, cv2.CAP_ANY):
        for i in range(3):
            cap = cv2.VideoCapture(i, api)
            if not cap.isOpened():
                continue
            try:
                cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
            except Exception:
                pass
            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 320)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 240)
            cap.set(cv2.CAP_PROP_FPS, 60)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            ok, frame = cap.read()
            if ok and frame is not None:
                return cap
            cap.release()
    return None


def read_fresh(cap):
    # Drop a stale buffered frame so we always track the latest pose.
    cap.grab()
    return cap.read()


def encode_jpg(frame):
    small = cv2.resize(frame, (240, 135), interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", small, [int(cv2.IMWRITE_JPEG_QUALITY), 42])
    if not ok:
        return ""
    return base64.b64encode(buf.tobytes()).decode("ascii")


def draw_rig(frame, pts, cop):
    h, w = frame.shape[:2]
    px = [(int(p[0] * w), int(p[1] * h)) for p in pts]
    if len(px) >= 5:
        cv2.line(frame, px[0], px[2], (90, 160, 200), 1, cv2.LINE_AA)
        cv2.line(frame, px[1], px[2], (90, 160, 200), 1, cv2.LINE_AA)
        cv2.line(frame, px[3], px[4], (90, 160, 200), 1, cv2.LINE_AA)
        mid_m = ((px[3][0] + px[4][0]) // 2, (px[3][1] + px[4][1]) // 2)
        cv2.line(frame, px[2], mid_m, (90, 160, 200), 1, cv2.LINE_AA)
    for i, p in enumerate(px):
        cv2.circle(frame, p, 4, COLORS[i % 5], -1, cv2.LINE_AA)
        cv2.circle(frame, p, 6, (20, 20, 20), 1, cv2.LINE_AA)
    cx, cy = int(cop[0] * w), int(cop[1] * h)
    cv2.drawMarker(frame, (cx, cy), (90, 210, 255), cv2.MARKER_CROSS, 22, 2, cv2.LINE_AA)
    cv2.circle(frame, (cx, cy), 11, (90, 210, 255), 2, cv2.LINE_AA)
    cv2.putText(frame, "YOLOv8-Face  5pts  CoP", (8, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (210, 200, 160), 1, cv2.LINE_AA)


def find_model():
    here = os.path.dirname(os.path.abspath(__file__))
    names = [MODEL_NAME, os.path.join("models", MODEL_NAME)]
    roots = [here, os.path.dirname(here), os.getcwd()]
    cur = here
    for _ in range(8):
        parent = os.path.dirname(cur)
        if parent == cur:
            break
        roots.append(parent)
        cur = parent
    for root in roots:
        for name in names:
            path = os.path.join(root, name)
            if os.path.isfile(path) and os.path.getsize(path) > 1_000_000:
                return path
            path = os.path.join(root, "desktop", "models", MODEL_NAME)
            if os.path.isfile(path) and os.path.getsize(path) > 1_000_000:
                return path
    dest_dir = os.path.join(here, "models")
    os.makedirs(dest_dir, exist_ok=True)
    dest = os.path.join(dest_dir, MODEL_NAME)
    emit(False, err="Downloading YOLOv8-Face…")
    urllib.request.urlretrieve(MODEL_URL, dest)
    if os.path.isfile(dest) and os.path.getsize(dest) > 1_000_000:
        return dest
    return None


def letterbox(image, size=IMGSZ, color=(114, 114, 114)):
    h, w = image.shape[:2]
    scale = min(size / h, size / w)
    nw, nh = int(round(w * scale)), int(round(h * scale))
    resized = cv2.resize(image, (nw, nh), interpolation=cv2.INTER_LINEAR)
    dw, dh = (size - nw) / 2.0, (size - nh) / 2.0
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    out = cv2.copyMakeBorder(resized, top, bottom, left, right, cv2.BORDER_CONSTANT, value=color)
    if out.shape[0] != size or out.shape[1] != size:
        out = cv2.resize(out, (size, size), interpolation=cv2.INTER_LINEAR)
    return out, scale, (left, top)


def softmax_dfl(x):
    x = x - np.max(x, axis=-1, keepdims=True)
    e = np.exp(x)
    return e / np.sum(e, axis=-1, keepdims=True)


def nms(boxes, scores, iou_thres):
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = np.maximum(0.0, x2 - x1) * np.maximum(0.0, y2 - y1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size > 0:
        i = int(order[0])
        keep.append(i)
        if order.size == 1:
            break
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = np.maximum(0.0, xx2 - xx1) * np.maximum(0.0, yy2 - yy1)
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-9)
        order = order[1:][iou <= iou_thres]
    return keep


def decode(outputs, conf=CONF, iou=IOU):
    boxes_l, scores_l, kpts_l = [], [], []
    strides = (8, 16, 32)
    for pred, stride in zip(outputs, strides):
        _, ch, height, width = pred.shape
        pred = pred.reshape(ch, -1).T
        scores = 1.0 / (1.0 + np.exp(-pred[:, 64]))
        mask = scores >= conf
        if not np.any(mask):
            continue
        pred = pred[mask]
        scores = scores[mask]
        idx = np.flatnonzero(mask)
        gy, gx = np.divmod(idx, width)
        gx = gx.astype(np.float32) + 0.5
        gy = gy.astype(np.float32) + 0.5
        bbox = softmax_dfl(pred[:, :64].reshape(-1, 4, 16)) @ np.arange(16, dtype=np.float32)
        x1 = (gx - bbox[:, 0]) * stride
        y1 = (gy - bbox[:, 1]) * stride
        x2 = (gx + bbox[:, 2]) * stride
        y2 = (gy + bbox[:, 3]) * stride
        kpt = pred[:, 65:].reshape(-1, 5, 3)
        kgx = gx - 0.5
        kgy = gy - 0.5
        kx = (kpt[:, :, 0] * 2.0 + kgx[:, None]) * stride
        ky = (kpt[:, :, 1] * 2.0 + kgy[:, None]) * stride
        boxes_l.append(np.stack([x1, y1, x2, y2], axis=1))
        scores_l.append(scores)
        kpts_l.append(np.stack([kx, ky], axis=-1).reshape(-1, 10))
    if not boxes_l:
        return None
    boxes = np.concatenate(boxes_l, axis=0)
    scores = np.concatenate(scores_l, axis=0)
    kpts = np.concatenate(kpts_l, axis=0)
    keep = nms(boxes, scores, iou)
    if not keep:
        return None
    best = int(np.argmax(scores[keep]))
    i = keep[best]
    return boxes[i], float(scores[i]), kpts[i]


class YoloFace:
    def __init__(self, path):
        opts = ort.SessionOptions()
        opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        opts.intra_op_num_threads = 2
        opts.inter_op_num_threads = 1
        providers = ["CPUExecutionProvider"]
        avail = ort.get_available_providers()
        if "CUDAExecutionProvider" in avail:
            providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        self.sess = ort.InferenceSession(path, opts, providers=providers)
        self.inp = self.sess.get_inputs()[0].name
        self.outs = [o.name for o in self.sess.get_outputs()]

    def detect(self, frame):
        img, scale, (pad_x, pad_y) = letterbox(frame, IMGSZ)
        blob = img[:, :, ::-1].astype(np.float32) / 255.0
        blob = np.transpose(blob, (2, 0, 1))[None]
        blob = np.ascontiguousarray(blob)
        raw = self.sess.run(self.outs, {self.inp: blob})
        hit = decode(raw)
        if hit is None:
            return None
        box, score, kpt = hit
        kpt = kpt.reshape(5, 2)
        kpt[:, 0] = (kpt[:, 0] - pad_x) / scale
        kpt[:, 1] = (kpt[:, 1] - pad_y) / scale
        h, w = frame.shape[:2]
        kpt[:, 0] = np.clip(kpt[:, 0], 0, w - 1)
        kpt[:, 1] = np.clip(kpt[:, 1], 0, h - 1)
        pts = [[float(p[0] / w), float(p[1] / h)] for p in kpt]
        return pts, score


def main():
    model_path = find_model()
    if model_path is None:
        emit(False, err="YOLO model missing. Put yolov8n-face.onnx in desktop/models/")
        return 2

    emit(False, err="YOLOv8-Face…")
    yolo = YoloFace(model_path)

    cap = open_cam()
    if cap is None:
        emit(False, err="Could not open the camera (YOLO/OpenCV). Close Teams/Zoom.")
        return 2

    tick = 0
    miss = 0
    sx, sy = 0.5, 0.5
    fx = OneEuro()
    fy = OneEuro()
    emit(False, err="Looking for a face…")

    while True:
        ok, frame = read_fresh(cap)
        if not ok or frame is None:
            time.sleep(0.004)
            continue
        hit = yolo.detect(frame)
        tick += 1
        if hit:
            pts, _score = hit
            # Eyes + nose carry lean/lift; mouth adds jaw noise and lag.
            copx = (pts[0][0] + pts[1][0] + pts[2][0]) / 3.0
            copy = (pts[0][1] + pts[1][1] + pts[2][1]) / 3.0
            sx = fx(copx)
            sy = fy(copy)
            miss = 0
            want_jpg = tick % JPG_EVERY == 0
            jpg = ""
            if want_jpg:
                draw_rig(frame, pts, (sx, sy))
                jpg = encode_jpg(frame)
            try:
                emit(True, sx, sy, pts, "", jpg)
            except BrokenPipeError:
                break
        else:
            miss += 1
            if miss > 12:
                fx.x_prev = None
                fy.x_prev = None
            jpg = encode_jpg(frame) if miss > 8 and tick % JPG_EVERY == 0 else ""
            try:
                emit(False, sx, sy, [], "Look at the camera (YOLO)", jpg)
            except BrokenPipeError:
                break

    cap.release()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as ex:
        emit(False, err="YOLO: " + str(ex))
        raise SystemExit(1)
