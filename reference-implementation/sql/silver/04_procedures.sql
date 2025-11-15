-- ============================================================================
-- SILVER.PROCEDURES
-- Raw procedure data from EHR source systems
-- ============================================================================

CREATE OR REPLACE TABLE SILVER.PROCEDURES (
    procedure_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),

    procedure_code VARCHAR(50),  -- CPT or internal code
    procedure_name VARCHAR(500),
    procedure_type VARCHAR(100),

    order_datetime TIMESTAMP_NTZ,
    start_datetime TIMESTAMP_NTZ,
    end_datetime TIMESTAMP_NTZ,

    performing_provider_id VARCHAR(50),
    department_id VARCHAR(50),

    procedure_status VARCHAR(50),  -- ORDERED, IN_PROGRESS, COMPLETED, CANCELLED

    -- Additional details (can be JSON)
    procedure_notes TEXT,

    -- Metadata
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_procedures_patient ON SILVER.PROCEDURES(patient_id);
CREATE INDEX idx_procedures_encounter ON SILVER.PROCEDURES(encounter_id);
CREATE INDEX idx_procedures_start ON SILVER.PROCEDURES(start_datetime);
