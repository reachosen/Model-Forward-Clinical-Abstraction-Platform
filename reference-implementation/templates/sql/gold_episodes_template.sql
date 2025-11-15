-- ============================================================================
-- GOLD.{DOMAIN}_EPISODES
-- Template for domain-specific episode tracking table
--
-- INSTRUCTIONS:
-- 1. Replace {DOMAIN} with your domain name (e.g., NAKI, UE)
-- 2. Replace {domain} with lowercase version
-- 3. Add domain-specific fields in the TODO sections
-- 4. Update comments to match your domain
-- ============================================================================

CREATE OR REPLACE TABLE GOLD.{DOMAIN}_EPISODES (
    episode_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,

    -- Episode definition
    episode_start_date DATE,
    episode_end_date DATE,
    episode_status VARCHAR(50),  -- POTENTIAL, CONFIRMED, RULED_OUT, INDETERMINATE

    -- TODO: Add domain-specific core fields
    -- Example for NAKI:
    -- baseline_gcs INTEGER,
    -- nadir_gcs INTEGER,
    -- injury_mechanism VARCHAR(200),

    -- Example for UE (Unplanned Extubation):
    -- intubation_datetime TIMESTAMP_NTZ,
    -- extubation_datetime TIMESTAMP_NTZ,
    -- reintubation_required BOOLEAN,

    -- TODO: Add your fields here
    -- field_name_1 DATA_TYPE,
    -- field_name_2 DATA_TYPE,

    -- TODO: Add determination criteria flags (based on your config.json)
    -- Example:
    -- meets_criterion_1 BOOLEAN,
    -- meets_criterion_2 BOOLEAN,
    -- meets_all_criteria BOOLEAN,

    -- TODO: Add your criteria flags here
    -- criterion_flag_1 BOOLEAN,
    -- criterion_flag_2 BOOLEAN,

    -- Risk assessment (standard across domains)
    risk_score FLOAT,  -- 0-100 scale
    risk_category VARCHAR(20),  -- LOW, MODERATE, HIGH, CRITICAL

    -- Metadata (standard)
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    -- Foreign keys
    CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES SILVER.PATIENTS(patient_id),
    CONSTRAINT fk_encounter FOREIGN KEY (encounter_id) REFERENCES SILVER.ENCOUNTERS(encounter_id)
);

-- Indexes
CREATE INDEX idx_{domain}_episodes_patient ON GOLD.{DOMAIN}_EPISODES(patient_id);
CREATE INDEX idx_{domain}_episodes_encounter ON GOLD.{DOMAIN}_EPISODES(encounter_id);
CREATE INDEX idx_{domain}_episodes_status ON GOLD.{DOMAIN}_EPISODES(episode_status);
CREATE INDEX idx_{domain}_episodes_risk ON GOLD.{DOMAIN}_EPISODES(risk_category);

-- ============================================================================
-- USAGE NOTES:
--
-- This table serves as the primary tracking table for {domain} episodes.
-- Each row represents a potential or confirmed {domain} case.
--
-- The episode_status field tracks the lifecycle:
-- - POTENTIAL: Automated detection flagged this case
-- - CONFIRMED: Clinician reviewed and confirmed
-- - RULED_OUT: Clinician reviewed and ruled out
-- - INDETERMINATE: Requires additional information
--
-- TODO: Add domain-specific usage notes here
-- ============================================================================
