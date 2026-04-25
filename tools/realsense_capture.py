"""
Intel RealSense D435i Capture Tool
===================================
Desktop-only utility for capturing aligned RGB + depth frames from an Intel
RealSense D435i and posting them to the NutriLabelAI /vision/estimate/upload
endpoint for demo and testing.

Usage (from repo root):
    python tools/realsense_capture.py
    python tools/realsense_capture.py --output-dir captures/ --api http://192.168.1.191:8000

Dependencies (not in main pyproject.toml – install separately for demo machine):
    pip install pyrealsense2 requests pillow numpy

If you just want to test the POST logic without a camera attached, pass --demo:
    python tools/realsense_capture.py --demo
"""

import argparse
import io
import json
import os
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, Tuple

import numpy as np

try:
    import pyrealsense2 as rs
    REALSENSE_AVAILABLE = True
except ImportError:
    REALSENSE_AVAILABLE = False
    print("⚠️  pyrealsense2 not installed. Use --demo flag to test without hardware.")

try:
    from PIL import Image as PILImage
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False


# ---------------------------------------------------------------------------
# Camera Intrinsics Extraction
# ---------------------------------------------------------------------------

def extract_intrinsics(profile: "rs.pipeline_profile") -> dict:
    """
    Extract D435i RGB camera intrinsics from an active pipeline profile.

    Returns a dict matching CameraIntrinsics schema:
        fx, fy, cx, cy, width, height, depth_scale
    """
    color_stream = profile.get_stream(rs.stream.color).as_video_stream_profile()
    intr = color_stream.get_intrinsics()

    # depth_scale converts raw sensor units to meters (typically 0.001 for D435i)
    depth_sensor = profile.get_device().first_depth_sensor()
    depth_scale = depth_sensor.get_depth_scale()

    return {
        "focal_length_x": float(intr.fx),
        "focal_length_y": float(intr.fy),
        "principal_point_x": float(intr.ppx),
        "principal_point_y": float(intr.ppy),
        "image_width": int(intr.width),
        "image_height": int(intr.height),
        "depth_scale": float(depth_scale),
    }


# ---------------------------------------------------------------------------
# Frame Capture
# ---------------------------------------------------------------------------

def capture_aligned_frames(
    color_width: int = 640,
    color_height: int = 480,
    fps: int = 30,
    warmup_frames: int = 30,
) -> Tuple[np.ndarray, np.ndarray, dict]:
    """
    Capture one aligned RGB + depth frame pair from the first RealSense device.

    Args:
        color_width:   RGB stream width in pixels.
        color_height:  RGB stream height in pixels.
        fps:           Stream frame rate.
        warmup_frames: Frames to discard before capturing (auto-exposure settle).

    Returns:
        rgb_array:   uint8 HxWx3 NumPy array (BGR order from RealSense).
        depth_array: float32 HxW NumPy array, depth in **meters**.
        intrinsics:  Dict with fx, fy, cx, cy, width, height, depth_scale.
    """
    if not REALSENSE_AVAILABLE:
        raise RuntimeError("pyrealsense2 is not installed.")

    pipeline = rs.pipeline()
    config = rs.config()
    config.enable_stream(rs.stream.color, color_width, color_height, rs.format.bgr8, fps)
    config.enable_stream(rs.stream.depth, color_width, color_height, rs.format.z16, fps)

    profile = pipeline.start(config)

    # Align depth to the RGB sensor frame
    align = rs.align(rs.stream.color)

    try:
        intrinsics = extract_intrinsics(profile)
        depth_scale = intrinsics["depth_scale"]

        # Discard warmup frames so auto-exposure stabilises
        for _ in range(warmup_frames):
            pipeline.wait_for_frames()

        frames = pipeline.wait_for_frames()
        aligned = align.process(frames)

        color_frame = aligned.get_color_frame()
        depth_frame = aligned.get_depth_frame()

        if not color_frame or not depth_frame:
            raise RuntimeError("Failed to capture aligned frames from RealSense.")

        rgb_array = np.asanyarray(color_frame.get_data())   # uint8 HxWx3 BGR
        depth_raw = np.asanyarray(depth_frame.get_data())   # uint16 HxW, raw sensor units

        # Convert to meters (float32)
        depth_m = depth_raw.astype(np.float32) * depth_scale

        return rgb_array, depth_m, intrinsics

    finally:
        pipeline.stop()


# ---------------------------------------------------------------------------
# Save to Disk
# ---------------------------------------------------------------------------

def save_capture(
    rgb_array: np.ndarray,
    depth_m: np.ndarray,
    output_dir: str = "captures",
) -> Tuple[str, str]:
    """
    Save captured RGB and depth arrays to disk.

    Returns:
        rgb_path:   Path to saved JPEG file.
        depth_path: Path to saved .npy file (float32, depth in meters).
    """
    os.makedirs(output_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    rgb_path = os.path.join(output_dir, f"rgb_{timestamp}.jpg")
    depth_path = os.path.join(output_dir, f"depth_{timestamp}.npy")

    # Save RGB as JPEG (convert BGR → RGB for PIL)
    if PIL_AVAILABLE:
        img = PILImage.fromarray(rgb_array[..., ::-1])  # BGR → RGB
        img.save(rgb_path, "JPEG", quality=90)
    else:
        # Fallback: write raw bytes as PPM
        rgb_path = rgb_path.replace(".jpg", ".npy")
        np.save(rgb_path, rgb_array)

    # Save depth as .npy (float32, meters)
    np.save(depth_path, depth_m)

    print(f"  Saved RGB:   {rgb_path}")
    print(f"  Saved depth: {depth_path}")
    return rgb_path, depth_path


# ---------------------------------------------------------------------------
# Generate demo frames (no hardware required)
# ---------------------------------------------------------------------------

def generate_demo_frames() -> Tuple[np.ndarray, np.ndarray, dict]:
    """
    Synthesise realistic-looking frames for demo / CI testing.

    Returns the same types as capture_aligned_frames().
    """
    h, w = 480, 640
    rng = np.random.default_rng(42)

    # Fake RGB: a brownish plate-like blob in the centre
    rgb = np.full((h, w, 3), [220, 200, 180], dtype=np.uint8)  # light background
    cy_px, cx_px = h // 2, w // 2
    yy, xx = np.ogrid[:h, :w]
    plate_mask = ((xx - cx_px) ** 2 + (yy - cy_px) ** 2) < (150 ** 2)
    rgb[plate_mask] = [180, 120, 80]  # brownish food colour
    # Add some noise
    rgb = np.clip(rgb.astype(np.int16) + rng.integers(-20, 20, rgb.shape), 0, 255).astype(np.uint8)

    # Fake depth: flat table at 0.40 m, food region raised by ~0.04 m
    depth = np.full((h, w), 0.40, dtype=np.float32)
    depth[plate_mask] = 0.36  # food is 4 cm closer to camera

    intrinsics = {
        "focal_length_x": 615.0,
        "focal_length_y": 615.0,
        "principal_point_x": float(w // 2),
        "principal_point_y": float(h // 2),
        "image_width": w,
        "image_height": h,
        "depth_scale": 0.001,
    }
    return rgb, depth, intrinsics


# ---------------------------------------------------------------------------
# POST to NutriLabelAI backend
# ---------------------------------------------------------------------------

def post_to_api(
    rgb_path: str,
    depth_path: str,
    intrinsics: dict,
    api_base: str = "http://localhost:8000",
    dish_hint: Optional[str] = None,
) -> dict:
    """
    POST an RGB image + depth .npy file to POST /vision/estimate/upload.

    Args:
        rgb_path:   Path to JPEG/PNG RGB image.
        depth_path: Path to .npy depth file (float32, meters).
        intrinsics: Camera intrinsics dict (from extract_intrinsics or demo).
        api_base:   Base URL of the FastAPI backend.
        dish_hint:  Optional hint for the dish name (passed in preferences).

    Returns:
        Parsed JSON response dict from the API.
    """
    try:
        import requests
    except ImportError:
        raise RuntimeError("requests library not installed. Run: pip install requests")

    metadata_payload = {
        "device_type": "realsense",
        "capture_mode": "depth",
        "device_model": "Intel RealSense D435i",
    }

    intrinsics_payload = {k: v for k, v in intrinsics.items()}

    preferences_payload: dict = {}
    if dish_hint:
        preferences_payload["dish_hint"] = dish_hint

    form_data = {
        "metadata_json": json.dumps(metadata_payload),
        "intrinsics_json": json.dumps(intrinsics_payload),
    }
    if preferences_payload:
        form_data["preferences_json"] = json.dumps(preferences_payload)

    with open(rgb_path, "rb") as rgb_file, open(depth_path, "rb") as depth_file:
        files = [
            ("rgb_images", (os.path.basename(rgb_path), rgb_file, "image/jpeg")),
            ("depth_file", (os.path.basename(depth_path), depth_file, "application/octet-stream")),
        ]
        url = f"{api_base}/vision/estimate/upload"
        print(f"\n📡 POST {url}")
        start = time.time()
        resp = requests.post(url, data=form_data, files=files, timeout=60)
        elapsed_ms = int((time.time() - start) * 1000)

    print(f"  Status:  {resp.status_code}  ({elapsed_ms} ms)")
    if resp.ok:
        return resp.json()
    else:
        print(f"  Error:   {resp.text[:500]}")
        resp.raise_for_status()
        return {}


# ---------------------------------------------------------------------------
# CLI entry point
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="RealSense D435i capture + NutriLabelAI upload")
    parser.add_argument("--demo", action="store_true",
                        help="Use synthesised frames instead of live camera")
    parser.add_argument("--output-dir", default="captures",
                        help="Directory to save captured frames (default: captures/)")
    parser.add_argument("--api", default="http://localhost:8000",
                        help="Backend base URL (default: http://localhost:8000)")
    parser.add_argument("--dish-hint", default=None,
                        help="Optional dish name hint to guide classification")
    parser.add_argument("--no-upload", action="store_true",
                        help="Capture and save frames but do not POST to API")
    args = parser.parse_args()

    print("=" * 60)
    print("  NutriLabelAI – RealSense D435i Capture Tool")
    print("=" * 60)

    # 1. Acquire frames
    if args.demo:
        print("\n🧪 Demo mode: generating synthetic frames …")
        rgb_array, depth_m, intrinsics = generate_demo_frames()
    else:
        if not REALSENSE_AVAILABLE:
            print("❌ pyrealsense2 not found. Install it or run with --demo.")
            return
        print("\n📷 Connecting to Intel RealSense D435i …")
        rgb_array, depth_m, intrinsics = capture_aligned_frames()

    print("\n✅ Capture complete")
    print(f"   RGB shape:   {rgb_array.shape}  dtype={rgb_array.dtype}")
    print(f"   Depth shape: {depth_m.shape}  dtype={depth_m.dtype}")
    print(f"   Intrinsics:  fx={intrinsics['focal_length_x']:.1f}  "
          f"fy={intrinsics['focal_length_y']:.1f}  "
          f"depth_scale={intrinsics['depth_scale']}")

    # 2. Save to disk
    rgb_path, depth_path = save_capture(rgb_array, depth_m, args.output_dir)

    if args.no_upload:
        print("\n⏭️  --no-upload set, skipping API call.")
        return

    # 3. POST to backend
    result = post_to_api(
        rgb_path=rgb_path,
        depth_path=depth_path,
        intrinsics=intrinsics,
        api_base=args.api,
        dish_hint=args.dish_hint,
    )

    print("\n📊 Estimation Result:")
    print(f"   Dish:         {result.get('selected_dish', {}).get('dish_name', 'N/A')}")
    cal = result.get("calorie_estimate", {})
    print(f"   Calories:     {cal.get('value', 'N/A')} kcal  "
          f"[{cal.get('range', {}).get('min', '?')} – {cal.get('range', {}).get('max', '?')}]")
    vol = result.get("volume_estimate")
    if vol:
        print(f"   Volume:       {vol.get('value', 'N/A')} {vol.get('unit', 'ml')}"
              f"  (conf={vol.get('confidence', '?'):.2f})")
    print(f"   Mode:         {result.get('estimation_mode', 'N/A')}")
    print(f"   Accuracy:     {result.get('accuracy_score', 'N/A')}")
    est_id = result.get("estimate_id")
    if est_id:
        print(f"   Estimate ID:  {est_id}  (use for feedback/meal-log)")
    print()


if __name__ == "__main__":
    main()
