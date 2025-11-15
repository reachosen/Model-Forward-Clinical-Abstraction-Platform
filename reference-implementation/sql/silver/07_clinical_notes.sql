-- ============================================================================
-- SILVER.CLINICAL_NOTES
-- Raw clinical documentation from EHR source systems
-- ============================================================================

CREATE OR REPLACE TABLE SILVER.CLINICAL_NOTES (
    note_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),

    note_type VARCHAR(100),  -- PROGRESS_NOTE, DISCHARGE_SUMMARY, PROCEDURE_NOTE, etc.
    note_subtype VARCHAR(100),

    authored_datetime TIMESTAMP_NTZ,
    author_provider_id VARCHAR(50),
    author_name VARCHAR(200),

    service_line VARCHAR(100),  -- ICU, MEDICINE, SURGERY, etc.

    note_title VARCHAR(500),
    note_text TEXT,  -- Full note content

    -- Section extraction (if available)
    chief_complaint TEXT,
    history_present_illness TEXT,
    assessment_plan TEXT,

    -- Metadata
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_notes_patient ON SILVER.CLINICAL_NOTES(patient_id);
CREATE INDEX idx_notes_encounter ON SILVER.CLINICAL_NOTES(encounter_id);
CREATE INDEX idx_notes_authored ON SILVER.CLINICAL_NOTES(authored_datetime);
CREATE INDEX idx_notes_type ON SILVER.CLINICAL_NOTES(note_type);
