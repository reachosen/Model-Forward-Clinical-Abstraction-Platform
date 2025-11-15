-- ============================================================================
-- SILVER.LABS
-- Raw laboratory results from EHR source systems
-- ============================================================================

CREATE OR REPLACE TABLE SILVER.LABS (
    lab_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),

    order_datetime TIMESTAMP_NTZ,
    collection_datetime TIMESTAMP_NTZ,
    result_datetime TIMESTAMP_NTZ,

    lab_test_code VARCHAR(50),  -- LOINC or internal code
    lab_test_name VARCHAR(200),
    component_code VARCHAR(50),
    component_name VARCHAR(200),

    result_value VARCHAR(500),  -- Can be numeric or text
    result_numeric FLOAT,
    result_unit VARCHAR(50),
    reference_range VARCHAR(100),
    abnormal_flag VARCHAR(20),  -- NORMAL, HIGH, LOW, CRITICAL_HIGH, CRITICAL_LOW

    specimen_type VARCHAR(100),  -- BLOOD, CULTURE, etc.
    specimen_source VARCHAR(100),  -- e.g., "Blood culture - central line"

    -- Metadata
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_labs_patient ON SILVER.LABS(patient_id);
CREATE INDEX idx_labs_encounter ON SILVER.LABS(encounter_id);
CREATE INDEX idx_labs_result_datetime ON SILVER.LABS(result_datetime);
CREATE INDEX idx_labs_test_code ON SILVER.LABS(lab_test_code);
