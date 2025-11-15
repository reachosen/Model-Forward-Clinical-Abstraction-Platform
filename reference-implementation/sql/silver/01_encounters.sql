-- ============================================================================
-- SILVER.ENCOUNTERS
-- Raw encounter data from EHR source systems
-- ============================================================================

CREATE OR REPLACE TABLE SILVER.ENCOUNTERS (
    encounter_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_type VARCHAR(50),  -- INPATIENT, EMERGENCY, OBSERVATION
    admission_datetime TIMESTAMP_NTZ,
    discharge_datetime TIMESTAMP_NTZ,
    primary_diagnosis_code VARCHAR(20),
    primary_diagnosis_desc VARCHAR(500),
    department_id VARCHAR(50),
    department_name VARCHAR(200),
    attending_provider_id VARCHAR(50),
    discharge_disposition VARCHAR(100),  -- HOME, TRANSFER, EXPIRED, etc.

    -- Metadata
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),

    -- Indexes
    CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES SILVER.PATIENTS(patient_id)
);

-- Optimize for common query patterns
CREATE INDEX idx_encounters_patient ON SILVER.ENCOUNTERS(patient_id);
CREATE INDEX idx_encounters_admission ON SILVER.ENCOUNTERS(admission_datetime);
