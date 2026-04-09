-- ============================================================================
-- Canonical PostgreSQL Schema — Nutrition Label App
-- ============================================================================
-- Prerequisites: PostgreSQL 14+, pgvector extension
--
-- Tables (creation order respects FK dependencies):
--   1. users                   — identity anchor (device_id, no auth)
--   2. dishes                  — flat canonical nutrition knowledge base
--   3. dish_variants           — aliases + 384-dim embeddings for semantic search
--   4. vision_estimates        — camera pipeline outputs (image refs, not base64)
--   5. meal_logs               — confirmed meal entries (manual + camera converge here)
--   6. vision_feedback         — user corrections on vision estimates
--   7. user_portion_preferences — per-user personalisation profile
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. users
-- ============================================================================
CREATE TABLE users (
    id          BIGSERIAL PRIMARY KEY,
    device_id   VARCHAR(255) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_users_device_id ON users (device_id);

-- ============================================================================
-- 2. dishes  (all nutrients inline, per 100 g unless serving_size_g overrides)
-- ============================================================================
CREATE TABLE dishes (
    id                  BIGSERIAL       PRIMARY KEY,
    name                VARCHAR(255)    NOT NULL,
    -- Core macros (required)
    calories            NUMERIC(8, 2)   NOT NULL CHECK (calories    >= 0),
    protein_g           NUMERIC(8, 2)   NOT NULL CHECK (protein_g   >= 0),
    fat_g               NUMERIC(8, 2)   NOT NULL CHECK (fat_g       >= 0),
    carbs_g             NUMERIC(8, 2)   NOT NULL CHECK (carbs_g     >= 0),
    -- FDA-required micronutrients (nullable — source data may be missing)
    fiber_g             NUMERIC(8, 2)   CHECK (fiber_g          >= 0),
    sugar_g             NUMERIC(8, 2)   CHECK (sugar_g          >= 0),
    sodium_mg           NUMERIC(8, 2)   CHECK (sodium_mg        >= 0),
    potassium_mg        NUMERIC(8, 2)   CHECK (potassium_mg     >= 0),
    saturated_fat_g     NUMERIC(8, 2)   CHECK (saturated_fat_g  >= 0),
    trans_fat_g         NUMERIC(8, 2)   CHECK (trans_fat_g      >= 0),
    cholesterol_mg      NUMERIC(8, 2)   CHECK (cholesterol_mg   >= 0),
    vitamin_a_mcg       NUMERIC(8, 2)   CHECK (vitamin_a_mcg    >= 0),
    vitamin_c_mg        NUMERIC(8, 2)   CHECK (vitamin_c_mg     >= 0),
    vitamin_d_mcg       NUMERIC(8, 2)   CHECK (vitamin_d_mcg    >= 0),
    calcium_mg          NUMERIC(8, 2)   CHECK (calcium_mg       >= 0),
    iron_mg             NUMERIC(8, 2)   CHECK (iron_mg          >= 0),
    -- Serving reference
    serving_size_g      NUMERIC(8, 2)   CHECK (serving_size_g   >  0),
    serving_size_unit   VARCHAR(50)     DEFAULT 'g',
    -- Provenance
    data_source         VARCHAR(100),   -- 'USDA', 'FastFood', 'Manual', etc.
    confidence_score    NUMERIC(4, 3)   CHECK (confidence_score BETWEEN 0 AND 1),
    -- Soft-delete + versioning
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    version             INTEGER         NOT NULL DEFAULT 1,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_dishes_name        ON dishes (name);
CREATE INDEX idx_dishes_data_source ON dishes (data_source);
CREATE INDEX idx_dishes_active      ON dishes (is_active) WHERE is_active = TRUE;

-- auto-update updated_at
CREATE OR REPLACE FUNCTION _update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dishes_updated_at
    BEFORE UPDATE ON dishes
    FOR EACH ROW EXECUTE FUNCTION _update_updated_at();

-- ============================================================================
-- 3. dish_variants  (aliases + embeddings for semantic search)
-- ============================================================================
CREATE TABLE dish_variants (
    id               BIGSERIAL    PRIMARY KEY,
    dish_id          BIGINT       NOT NULL
                        REFERENCES dishes (id) ON DELETE CASCADE ON UPDATE CASCADE,
    variant_text     TEXT         NOT NULL,
    -- 384-dim matches sentence-transformers/all-MiniLM-L6-v2
    embedding        VECTOR(384)  NOT NULL,
    -- 'canonical', 'alias', 'regional', 'user_generated', 'misspelling'
    variant_type     VARCHAR(50),
    language_code    VARCHAR(10)  NOT NULL DEFAULT 'en',
    search_count     INTEGER      NOT NULL DEFAULT 0,
    last_searched_at TIMESTAMPTZ,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_dish_variant_text UNIQUE (dish_id, variant_text)
);
CREATE INDEX idx_dish_variants_dish_id ON dish_variants (dish_id);
CREATE INDEX idx_dish_variants_type    ON dish_variants (variant_type);
-- HNSW cosine index — matches the <=> operator used in retrieval_service.py
CREATE INDEX idx_dish_variants_embedding_hnsw
    ON dish_variants
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE TRIGGER trg_dish_variants_updated_at
    BEFORE UPDATE ON dish_variants
    FOR EACH ROW EXECUTE FUNCTION _update_updated_at();

-- ============================================================================
-- 4. vision_estimates  (camera pipeline outputs)
-- ============================================================================
CREATE TABLE vision_estimates (
    id                      BIGSERIAL       PRIMARY KEY,
    user_id                 BIGINT          REFERENCES users   (id) ON DELETE SET NULL,
    -- Capture metadata
    capture_mode            VARCHAR(20)     NOT NULL
                               CHECK (capture_mode IN ('depth', 'multi_angle', 'single')),
    device_type             VARCHAR(10),    -- 'ios', 'android'
    num_images              INTEGER         NOT NULL,
    has_depth_data          BOOLEAN         NOT NULL DEFAULT FALSE,
    -- Storage keys/paths — NEVER base64
    image_storage_keys      JSONB,          -- ["img/uuid1.jpg", "img/uuid2.jpg"]
    depth_storage_key       VARCHAR(500),   -- path/key to depth map
    -- Top predicted dish
    predicted_dish_id       BIGINT          REFERENCES dishes  (id) ON DELETE SET NULL,
    predicted_dish_name     VARCHAR(255)    NOT NULL,
    predicted_confidence    NUMERIC(4, 3),
    alternative_dishes      JSONB,          -- [{dish_id, dish_name, confidence}]
    -- Estimation outputs
    estimation_mode         VARCHAR(20)     NOT NULL,
    volume_ml               NUMERIC(8, 2),
    volume_confidence       NUMERIC(4, 3),
    calorie_estimate        NUMERIC(8, 2)   NOT NULL CHECK (calorie_estimate >= 0),
    calorie_range_min       NUMERIC(8, 2),
    calorie_range_max       NUMERIC(8, 2),
    -- Model versions — enables future reprocessing
    classifier_version      VARCHAR(50),
    segmentation_version    VARCHAR(50),
    volume_estimator_version VARCHAR(50),
    processing_time_ms      INTEGER,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_vision_estimates_user_id   ON vision_estimates (user_id);
CREATE INDEX idx_vision_estimates_created_at ON vision_estimates (created_at);
CREATE INDEX idx_vision_estimates_dish_id   ON vision_estimates (predicted_dish_id);

-- ============================================================================
-- 5. meal_logs  (manual + camera paths both converge here)
-- ============================================================================
CREATE TABLE meal_logs (
    id                  BIGSERIAL       PRIMARY KEY,
    user_id             BIGINT          REFERENCES users            (id) ON DELETE SET NULL,
    dish_id             BIGINT          REFERENCES dishes           (id) ON DELETE SET NULL,
    vision_estimate_id  BIGINT          REFERENCES vision_estimates (id) ON DELETE SET NULL,
    -- 'manual' or 'camera'
    entry_source        VARCHAR(20)     NOT NULL
                           CHECK (entry_source IN ('manual', 'camera')),
    -- Denormalised display fields — preserved even if dish is later deleted
    logged_dish_name    VARCHAR(255)    NOT NULL,
    logged_calories     NUMERIC(8, 2)   NOT NULL CHECK (logged_calories >= 0),
    -- Frozen FDA label snapshot — never mutated by future model updates
    nutrition_label     JSONB           NOT NULL,
    serving_multiplier  NUMERIC(6, 3)   NOT NULL DEFAULT 1.0,
    match_confidence    NUMERIC(4, 3),
    model_version       VARCHAR(50),
    logged_at           TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_meal_logs_user_id   ON meal_logs (user_id);
CREATE INDEX idx_meal_logs_logged_at ON meal_logs (logged_at);
CREATE INDEX idx_meal_logs_dish_id   ON meal_logs (dish_id);

-- ============================================================================
-- 6. vision_feedback  (user corrections on vision estimates)
-- ============================================================================
CREATE TABLE vision_feedback (
    id                  BIGSERIAL   PRIMARY KEY,
    vision_estimate_id  BIGINT      NOT NULL
                           REFERENCES vision_estimates (id) ON DELETE CASCADE,
    user_id             BIGINT      REFERENCES users  (id) ON DELETE SET NULL,
    corrected_dish_id   BIGINT      REFERENCES dishes (id) ON DELETE SET NULL,
    -- 'confirmed' | 'corrected_dish' | 'corrected_portion' | 'quick_correction'
    feedback_type       VARCHAR(30) NOT NULL
                           CHECK (feedback_type IN (
                               'confirmed', 'corrected_dish',
                               'corrected_portion', 'quick_correction'
                           )),
    confirmed_dish_name VARCHAR(255),
    portion_adjustment  NUMERIC(6, 3),  -- multiplier (0.5 = half, 2.0 = double)
    plate_size          VARCHAR(30),
    -- 'accurate' | 'too_high' | 'too_low' | 'wrong_dish'
    quick_feedback      VARCHAR(20),
    corrected_calories  NUMERIC(8, 2),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_vision_feedback_estimate_id ON vision_feedback (vision_estimate_id);
CREATE INDEX idx_vision_feedback_user_id     ON vision_feedback (user_id);

-- ============================================================================
-- 7. user_portion_preferences  (per-user personalisation)
-- ============================================================================
CREATE TABLE user_portion_preferences (
    id                  BIGSERIAL       PRIMARY KEY,
    user_id             BIGINT          NOT NULL UNIQUE
                           REFERENCES users (id) ON DELETE CASCADE,
    avg_portion_factor  NUMERIC(6, 3)   NOT NULL DEFAULT 1.0,
    feedback_count      INTEGER         NOT NULL DEFAULT 0,
    confidence_score    NUMERIC(4, 3)   NOT NULL DEFAULT 0.0,
    -- {dish_id_str: {avg_factor, count}}
    dish_preferences    JSONB,
    -- {category: {avg_factor, count}}
    category_preferences JSONB,
    last_updated        TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_user_portion_preferences_user_id ON user_portion_preferences (user_id);

-- ============================================================================
-- Example similarity search query
-- ============================================================================
-- SELECT
--     d.id, d.name, d.calories, d.protein_g, d.carbs_g, d.fat_g,
--     d.fiber_g, d.sugar_g, d.sodium_mg, d.potassium_mg,
--     1 - (dv.embedding <=> $1::vector) AS similarity
-- FROM dish_variants dv
-- JOIN dishes d ON dv.dish_id = d.id
-- WHERE d.is_active = TRUE
--   AND (1 - (dv.embedding <=> $1::vector)) >= 0.30
-- ORDER BY dv.embedding <=> $1::vector
-- LIMIT 5;


-- ============================================================================
-- Table: dishes
-- ============================================================================
-- Purpose: Store canonical dish profiles with complete nutrition information
-- This is the authoritative source for nutrition facts
-- ============================================================================

CREATE TABLE dishes (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Canonical dish name
    name VARCHAR(255) NOT NULL,
    
    -- Nutrition Facts (per 100g serving unless specified)
    calories DECIMAL(8, 2) NOT NULL CHECK (calories >= 0),
    protein_g DECIMAL(8, 2) NOT NULL CHECK (protein_g >= 0),
    fat_g DECIMAL(8, 2) NOT NULL CHECK (fat_g >= 0),
    carbs_g DECIMAL(8, 2) NOT NULL CHECK (carbs_g >= 0),
    fiber_g DECIMAL(8, 2) CHECK (fiber_g >= 0),
    sugar_g DECIMAL(8, 2) CHECK (sugar_g >= 0),
    sodium_mg DECIMAL(8, 2) CHECK (sodium_mg >= 0),
    
    -- Additional micronutrients (optional)
    saturated_fat_g DECIMAL(8, 2) CHECK (saturated_fat_g >= 0),
    trans_fat_g DECIMAL(8, 2) CHECK (trans_fat_g >= 0),
    cholesterol_mg DECIMAL(8, 2) CHECK (cholesterol_mg >= 0),
    vitamin_a_mcg DECIMAL(8, 2) CHECK (vitamin_a_mcg >= 0),
    vitamin_c_mg DECIMAL(8, 2) CHECK (vitamin_c_mg >= 0),
    calcium_mg DECIMAL(8, 2) CHECK (calcium_mg >= 0),
    iron_mg DECIMAL(8, 2) CHECK (iron_mg >= 0),
    
    -- Serving information
    serving_size_g DECIMAL(8, 2) CHECK (serving_size_g > 0),
    serving_size_unit VARCHAR(50) DEFAULT 'g',
    
    -- Metadata
    data_source VARCHAR(100), -- e.g., 'USDA', 'FastFood', 'Manual'
    confidence_score DECIMAL(4, 3) CHECK (confidence_score BETWEEN 0 AND 1),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Audit tracking
    is_active BOOLEAN DEFAULT TRUE,
    version INTEGER DEFAULT 1
);

-- ============================================================================
-- Table: dish_variants
-- ============================================================================
-- Purpose: Store textual variants with embeddings for similarity-based retrieval
-- Each variant represents a different way users might describe the same dish
-- ============================================================================

CREATE TABLE dish_variants (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Foreign Key to parent dish
    dish_id BIGINT NOT NULL,
    
    -- Variant text (what the user might type or say)
    variant_text TEXT NOT NULL,
    
    -- Vector embedding for similarity search
    -- Dimension should match your embedding model (e.g., 384 for all-MiniLM-L6-v2, 1536 for OpenAI)
    embedding VECTOR(384) NOT NULL,
    
    -- Variant metadata
    variant_type VARCHAR(50), -- e.g., 'user_generated', 'synonym', 'misspelling', 'regional'
    language_code VARCHAR(10) DEFAULT 'en',
    
    -- Usage statistics
    search_count INTEGER DEFAULT 0,
    last_searched_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_dish_variants_dish
        FOREIGN KEY (dish_id) 
        REFERENCES dishes(id) 
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    
    CONSTRAINT unique_dish_variant
        UNIQUE (dish_id, variant_text)
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Indexes on dishes table
CREATE INDEX idx_dishes_name ON dishes(name);
CREATE INDEX idx_dishes_data_source ON dishes(data_source);
CREATE INDEX idx_dishes_created_at ON dishes(created_at DESC);
CREATE INDEX idx_dishes_active ON dishes(is_active) WHERE is_active = TRUE;

-- Indexes on dish_variants table
CREATE INDEX idx_dish_variants_dish_id ON dish_variants(dish_id);
CREATE INDEX idx_dish_variants_text ON dish_variants(variant_text);
CREATE INDEX idx_dish_variants_type ON dish_variants(variant_type);

-- ============================================================================
-- pgvector Indexes for Similarity Search
-- ============================================================================
-- Two options for vector similarity indexes:
-- 1. HNSW (Hierarchical Navigable Small World) - Better recall, more memory
-- 2. IVFFlat (Inverted File with Flat) - Faster build, less accurate
--
-- Choose based on your needs:
-- - HNSW: Production systems requiring high accuracy
-- - IVFFlat: Large datasets where build time matters
-- ============================================================================

-- Option 1: HNSW Index (Recommended for production)
-- Parameters:
--   m: Max connections per node (default 16, higher = better recall, more memory)
--   ef_construction: Size of dynamic candidate list (default 64, higher = better index quality)
CREATE INDEX idx_dish_variants_embedding_hnsw 
ON dish_variants 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Option 2: IVFFlat Index (Alternative for large datasets)
-- Uncomment if you prefer IVFFlat over HNSW
-- Parameters:
--   lists: Number of clusters (rule of thumb: sqrt(rows))
-- CREATE INDEX idx_dish_variants_embedding_ivfflat 
-- ON dish_variants 
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- ============================================================================
-- Automatic Timestamp Update Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dishes_updated_at
    BEFORE UPDATE ON dishes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dish_variants_updated_at
    BEFORE UPDATE ON dish_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Example Similarity Search Queries
-- ============================================================================

-- Find top 10 most similar dishes to a query embedding
-- COMMENT ON TABLE dish_variants IS '
-- Example similarity search:
-- 
-- SELECT 
--     dv.id,
--     dv.variant_text,
--     d.name,
--     d.calories,
--     d.protein_g,
--     1 - (dv.embedding <=> $1) AS similarity
-- FROM dish_variants dv
-- JOIN dishes d ON dv.dish_id = d.id
-- WHERE d.is_active = TRUE
-- ORDER BY dv.embedding <=> $1
-- LIMIT 10;
-- 
-- Note: <=> is the cosine distance operator
-- Other operators: <-> (L2 distance), <#> (inner product)
-- ';

-- ============================================================================
-- Table Relationships Summary
-- ============================================================================
-- 
-- dishes (1) ----< (N) dish_variants
--   |                      |
--   |                      +-- embedding VECTOR(384)
--   |                      +-- variant_text TEXT
--   |                      +-- dish_id FK
--   |
--   +-- Nutrition facts (calories, protein, etc.)
--   +-- Canonical name
--   +-- Metadata
-- 
-- Flow:
-- 1. User query → Generate embedding
-- 2. Search dish_variants using vector similarity (pgvector)
-- 3. Retrieve parent dish with full nutrition facts
-- 4. Return nutrition label to user
-- 
-- ============================================================================
