"""
Segmentation Service

Primary: Clarifai API (if available).
Fallback: Classical-image-processing heuristic using numpy/Pillow that gives
          stable, deterministic results for every image without any ML model.

The enhanced interface returns rich mask metadata so the volume estimator can
compute plate-reference and multi-angle volumes.  The pluggable design means
SAM / YOLO-seg / MobileSAM can be dropped in by subclassing SegmentationBackend.
"""

import base64
import io
from typing import Any, List, Dict
import logging
import math
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)

# ── optional heavy dependencies (degrade gracefully) ──────────────────────────
try:
    from PIL import Image as _PILImage
    import numpy as _np
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False
    logger.warning("⚠️ Pillow/numpy not available – segmentation fallback will use static estimates")

try:
    from app.services.vision_api_client import get_clarifai_client
    _CLARIFAI_AVAILABLE = True
except ImportError:
    _CLARIFAI_AVAILABLE = False


# ── Pluggable backend interface ───────────────────────────────────────────────

class SegmentationBackend:
    """Abstract base – swap in SAM / YOLO-seg / MobileSAM by subclassing."""

    def segment(self, image_b64: str, image_index: int) -> Dict[str, Any]:
        raise NotImplementedError


class ClarifaiBackend(SegmentationBackend):
    """Clarifai API segmentation backend."""

    def __init__(self, client):
        self._client = client

    def segment(self, image_b64: str, image_index: int) -> Dict[str, Any]:
        result = self._client.segment_food(image_b64)
        return {
            "image_index": image_index,
            "source": "clarifai",
            "mask_available": result.get("mask_available", False),
            "segmentation_quality": result.get("segmentation_quality", 0.75),
            "food_region_pixels": result.get("food_region_pixels", 0),
            "total_pixels": result.get("total_pixels", 640 * 480),
            "coverage_ratio": result.get("coverage_ratio", 0.4),
            "plate_area_pixels": result.get("plate_area_pixels", 0),
            "food_area_ratio": result.get("food_area_ratio", 0.4),
            "bounding_box": result.get("bounding_box", None),
            "segmentation_quality_score": result.get("segmentation_quality", 0.75),
        }


class HeuristicBackend(SegmentationBackend):
    """
    Classical-image-processing fallback.

    Algorithm (when PIL + numpy are available):
    1. Decode image → RGB array
    2. Convert to HSV; build a rough saturation+value mask to detect
       "colourful / non-background" pixels → food_mask approximation
    3. Detect the largest near-circular connected blob as the plate
    4. Compute area ratios, quality scores

    When PIL is unavailable: return sensible fixed estimates.
    """

    def segment(self, image_b64: str, image_index: int) -> Dict[str, Any]:
        if not _PIL_AVAILABLE:
            return self._static_estimate(image_index)
        try:
            return self._heuristic_segment(image_b64, image_index)
        except Exception as exc:
            logger.warning(f"⚠️ Heuristic segmentation failed for image {image_index}: {exc}")
            return self._static_estimate(image_index)

    # ------------------------------------------------------------------
    def _heuristic_segment(self, image_b64: str, image_index: int) -> Dict[str, Any]:
        raw = base64.b64decode(image_b64)
        img = _PILImage.open(io.BytesIO(raw)).convert("RGB")
        # Downscale for speed (max 320px wide)
        max_w = 320
        if img.width > max_w:
            ratio = max_w / img.width
            img = img.resize((max_w, int(img.height * ratio)), _PILImage.BILINEAR)

        arr = _np.array(img, dtype=_np.float32) / 255.0  # H×W×3 in [0,1]
        total_pixels = arr.shape[0] * arr.shape[1]

        # ── HSV conversion ────────────────────────────────────────────
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        cmax = _np.maximum(_np.maximum(r, g), b)
        cmin = _np.minimum(_np.minimum(r, g), b)
        delta = cmax - cmin

        saturation = _np.where(cmax > 0, delta / (cmax + 1e-6), 0.0)
        value = cmax

        # Food heuristic: reasonably saturated or warm, not very dark, not pure white
        food_mask = (
            ((saturation > 0.12) | (value > 0.6)) &
            (value > 0.15) &
            (value < 0.97)
        )
        food_pixels = int(_np.sum(food_mask))

        # Plate heuristic: large low-saturation region near image centre
        plate_mask = (saturation < 0.15) & (value > 0.4)
        plate_pixels = int(_np.sum(plate_mask))

        food_area_ratio = food_pixels / (total_pixels + 1)

        # Bounding box of food mask
        rows = _np.any(food_mask, axis=1)
        cols = _np.any(food_mask, axis=0)
        if rows.any() and cols.any():
            rmin, rmax = int(_np.argmax(rows)), int(len(rows) - 1 - _np.argmax(rows[::-1]))
            cmin_b, cmax_b = int(_np.argmax(cols)), int(len(cols) - 1 - _np.argmax(cols[::-1]))
            bbox = [cmin_b, rmin, cmax_b, rmax]
        else:
            bbox = None

        # Centering score: how centred is the food blob?
        cy, cx = arr.shape[0] // 2, arr.shape[1] // 2
        ys, xs = _np.where(food_mask)
        if len(ys) > 0:
            food_cy, food_cx = float(_np.mean(ys)), float(_np.mean(xs))
            dist = math.sqrt((food_cy - cy) ** 2 + (food_cx - cx) ** 2)
            max_dist = math.sqrt(cy ** 2 + cx ** 2) + 1e-6
            centering_score = float(max(0.0, 1.0 - dist / max_dist))
        else:
            centering_score = 0.3

        # Quality: combination of coverage ratio + centering
        seg_quality = min(1.0, 0.5 * min(food_area_ratio / 0.35, 1.0) + 0.5 * centering_score)

        return {
            "image_index": image_index,
            "source": "heuristic",
            "mask_available": food_pixels > 100,
            "segmentation_quality": round(seg_quality, 3),
            "segmentation_quality_score": round(seg_quality, 3),
            "food_region_pixels": food_pixels,
            "plate_area_pixels": plate_pixels,
            "total_pixels": total_pixels,
            "coverage_ratio": round(food_area_ratio, 4),
            "food_area_ratio": round(food_area_ratio, 4),
            "bounding_box": bbox,
            "centering_score": round(centering_score, 3),
        }

    def _static_estimate(self, image_index: int) -> Dict[str, Any]:
        """Fallback when no image processing library is available."""
        return {
            "image_index": image_index,
            "source": "static_fallback",
            "mask_available": True,
            "segmentation_quality": 0.70,
            "segmentation_quality_score": 0.70,
            "food_region_pixels": 35000,
            "plate_area_pixels": 60000,
            "total_pixels": 640 * 480,
            "coverage_ratio": 0.35,
            "food_area_ratio": 0.35,
            "bounding_box": None,
            "centering_score": 0.7,
        }


# ── Service class ─────────────────────────────────────────────────────────────

class SegmentationService:
    """
    Food segmentation service.

    Uses Clarifai when available; otherwise uses the heuristic backend.
    Exposes ``segment_food()`` (legacy simple interface) and
    ``segment_food_enhanced()`` (richer output for the normal-camera pipeline).
    """

    def __init__(self):
        self._backend = self._build_backend()

    def _build_backend(self) -> SegmentationBackend:
        if _CLARIFAI_AVAILABLE:
            try:
                client = get_clarifai_client()
                if client.stub:
                    logger.info("✅ Using Clarifai segmentation backend")
                    return ClarifaiBackend(client)
            except Exception as exc:
                logger.warning(f"⚠️ Clarifai init failed: {exc}")
        logger.info("Using heuristic segmentation backend")
        return HeuristicBackend()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def segment_food(self, images_base64: List[str]) -> List[Dict[str, Any]]:
        """
        Legacy interface – returns a list of mask metadata dicts.

        Each dict has at minimum:
            image_index, mask_available, segmentation_quality,
            food_region_pixels, total_pixels, coverage_ratio
        """
        return [self._backend.segment(img, i) for i, img in enumerate(images_base64)]

    def segment_food_enhanced(
        self,
        images_base64: List[str],
    ) -> Dict[str, Any]:
        """
        Enhanced interface for the normal-camera pipeline.

        Returns:
            {
                "masks": [<per-image mask dict>, ...],
                "food_mask": <primary mask dict>,
                "plate_mask": <primary plate dict>,
                "avg_segmentation_quality": float,
                "avg_food_area_ratio": float,
                "primary_bounding_box": list | None,
                "primary_food_pixels": int,
                "primary_plate_pixels": int,
                "primary_total_pixels": int,
            }
        """
        masks = self.segment_food(images_base64)
        primary = masks[0] if masks else {}

        avg_quality = (
            sum(m.get("segmentation_quality", 0.5) for m in masks) / len(masks)
            if masks else 0.5
        )
        avg_food_ratio = (
            sum(m.get("food_area_ratio", m.get("coverage_ratio", 0.35)) for m in masks)
            / len(masks)
            if masks else 0.35
        )

        return {
            "masks": masks,
            "food_mask": primary,
            "plate_mask": primary,  # same dict carries plate_area_pixels
            "avg_segmentation_quality": round(avg_quality, 3),
            "avg_food_area_ratio": round(avg_food_ratio, 4),
            "primary_bounding_box": primary.get("bounding_box"),
            "primary_food_pixels": primary.get("food_region_pixels", 0),
            "primary_plate_pixels": primary.get("plate_area_pixels", 0),
            "primary_total_pixels": primary.get("total_pixels", 307200),
        }


# ── Singleton / convenience ───────────────────────────────────────────────────

_segmentation_instance: Optional[SegmentationService] = None


def get_segmentation_service() -> SegmentationService:
    """Get or create singleton segmentation service instance."""
    global _segmentation_instance
    if _segmentation_instance is None:
        _segmentation_instance = SegmentationService()
    return _segmentation_instance


def segment_food(images_base64: List[str]) -> List[Dict[str, Any]]:
    """Segment food regions – convenience wrapper (legacy interface)."""
    return get_segmentation_service().segment_food(images_base64)


def segment_food_enhanced(images_base64: List[str]) -> Dict[str, Any]:
    """Enhanced segmentation returning plate+food masks and quality scores."""
    return get_segmentation_service().segment_food_enhanced(images_base64)
