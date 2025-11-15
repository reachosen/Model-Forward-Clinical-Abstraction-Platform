-- ============================================================================
-- GOLD.CLABSI_METRICS
-- Aggregated metrics at encounter level for CLABSI surveillance
-- ============================================================================

CREATE OR REPLACE TABLE GOLD.CLABSI_METRICS (
    metric_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,

    -- Basic counts
    central_line_days INTEGER,
    blood_cultures_drawn INTEGER,
    positive_blood_cultures INTEGER,
    antibiotic_courses INTEGER,

    -- Timing metrics
    time_to_first_culture_hours FLOAT,  -- From line insertion
    time_to_culture_result_hours FLOAT,
    time_to_antibiotic_hours FLOAT,  -- From culture collection

    -- Vital sign metrics
    fever_episodes INTEGER,
    max_temperature FLOAT,
    hypotension_episodes INTEGER,
    min_systolic_bp INTEGER,

    -- Lab metrics
    max_wbc FLOAT,
    min_wbc FLOAT,
    max_crp FLOAT,  -- C-reactive protein
    max_procalcitonin FLOAT,

    -- Antibiotic metrics
    empiric_antibiotics_appropriate BOOLEAN,
    definitive_antibiotics_appropriate BOOLEAN,
    antibiotic_days INTEGER,

    -- Outcome metrics
    line_removed_for_infection BOOLEAN,
    transferred_to_icu BOOLEAN,
    length_of_stay_days INTEGER,
    mortality BOOLEAN,

    -- Quality metrics
    clabsi_bundle_compliance_score FLOAT,  -- 0-100, if tracked
    hand_hygiene_compliance FLOAT,  -- If tracked

    -- Calculated
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_metrics_patient ON GOLD.CLABSI_METRICS(patient_id);
CREATE INDEX idx_metrics_encounter ON GOLD.CLABSI_METRICS(encounter_id);
