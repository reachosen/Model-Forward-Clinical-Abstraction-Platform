-- ============================================================================
-- LEDGER.CLINICIAN_FEEDBACK
-- Feedback from clinicians on abstraction quality
-- ============================================================================

CREATE OR REPLACE TABLE LEDGER.CLINICIAN_FEEDBACK (
    feedback_id VARCHAR(50) PRIMARY KEY,
    ledger_id VARCHAR(50) NOT NULL,  -- Links to abstraction ledger entry
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    episode_id VARCHAR(50),

    -- Feedback metadata
    feedback_datetime TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    clinician_id VARCHAR(50),
    clinician_name VARCHAR(200),
    clinician_role VARCHAR(100),  -- ABSTRACTOR, INFECTION_PREVENTIONIST, PHYSICIAN, NURSE

    -- Feedback type
    feedback_type VARCHAR(50),  -- APPROVAL, CORRECTION, QUESTION, COMMENT

    -- Rating
    overall_rating INTEGER,  -- 1-5 scale
    accuracy_rating INTEGER,  -- 1-5 scale
    completeness_rating INTEGER,  -- 1-5 scale
    usefulness_rating INTEGER,  -- 1-5 scale

    -- Textual feedback
    feedback_text TEXT,
    corrections VARIANT,  -- JSON of field-level corrections

    -- Decision
    final_decision VARCHAR(50),  -- CONFIRMED_CLABSI, RULED_OUT, NEEDS_MORE_INFO, etc.
    decision_rationale TEXT,

    -- Follow-up
    needs_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,

    CONSTRAINT fk_feedback_ledger FOREIGN KEY (ledger_id)
        REFERENCES LEDGER.ABSTRACTION_LEDGER(ledger_id)
);

CREATE INDEX idx_feedback_ledger ON LEDGER.CLINICIAN_FEEDBACK(ledger_id);
CREATE INDEX idx_feedback_patient ON LEDGER.CLINICIAN_FEEDBACK(patient_id);
CREATE INDEX idx_feedback_clinician ON LEDGER.CLINICIAN_FEEDBACK(clinician_id);
CREATE INDEX idx_feedback_datetime ON LEDGER.CLINICIAN_FEEDBACK(feedback_datetime);
