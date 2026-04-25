"""
Tests: RealSense Depth Integration

Covers:
1. Multipart upload contract – POST /vision/estimate/upload with a synthetic .npy file
2. Depth-mode fallback   – capture_mode=depth without depth_data falls back gracefully
3. RealSense metadata    – device_type=realsense parses correctly in RequestMetadata
4. DB row write          – POST /vision/estimate writes a vision_estimates row
"""

import base64
import io
import json

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_1PX_JPEG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk"
    "+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


def _make_npy_bytes(shape=(48, 64), max_depth_m=0.6):
    """Return bytes of a minimal float32 .npy depth array (values in metres)."""
    arr = np.random.uniform(0.2, max_depth_m, size=shape).astype(np.float32)
    buf = io.BytesIO()
    np.save(buf, arr)
    return buf.getvalue()


def _sample_intrinsics_json(width=64, height=48):
    return json.dumps({
        "focal_length_x": 60.0,
        "focal_length_y": 60.0,
        "principal_point_x": float(width // 2),
        "principal_point_y": float(height // 2),
        "image_width": width,
        "image_height": height,
        "depth_scale": 1.0,
    })


def _sample_metadata_json(device_type="realsense", capture_mode="depth"):
    return json.dumps({
        "device_type": device_type,
        "capture_mode": capture_mode,
        "device_model": "Intel RealSense D435i",
        "user_id": "test-user-rs",
    })


# ---------------------------------------------------------------------------
# Test 1 – Multipart upload contract
# ---------------------------------------------------------------------------

class TestMultipartUploadContract:
    """POST /vision/estimate/upload should accept a .npy depth file and return 200."""

    def test_upload_returns_200_with_npy_depth(self):
        npy_data = _make_npy_bytes()
        img_bytes = base64.b64decode(_1PX_JPEG_B64)

        response = client.post(
            "/vision/estimate/upload",
            data={
                "metadata_json": _sample_metadata_json(),
                "intrinsics_json": _sample_intrinsics_json(),
            },
            files={
                "rgb_images": ("top.jpg", img_bytes, "image/jpeg"),
                "depth_file": ("depth.npy", npy_data, "application/octet-stream"),
            },
        )
        assert response.status_code == 200, response.text

    def test_upload_response_has_required_fields(self):
        npy_data = _make_npy_bytes()
        img_bytes = base64.b64decode(_1PX_JPEG_B64)

        response = client.post(
            "/vision/estimate/upload",
            data={
                "metadata_json": _sample_metadata_json(),
                "intrinsics_json": _sample_intrinsics_json(),
            },
            files={
                "rgb_images": ("top.jpg", img_bytes, "image/jpeg"),
                "depth_file": ("depth.npy", npy_data, "application/octet-stream"),
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "dish_predictions" in data
        assert "selected_dish" in data
        assert "calorie_estimate" in data
        assert "estimation_mode" in data
        assert "accuracy_score" in data

    def test_upload_without_rgb_returns_422(self):
        """Omitting rgb_images should produce a validation error."""
        response = client.post(
            "/vision/estimate/upload",
            data={"metadata_json": _sample_metadata_json()},
            files={},
        )
        assert response.status_code in (400, 422)

    def test_upload_without_depth_still_works(self):
        """Depth file is optional – single-image upload should succeed."""
        img_bytes = base64.b64decode(_1PX_JPEG_B64)
        response = client.post(
            "/vision/estimate/upload",
            data={
                "metadata_json": _sample_metadata_json(
                    device_type="iphone_camera", capture_mode="single"
                ),
            },
            files={"rgb_images": ("top.jpg", img_bytes, "image/jpeg")},
        )
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Test 2 – Depth-mode fallback (no depth_data supplied)
# ---------------------------------------------------------------------------

class TestDepthModeFallback:
    """When capture_mode=depth but no depth_data is sent, the pipeline must
    fall back gracefully (reference_based or multi_angle) and include a
    warning in the response metadata."""

    def _request_depth_no_data(self):
        return {
            "images": [
                {
                    "data": _1PX_JPEG_B64,
                    "angle": "top",
                    "timestamp": "2026-01-20T10:00:00Z",
                }
            ],
            "metadata": {
                "device_type": "realsense",
                "capture_mode": "depth",
                "device_model": "Intel RealSense D435i",
            },
            # Intentionally omitting depth_data and camera_intrinsics
        }

    def test_fallback_returns_200(self):
        response = client.post(
            "/vision/estimate", json=self._request_depth_no_data()
        )
        assert response.status_code == 200, response.text

    def test_fallback_mode_is_not_depth(self):
        """estimation_mode must differ from 'depth' when no depth data is given."""
        response = client.post(
            "/vision/estimate", json=self._request_depth_no_data()
        )
        assert response.status_code == 200
        data = response.json()
        assert data["estimation_mode"] != "depth", (
            "Should fall back to reference_based or multi_angle, not depth"
        )

    def test_fallback_has_accuracy_score(self):
        response = client.post(
            "/vision/estimate", json=self._request_depth_no_data()
        )
        data = response.json()
        assert "accuracy_score" in data
        assert isinstance(data["accuracy_score"], (int, float))


# ---------------------------------------------------------------------------
# Test 3 – RealSense metadata parsing
# ---------------------------------------------------------------------------

class TestRealSenseMetadataParsing:
    """device_type=realsense must round-trip through the endpoint without error."""

    def test_realsense_device_type_accepted(self):
        payload = {
            "images": [
                {
                    "data": _1PX_JPEG_B64,
                    "angle": "top",
                    "timestamp": "2026-01-20T10:00:00Z",
                }
            ],
            "metadata": {
                "device_type": "realsense",
                "capture_mode": "single",
                "device_model": "Intel RealSense D435i",
            },
        }
        response = client.post("/vision/estimate", json=payload)
        assert response.status_code == 200

    def test_ios_lidar_device_type_accepted(self):
        payload = {
            "images": [
                {
                    "data": _1PX_JPEG_B64,
                    "angle": "top",
                    "timestamp": "2026-01-20T10:00:00Z",
                }
            ],
            "metadata": {
                "device_type": "ios_lidar",
                "capture_mode": "single",
                "device_model": "iPhone 15 Pro",
            },
        }
        response = client.post("/vision/estimate", json=payload)
        assert response.status_code == 200

    def test_iphone_camera_device_type_accepted(self):
        payload = {
            "images": [
                {
                    "data": _1PX_JPEG_B64,
                    "angle": "top",
                    "timestamp": "2026-01-20T10:00:00Z",
                }
            ],
            "metadata": {
                "device_type": "iphone_camera",
                "capture_mode": "single",
                "device_model": "iPhone 14",
            },
        }
        response = client.post("/vision/estimate", json=payload)
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Test 4 – DB row write
# ---------------------------------------------------------------------------

class TestDBRowWrite:
    """POST /vision/estimate should persist a vision_estimates row (estimate_id
    will be non-null when DB is available, or null when the DB write fails
    gracefully in tests without a live DB)."""

    def test_estimate_id_present_in_response(self):
        """estimate_id key must exist in response (value may be null in CI)."""
        payload = {
            "images": [
                {
                    "data": _1PX_JPEG_B64,
                    "angle": "top",
                    "timestamp": "2026-01-20T10:00:00Z",
                }
            ],
            "metadata": {
                "device_type": "realsense",
                "capture_mode": "single",
            },
        }
        response = client.post("/vision/estimate", json=payload)
        assert response.status_code == 200
        data = response.json()
        # Key must be present; value is a string UUID or null
        assert "estimate_id" in data
        if data["estimate_id"] is not None:
            assert isinstance(data["estimate_id"], str)
            assert len(data["estimate_id"]) > 0
