-- ============================================================================
-- PostgreSQL Schema for Dish-Level Nutrition Estimation System
-- ============================================================================
-- Prerequisites: PostgreSQL 12+ with pgvector extension installed
--
-- Tables:
--   1. dishes: Canonical dish profiles with complete nutrition facts
--   2. dish_variants: Textual variants with embeddings for similarity search
--
-- Relationships:
--   - One dish can have many variants (1:N)
--   - Variants reference their parent dish via foreign key
-- ============================================================================

-- Enable pgvector extension for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

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
