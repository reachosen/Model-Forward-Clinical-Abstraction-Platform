-- ============================================================================
-- SILVER.MEDICATIONS
-- Raw medication administration data from EHR source systems
-- ============================================================================

CREATE OR REPLACE TABLE SILVER.MEDICATIONS (
    medication_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),

    medication_code VARCHAR(50),  -- RxNorm or internal code
    medication_name VARCHAR(500),
    generic_name VARCHAR(500),

    order_datetime TIMESTAMP_NTZ,
    administration_datetime TIMESTAMP_NTZ,

    dose FLOAT,
    dose_unit VARCHAR(50),
    route VARCHAR(100),  -- IV, PO, IM, etc.
    frequency VARCHAR(100),

    indication VARCHAR(500),

    -- Antibiotic-specific fields (important for CLABSI)
    is_antibiotic BOOLEAN,
    antibiotic_class VARCHAR(100),

    -- Metadata
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_medications_patient ON SILVER.MEDICATIONS(patient_id);
CREATE INDEX idx_medications_encounter ON SILVER.MEDICATIONS(encounter_id);
CREATE INDEX idx_medications_admin ON SILVER.MEDICATIONS(administration_datetime);
