-- ============================================================================
-- SILVER.DEVICES
-- Raw medical device data from EHR source systems
-- Critical for CLABSI - tracks central line placement and removal
-- ============================================================================

CREATE OR REPLACE TABLE SILVER.DEVICES (
    device_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),

    device_type VARCHAR(100),  -- CENTRAL_LINE, PICC, DIALYSIS_CATHETER, etc.
    device_subtype VARCHAR(100),  -- TRIPLE_LUMEN, SINGLE_LUMEN, etc.
    device_name VARCHAR(200),

    insertion_datetime TIMESTAMP_NTZ,
    removal_datetime TIMESTAMP_NTZ,

    insertion_site VARCHAR(100),  -- SUBCLAVIAN, JUGULAR, FEMORAL, etc.
    laterality VARCHAR(20),  -- LEFT, RIGHT

    inserting_provider_id VARCHAR(50),
    removing_provider_id VARCHAR(50),

    -- Device status
    device_status VARCHAR(50),  -- IN_PLACE, REMOVED, DISCONTINUED
    removal_reason VARCHAR(500),

    -- Complications
    complications VARCHAR(1000),

    -- Metadata
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_devices_patient ON SILVER.DEVICES(patient_id);
CREATE INDEX idx_devices_encounter ON SILVER.DEVICES(encounter_id);
CREATE INDEX idx_devices_insertion ON SILVER.DEVICES(insertion_datetime);
CREATE INDEX idx_devices_type ON SILVER.DEVICES(device_type);
