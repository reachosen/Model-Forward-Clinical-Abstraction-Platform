-- ============================================================================
-- SILVER.VITALS
-- Raw vital signs from EHR source systems
-- ============================================================================

CREATE OR REPLACE TABLE SILVER.VITALS (
    vital_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),

    recorded_datetime TIMESTAMP_NTZ,

    vital_type VARCHAR(50),  -- TEMP, BP, HR, RR, SPO2
    vital_value FLOAT,
    vital_unit VARCHAR(20),

    -- Expanded fields for common vitals
    temperature FLOAT,
    temperature_unit VARCHAR(10),  -- F, C
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    spo2 INTEGER,

    -- Metadata
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_vitals_patient ON SILVER.VITALS(patient_id);
CREATE INDEX idx_vitals_encounter ON SILVER.VITALS(encounter_id);
CREATE INDEX idx_vitals_recorded ON SILVER.VITALS(recorded_datetime);
