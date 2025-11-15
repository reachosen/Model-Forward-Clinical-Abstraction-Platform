-- ============================================================================
-- SILVER.PATIENTS
-- Raw patient demographic data from EHR source systems
-- ============================================================================

CREATE OR REPLACE TABLE SILVER.PATIENTS (
    patient_id VARCHAR(50) PRIMARY KEY,
    mrn VARCHAR(50) UNIQUE,  -- Medical Record Number
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),  -- MALE, FEMALE, OTHER, UNKNOWN
    race VARCHAR(100),
    ethnicity VARCHAR(100),

    -- Metadata
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_patients_mrn ON SILVER.PATIENTS(mrn);
