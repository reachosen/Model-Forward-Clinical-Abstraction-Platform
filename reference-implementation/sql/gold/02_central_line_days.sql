-- ============================================================================
-- GOLD.CENTRAL_LINE_DAYS
-- One row per patient per day with central line metrics
-- ============================================================================

CREATE OR REPLACE TABLE GOLD.CENTRAL_LINE_DAYS (
    line_day_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    device_id VARCHAR(50),

    calendar_date DATE,
    day_number INTEGER,  -- Days since line insertion

    -- Line details
    line_type VARCHAR(100),
    line_site VARCHAR(100),
    line_laterality VARCHAR(20),

    -- Daily metrics
    has_fever BOOLEAN,
    max_temperature FLOAT,
    has_hypotension BOOLEAN,
    min_systolic_bp INTEGER,

    has_elevated_wbc BOOLEAN,
    wbc_value FLOAT,

    antibiotics_started BOOLEAN,
    antibiotic_names VARCHAR(1000),

    -- Calculated
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_line_days_patient ON GOLD.CENTRAL_LINE_DAYS(patient_id);
CREATE INDEX idx_line_days_device ON GOLD.CENTRAL_LINE_DAYS(device_id);
CREATE INDEX idx_line_days_date ON GOLD.CENTRAL_LINE_DAYS(calendar_date);
