-- ============================================================================
-- GOLD.BLOOD_CULTURE_RESULTS
-- Aggregated and enriched blood culture results
-- ============================================================================

CREATE OR REPLACE TABLE GOLD.BLOOD_CULTURE_RESULTS (
    culture_result_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),

    collection_datetime TIMESTAMP_NTZ,
    result_datetime TIMESTAMP_NTZ,

    -- Culture details
    specimen_source VARCHAR(200),  -- e.g., "Central line - Right Subclavian"
    culture_type VARCHAR(100),  -- AEROBIC, ANAEROBIC

    -- Organism details
    organism_name VARCHAR(500),
    organism_code VARCHAR(50),
    organism_category VARCHAR(100),  -- PATHOGEN, COMMENSAL, CONTAMINANT, SKIN_FLORA

    -- CLABSI-specific classifications
    is_recognized_pathogen BOOLEAN,
    is_common_commensal BOOLEAN,
    is_skin_contaminant BOOLEAN,

    -- Growth characteristics
    time_to_positivity_hours FLOAT,
    growth_density VARCHAR(50),  -- LIGHT, MODERATE, HEAVY

    -- Susceptibility
    antibiotic_susceptibility VARIANT,  -- JSON of organism sensitivities

    -- Context
    concurrent_cultures_count INTEGER,  -- Number of cultures drawn at same time
    other_positive_cultures BOOLEAN,

    -- Calculated
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_cultures_patient ON GOLD.BLOOD_CULTURE_RESULTS(patient_id);
CREATE INDEX idx_cultures_encounter ON GOLD.BLOOD_CULTURE_RESULTS(encounter_id);
CREATE INDEX idx_cultures_collection ON GOLD.BLOOD_CULTURE_RESULTS(collection_datetime);
CREATE INDEX idx_cultures_organism ON GOLD.BLOOD_CULTURE_RESULTS(organism_category);
