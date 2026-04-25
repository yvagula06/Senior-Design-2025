"""
Image Quality Service

Checks uploaded food photos for:
- Blur (Laplacian variance)
- Brightness (too dark / too bright)
- Centering (is food roughly in the frame centre?)
- Basic content check (non-trivial image, not all one colour)

Returns a composite quality score [0..1] and an optional retake suggestion.

Dependencies:
- Pillow + numpy (same as segmentation_service — degrade gracefully if absent)
"""

import base64
import io
import logging
import math
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

try:
    from PIL import Image as _PILImage, ImageFilter as _ImageFilter
    import numpy as _np
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False
    logger.warning("⚠️ Pillow/numpy not available – image quality checks will use static estimates")


# ── Thresholds ────────────────────────────────────────────────────────────────

_BLUR_THRESHOLD = 80.0          # Laplacian variance below this → blurry
_DARK_THRESHOLD = 0.18          # Mean luminance below this → too dark
_BRIGHT_THRESHOLD = 0.90        # Mean luminance above this → too bright
_MIN_VARIANCE = 0.002           # Nearly flat image → likely blank/covered lens


# ── Main public function ──────────────────────────────────────────────────────

def check_image_quality(image_b64: str) -> Dict[str, Any]:
    """
    Analyse a single base64-encoded image and return quality metrics.

    Returns:
        {
            "quality_score":          float [0..1],
            "blur_score":             float [0..1]  (1 = sharp),
            "brightness_score":       float [0..1]  (1 = ideal),
            "centering_score":        float [0..1]  (1 = centred),
            "blur_detected":          bool,
            "too_dark":               bool,
            "too_bright":             bool,
            "issues":                 List[str],
            "retake_recommendation":  str | None,
        }
    """
    if not _PIL_AVAILABLE:
        return _static_ok()

    try:
        raw = base64.b64decode(image_b64)
        img = _PILImage.open(io.BytesIO(raw)).convert("RGB")
    except Exception as exc:
        logger.warning(f"⚠️ Could not decode image for quality check: {exc}")
        return _static_ok()

    # Downscale for speed
    max_w = 320
    if img.width > max_w:
        ratio = max_w / img.width
        img = img.resize((max_w, int(img.height * ratio)), _PILImage.BILINEAR)

    arr = _np.array(img, dtype=_np.float32) / 255.0  # H×W×3

    issues: list[str] = []

    # ── Blur detection (Laplacian variance of luminance channel) ─────────────
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    lum_uint8 = (lum * 255).astype(_np.uint8)
    lum_pil = _PILImage.fromarray(lum_uint8, mode="L")
    lap = lum_pil.filter(_ImageFilter.FIND_EDGES)
    lap_arr = _np.array(lap, dtype=_np.float32)
    blur_variance = float(_np.var(lap_arr))
    blur_detected = blur_variance < _BLUR_THRESHOLD
    blur_score = float(min(1.0, blur_variance / (_BLUR_THRESHOLD * 3)))  # normalise

    if blur_detected:
        issues.append("Image is blurry – hold the camera still")

    # ── Brightness ────────────────────────────────────────────────────────────
    mean_lum = float(_np.mean(lum))
    too_dark = mean_lum < _DARK_THRESHOLD
    too_bright = mean_lum > _BRIGHT_THRESHOLD

    # Ideal brightness in [0.25, 0.80] → score=1; falls off on either side
    if 0.25 <= mean_lum <= 0.80:
        brightness_score = 1.0
    elif mean_lum < 0.25:
        brightness_score = float(mean_lum / 0.25)
    else:
        brightness_score = float(max(0.0, 1.0 - (mean_lum - 0.80) / 0.20))

    if too_dark:
        issues.append("Image is too dark – use better lighting")
    if too_bright:
        issues.append("Image is too bright / overexposed")

    # ── Centering ─────────────────────────────────────────────────────────────
    # Use saturation/value mask (same logic as segmentation heuristic)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    cmax = _np.maximum(_np.maximum(r, g), b)
    cmin = _np.minimum(_np.minimum(r, g), b)
    delta = cmax - cmin
    saturation = _np.where(cmax > 0, delta / (cmax + 1e-6), 0.0)

    food_mask = (saturation > 0.10) & (cmax > 0.15) & (cmax < 0.97)
    ys, xs = _np.where(food_mask)
    h, w = arr.shape[:2]

    if len(ys) > 200:
        food_cy, food_cx = float(_np.mean(ys)), float(_np.mean(xs))
        dist = math.sqrt((food_cy - h / 2) ** 2 + (food_cx - w / 2) ** 2)
        max_dist = math.sqrt((h / 2) ** 2 + (w / 2) ** 2) + 1e-6
        centering_score = float(max(0.0, 1.0 - dist / max_dist))

        coverage = len(ys) / (h * w + 1)
        if centering_score < 0.4:
            issues.append("Food appears off-centre – centre the plate in the frame")
        if coverage < 0.10:
            issues.append("Food takes up very little of the frame – move closer")
        if coverage > 0.85:
            issues.append("Image may be too close – move the camera back slightly")
    else:
        centering_score = 0.5
        issues.append("Could not detect food in image – ensure food is visible")

    # ── Composite quality score ───────────────────────────────────────────────
    quality_score = float(
        0.40 * blur_score +
        0.35 * brightness_score +
        0.25 * centering_score
    )
    quality_score = round(max(0.0, min(1.0, quality_score)), 3)

    # ── Retake recommendation ─────────────────────────────────────────────────
    retake: Optional[str] = None
    if quality_score < 0.45 or blur_detected or (too_dark and too_bright is False):
        if issues:
            retake = issues[0]  # primary issue
        else:
            retake = "Image quality is low – try retaking the photo"

    return {
        "quality_score": quality_score,
        "blur_score": round(blur_score, 3),
        "brightness_score": round(brightness_score, 3),
        "centering_score": round(centering_score, 3),
        "blur_detected": blur_detected,
        "too_dark": too_dark,
        "too_bright": too_bright,
        "issues": issues,
        "retake_recommendation": retake,
    }


def check_images_quality(images_b64: list[str]) -> Dict[str, Any]:
    """
    Check quality for multiple images and aggregate.

    Returns:
        {
            "per_image": [<per-image result>, ...],
            "avg_quality_score": float,
            "worst_quality_score": float,
            "any_blur": bool,
            "retake_recommendation": str | None,
        }
    """
    results = [check_image_quality(img) for img in images_b64]
    scores = [r["quality_score"] for r in results]
    avg_score = sum(scores) / len(scores) if scores else 0.5
    worst_score = min(scores) if scores else 0.5
    any_blur = any(r["blur_detected"] for r in results)

    # Gather unique retake messages
    retakes = [r["retake_recommendation"] for r in results if r["retake_recommendation"]]
    retake = retakes[0] if retakes else None

    return {
        "per_image": results,
        "avg_quality_score": round(avg_score, 3),
        "worst_quality_score": round(worst_score, 3),
        "any_blur": any_blur,
        "retake_recommendation": retake,
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _static_ok() -> Dict[str, Any]:
    """Return a neutral 'OK' result when image analysis is unavailable."""
    return {
        "quality_score": 0.75,
        "blur_score": 0.75,
        "brightness_score": 0.75,
        "centering_score": 0.75,
        "blur_detected": False,
        "too_dark": False,
        "too_bright": False,
        "issues": [],
        "retake_recommendation": None,
    }
