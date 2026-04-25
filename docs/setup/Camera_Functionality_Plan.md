# Camera + ML Calories Feature Implementation Plan (Clarifai Vision API + AR/Depth + Multi-Angle Fallback)

## Goal

Add a camera feature that:
- Identifies the dish type from an image
- Estimates calories for the entire plate using volume estimation when possible
- Returns an accuracy score and calorie range
- Allows the user to accept the estimate as their meal entry or edit dish/portion

This integrates into the existing architecture:

**Mobile**
- mobile/src/screens/Vision/CameraCaptureScreen.tsx
- mobile/src/screens/Vision/EstimationResultScreen.tsx
- mobile/src/services/visionApi.ts
- mobile/src/context/FoodContext.tsx

**Backend (FastAPI)**
- POST /vision/estimate
- app/api/vision_router.py
- app/services/vision_orchestrator.py

## Core Architectural Decisions (Locked)

### 1) Vision Provider: Clarifai API (No self-hosted vision models)

We use Clarifai as the vision provider for:
- Dish identification (top-1 + top-K labels + confidence)
- Segmentation (food region mask; optionally plate/background if supported)

We do not run dish classification or segmentation models locally.

### 2) Keys and security

- Clarifai API key is stored only on the backend (environment variable / secrets).
- Mobile never calls Clarifai directly; mobile only calls POST /vision/estimate.

### 3) Volume and calories computed in-house

We keep these in the backend:
- Depth/AR-based volume estimation when supported
- Multi-angle volume estimation fallback (top + side photos)
- Volume → grams → calories conversion using:
  - nutrition DB + retrieval pipeline (embedding search -> mixture -> scaling -> confidence)
  - density priors per dish category (rice, soup, pasta, sandwich, dessert)

### 4) Optional LLM usage (helper, not the source of truth)

LLM is used only for:
- Dish name normalization (e.g., "pho tai" -> "pho")
- Category selection (e.g., "biryani" -> "rice dish" density bucket)
- Resolving ambiguous top-K labels into a canonical dish string for DB mapping

LLM is not used to "look at the image and guess calories."

### 5) Stable endpoint contract

- POST /vision/estimate always returns the same response schema across phases.
- Only the capture mode (depth vs multi-angle) changes the internal volume calculation.

## Phase 0: Finalize requirements and constraints (1 working session)

### Decisions to lock

- Platforms: iOS + Android (Expo)
- Capture modes:
  - Depth/AR mode when supported
  - Multi-angle fallback for all devices
- Clarifai integration details:
  - Which Clarifai models/endpoints to use (food classification + segmentation)
  - Request and response parsing logic
- LLM provider to use (if enabled) and prompt format for normalization/category

### Success criteria

- Dish ID: top-1 + top-3 alternatives with confidence
- Calories estimate + range + accuracy score
- User can confirm/edit dish + portion and log meal

## Phase 1: Ship MVP (Multi-angle first, works on all devices)

### Mobile implementation

#### Entry point

Use existing Camera/Vision tab in navigation.

#### Capture flow (multi-angle)

Update CameraCaptureScreen.tsx to enforce a two-step capture:
1. Top-down photo
2. Side-angle photo

Include a simple overlay guide for consistency.

#### Upload

mobile/src/services/visionApi.ts sends multipart form-data to:
- POST /vision/estimate

Payload fields:
- rgb_top (required)
- rgb_side (required)
- mode = "multi_angle"
- metadata: device model, image width/height, orientation, timestamp

#### Results UI

EstimationResultScreen.tsx shows:
- Predicted dish (dropdown populated from Clarifai top-K)
- Calories estimate + range
- Accuracy score badge
- Portion slider (Small / Normal / Large)
- Confirm button:
  - Writes a structured entry into FoodContext
  - Saves "vision-based meal" in history

### Backend implementation

#### Router

Implement/extend app/api/vision_router.py:
- Endpoint: POST /vision/estimate
- Validates input images and metadata
- Calls vision_orchestrator.estimate(...)

#### Orchestrator pipeline

In app/services/vision_orchestrator.py:

**Call Clarifai Vision API**
- Inputs: rgb_top (and optionally rgb_side for better dish context)
- Outputs:
  - Dish predictions: top-K labels with confidence
  - Segmentation mask for food region (and plate region if supported)

**Normalize dish labels**
- Map Clarifai labels into a canonical dish string
- Optional LLM step:
  - input: Clarifai top-K + raw label strings
  - output: canonical dish name + category bucket

**Volume estimation (multi-angle mode)**
- Use segmentation mask to compute food area from top photo
- Estimate real-world scale:
  - detect plate rim (ellipse) OR use fallback heuristics
- Estimate height from side photo:
  - segmentation on side photo (Clarifai segmentation if available)
  - derive approximate max/avg height
- Compute volume (cm³) using shape factor from category bucket

**Nutrition mapping (calories computation)**
- Convert volume → grams using density prior for category
- Map canonical dish name into nutrition DB via retrieval pipeline:
  - embedding search
  - mixture aggregation
  - scaling
  - confidence computation
- Compute total calories:
  - calories = grams * kcal_per_g (from DB result)

**Confidence + range**
- Produce:
  - accuracy_score based on:
    - Clarifai dish confidence
    - segmentation quality (mask area sanity checks)
    - scale confidence (plate detected or not)
    - height confidence (side view quality)
    - dish variance prior (some dishes vary a lot)
  - range_low/high based on uncertainty factors

**Feedback hooks**
- Store optional feedback events using feedback_router.py:
  - user confirms dish (selected label)
  - portion slider adjustment
  - quick correction "too high/too low"

## Phase 2: Depth/AR first (preferred accuracy) + fallback to multi-angle

### Mobile implementation

#### Capability detection

On entering Camera screen:
- If depth or AR scale is supported, show "Scan Mode" option
- Otherwise default to "2-photo mode"

#### Scan Mode UX

Prompt: "Move phone around the plate for 2–3 seconds"

Capture:
- RGB frame(s)
- depth map (if available)
- intrinsics / AR metadata (if exposed)

#### Automatic fallback

If depth data quality is poor or unsupported:
- Prompt user to take the top and side photos (Phase 1 path)

### Backend implementation

#### Endpoint extension (same endpoint)

POST /vision/estimate additionally accepts:
- depth_top (optional)
- intrinsics (optional)
- mode = "depth"

#### Depth volume estimation

- Clarifai still provides dish ID + segmentation masks
- Backend computes volume using depth:
  - estimate base plane (table/plate)
  - integrate segmented food height above plane
  - compute volume in cm³

#### Confidence adjustment

- Depth coverage/noise tightens or widens the calorie range
- Depth mode should generally produce higher accuracy_score when valid

## Phase 3: Improvement loop (data-driven accuracy)

### Data collected (lightweight)

- Confirmed dish label
- Portion slider selection
- Quick correction feedback
- Optional plate size selection (standard plate, small plate, bowl)

### Improvements enabled

- Better Clarifai label normalization rules
- Improved density priors per category
- Improved multi-angle height heuristics
- Tighter calorie ranges for common meals
- Optional personalization (user-specific portion factor)

## Provider Integration Details (Clarifai baked in)

### Backend service additions

Add app/services/vision_api_client.py:

```
class ClarifaiClient:
    predict_dish(image_bytes) -> topK labels + confidences
    segment_food(image_bytes) -> mask or polygon
```

Centralize retry logic, timeouts, and error handling.

### Error handling requirements

If Clarifai fails:
- Return fallback response:
  - dish = "Unknown"
  - ask user to select dish manually (from search)
  - calories estimate can be disabled or based on generic default portion
- Do not crash mobile flow.

## Engineering Deliverables (repo aligned)

### Mobile

- CameraCaptureScreen.tsx
  - multi-angle capture flow
  - depth/AR scan mode + fallback
- EstimationResultScreen.tsx
  - top-K picker
  - portion slider
  - confirm meal logging
- visionApi.ts
  - multipart upload to /vision/estimate
- FoodContext.tsx
  - log vision estimate helper

### Backend

- app/api/vision_router.py
- app/schemas/vision.py
- app/services/vision_orchestrator.py
- app/services/vision_api_client.py (Clarifai)
- app/services/volume_estimator.py
- app/services/nutrition_mapper.py
- app/services/vision_confidence_adapter.py

## Non-negotiable rule

The /vision/estimate response schema remains identical across phases so the mobile UI never needs to change. Only capture inputs and backend internals evolve.
