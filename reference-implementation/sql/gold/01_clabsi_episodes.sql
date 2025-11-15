-- ============================================================================
-- GOLD.CLABSI_EPISODES
-- Domain-specific table for potential CLABSI cases
-- ============================================================================

CREATE OR REPLACE TABLE GOLD.CLABSI_EPISODES (
    episode_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,

    -- Episode definition
    episode_start_date DATE,
    episode_end_date DATE,
    episode_status VARCHAR(50),  -- POTENTIAL, CONFIRMED, RULED_OUT, INDETERMINATE

    -- Central line info
    primary_device_id VARCHAR(50),
    line_insertion_date TIMESTAMP_NTZ,
    line_removal_date TIMESTAMP_NTZ,
    line_days_at_culture INTEGER,  -- Days line was in place when culture drawn
    line_type VARCHAR(100),
    line_site VARCHAR(100),

    -- Blood culture info
    index_culture_id VARCHAR(50),  -- The triggering blood culture
    index_culture_date TIMESTAMP_NTZ,
    culture_organism VARCHAR(500),
    culture_organism_category VARCHAR(100),  -- PATHOGEN, COMMENSAL, CONTAMINANT

    -- CLABSI criteria flags
    has_central_line BOOLEAN,
    line_present_gt_2days BOOLEAN,
    positive_blood_culture BOOLEAN,
    recognized_pathogen BOOLEAN,
    no_other_infection_source BOOLEAN,

    -- Risk assessment
    risk_score FLOAT,  -- 0-100 scale
    risk_category VARCHAR(20),  -- LOW, MODERATE, HIGH

    -- Calculated at
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_clabsi_episodes_patient ON GOLD.CLABSI_EPISODES(patient_id);
CREATE INDEX idx_clabsi_episodes_encounter ON GOLD.CLABSI_EPISODES(encounter_id);
CREATE INDEX idx_clabsi_episodes_status ON GOLD.CLABSI_EPISODES(episode_status);
