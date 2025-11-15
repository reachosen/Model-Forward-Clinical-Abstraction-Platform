-- ============================================================================
-- LEDGER.VECTOR_STORE
-- Semantic chunks with embeddings for vector search
-- ============================================================================

CREATE OR REPLACE TABLE LEDGER.VECTOR_STORE (
    chunk_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    episode_id VARCHAR(50),

    -- Chunk metadata
    chunk_type VARCHAR(100),  -- SIGNAL_SUMMARY, TIMELINE_PHASE, NOTE_EXCERPT, etc.
    chunk_phase VARCHAR(50),  -- PRE_LINE, LINE_PLACEMENT, MONITORING, CULTURE, POST_CULTURE
    chunk_index INTEGER,  -- Order within the payload

    -- Content
    chunk_text TEXT NOT NULL,
    chunk_metadata VARIANT,  -- JSON with additional context

    -- Vector embedding (placeholder - in real implementation would use actual embeddings)
    embedding_vector ARRAY,  -- Array of floats representing the embedding
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
    embedding_dimensions INTEGER DEFAULT 1536,

    -- Timestamps
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_vector_patient ON LEDGER.VECTOR_STORE(patient_id);
CREATE INDEX idx_vector_encounter ON LEDGER.VECTOR_STORE(encounter_id);
CREATE INDEX idx_vector_episode ON LEDGER.VECTOR_STORE(episode_id);
CREATE INDEX idx_vector_type ON LEDGER.VECTOR_STORE(chunk_type);
CREATE INDEX idx_vector_phase ON LEDGER.VECTOR_STORE(chunk_phase);

-- Note: In a production system, you would use Snowflake's VECTOR data type
-- and vector similarity search functions. This is a simplified representation.
