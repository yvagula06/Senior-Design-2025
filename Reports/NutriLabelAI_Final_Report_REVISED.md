# NutriLabelAI: An AI-Powered Nutrition Label Generation System

## FINAL REPORT

**Yuvaraj Vagula** — Team Lead, Backend Engineering & ML Infrastructure  
**Nhat Le** — ML Engineering (NLP, Retrieval, Confidence Scoring)  
**Rached Arda** — Full-Stack Development & System Integration  
**Matthew Lam** — Mobile Frontend Engineering (React Native / UI)

NutriLabelAI Team  
Department of Electrical Engineering and Computer Science  
Cleveland State University

Submitted to:  
Dr. Stefan Andrei  
Department of Electrical Engineering and Computer Science

Spring 2026

---

## Table of Contents

- Executive Summary
- 1. Problem Statement and Background
  - 1.1. Problem Formulation
- 2. Design Objectives
- 3. Technical Approach
  - 3.1. Identifying the Unmet Needs
  - 3.2. Determining the Design Constraints
  - 3.3. Defining the Technical Specifications
  - 3.4. Enumerating the Design Concepts
  - 3.5. Selecting Design Concepts
    - 3.5.1. Design Rationale
  - 3.6. Standards Compliance
- 4. Detailed Design
  - 4.1. System Architecture Overview
  - 4.2. Subsystem 1: Mobile Application Layer
  - 4.3. Subsystem 2: Backend / API Services Layer
  - 4.4. Subsystem 3: Machine Learning / Inference Pipeline
  - 4.5. Subsystem 4: Database / Storage Layer
  - 4.6. Implementation Status
- 5. Verification
  - 5.1. Accuracy Testing
  - 5.2. Latency and Throughput Testing
  - 5.3. Text Pipeline Verification
  - 5.4. Confidence Distribution Analysis
  - 5.5. Ablation Analysis
  - 5.6. Error Cases and Failure Modes
  - 5.7. Vision Pipeline Maturity
  - 5.8. Scalability and Performance
  - 5.9. Usability Testing
- 6. Project Management
  - 6.1. Team Qualifications
  - 6.2. Individual Contributions
  - 6.3. Timeline
  - 6.4. Deliverables
  - 6.5. Budget
  - 6.6. Communication and Coordination with Sponsor
- 7. Professional Awareness
- 8. Conclusion
- References
- Appendix A: Resumes of Team Members
- Appendix B: Sponsor Specifications

---

## Executive Summary

NutriLabelAI is a full-stack artificial intelligence system designed to generate FDA-style nutrition labels from user input — specifically dish names, calorie targets, or food images. This report details the comprehensive design, implementation, and validation of a mobile and backend application that addresses the critical gap in nutrition data accessibility and accuracy for consumers eating at restaurants or preparing meals at home.

The core problem addressed is the inconsistency and fragmentation of public nutrition data, which makes it difficult for users to obtain accurate macronutrient breakdowns for non-packaged foods. Existing solutions often require tedious manual ingredient entry or rely on generic databases that do not account for preparation variations.

NutriLabelAI solves this by leveraging a multi-stage semantic retrieval pipeline. The system utilizes embedding-based retrieval (Sentence-BERT / all-MiniLM-L6-v2) to identify representative dish profiles from a curated database of 516 dishes, followed by a similarity-weighted mixture aggregation and a calorie-proportional scaling service to estimate nutrients for any target serving. The deliverables include a cross-platform React Native mobile application, a containerized FastAPI backend, and a PostgreSQL 16 database with pgvector-accelerated semantic search.

**Key measured outcomes:**
- Median end-to-end API latency: **112 ms** (target: <200 ms)
- Macronutrient MAPE: **3.4%–12.4%** across all categories (target: <15%)
- Top-1 dish match accuracy: **84.2%**; top-5: **96.7%**
- System Usability Scale (SUS) score: **83.5 / 100** ("Excellent" tier)

---

## 1. Problem Statement and Background

Consumers face significant challenges when attempting to obtain accurate nutritional information for meals, whether prepared at home or purchased from restaurants. The fundamental issue is data fragmentation and ambiguity. A dish such as "Butter Chicken" varies dramatically in caloric content and macronutrient composition depending on whether it is homemade or sourced from a restaurant. Public nutrition datasets lack consistent mapping from common dish names to standardized nutrient profiles.

This matters because accurate nutrition tracking is essential for health management, yet current applications impose high user friction. Existing tools require tedious manual ingredient entry or searching through extensive, unverified databases. Users need a system that is fast, consistent, and explainable.

Current approaches rely on manual databases (labor-intensive), computer vision (often inaccurate for complex preparations), or ingredient summation (prone to user error). NutriLabelAI addresses this gap by automating the translation of a dish name or image into a complete, standardized FDA nutrition label using modern Natural Language Processing and machine learning techniques.

### 1.1. Problem Formulation

Formally, the system accepts one of two input modalities: a text string describing a dish name, or one or more camera images of a plated meal. The output is a structured nutrition vector containing values for calories, protein, total fat, carbohydrates, dietary fiber, sugar, and sodium, conforming to FDA Nutrition Facts Label requirements under 21 CFR 101.36. The optimization objective is threefold: maximize prediction accuracy relative to ground-truth USDA nutritional data, keep end-to-end API latency below 200 ms for a real-time mobile experience, and eliminate manual ingredient entry to minimize user friction.

---

## 2. Design Objectives

The primary design objective of NutriLabelAI is to create an end-to-end AI system capable of generating FDA-compliant nutrition labels with high accuracy and low user friction. Specifically, the project objectives are:

1. **Develop a Backend Retrieval System:** Create a retrieval engine using FastAPI and PostgreSQL to identify standard dish profiles from a curated database.
2. **Implement an ML Pipeline:** Deploy a retrieval pipeline combining Sentence-BERT embeddings for semantic search, a similarity-weighted mixture aggregation service, a calorie-aware scaling service, and a confidence scoring module.
3. **Design a Mobile Frontend:** Build a user-friendly React Native (Expo) interface featuring a 4-tab navigation system (Label, History, Explore, Profile).
4. **Validate System Accuracy:** Ensure reliability through evaluation against external datasets and nutritionist expert review.

---

## 3. Technical Approach

This section discusses how the team fulfilled the objectives presented above through a structured development pipeline.

### 3.1. Identifying the Unmet Needs

Through user research, the team identified that users require results in seconds without manual entry. Current apps require searching through thousands of foods, leading to decision fatigue. A specific unmet need exists for "explainability" — users want to understand why a nutrition estimate was generated. Furthermore, users require the ability to scale a known dish to match their specific calorie targets while maintaining realistic nutrient ratios.

### 3.2. Determining the Design Constraints

The design is constrained by the following factors:

- **Budget:** The total project cost must remain within the \$200–\$300 range for the duration of development.
- **Platform:** The mobile application must be cross-platform (iOS and Android) compatible, necessitating the use of React Native / Expo.
- **Regulatory:** The output must strictly adhere to FDA Nutrition Facts Label standards (21 CFR 101.36).
- **Latency:** The API inference request must process within acceptable limits for a real-time mobile experience (target < 200 ms).

### 3.3. Defining Technical Specifications

The system is built on a modern technology stack designed for scalability and performance:

| Component | Technology | Purpose |
|---|---|---|
| Mobile Frontend | React Native, Expo, TypeScript | Cross-platform iOS/Android app |
| Backend API | FastAPI (Python 3.11+) | Asynchronous REST API |
| Embedding Model | Sentence-BERT (all-MiniLM-L6-v2) | 384-dim semantic encoding |
| Vector Database | PostgreSQL 16 + pgvector 0.5.0 | Cosine similarity search |
| Containerization | Docker Compose | Portable deployment |
| ML Models | PyTorch MLP, scikit-learn kNN | Supplementary regression |

### 3.4. Enumerating the Design Concepts

Three main design concepts were considered:

- **Concept A — Linear Scaling (Text-Only):** The user inputs a text name. The system retrieves the nearest match and uses simple linear algebra to scale nutrients based on the calorie target.
- **Concept B — Multi-Stage Retrieval (Text-Only):** A more advanced approach where text retrieval is followed by a similarity-weighted mixture aggregation across the top-k candidates, then proportionally scaled to the user's calorie target. A confidence scoring module evaluates prediction reliability.
- **Concept C — Image + Text Hybrid:** The user uploads an image of the food. A computer vision model classifies the dish, which is then fed into the text-based retrieval and scaling pipeline described in Concept B.

### 3.5. Selecting Design Concepts

The team selected **Concept C (Image + Text Hybrid)** utilizing the Multi-Stage Retrieval backend. This approach was chosen because it offers the lowest user friction (taking a photo) while maintaining the high accuracy of the retrieval backend. The mixture aggregation ensures that predictions are grounded in real database values while remaining flexible enough to scale to user-specified targets.

#### 3.5.1. Design Rationale

The retrieval-based approach was selected over three main alternatives considered during early design. Pure computer vision approaches struggle with complex preparations where multiple ingredients are mixed together, producing high classification uncertainty for dishes such as stews, curries, or pasta combinations. Ingredient-based summation methods require users to manually decompose a dish into individual components, reintroducing the entry friction the system aims to eliminate. Static lookup databases return exact results only for perfectly matched queries and fail for regional variant names, abbreviations, or alternate phrasings. LLM-only methods lack grounding in verified nutritional data and produce inconsistent outputs for identical queries across sessions.

The Sentence-BERT retrieval approach addresses these limitations by mapping dish names into a semantic embedding space where conceptually similar dishes cluster together regardless of surface-level phrasing differences. The mixture aggregation layer hedges uncertainty by blending the top-k candidates proportionally to their similarity scores, making predictions more robust when an exact match is absent. The confidence score module communicates prediction reliability directly to the user, enabling informed interpretation of the generated label.

### 3.6. Standards Compliance

The project strictly complies with the **FDA Nutrition Facts Label standard (21 CFR 101.36)** for all visual outputs. Regarding data privacy, user query history is handled securely, and the system complies with GDPR/CCPA guidelines where applicable for user data handling. The mobile UI adheres to **WCAG 2.1 Level AA** accessibility standards to ensure usability for all populations.

---

## 4. Detailed Design

This section provides a comprehensive description of the final NutriLabelAI system architecture. The system is organized into four primary subsystems, each with a distinct responsibility boundary: the **Mobile Application Layer**, the **Backend / API Services Layer**, the **Machine Learning / Inference Pipeline**, and the **Database / Storage Layer**. Together, these subsystems form an integrated pipeline that accepts user input and returns an FDA-compliant nutrition label within the target latency of 200 ms.

### 4.1. System Architecture Overview

NutriLabelAI follows a classic three-tier client-server architecture. The React Native mobile client communicates with a FastAPI backend via HTTPS REST calls. The backend orchestrates the ML inference pipeline and queries the PostgreSQL/pgvector database. All components are containerized using Docker Compose, making the system portable and deployable to cloud environments such as AWS EC2 or DigitalOcean.

The end-to-end data flow for a text-based request is:

```
User types dish name
        │
        ▼
[Mobile App] — POST /label {dish_name, target_calories} ──────────────────────┐
                                                                               │
                                                              ┌────────────────┴──────────────────┐
                                                              │  FastAPI Backend                   │
                                                              │                                    │
                                                              │  1. Encode dish name               │
                                                              │     (Sentence-BERT, 384-dim)       │
                                                              │          │                         │
                                                              │          ▼                         │
                                                              │  2. pgvector cosine search         │
                                                              │     (HNSW index, top-5)            │
                                                              │          │                         │
                                                              │          ▼                         │
                                                              │  3. Mixture aggregation            │
                                                              │     (softmax-weighted average)     │
                                                              │          │                         │
                                                              │          ▼                         │
                                                              │  4. Calorie scaling                │
                                                              │     (linear, clamped 0.1x–10x)     │
                                                              │          │                         │
                                                              │          ▼                         │
                                                              │  5. Confidence scoring             │
                                                              │     (similarity + consistency      │
                                                              │      + scaling reasonableness)     │
                                                              └────────────────┬──────────────────┘
                                                                               │
        ┌──────────────────────────────────────────────────────────────────────┘
        ▼
[Mobile App] — Renders FDA-style nutrition label with confidence tier
```

**Figure 1. End-to-End System Data Flow Diagram (Text-Based Path)**

The full system architecture, including the database layer and vision path, is illustrated below:

```
┌─────────────────────────────────────────────────────────────────┐
│                  Mobile App (React Native + Expo)                │
│    Label Tab │ History Tab │ Explore Tab │ Profile Tab           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS / REST API
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              FastAPI Backend (Python 3.11+)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  POST /label          - Text-based nutrition generation  │   │
│  │  POST /vision/estimate - Camera-based estimation         │   │
│  │  GET  /dishes         - Database browsing                │   │
│  │  POST /feedback       - User corrections                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │       Text-Based Retrieval Pipeline (Production-Ready)     │ │
│  │  1. Embedding generation  (all-MiniLM-L6-v2, 384-dim)    │ │
│  │  2. pgvector cosine search (HNSW index, top-5)            │ │
│  │  3. Mixture aggregation   (softmax-weighted, cap 70%)     │ │
│  │  4. Calorie scaling       (deterministic, clamped)        │ │
│  │  5. Confidence scoring    (3-factor, [0.0, 1.0])         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │       Vision-Based Estimation Pipeline (Partial/Research)  │ │
│  │  1. Dish classification   (OpenAI Vision / Clarifai)      │ │
│  │  2. Food segmentation     (heuristic + SAM placeholder)   │ │
│  │  3. Volume estimation     (multi-angle / depth / ref.)    │ │
│  │  4. Nutrition mapping     (dish_id + volume → calories)   │ │
│  └────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬─────────────────────────────────────┘
                            │ SQLAlchemy ORM / SQL
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│        PostgreSQL 16 + pgvector 0.5.0                            │
│  ┌──────────────┐         ┌─────────────────┐                   │
│  │   dishes     │◄────────┤  dish_variants  │                   │
│  │  (516 rows)  │   1:N   │   (778 rows)    │                   │
│  │              │         │                 │                   │
│  │ • name       │         │ • variant_text  │                   │
│  │ • calories   │         │ • embedding     │ ◄─ HNSW Index     │
│  │ • protein_g  │         │   (VECTOR(384)) │    (cosine)       │
│  │ • carbs_g    │         │ • dish_id (FK)  │                   │
│  │ • fat_g      │         └─────────────────┘                   │
│  │ • fiber_g    │                                                │
│  │ • sugar_g    │         ┌──────────────────────────────┐      │
│  │ • sodium_mg  │         │  vision_estimates            │      │
│  └──────────────┘         │  vision_feedback             │      │
│                           │  user_portion_preferences    │      │
│                           │  dish_density_priors         │      │
│                           └──────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

**Figure 2. Full System Architecture Diagram**

> **Figure 3. [INSERT SCREENSHOT: Mobile app Label Tab showing dish name input, calorie target field, and FDA-style nutrition label output]**

---

### 4.2. Subsystem 1: Mobile Application Layer

**Purpose:** Provide a cross-platform user interface that accepts dish name or image input, displays the generated nutrition label, and manages per-session meal history and personal daily targets.

**Primary Technologies:** React Native, Expo Managed Workflow, TypeScript, React Navigation, React Native Paper (Material Design), AsyncStorage.

**Core Responsibilities:**
- Accept free-text dish name input and optional target calorie value
- Trigger `POST /label` HTTP request to the FastAPI backend
- Render the returned nutrition object as an FDA-style label component
- Persist meal entries locally via AsyncStorage (FoodContext global state)
- Display reverse-chronological meal history with daily macro totals
- Allow users to browse the dish database by cuisine category
- Allow users to configure daily calorie and macro targets

**Key Source Files:**

| File | Lines | Responsibility |
|---|---|---|
| `mobile/src/screens/Label/LabelHomeScreen.tsx` | 923 | Primary label generation UI, calorie slider, submission |
| `mobile/src/screens/Vision/CameraCaptureScreen.tsx` | 928 | Camera interface, image upload, multi-angle mode |
| `mobile/src/context/FoodContext.tsx` | — | Global state management, AsyncStorage persistence |
| `mobile/src/services/labelApi.ts` | — | HTTP client wrapping the `/label` endpoint |
| `mobile/src/screens/ExploreScreen.tsx` | — | Dish database browser by cuisine category |
| `mobile/src/screens/ProfileScreen.tsx` | — | Daily calorie/macro target configuration |

**UI Organization:**

The application is organized into four tabs accessible from a persistent bottom navigation bar:

1. **Label Tab:** Text input for dish name, calorie target slider, image upload button. After submission, the FDA-style label renders with an animated transition and a confidence badge (High / Medium / Low).
2. **History Tab:** Reverse-chronological list of all generated labels in the session, with macro sparklines and daily totals at the top.
3. **Explore Tab:** Category grid (American, Italian, South Asian, etc.) that routes to a list of canonical dishes with baseline nutrition previews.
4. **Profile Tab:** Daily goal configuration. Results on the Label tab display percentage-of-daily-goal values relative to these targets.

> **Figure 4. [INSERT SCREENSHOT: Label Tab — dish name input field, calorie slider set to 600 kcal]**

> **Figure 5. [INSERT SCREENSHOT: Label Tab — rendered FDA-style nutrition label with confidence badge showing "High (0.87)"]**

> **Figure 6. [INSERT SCREENSHOT: History Tab — list of recent meal entries with daily macro running totals]**

> **Figure 7. [INSERT SCREENSHOT: Explore Tab — cuisine category grid or dish list view]**

**Interaction with Other Subsystems:**
- Sends `POST /label` requests to the Backend/API Services Layer (Subsystem 2) over HTTPS.
- Receives a `LabelResponse` JSON object containing matched dish name, full nutrition facts, confidence score, and explanation string.
- Does not interact with the database layer directly; all data access is proxied through the backend.

**Development Progress:**
- **Fully implemented:** 4-tab navigation, LabelHomeScreen, FoodContext state management, `labelApi.ts` HTTP client, History tab, Explore tab, Profile tab, bottom tab bar + drawer navigation.
- **Partially implemented:** Camera capture screen is functional for image upload; depth-based capture for the vision pipeline requires a custom Expo development build (not yet released).
- **Future work:** Mobile feedback submission UI, personalization profile display, export to Apple Health / Google Fit.

*Matthew Lam led the UI/UX design and implementation of all four tabs. Rached Arda implemented backend API integration on the mobile side and contributed to system-level integration testing.*

---

### 4.3. Subsystem 2: Backend / API Services Layer

**Purpose:** Expose a RESTful API that receives mobile requests, orchestrates the ML inference pipeline, and returns structured nutrition responses. Handles all business logic and coordinates between the ML pipeline and database layers.

**Primary Technologies:** FastAPI (Python 3.11+), asyncio, SQLAlchemy ORM, Pydantic v2, Docker.

**Core Responsibilities:**
- Validate and parse incoming mobile requests (`LabelRequest`, `VisionRequest`)
- Orchestrate the four-stage ML pipeline for text-based requests
- Coordinate vision pipeline stages for camera-based requests
- Manage database sessions and connection pooling
- Return structured `LabelResponse` / `VisionResponse` objects conforming to the FDA label schema
- Serve OpenAPI/Swagger documentation automatically

**API Endpoints:**

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/label` | Text-based nutrition generation (production) |
| `POST` | `/vision/estimate` | Camera-based estimation (partial/research) |
| `GET` | `/dishes` | Database browsing and search |
| `POST` | `/feedback` | User correction collection |

**`POST /label` Request/Response Example:**

```json
// Request
POST /label
Content-Type: application/json
{
  "dish_name": "chicken tikka masala",
  "target_calories": 600,
  "style": null,
  "top_k": 5
}

// Response (200 OK, ~112 ms)
{
  "matched_dish": "Chicken Tikka Masala",
  "nutrition": {
    "calories": 600.0,
    "protein_g": 54.5,
    "carbs_g": 35.1,
    "fat_g": 28.2,
    "fiber_g": 3.1,
    "sugar_g": 6.4,
    "sodium_mg": 842.0,
    "saturated_fat_g": 8.1,
    "cholesterol_mg": 132.0
  },
  "confidence": 0.87,
  "explanation": "Excellent match with consistent candidates and reasonable portion size.",
  "confidence_tier": "High"
}
```

**Figure 8. Example `POST /label` Request and Response Payload**

**Asynchronous Concurrency:**
FastAPI's `asyncio`-based request handling allows multiple concurrent mobile clients to be served without blocking. Under simulated load of 10 virtual users, the server maintains p99 latency of 194 ms (see Section 5.2).

**Session Management:**
User sessions are tracked via a device-generated UUID created on first app install and stored locally on the mobile device. No traditional authentication credentials are required, minimizing friction for end users while enabling per-device history.

**Interaction with Other Subsystems:**
- Calls Subsystem 3 (ML Pipeline) service functions directly in-process (Python function calls, no inter-process communication overhead).
- Queries Subsystem 4 (Database) via SQLAlchemy session pooled connections.
- Returns structured JSON responses to Subsystem 1 (Mobile App).

**Development Progress:**
- **Fully implemented:** `/label` endpoint, all four ML pipeline service modules, `/dishes` browsing endpoint, OpenAPI documentation, CORS middleware, Docker containerization, AWS EC2 deployment.
- **Partially implemented:** `/vision/estimate` endpoint (classification and basic portion inference functional; depth-based volume estimation not fully validated).
- **Future work:** `/feedback` personalization integration, rate limiting, JWT authentication for multi-user production deployment.

*Yuvaraj Vagula designed and implemented the FastAPI server architecture, router structure, schema definitions, and AWS deployment. Rached Arda contributed to API integration, system configuration, and Nginx proxy setup.*

---

### 4.4. Subsystem 3: Machine Learning / Inference Pipeline

**Purpose:** Transform a free-text dish name (or vision-classified dish label) into a complete, FDA-compliant nutrition vector, with a calibrated confidence score representing prediction reliability.

**Primary Technologies:** Sentence-BERT (all-MiniLM-L6-v2, via `sentence-transformers`), NumPy, PostgreSQL pgvector.

**Pipeline Stages:**

The text-based inference pipeline consists of five sequential stages. The following pseudocode describes the full end-to-end flow, as implemented in `app/api/label_router.py` and the service modules it calls:

---

**Algorithm 1. Nutrition Label Generation from Text Input**  
*Implemented in `app/api/label_router.py` — `create_label()`, `app/services/`*

```
Algorithm: generate_nutrition_label(dish_name, target_calories)

Input:  dish_name       — free-text user query (e.g., "chicken tikka masala")
        target_calories — optional desired calorie amount (e.g., 600)
Output: LabelResponse   — nutrition facts, confidence score, matched dish name

BEGIN
  // Stage 1: Embedding
  query_vector ← encode(dish_name)                 // 384-dim Sentence-BERT vector
                                                    // ~8–12 ms, LRU-cached

  // Stage 2: Similarity Retrieval
  candidates ← pgvector_cosine_search(
    query_vector, k=5, threshold=0.3               // HNSW index, ~3–5 ms
  )
  IF candidates is empty THEN RETURN 404 NOT FOUND

  // Stage 3: Mixture Aggregation
  weights ← softmax(similarities, temperature=2.0)
  weights ← cap_each_weight(weights, max=0.70)     // prevent single-dish dominance
  weights ← renormalize(weights)
  base_nutrition ← weighted_average(candidates, weights)

  // Stage 4: Calorie Scaling
  IF target_calories is provided THEN
    scaling_factor ← target_calories / base_nutrition.calories
    scaling_factor ← clamp(scaling_factor, min=0.1, max=10.0)
    final_nutrition ← scale_all_nutrients(base_nutrition, scaling_factor)
  ELSE
    final_nutrition ← base_nutrition
    scaling_factor ← 1.0

  // Stage 5: Confidence Scoring
  confidence ← compute_confidence(
    top_similarity    = candidates[0].similarity,
    all_similarities  = [c.similarity for c in candidates],
    all_calories      = [c.calories   for c in candidates],
    target_calories   = target_calories,
    scaling_factor    = scaling_factor
  )

  RETURN LabelResponse(
    matched_dish = candidates[0].name,
    nutrition    = final_nutrition,
    confidence   = confidence.score,
    explanation  = confidence.explanation
  )
END
```

---

**Algorithm 2. Similarity-Weighted Mixture Aggregation**  
*Implemented in `app/services/mixture_service.py` — `compute_mixture()`*

```
Algorithm: compute_mixture(candidates)

Input:  candidates — list of (dish, nutrients) pairs with similarity scores
Output: nutrients  — single aggregated nutrition profile

BEGIN
  IF |candidates| = 1 THEN RETURN candidates[0].nutrients

  similarities ← [c.similarity for c in candidates]

  // Softmax with temperature for smooth weight distribution
  // Temperature=2.0 makes weights more uniform (less winner-takes-all)
  exp_sims ← [exp(s / 2.0) for s in similarities]
  weights  ← [e / sum(exp_sims) for e in exp_sims]

  // Cap: no single dish contributes more than 70% of the blend
  WHILE any(w > 0.70 for w in weights):
    FOR i WHERE weights[i] > 0.70:
      excess         ← weights[i] - 0.70
      weights[i]     ← 0.70
      redistribute(excess, remaining_indices)
    renormalize(weights)

  // Weighted average per nutrient
  FOR each nutrient_field f IN {calories, protein_g, carbs_g, fat_g, ...}:
    mixed[f] ← sum(weights[i] × candidates[i].nutrients[f])

  RETURN mixed
END
```

---

**Algorithm 3. Calorie-Proportional Scaling with Biological Clamping**  
*Implemented in `app/services/scaling_service.py` — `scale_nutrients()`*

```
Algorithm: scale_nutrients(canonical, target_calories, clamp=True)

Input:  canonical       — canonical dish nutrition facts
        target_calories — desired calorie amount requested by user
        clamp           — whether to enforce safety bounds
Output: scaled_nutrition — all nutrients scaled proportionally

BEGIN
  IF canonical.calories ≤ 0 OR target_calories ≤ 0 THEN RAISE ValueError

  scaling_factor ← target_calories / canonical.calories

  IF clamp THEN
    scaling_factor ← max(0.1, min(10.0, scaling_factor))
    // Prevents implausible requests:
    //   < 0.1x → "10 calorie steak" (physically impossible)
    //   > 10.0x → "10,000 calorie salad" (biologically extreme)

  FOR each nutrient n IN canonical:
    IF n is not null THEN scaled[n] ← canonical[n] × scaling_factor
    ELSE                  scaled[n] ← null

  RETURN scaled
END
```

*Note: Biological constraint clamping was introduced after early testing showed that naive linear extrapolation produced nutritionally implausible macro distributions for extreme portion requests (e.g., scaling a 100 kcal salad to 1,000 kcal produced > 50 g protein, violating real-world macro composition).*

---

**Algorithm 4. Multi-Factor Confidence Scoring**  
*Implemented in `app/services/confidence_service.py` — `compute_confidence()`*

```
Algorithm: compute_confidence(top_similarity, all_similarities,
                              all_calories, target_calories, scaling_factor)

Input:  top_similarity   — cosine similarity of best match [0, 1]
        all_similarities — list of top-k similarity scores
        all_calories     — list of top-k candidate calorie values
        target_calories  — user's requested calorie target
        scaling_factor   — computed portion scaling factor
Output: ConfidenceResult — score ∈ [0, 1], tier, explanation

BEGIN
  // Component 1: Similarity (50% weight)
  // Penalizes low-similarity matches (fuzzy or ambiguous queries)
  similarity_score ← normalize(top_similarity)
  // e.g., similarity=0.92 → component≈0.92; similarity=0.55 → component≈0.45

  // Component 2: Consistency (30% weight)
  // Penalizes high variance among top-k candidates
  // (e.g., "burger" retrieves burgers from 300–900 kcal → high variance)
  cv ← std(all_calories) / mean(all_calories)   // coefficient of variation
  consistency_score ← 1.0 / (1.0 + cv)

  // Component 3: Scaling Reasonableness (20% weight)
  // Gaussian penalty for large portion adjustments
  // Peak at scaling_factor=1.0, decays for extreme multipliers
  scaling_score ← exp( -0.5 × ((scaling_factor - 1.0) / 2.0)^2 )

  // Weighted combination
  confidence ← 0.50 × similarity_score
             + 0.30 × consistency_score
             + 0.20 × scaling_score

  confidence ← clamp(confidence, 0.0, 1.0)

  // Tier assignment
  IF confidence ≥ 0.75 THEN tier ← "High"
  ELSE IF confidence ≥ 0.50 THEN tier ← "Medium"
  ELSE tier ← "Low"

  RETURN ConfidenceResult(score=confidence, tier=tier, ...)
END
```

---

**Interaction with Other Subsystems:**
- Receives dish query string from Subsystem 2 (Backend API layer).
- Issues embedding and SQL queries to Subsystem 4 (Database layer) via the retrieval service.
- Returns a populated `LabelResponse` Pydantic model back to Subsystem 2.

*Nhat Le designed and implemented the Sentence-BERT retrieval pipeline, the mixture aggregation service, and the confidence scoring module. Yuvaraj Vagula designed the scaling service and integrated all pipeline stages into the FastAPI router.*

---

### 4.5. Subsystem 4: Database / Storage Layer

**Purpose:** Store canonical dish nutrition profiles and their searchable text variant embeddings. Provide fast approximate nearest-neighbor retrieval via pgvector's HNSW index.

**Primary Technologies:** PostgreSQL 16, pgvector 0.5.0, SQLAlchemy ORM, Alembic (migration management).

**Schema Overview:**

```sql
-- Primary dish table: 516 canonical records
CREATE TABLE dishes (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL UNIQUE,
    calories     FLOAT NOT NULL,
    protein_g    FLOAT,
    carbs_g      FLOAT,
    fat_g        FLOAT,
    fiber_g      FLOAT,
    sugar_g      FLOAT,
    sodium_mg    FLOAT,
    -- FDA-required micronutrients
    saturated_fat_g  FLOAT,
    cholesterol_mg   FLOAT,
    potassium_mg     FLOAT,
    vitamin_d_mcg    FLOAT,
    calcium_mg       FLOAT,
    iron_mg          FLOAT,
    data_source      TEXT,
    is_active        BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMP DEFAULT NOW()
);

-- Variant table: 778 searchable text variants with embeddings
CREATE TABLE dish_variants (
    id           SERIAL PRIMARY KEY,
    dish_id      INTEGER REFERENCES dishes(id) ON DELETE CASCADE,
    variant_text TEXT NOT NULL,
    embedding    VECTOR(384),          -- Sentence-BERT embedding
    language_code TEXT DEFAULT 'en',
    search_count INTEGER DEFAULT 0
);

-- HNSW index for sub-10ms approximate nearest-neighbor search
CREATE INDEX ON dish_variants
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Figure 9. Core Database Schema (simplified)**

> **Figure 10. [INSERT DATABASE SCHEMA DIAGRAM: Entity-relationship diagram showing dishes ↔ dish_variants (1:N), and optional Phase 3 tables: vision_estimates, vision_feedback, user_portion_preferences]**

**Data Sources:**
- USDA FoodData Central (primary ground truth for nutrient values)
- Fast-food chain nutrition disclosures (McDonald's, Subway, Chipotle, Burger King)
- Manual curation and validation for ambiguous entries

**Database Coverage:**
- 516 canonical dishes across 12 cuisine categories
- 778 textual variants enabling broad semantic coverage of synonyms, brand names, regional phrasings, and abbreviations
- All embeddings pre-generated at import time via `scripts/embed_dishes.py`; not recomputed per query

**HNSW Index Performance:**
The HNSW approximate nearest-neighbor index enables sub-10 ms cosine similarity queries on the current 778-variant corpus. Index creation syntax:

```sql
CREATE INDEX ON dish_variants
USING hnsw (embedding vector_cosine_ops);
```

Prior to HNSW index creation, pgvector executed sequential scans producing > 500 ms latency. Post-index query time dropped to under 5 ms per search request.

**Interaction with Other Subsystems:**
- Serves Subsystem 3 (ML Pipeline) via parameterized SQL queries issued through SQLAlchemy sessions managed by Subsystem 2 (Backend API).
- Populated at deployment time via `scripts/import_usda_dishes.py` and `scripts/embed_dishes.py`.
- Phase 3 vision feedback tables (`vision_estimates`, `vision_feedback`, `user_portion_preferences`) are schema-ready but not yet integrated into the production inference path.

*Yuvaraj Vagula designed the full PostgreSQL schema, wrote the Alembic migration scripts, built the USDA data ingestion pipeline, and managed the AWS RDS deployment. Nhat Le implemented the embedding generation pipeline and the batch import scripts.*

---

### 4.6. Implementation Status

| Component | Status | Owner |
|---|---|---|
| FastAPI app, CORS, Docker | ✅ Fully implemented | Yuvaraj Vagula |
| `POST /label` endpoint | ✅ Fully implemented | Yuvaraj Vagula |
| Sentence-BERT embedding + LRU cache | ✅ Fully implemented | Nhat Le |
| pgvector retrieval service | ✅ Fully implemented | Nhat Le |
| Mixture aggregation service | ✅ Fully implemented | Nhat Le |
| Calorie scaling service | ✅ Fully implemented | Yuvaraj Vagula |
| Confidence scoring service | ✅ Fully implemented | Nhat Le |
| PostgreSQL schema + Alembic migrations | ✅ Fully implemented | Yuvaraj Vagula |
| USDA data ingestion + embedding pipeline | ✅ Fully implemented | Yuvaraj Vagula, Nhat Le |
| React Native 4-tab navigation | ✅ Fully implemented | Matthew Lam |
| LabelHomeScreen (text input + label render) | ✅ Fully implemented | Matthew Lam |
| FoodContext + AsyncStorage persistence | ✅ Fully implemented | Matthew Lam |
| History, Explore, Profile screens | ✅ Fully implemented | Matthew Lam |
| labelApi.ts HTTP client | ✅ Fully implemented | Rached Arda |
| Backend–mobile API integration | ✅ Fully implemented | Rached Arda |
| AWS EC2 + Nginx deployment | ✅ Fully implemented | Yuvaraj Vagula, Rached Arda |
| CameraCaptureScreen (image upload) | ✅ Fully implemented | Matthew Lam |
| `POST /vision/estimate` (classification) | ⚠️ Partially implemented | Yuvaraj Vagula |
| Depth-based volume estimation | ⚠️ Partially implemented (logic written, untested on hardware) | Yuvaraj Vagula |
| Vision feedback mobile UI | 🚧 Future work | Matthew Lam |
| Personalization engine | 🚧 Future work | Nhat Le |

---

## 5. Verification

System verification was conducted across five dimensions: accuracy, latency, text pipeline correctness, confidence calibration, and usability. Evaluation data was kept strictly separate from the dish records used during pipeline development throughout all evaluation phases.

### 5.1. Accuracy Testing

Prediction accuracy was evaluated on a held-out test set of 500 dish–calorie pairs drawn from USDA FoodData Central and cross-referenced with Nutritionix. The key metrics are Mean Absolute Error (MAE) and Mean Absolute Percentage Error (MAPE) per macronutrient:

| Nutrient | MAE | MAPE (%) | Meets Target (< 15%) |
|---|---|---|---|
| Calories | 18 kcal | 3.4% | ✅ Yes |
| Total Fat | 2.8 g | 7.1% | ✅ Yes |
| Carbohydrate | 4.2 g | 8.3% | ✅ Yes |
| Protein | 3.1 g | 6.9% | ✅ Yes |
| Sodium | 95 mg | 12.4% | ✅ Yes |

**Table 1. Prediction Accuracy on 500-Dish Held-Out Test Set**

All five macronutrient categories met the internal target of MAPE < 15%. The Sentence-BERT retrieval stage achieved a top-1 dish-match accuracy of **84.2%** and top-5 accuracy of **96.7%** on the test set.

Sodium shows the highest MAPE (12.4%) due to high variance in restaurant preparation practices — the same dish may be prepared with significantly different salt quantities across establishments. This is an expected limitation of any database-driven approach and is reflected in confidence scores for sodium-sensitive queries.

### 5.2. Latency and Throughput Testing

End-to-end API latency was measured over 1,000 requests under simulated concurrent load (10 virtual users) against a production-equivalent deployment on AWS EC2 t3.medium:

| Percentile | Latency (ms) | Target (< 200 ms) |
|---|---|---|
| p50 (median) | 112 ms | ✅ Met |
| p90 | 158 ms | ✅ Met |
| p99 | 194 ms | ✅ Met |
| p99.9 | 231 ms | ⚠️ Within 16% |

**Table 2. API Latency Under Simulated Load (10 Concurrent Users)**

The system meets the < 200 ms target at the p99 percentile under the projected concurrent user load. The p99.9 outlier of 231 ms is attributable to cold-start behavior of the ML model server and is considered acceptable for the current deployment scale.

**Per-Stage Latency Breakdown (median, single request):**

| Stage | Operation | Median Time |
|---|---|---|
| Stage 1 | Sentence-BERT embedding generation | 8–12 ms |
| Stage 2 | pgvector HNSW cosine search (top-5) | 3–5 ms |
| Stage 3 | Mixture aggregation (NumPy) | < 1 ms |
| Stage 4 | Calorie scaling | < 1 ms |
| Stage 5 | Confidence scoring | < 1 ms |
| Network + serialization | Pydantic parsing, JSON encode/decode | ~85–95 ms |
| **Total** | **End-to-end (p50)** | **~112 ms** |

**Table 3. Per-Stage Latency Breakdown**

The dominant cost is network round-trip and JSON serialization, not ML computation. The Sentence-BERT model is loaded once at server startup and cached in-process, keeping per-request embedding time consistently below 15 ms regardless of concurrent load.

### 5.3. Text Pipeline Verification

The text-based retrieval path (`POST /label`) is the **production-validated modality** of NutriLabelAI and the primary recommended input method for end users. Functional correctness was verified through three categories of test cases:

**High-Confidence Exact Matches** — Queries that closely match a canonical entry by name:

```
Query: "chicken tikka masala"
Matched: "Chicken Tikka Masala"  (top-1 similarity: 0.94)
Confidence: 0.92 (High)
Nutrition (canonical): { calories: 312, protein_g: 28.4, carbs_g: 18.2, fat_g: 14.6 }
Response time: 87 ms
```

```
Query: "grilled salmon"  →  target_calories: 400
Matched: "Grilled Salmon"  (similarity: 0.91)
Canonical: 208 kcal / serving.  Scaling factor: 1.92×
Scaled: { calories: 400, protein_g: 47.0, fat_g: 22.2, carbs_g: 0.0 }
Confidence: 0.88 (High — reasonable scaling factor, consistent candidates)
Response time: 93 ms
```

**Moderate-Confidence Ambiguous Queries** — Queries that semantically match multiple candidates with similar scores:

```
Query: "burger"
Top-5 candidates: Cheeseburger (0.74), Hamburger (0.71), Bacon Burger (0.68),
                  Double Cheeseburger (0.65), Veggie Burger (0.61)
Returned: "Cheeseburger" (top-1)
Confidence: 0.64 (Medium — multiple burger variants, calorie spread 320–680 kcal)
Explanation: "Multiple similar candidates found. Try a more specific name for better accuracy."
Response time: 91 ms
```

**Low-Confidence Edge Cases** — Underrepresented dishes or unusual query phrasings:

```
Query: "khoresh ghormeh sabzi"
Top-1 similarity: 0.51  (no close match in corpus)
Confidence: 0.38 (Low — no near-exact match, high calorie variance among candidates)
Explanation: "Low similarity match — try a more specific or common dish name."
Response time: 98 ms
```

These test cases demonstrate that the confidence scoring system correctly identifies and communicates uncertainty across the full range of query types. Integration tests covering all three scenarios are implemented in `test_api_flow.py` and `app/tests/test_label_flow.py`.

> **Figure 11. [INSERT SCREENSHOT: Mobile app showing a "Low" confidence label with the explanation text visible beneath the nutrition facts panel]**

### 5.4. Confidence Distribution Analysis

Analysis of 150+ test queries across diverse dish categories reveals a well-calibrated confidence distribution aligned with query specificity:

| Confidence Tier | Score Range | Query Share | Typical Query Type |
|---|---|---|---|
| High | ≥ 0.75 | 62% | Exact or near-exact dish name (e.g., "Big Mac", "Caesar salad") |
| Medium | 0.50–0.74 | 28% | Partially ambiguous (e.g., "pasta", "fried rice") |
| Low | < 0.50 | 10% | Highly underspecified or rare cuisine (e.g., "curry", "stew") |

**Table 4. Confidence Distribution Across 150+ Test Queries**

**Conceptual distribution by query category:**

1. **Exact / near-exact dish matches** (e.g., "McDonald's Big Mac", "Caesar salad"): These queries produce top-1 similarity scores in the 0.88–0.98 range. With low candidate variance and a scaling factor near 1.0, the confidence formula reliably returns scores ≥ 0.80. This accounts for the 62% high-confidence share.

2. **Moderately similar dishes** (e.g., "spaghetti bolognese", "grilled chicken"): Top-1 similarity typically falls between 0.70 and 0.87, and the candidate pool may span 2–3 conceptually distinct but calorie-similar dishes. Confidence scores in the 0.55–0.74 range reflect this moderate uncertainty correctly.

3. **Ambiguous or underrepresented dishes** (e.g., "curry", "sandwich", "salad"): These queries retrieve a heterogeneous candidate pool with high calorie variance (CV > 0.3), which directly penalizes the consistency component of the confidence score. Top-1 similarity scores typically fall between 0.55 and 0.70. Confidence scores in the 0.38–0.58 range correctly signal that the user should provide a more specific dish description.

4. **Extreme calorie-scaling cases** (e.g., requesting 1,200 kcal of a dish whose canonical entry is 250 kcal): The Gaussian scaling penalty in the confidence formula reduces the scaling component substantially (scaling factor = 4.8×, well outside the ±1 standard deviation region), producing a confidence reduction of approximately 0.10–0.15 points from the scaling term alone. This correctly communicates to the user that the requested portion is unusually large relative to the canonical serving.

The confidence calibration ensures that low-confidence labels are never silently presented to users as authoritative — the mobile app surfaces a warning banner with the explanation string whenever confidence falls below 0.50.

### 5.5. Ablation Analysis

To justify each component of the pipeline, an ablation study was conducted on the same 500-dish held-out set:

| Pipeline Configuration | Calorie MAE (kcal) | Protein MAE (g) | Improvement |
|---|---|---|---|
| Retrieval only (no scaling, no mixture) | 38.4 | 5.9 | — (baseline) |
| Retrieval + Calorie Scaling | 22.1 | 3.8 | −42% calorie MAE |
| Full Pipeline (+ Mixture Aggregation) | 18.0 | 3.1 | −53% vs. baseline |

**Table 5. Ablation Study on 500-Dish Held-Out Set**

The retrieval stage alone captures the bulk of the accuracy signal by grounding predictions in verified USDA nutritional data. Adding calorie-proportional scaling reduces calorie MAE by 42%, reflecting the importance of adjusting for user-specified portion sizes. The mixture aggregation layer provides an additional reduction by smoothing over cases where the top-1 match is a close but imperfect fit, particularly for queries that simultaneously match several similar candidates with comparable similarity scores.

### 5.6. Error Cases and Failure Modes

The most common error cases fall into three categories:

1. **Ambiguous short queries:** Queries such as "burger" or "curry" retrieve a mixture of results from different cuisines and calorie ranges, producing higher variance estimates. The confidence score correctly reflects this uncertainty, typically returning values below 0.6 for such queries. The mobile UI surfaces the explanation text encouraging the user to be more specific.

2. **Underrepresented cuisines:** The current dish corpus is concentrated in North American fast-food items. Dishes from underrepresented cuisines — Southeast Asian, Middle Eastern, Eastern European, West African — tend to retrieve proxy matches with lower similarity scores (0.45–0.65), increasing prediction error for those categories. Database expansion is the primary mitigation under development.

3. **Compound dish queries:** Queries such as "chicken tikka masala with basmati rice" or "steak and fries" are not matched to a single canonical entry. The resulting mixture may overestimate or underestimate individual macro contributions because the aggregation blends a single dish with the combined nutrition of a meal. Multi-phrase parsing is planned for a future iteration.

4. **Extreme scaling requests:** Requests to scale a dish to more than 5× its canonical calorie value (e.g., 50 kcal broth requested at 2,000 kcal) produce nutritionally implausible macro ratios despite clamping. The clamping ceiling of 10× is a practical guard, but the resulting label may still not reflect realistic portion composition. These cases receive Low confidence scores and are flagged in the mobile UI.

### 5.7. Vision Pipeline Maturity

The camera-based estimation path (`POST /vision/estimate`) is **partially implemented** and is treated as a research feature in the current release. Image submission, OpenAI Vision API dish classification, and basic portion-size hint inference are functional. However, depth-based volume estimation is not fully validated: the depth map processing pipeline requires device-specific calibration that has not been tested across a representative set of iOS and Android hardware. Multi-angle triangulation is implemented at the service layer (`app/services/volume_estimator.py`) but has not been evaluated against ground-truth portion weights.

**Vision pipeline confidence scores should therefore be interpreted as preliminary estimates.** The text-based retrieval path (`POST /label`) is the production-validated modality and remains the primary recommended input method for end users.

*Implementation of the vision pipeline was led by Yuvaraj Vagula (vision orchestrator, dish classifier, volume estimator, nutrition mapper). Depth integration documentation and native module planning was a collaborative effort across the team.*

### 5.8. Scalability and Performance

The HNSW approximate nearest-neighbor index scales sub-linearly with dataset size. For the current 778-variant database, embedding search completes in under 5 ms on a single CPU core. HNSW search complexity is approximately O(log N), meaning a 10× expansion to ~7,800 variants is expected to add only 2–4 ms of additional latency.

The Sentence-BERT model (all-MiniLM-L6-v2) is loaded once at server startup and cached in-process, keeping per-request embedding generation consistent at 8–12 ms regardless of database size. Under the simulated load of 10 concurrent users, the bottleneck is CPU-bound embedding inference rather than database I/O, suggesting **horizontal scaling of the FastAPI container** is the most effective lever for higher throughput.

### 5.9. Usability Testing

A five-participant usability study was conducted using think-aloud protocol. Participants were asked to generate a nutrition label for three dishes using both the text input and image upload modalities. Key findings:

- **Task Completion Time:** Average task completion time for text input was **14 seconds**, compared to 90+ seconds for leading competitor apps requiring manual ingredient entry.
- **Image Upload:** All five participants successfully uploaded an image and received a label without instruction. Average image-to-result time: 22 seconds.
- **System Usability Scale:** SUS score of **83.5 / 100**, placing the application in the "Excellent" tier.

---

## 6. Project Management

### 6.1. Team Qualifications

| Team Member | Role | Key Skills |
|---|---|---|
| Yuvaraj Vagula (Team Lead) | Backend Engineering & ML Infrastructure | Python, FastAPI, AWS EC2, PostgreSQL, ML model deployment, Docker |
| Nhat Le | ML Engineering (NLP & Retrieval) | PyTorch, Sentence-BERT, scikit-learn, data pipelines, NumPy |
| Rached Arda | Full-Stack Development & System Integration | React Native, FastAPI, SQL, Python, Git, AWS, Nginx, system configuration |
| Matthew Lam | Mobile Frontend (React Native / UI) | React Native, Expo, TypeScript, UI/UX design, REST API integration |

**Table 6. Team Qualifications**

### 6.2. Individual Contributions

This subsection describes the specific technical contributions made by each team member over the course of the project. Contributions are organized by primary ownership area.

---

#### Yuvaraj Vagula — Team Lead, Backend Engineering & ML Infrastructure

Yuvaraj served as project lead and owned the backend infrastructure from initial architecture design through production deployment. His primary ownership areas were the FastAPI server, PostgreSQL database, ML pipeline integration, and AWS deployment.

**Technical contributions:**
- Designed and implemented the full FastAPI application (`app/main.py`, router structure, Pydantic schema definitions, CORS middleware).
- Designed the PostgreSQL 16 database schema (`schema.sql`), including the `dishes` and `dish_variants` tables and all Phase 3 vision feedback tables.
- Wrote and applied both Alembic database migration scripts (`alembic/versions/`), managing schema evolution from initial design through Phase 3 extension.
- Built the USDA FoodData Central data ingestion pipeline (`scripts/import_usda_dishes.py`) and coordinated the curation of 516 canonical dish records.
- Implemented the deterministic calorie scaling service (`app/services/scaling_service.py`), including biological constraint clamping to prevent implausible macro distributions.
- Integrated all four ML pipeline service modules into the `/label` endpoint (`app/api/label_router.py`), wiring retrieval → mixture → scaling → confidence into a single synchronous inference path.
- Deployed and maintained the production API on AWS EC2 t3.medium with Nginx reverse proxy and Docker Compose orchestration.
- Led latency profiling and performance optimization, including discovery and resolution of the missing HNSW index that reduced query time from > 500 ms to < 10 ms.
- Implemented the vision orchestration layer (`app/services/vision_orchestrator.py`) and coordinated integration of Clarifai and OpenAI Vision API clients.

---

#### Nhat Le — ML Engineer (NLP, Retrieval, Confidence Scoring)

Nhat was the primary owner of the machine learning components, responsible for the semantic retrieval pipeline, mixture aggregation, and confidence scoring.

**Technical contributions:**
- Selected and integrated the `sentence-transformers/all-MiniLM-L6-v2` model for 384-dimensional embedding generation, evaluating it against larger BERT variants for the accuracy-vs-latency tradeoff (`app/utils/embeddings.py`).
- Implemented the pgvector-based retrieval service (`app/services/retrieval_service.py`), writing the parameterized SQL query that performs cosine similarity search using the `<=>` operator and joins variant results to canonical dish profiles.
- Designed and implemented the similarity-weighted mixture aggregation service (`app/services/mixture_service.py`), including the softmax temperature parameter and the 70% per-candidate weight cap to prevent single-dish dominance.
- Designed and implemented the multi-factor confidence scoring service (`app/services/confidence_service.py`), including the three-component weighted formula (similarity 50%, consistency 30%, scaling 20%), Gaussian scaling penalty, confidence tier thresholds, and human-readable explanation generation.
- Built the batch embedding generation script (`scripts/embed_dishes.py`) used to pre-compute and store the 384-dimensional vectors for all 778 dish variants at import time.
- Trained and validated the supplementary ML models in `ml_models/` (nearest-neighbors, linear regression, PyTorch MLP) using `DSA330_Nutrition_TextRegression.ipynb`.
- Wrote unit and integration tests for the confidence and retrieval services (`app/tests/test_confidence.py`, `app/tests/test_label_flow.py`).

---

#### Rached Arda — Full-Stack Developer & System Integration Engineer

Rached served as the primary integration engineer, responsible for ensuring the mobile frontend communicated correctly with the backend API, and for end-to-end system configuration and deployment support.

**Technical contributions:**
- Implemented the `labelApi.ts` HTTP client in the mobile application (`mobile/src/services/labelApi.ts`), which constructs `POST /label` requests, handles HTTP error codes, and parses `LabelResponse` JSON into typed TypeScript objects used by the React Native UI.
- Conducted end-to-end integration testing across the full stack (mobile → API → database → response), identifying and resolving several serialization and schema mismatches between Pydantic models and the React Native response parser.
- Contributed to backend API development, including dishes router (`app/api/dishes_router.py`) and feedback router (`app/api/feedback_router.py`) implementation.
- Configured the AWS EC2 production environment, including Nginx reverse proxy configuration, SSL/TLS setup, and environment variable management via `.env` files.
- Managed the shared GitHub repository, enforcing branching conventions and reviewing pull requests for both frontend and backend contributions.
- Authored integration and system-level test scripts (`test_api_flow.py`, `test_queries.ps1`) used to validate the full pipeline under realistic input conditions.

---

#### Matthew Lam — Mobile Frontend Engineer (React Native / UI)

Matthew was the primary owner of the React Native mobile application, responsible for the complete user-facing experience.

**Technical contributions:**
- Designed and implemented the four-tab navigation structure using React Navigation (bottom tab bar + drawer), creating the routing architecture that connects Label, History, Explore, and Profile screens.
- Built `LabelHomeScreen.tsx` (923 lines), the primary user interface for dish name input, calorie target slider, preparation style selection, image upload, and FDA-style nutrition label rendering with animated transitions and confidence badge display.
- Implemented `CameraCaptureScreen.tsx` (928 lines), the camera interface supporting single-image capture and multi-angle capture mode using `expo-image-picker`.
- Designed and implemented the FDA-style nutrition label rendering component, matching the visual layout required by 21 CFR 101.36.
- Implemented `FoodContext.tsx`, the React Context provider for global meal state management, using AsyncStorage for persistent local storage of meal history across app sessions.
- Built the History tab with reverse-chronological meal entries and daily macro running totals; built the Explore tab with cuisine category grid and dish preview cards; built the Profile tab with daily goal configuration.
- Integrated the `labelApi.ts` HTTP responses into the UI state, implementing loading indicators, error handling displays, and retry logic for failed requests.
- Conducted UI/UX design review and implemented WCAG 2.1 accessibility improvements including screen-reader labels and touch-target sizing.

---

### 6.3. Timeline

| Phase | Duration | Tasks | Assigned To |
|---|---|---|---|
| Phase 1 | Weeks 1–3 | Data collection, PostgreSQL schema design, USDA data ingestion | Yuvaraj (50%), Nhat (50%) |
| Phase 2 | Weeks 4–6 | Embedding pipeline, retrieval service, React Native project setup | Nhat (50%), Matthew (50%) |
| Phase 3 | Weeks 7–9 | FastAPI API endpoints, mobile app layout and navigation | Rached (50%), Matthew (50%) |
| Phase 4 | Weeks 10–12 | Mixture aggregation, confidence scoring, scaling service, full pipeline integration | Yuvaraj (50%), Nhat (50%) |
| Phase 5 | Weeks 13–15 | End-to-end testing, UI polish, deployment, usability study | All Team |

**Table 7. Project Milestone Timeline**

### 6.4. Deliverables

The team delivered the following artifacts:

1. **Mobile App:** A fully functional iOS/Android app with Image Upload, Label Results, History, Explore, and Profile screens.
2. **API & Backend:** A deployed FastAPI instance with endpoints for `/label` and `/vision/estimate`, documented via OpenAPI/Swagger.
3. **ML Pipeline:** Sentence-BERT (all-MiniLM-L6-v2) embedding model for semantic retrieval; a similarity-weighted mixture service; a deterministic calorie-scaling service; and a confidence scoring module — all implemented within the FastAPI service layer and version-controlled in the repository.
4. **Documentation:** This final technical report and a public GitHub repository containing all source code, data schemas, deployment configuration, and setup guides.

### 6.5. Budget

| Item | Supplier | Cost Estimate |
|---|---|---|
| API Hosting | DigitalOcean / AWS EC2 | \$10–25 / month |
| Database Hosting | AWS RDS / DigitalOcean | \$12–15 / month |
| Storage (Embeddings/Models) | AWS S3 | \$5–10 total |
| **Total Estimated Cost** | — | **\$200–\$300** |

**Table 8. Estimated Project Budget**

### 6.6. Communication and Coordination with Sponsor

The team held weekly status meetings with Dr. Stefan Andrei and submitted bi-weekly progress reports via email. A shared GitHub repository was used for code versioning and document sharing, providing the advisor with continuous visibility into project progress.

---

## 7. Professional Awareness

The team recognizes the ethical implications of deploying AI systems in the domain of personal health. NutriLabelAI provides estimates, not clinical dietary advice, and this limitation is clearly communicated to users within the application via a persistent disclaimer. The team is committed to the following professional standards:

- **Ethical AI:** Full transparency in how predictions are generated. The "Explore" tab surfaces the source dish profile and similarity score, enabling users to evaluate prediction provenance. All confidence scores are displayed to users without rounding or concealment.
- **Data Privacy:** User images are processed in-memory and are not persisted beyond the duration of the inference request. Query history is stored anonymously on-device via AsyncStorage. Users retain the right to delete their data at any time, in compliance with GDPR/CCPA guidelines.
- **Reliability & Validation:** Model outputs were validated against two external nutrition databases (USDA FoodData Central and Nutritionix) and reviewed for macro plausibility prior to deployment. The biological clamping constraints in the scaling service prevent the system from producing clinically implausible nutrient distributions.
- **Accessibility:** The mobile UI was designed and tested to comply with WCAG 2.1 Level AA standards, including adequate color contrast ratios, screen-reader accessibility labels on all interactive elements, and minimum 44×44 pt touch-target sizing.

---

## 8. Conclusion

NutriLabelAI successfully delivers an end-to-end, AI-powered nutrition label generation system that addresses a genuine and underserved user need. By combining semantic embedding retrieval, similarity-weighted mixture aggregation, and deterministic calorie scaling, the system produces FDA-compliant nutrition estimates with a median end-to-end latency of **112 ms** and macronutrient MAPE values consistently below 13% across all categories.

The text-based retrieval pipeline (`POST /label`) is the production-validated path, achieving 84.2% top-1 dish match accuracy and 96.7% top-5 accuracy on a 500-dish held-out evaluation set. The confidence scoring system reliably differentiates high- and low-certainty predictions, with 62% of queries returning high-confidence scores (≥ 0.75) and only 10% falling below the low-confidence threshold. The cross-platform React Native application reduces user friction dramatically compared to existing manual-entry tools, achieving a System Usability Scale score of **83.5** — placing it in the "Excellent" tier.

The camera-based estimation path is partially implemented and documented as a research feature, awaiting hardware validation of depth-based volume estimation across diverse iOS and Android devices. Future work will prioritize: depth sensor integration for the vision pipeline, user-adaptive personalization based on portion feedback, expansion of the dish database beyond 516 entries to improve coverage of underrepresented cuisines, and real-time restaurant menu integration. The team met all stated technical objectives within the approved budget and project timeline.

---

## References

[1] U.S. Department of Agriculture, Agricultural Research Service. *FoodData Central*, 2021. Available: https://fdc.nal.usda.gov/

[2] Reimers, N., & Gurevych, I. "Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks," *arXiv:1908.10084*, 2019.

[3] U.S. Food and Drug Administration. "Nutrition Labeling of Dietary Supplements," *21 CFR 101.36*. Available: https://www.ecfr.gov/

[4] PostgreSQL Documentation. "pgvector Extension for Vector Similarity Search." Available: https://github.com/pgvector/pgvector

[5] FastAPI Documentation. "Modern, Fast Web Framework for Building APIs." Available: https://fastapi.tiangolo.com/

[6] Malkov, Y. A., & Yashunin, D. A. "Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs," *IEEE Transactions on Pattern Analysis and Machine Intelligence*, 42(4), 824–836, 2020.

---

## Appendix A: Resumes of Team Members

### Yuvaraj Vagula — Team Lead

Yuvaraj is a Computer Science senior at Cleveland State University specializing in backend systems and machine learning infrastructure. He led the design and deployment of the FastAPI server, PostgreSQL schema, and ML model serving pipeline for NutriLabelAI. His primary technical contributions to this project include the full backend API architecture, the calorie scaling service, the USDA data ingestion pipeline, the AWS EC2 production deployment, and the vision orchestration layer. His technical competencies include Python, FastAPI, AWS EC2, Docker, PostgreSQL, and PyTorch.

### Nhat Le — ML Engineer

Nhat is a Computer Science senior specializing in natural language processing and predictive modeling. For NutriLabelAI, he designed and implemented the Sentence-BERT retrieval pipeline, the pgvector cosine similarity search service, the similarity-weighted mixture aggregation service, and the multi-factor confidence scoring module. He also built the batch embedding generation pipeline and trained the supplementary ML models. His technical competencies include PyTorch, Sentence-Transformers, scikit-learn, and data engineering with pandas and NumPy.

### Rached Arda — Full-Stack Developer

Rached is a Computer Science senior at Cleveland State University with a 3.7 GPA and hands-on experience in full-stack development. For NutriLabelAI, he served as the primary system integration engineer, implementing the mobile HTTP client, conducting end-to-end integration testing, configuring the AWS production environment, and managing the shared development repository. He contributed to both the React Native mobile frontend and backend API development. His technical competencies include React Native, FastAPI, Python, SQL, PostgreSQL, AWS EC2, Nginx, and Git. He holds a software engineering internship at TechX and an AI evaluation contract at Handshake AI.

### Matthew Lam — Frontend Engineer

Matthew is a Computer Science senior specializing in mobile application development. For NutriLabelAI, he led the complete UI/UX design and React Native implementation, including the 4-tab navigation architecture, the FDA label rendering component, the FoodContext state management system, and all four primary application screens (Label, History, Explore, Profile). His technical competencies include React Native, Expo, TypeScript, JavaScript, and UI/UX prototyping.

---

## Appendix B: Sponsor Specifications

This project is faculty-advised and does not have an external industry sponsor. Dr. Stefan Andrei (Department of Electrical Engineering and Computer Science, Cleveland State University) served as the project advisor, providing technical guidance, milestone reviews, and final approval of deliverables. No external sponsor specifications apply.

---

---

## REVISION SUMMARY

*(This section is for internal review and should be removed from the submitted final version.)*

### Changes Made

**A. Contribution Clarity**
- Expanded Section 6.2 from a 3-sentence task assignment table into a full "Individual Contributions" subsection with four named paragraphs — one per team member — each describing primary ownership areas, major technical tasks, specific implementations, and how the work contributed to the final system.
- Added ownership attribution lines at the end of each subsystem description in Section 4 (e.g., "Nhat Le designed and implemented...").
- Replaced generic "frontend team / backend team" language throughout with explicit names.

**B. Detailed Design**
- Rewrote Section 4 from a flat list of components into a structured four-subsystem breakdown (Mobile Application Layer, Backend/API Services Layer, ML Pipeline, Database/Storage Layer).
- Each subsystem now has: purpose, primary technologies, core responsibilities, a key source file table or schema block, and interaction-with-other-subsystems notes.
- Added a full end-to-end data flow diagram (text path) as Figure 1 and kept the full system architecture ASCII diagram as Figure 2.
- Added Section 4.6 "Implementation Status" table showing per-component status and owner.

**C. Verification**
- Restructured Section 5 into nine labeled subsections.
- Added Section 5.3 "Text Pipeline Verification" with three concrete test cases (high-confidence, ambiguous, low-confidence) with actual output values.
- Added Section 5.4 "Confidence Distribution Analysis" with a summary table and a four-category conceptual narrative.
- Added Section 5.2 per-stage latency breakdown table.
- Strengthened interpretation text throughout to tie results back to system goals.

**D. Pseudocode / Code Snippets**
- Added Algorithm 1: Nutrition label generation end-to-end pipeline.
- Added Algorithm 2: Similarity-weighted mixture aggregation.
- Added Algorithm 3: Calorie-proportional scaling with biological clamping.
- Added Algorithm 4: Multi-factor confidence scoring.
- Added one concrete JSON request/response example (Figure 8) for the `/label` endpoint.
- Added one SQL schema block showing the HNSW index creation.

**E. Screenshots / Figures**
- Added 11 labeled figure slots throughout the report.
- Figures 1–2: Architecture diagrams (included as ASCII).
- Figures 3–7: Mobile app screenshot placeholders with descriptive captions.
- Figure 8: API request/response example (text, included inline).
- Figures 9–10: Database schema block and ER diagram placeholder.
- Figure 11: Mobile app low-confidence label screenshot placeholder.

**F. Names**
- Team member names now appear in: title page, Section 4 subsystem ownership lines, Section 6.2 individual contribution paragraphs, Section 5.7 vision attribution, and Appendix A resumes.

---

## NEEDED FROM TEAM

1. **Actual mobile app screenshots** for Figures 3–7 and Figure 11. These should be captured from the working app and inserted at the marked figure positions.
2. **Architecture/ER diagram images** (Figures 10) — an ER diagram for the database schema would strengthen Section 4.5.
3. **Usability study participant details** — if more than 5 participants were involved, update Section 5.9.
4. **Validation of confidence distribution numbers** — the 62% / 28% / 10% distribution and the 150-query test set are cited from the midterm report; confirm these numbers reflect the final production pipeline.
5. **Vision pipeline test results** — if any hardware testing was completed on iOS LiDAR or Android ARCore devices before submission, add those results to Section 5.7.
6. **Nhat Le's specific GPA or internship details** for Appendix A resume — currently omitted as no data was available in the source files.
