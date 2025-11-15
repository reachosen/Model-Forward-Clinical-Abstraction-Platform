-- ============================================================================
-- GOLD_AI.CLABSI_LLM_PAYLOADS
-- LLM-ready structured payloads for each potential CLABSI case
-- Contains signals, timelines, note bundles, and scaffolding for LLM reasoning
-- ============================================================================

CREATE OR REPLACE TABLE GOLD_AI.CLABSI_LLM_PAYLOADS (
    payload_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    episode_id VARCHAR(50),

    -- Payload metadata
    payload_version VARCHAR(20) DEFAULT 'v1.0',
    generated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    payload_status VARCHAR(50) DEFAULT 'ACTIVE',  -- ACTIVE, SUPERSEDED, ARCHIVED

    -- Complete structured payload as JSON
    payload VARIANT NOT NULL,

    -- Flattened key fields for querying
    has_clabsi_signals BOOLEAN,
    signal_count INTEGER,
    risk_level VARCHAR(20),  -- LOW, MODERATE, HIGH, CRITICAL

    -- Content hash for change detection
    payload_hash VARCHAR(64),

    CONSTRAINT fk_episode FOREIGN KEY (episode_id)
        REFERENCES GOLD.CLABSI_EPISODES(episode_id)
);

CREATE INDEX idx_payloads_patient ON GOLD_AI.CLABSI_LLM_PAYLOADS(patient_id);
CREATE INDEX idx_payloads_encounter ON GOLD_AI.CLABSI_LLM_PAYLOADS(encounter_id);
CREATE INDEX idx_payloads_episode ON GOLD_AI.CLABSI_LLM_PAYLOADS(episode_id);
CREATE INDEX idx_payloads_risk ON GOLD_AI.CLABSI_LLM_PAYLOADS(risk_level);

-- ============================================================================
-- PAYLOAD STRUCTURE DEFINITION
-- ============================================================================
-- The PAYLOAD VARIANT field contains the following JSON structure:
--
-- {
--   "metadata": {
--     "patient_id": "string",
--     "encounter_id": "string",
--     "episode_id": "string",
--     "mrn": "string",
--     "age": integer,
--     "gender": "string",
--     "admission_date": "timestamp",
--     "discharge_date": "timestamp",
--     "los_days": integer,
--     "department": "string"
--   },
--
--   "signals": [
--     {
--       "signal_id": "string",
--       "signal_name": "string",
--       "signal_type": "DEVICE|LAB|VITAL|MEDICATION|PROCEDURE",
--       "value": "string|number",
--       "severity": "INFO|WARNING|CRITICAL",
--       "rationale": "string",
--       "timestamp": "timestamp",
--       "source_table": "string",
--       "source_id": "string",
--       "confidence": float  // 0-1
--     }
--   ],
--
--   "timelines": [
--     {
--       "phase": "PRE_LINE|LINE_PLACEMENT|MONITORING|CULTURE|POST_CULTURE",
--       "events": [
--         {
--           "event_id": "string",
--           "event_datetime": "timestamp",
--           "event_type": "string",
--           "description": "string",
--           "severity": "INFO|WARNING|CRITICAL",
--           "relative_day": integer,
--           "details": object
--         }
--       ]
--     }
--   ],
--
--   "note_bundles": [
--     {
--       "phase": "string",
--       "time_range": "string",
--       "notes": [
--         {
--           "note_id": "string",
--           "note_type": "string",
--           "authored_datetime": "timestamp",
--           "author": "string",
--           "excerpt": "string",  // Relevant excerpts only
--           "relevance_score": float
--         }
--       ]
--     }
--   ],
--
--   "rule_flags": {
--     "has_central_line": boolean,
--     "line_days_at_culture": integer,
--     "positive_blood_culture": boolean,
--     "recognized_pathogen": boolean,
--     "meets_nhsn_criteria": boolean,
--     "at_risk": boolean,
--     "suspected_clabsi": boolean,
--     "confirmed_clabsi": boolean,
--     "ruled_out": boolean,
--     "indeterminate": boolean
--   },
--
--   "metrics": {
--     "central_line_days": integer,
--     "fever_count": integer,
--     "max_temperature": float,
--     "wbc_max": float,
--     "antibiotic_courses": integer,
--     "risk_score": float
--   },
--
--   "follow_up_questions": [
--     {
--       "question_id": "string",
--       "question_text": "string",
--       "question_type": "MISSING_DATA|AMBIGUOUS|CONTRADICTION|CLINICAL_JUDGMENT",
--       "priority": "LOW|MEDIUM|HIGH",
--       "suggested_sources": ["string"]
--     }
--   ],
--
--   "abstraction_hints": {
--     "likely_outcome": "CONFIRMED|RULED_OUT|INDETERMINATE",
--     "key_decision_points": ["string"],
--     "missing_critical_data": ["string"],
--     "conflicting_evidence": ["string"]
--   }
-- }
-- ============================================================================
