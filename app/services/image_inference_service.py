"""Image-based dish inference service.

This module defines a small, well-isolated hook where you can plug in
your own computer vision / deep learning model to infer a dish name
from an input image captured by the mobile app.

The FastAPI /label endpoint will call ``infer_dish_from_image`` when
``image_data`` is provided in the request payload. If this function
returns a non-empty string, that inferred dish name will be used as the
query into the existing retrieval pipeline; otherwise, the API falls
back to the user-provided ``dish_name`` text.

To integrate your model:

1. Load your model once at module import or on first use.
2. Decode ``image_bytes`` into a tensor / array.
3. Run inference and map prediction to a human-readable dish string.
4. Return that string from ``infer_dish_from_image``.

You can reuse artifacts under ``ml_models/`` or add new ones.
"""

from __future__ import annotations

from typing import Optional


def infer_dish_from_image(image_bytes: bytes) -> Optional[str]:
    """Infer a dish name from raw image bytes.

    Args:
        image_bytes: Raw image bytes decoded from base64 sent by the
            mobile client.

    Returns:
        A best-guess dish name (e.g., "butter chicken with rice"), or
        ``None`` if no reliable prediction is available.

    NOTE:
        This is currently a stub implementation. It intentionally does
        **not** perform any real ML so that the API remains functional
        even before the vision model is wired up.

        Replace the body of this function with a call into your own
        model, for example:

        .. code-block:: python

            import io
            from PIL import Image
            import torch

            _model = load_your_model_once()

            def infer_dish_from_image(image_bytes: bytes) -> Optional[str]:
                image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
                tensor = preprocess(image).unsqueeze(0)  # 1xCxHxW
                with torch.inference_mode():
                    logits = _model(tensor)
                dish_id = logits.argmax(dim=1).item()
                return ID_TO_DISH_NAME[dish_id]

    """

    # TODO: Implement real model inference here.
    # For now, return None so the API falls back to ``dish_name`` text.
    return None
