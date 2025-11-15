-- ============================================================================
-- GOLD.CLINICAL_TIMELINE
-- Unified timeline of clinically significant events
-- ============================================================================

CREATE OR REPLACE TABLE GOLD.CLINICAL_TIMELINE (
    timeline_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    episode_id VARCHAR(50),  -- Links to CLABSI episode if applicable

    event_datetime TIMESTAMP_NTZ,
    event_type VARCHAR(100),  -- LINE_INSERTION, CULTURE_DRAWN, FEVER_ONSET, etc.
    event_category VARCHAR(50),  -- DEVICE, LAB, VITAL, MEDICATION, PROCEDURE

    event_description VARCHAR(1000),
    event_severity VARCHAR(20),  -- INFO, WARNING, CRITICAL

    -- Event details (JSON for flexibility)
    event_details VARIANT,

    -- Relative timing
    days_from_admission INTEGER,
    days_from_line_insertion INTEGER,
    days_from_index_culture INTEGER,

    -- Clinical significance
    is_clabsi_relevant BOOLEAN,
    significance_score INTEGER,  -- 0-10 scale

    -- Calculated
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_timeline_patient ON GOLD.CLINICAL_TIMELINE(patient_id);
CREATE INDEX idx_timeline_encounter ON GOLD.CLINICAL_TIMELINE(encounter_id);
CREATE INDEX idx_timeline_episode ON GOLD.CLINICAL_TIMELINE(episode_id);
CREATE INDEX idx_timeline_event_datetime ON GOLD.CLINICAL_TIMELINE(event_datetime);
CREATE INDEX idx_timeline_event_type ON GOLD.CLINICAL_TIMELINE(event_type);
