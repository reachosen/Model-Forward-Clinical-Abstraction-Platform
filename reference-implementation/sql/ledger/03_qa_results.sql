-- ============================================================================
-- LEDGER.QA_RESULTS
-- QA validation results for abstractions
-- ============================================================================

CREATE OR REPLACE TABLE LEDGER.QA_RESULTS (
    qa_id VARCHAR(50) PRIMARY KEY,
    ledger_id VARCHAR(50) NOT NULL,  -- Links to abstraction ledger entry
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    episode_id VARCHAR(50),

    -- QA execution
    qa_datetime TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    qa_version VARCHAR(20) DEFAULT 'v1.0',
    environment VARCHAR(20) DEFAULT 'TEST',

    -- Overall QA status
    qa_status VARCHAR(20) NOT NULL,  -- PASS, WARN, FAIL
    qa_score FLOAT,  -- 0-100

    -- Rule results
    rules_evaluated INTEGER,
    rules_passed INTEGER,
    rules_warnings INTEGER,
    rules_failed INTEGER,

    -- Detailed results
    rule_results VARIANT NOT NULL,  -- JSON array of individual rule results

    -- Issues found
    missing_data_fields ARRAY,
    contradictions ARRAY,
    validation_errors ARRAY,

    -- Recommendations
    recommended_actions ARRAY,

    CONSTRAINT fk_qa_ledger FOREIGN KEY (ledger_id)
        REFERENCES LEDGER.ABSTRACTION_LEDGER(ledger_id)
);

CREATE INDEX idx_qa_ledger ON LEDGER.QA_RESULTS(ledger_id);
CREATE INDEX idx_qa_patient ON LEDGER.QA_RESULTS(patient_id);
CREATE INDEX idx_qa_status ON LEDGER.QA_RESULTS(qa_status);
CREATE INDEX idx_qa_datetime ON LEDGER.QA_RESULTS(qa_datetime);
