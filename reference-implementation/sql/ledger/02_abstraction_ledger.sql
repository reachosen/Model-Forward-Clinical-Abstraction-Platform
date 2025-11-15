-- ============================================================================
-- LEDGER.ABSTRACTION_LEDGER
-- Comprehensive audit trail for all abstraction decisions
-- ============================================================================

CREATE OR REPLACE TABLE LEDGER.ABSTRACTION_LEDGER (
    ledger_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    episode_id VARCHAR(50),

    -- Environment
    environment VARCHAR(20) DEFAULT 'TEST',  -- TEST or PROD
    session_id VARCHAR(50),  -- Links multiple actions in same session

    -- Entry metadata
    entry_datetime TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    entry_type VARCHAR(100),  -- SIGNAL_EVALUATION, MODEL_OUTPUT, CLINICIAN_EDIT, QA_RESULT, etc.
    entry_status VARCHAR(50),  -- DRAFT, SUBMITTED, REVIEWED, APPROVED, REJECTED

    -- User/system info
    created_by_user_id VARCHAR(50),
    created_by_system VARCHAR(100),  -- DATA_AGENT, ABSTRACTION_AGENT, HUMAN

    -- Content
    entry_content VARIANT NOT NULL,  -- JSON payload

    -- References
    parent_ledger_id VARCHAR(50),  -- Links to previous entry if this is an update
    payload_id VARCHAR(50),  -- Links to the source LLM payload

    -- Tags for filtering
    tags ARRAY,  -- e.g., ['clabsi', 'high_risk', 'needs_review']

    CONSTRAINT fk_parent FOREIGN KEY (parent_ledger_id)
        REFERENCES LEDGER.ABSTRACTION_LEDGER(ledger_id)
);

CREATE INDEX idx_ledger_patient ON LEDGER.ABSTRACTION_LEDGER(patient_id);
CREATE INDEX idx_ledger_encounter ON LEDGER.ABSTRACTION_LEDGER(encounter_id);
CREATE INDEX idx_ledger_episode ON LEDGER.ABSTRACTION_LEDGER(episode_id);
CREATE INDEX idx_ledger_environment ON LEDGER.ABSTRACTION_LEDGER(environment);
CREATE INDEX idx_ledger_type ON LEDGER.ABSTRACTION_LEDGER(entry_type);
CREATE INDEX idx_ledger_datetime ON LEDGER.ABSTRACTION_LEDGER(entry_datetime);
