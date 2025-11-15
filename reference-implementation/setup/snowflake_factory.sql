-- ============================================================================
-- SNOWFLAKE FACTORY SCRIPT - Model-Forward Clinical Abstraction Platform
-- ============================================================================
-- Purpose: One-script deployment of complete database infrastructure
-- Usage: snowsql -f setup/snowflake_factory.sql -D env=DEV
-- DBA: Run this script to create all schemas, tables, and seed data
-- ============================================================================

-- Environment Configuration (pass via -D flag or set here)
SET env = 'DEV'; -- DEV | TEST | PROD

-- Database Configuration
SET database_name = 'CLINICAL_ABSTRACTION_' || $env;
SET warehouse_name = 'CLINICAL_WH_' || $env;

-- ============================================================================
-- SECTION 1: INFRASTRUCTURE SETUP
-- ============================================================================

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS IDENTIFIER($database_name);
USE DATABASE IDENTIFIER($database_name);

-- Create warehouse if not exists (adjust size as needed)
CREATE WAREHOUSE IF NOT EXISTS IDENTIFIER($warehouse_name)
  WAREHOUSE_SIZE = 'SMALL'
  AUTO_SUSPEND = 300
  AUTO_RESUME = TRUE
  INITIALLY_SUSPENDED = TRUE;

USE WAREHOUSE IDENTIFIER($warehouse_name);

-- ============================================================================
-- SECTION 2: SCHEMA CREATION
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS SILVER
  COMMENT = 'Raw-normalized clinical facts from source systems';

CREATE SCHEMA IF NOT EXISTS GOLD
  COMMENT = 'Domain-specific derived metrics and models';

CREATE SCHEMA IF NOT EXISTS GOLD_AI
  COMMENT = 'LLM-ready structured payloads';

CREATE SCHEMA IF NOT EXISTS LEDGER
  COMMENT = 'Audit trail, vector store, and abstraction tracking';

-- ============================================================================
-- SECTION 3: SILVER LAYER TABLES (Raw Clinical Facts)
-- ============================================================================

-- Patients
CREATE TABLE IF NOT EXISTS SILVER.PATIENTS (
    patient_id VARCHAR(50) PRIMARY KEY,
    mrn VARCHAR(50) UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(20),
    race VARCHAR(100),
    ethnicity VARCHAR(100),
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Encounters
CREATE TABLE IF NOT EXISTS SILVER.ENCOUNTERS (
    encounter_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_type VARCHAR(50),
    admission_datetime TIMESTAMP_NTZ,
    discharge_datetime TIMESTAMP_NTZ,
    primary_diagnosis_code VARCHAR(20),
    primary_diagnosis_desc VARCHAR(500),
    department_id VARCHAR(50),
    department_name VARCHAR(200),
    attending_provider_id VARCHAR(50),
    discharge_disposition VARCHAR(100),
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    CONSTRAINT fk_patient FOREIGN KEY (patient_id) REFERENCES SILVER.PATIENTS(patient_id)
);

-- Labs
CREATE TABLE IF NOT EXISTS SILVER.LABS (
    lab_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    order_datetime TIMESTAMP_NTZ,
    collection_datetime TIMESTAMP_NTZ,
    result_datetime TIMESTAMP_NTZ,
    lab_test_code VARCHAR(50),
    lab_test_name VARCHAR(200),
    component_code VARCHAR(50),
    component_name VARCHAR(200),
    result_value VARCHAR(500),
    result_numeric FLOAT,
    result_unit VARCHAR(50),
    reference_range VARCHAR(100),
    abnormal_flag VARCHAR(20),
    specimen_type VARCHAR(100),
    specimen_source VARCHAR(100),
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Vitals
CREATE TABLE IF NOT EXISTS SILVER.VITALS (
    vital_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    recorded_datetime TIMESTAMP_NTZ,
    vital_type VARCHAR(50),
    vital_value FLOAT,
    vital_unit VARCHAR(20),
    temperature FLOAT,
    temperature_unit VARCHAR(10),
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate INTEGER,
    respiratory_rate INTEGER,
    spo2 INTEGER,
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Procedures
CREATE TABLE IF NOT EXISTS SILVER.PROCEDURES (
    procedure_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    procedure_code VARCHAR(50),
    procedure_name VARCHAR(500),
    procedure_type VARCHAR(100),
    order_datetime TIMESTAMP_NTZ,
    start_datetime TIMESTAMP_NTZ,
    end_datetime TIMESTAMP_NTZ,
    performing_provider_id VARCHAR(50),
    department_id VARCHAR(50),
    procedure_status VARCHAR(50),
    procedure_notes TEXT,
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Medications
CREATE TABLE IF NOT EXISTS SILVER.MEDICATIONS (
    medication_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    medication_code VARCHAR(50),
    medication_name VARCHAR(500),
    generic_name VARCHAR(500),
    order_datetime TIMESTAMP_NTZ,
    administration_datetime TIMESTAMP_NTZ,
    dose FLOAT,
    dose_unit VARCHAR(50),
    route VARCHAR(100),
    frequency VARCHAR(100),
    indication VARCHAR(500),
    is_antibiotic BOOLEAN,
    antibiotic_class VARCHAR(100),
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Devices
CREATE TABLE IF NOT EXISTS SILVER.DEVICES (
    device_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    device_type VARCHAR(100),
    device_subtype VARCHAR(100),
    device_name VARCHAR(200),
    insertion_datetime TIMESTAMP_NTZ,
    removal_datetime TIMESTAMP_NTZ,
    insertion_site VARCHAR(100),
    laterality VARCHAR(20),
    inserting_provider_id VARCHAR(50),
    removing_provider_id VARCHAR(50),
    device_status VARCHAR(50),
    removal_reason VARCHAR(500),
    complications VARCHAR(1000),
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Clinical Notes
CREATE TABLE IF NOT EXISTS SILVER.CLINICAL_NOTES (
    note_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    note_type VARCHAR(100),
    note_subtype VARCHAR(100),
    authored_datetime TIMESTAMP_NTZ,
    author_provider_id VARCHAR(50),
    author_name VARCHAR(200),
    service_line VARCHAR(100),
    note_title VARCHAR(500),
    note_text TEXT,
    chief_complaint TEXT,
    history_present_illness TEXT,
    assessment_plan TEXT,
    source_system VARCHAR(50) DEFAULT 'CABOODLE',
    loaded_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Create indexes for SILVER layer
CREATE INDEX IF NOT EXISTS idx_encounters_patient ON SILVER.ENCOUNTERS(patient_id);
CREATE INDEX IF NOT EXISTS idx_labs_patient ON SILVER.LABS(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_patient ON SILVER.VITALS(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_patient ON SILVER.PROCEDURES(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_patient ON SILVER.MEDICATIONS(patient_id);
CREATE INDEX IF NOT EXISTS idx_devices_patient ON SILVER.DEVICES(patient_id);
CREATE INDEX IF NOT EXISTS idx_notes_patient ON SILVER.CLINICAL_NOTES(patient_id);

-- ============================================================================
-- SECTION 4: GOLD LAYER TABLES (Domain-Specific Metrics)
-- ============================================================================

-- CLABSI Episodes
CREATE TABLE IF NOT EXISTS GOLD.CLABSI_EPISODES (
    episode_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    episode_start_date DATE,
    episode_end_date DATE,
    episode_status VARCHAR(50),
    primary_device_id VARCHAR(50),
    line_insertion_date TIMESTAMP_NTZ,
    line_removal_date TIMESTAMP_NTZ,
    line_days_at_culture INTEGER,
    line_type VARCHAR(100),
    line_site VARCHAR(100),
    index_culture_id VARCHAR(50),
    index_culture_date TIMESTAMP_NTZ,
    culture_organism VARCHAR(500),
    culture_organism_category VARCHAR(100),
    has_central_line BOOLEAN,
    line_present_gt_2days BOOLEAN,
    positive_blood_culture BOOLEAN,
    recognized_pathogen BOOLEAN,
    no_other_infection_source BOOLEAN,
    risk_score FLOAT,
    risk_category VARCHAR(20),
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Central Line Days
CREATE TABLE IF NOT EXISTS GOLD.CENTRAL_LINE_DAYS (
    line_day_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    device_id VARCHAR(50),
    calendar_date DATE,
    day_number INTEGER,
    line_type VARCHAR(100),
    line_site VARCHAR(100),
    line_laterality VARCHAR(20),
    has_fever BOOLEAN,
    max_temperature FLOAT,
    has_hypotension BOOLEAN,
    min_systolic_bp INTEGER,
    has_elevated_wbc BOOLEAN,
    wbc_value FLOAT,
    antibiotics_started BOOLEAN,
    antibiotic_names VARCHAR(1000),
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Blood Culture Results
CREATE TABLE IF NOT EXISTS GOLD.BLOOD_CULTURE_RESULTS (
    culture_result_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    collection_datetime TIMESTAMP_NTZ,
    result_datetime TIMESTAMP_NTZ,
    specimen_source VARCHAR(200),
    culture_type VARCHAR(100),
    organism_name VARCHAR(500),
    organism_code VARCHAR(50),
    organism_category VARCHAR(100),
    is_recognized_pathogen BOOLEAN,
    is_common_commensal BOOLEAN,
    is_skin_contaminant BOOLEAN,
    time_to_positivity_hours FLOAT,
    growth_density VARCHAR(50),
    antibiotic_susceptibility VARIANT,
    concurrent_cultures_count INTEGER,
    other_positive_cultures BOOLEAN,
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Infection Risk Factors
CREATE TABLE IF NOT EXISTS GOLD.INFECTION_RISK_FACTORS (
    risk_factor_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    age_at_admission INTEGER,
    age_category VARCHAR(20),
    admission_diagnosis VARCHAR(500),
    admission_department VARCHAR(200),
    is_icu_admission BOOLEAN,
    icu_days INTEGER,
    has_immunosuppression BOOLEAN,
    has_malignancy BOOLEAN,
    has_diabetes BOOLEAN,
    has_renal_failure BOOLEAN,
    has_liver_disease BOOLEAN,
    has_tpn BOOLEAN,
    has_hemodialysis BOOLEAN,
    has_surgery BOOLEAN,
    surgery_count INTEGER,
    central_line_count INTEGER,
    central_line_total_days INTEGER,
    has_multiple_lumens BOOLEAN,
    femoral_line_present BOOLEAN,
    prior_antibiotic_use BOOLEAN,
    antibiotic_days_before_culture INTEGER,
    comorbidity_score INTEGER,
    procedural_risk_score INTEGER,
    overall_risk_score INTEGER,
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Clinical Timeline
CREATE TABLE IF NOT EXISTS GOLD.CLINICAL_TIMELINE (
    timeline_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    episode_id VARCHAR(50),
    event_datetime TIMESTAMP_NTZ,
    event_type VARCHAR(100),
    event_category VARCHAR(50),
    event_description VARCHAR(1000),
    event_severity VARCHAR(20),
    event_details VARIANT,
    days_from_admission INTEGER,
    days_from_line_insertion INTEGER,
    days_from_index_culture INTEGER,
    is_clabsi_relevant BOOLEAN,
    significance_score INTEGER,
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- CLABSI Metrics
CREATE TABLE IF NOT EXISTS GOLD.CLABSI_METRICS (
    metric_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    central_line_days INTEGER,
    blood_cultures_drawn INTEGER,
    positive_blood_cultures INTEGER,
    antibiotic_courses INTEGER,
    time_to_first_culture_hours FLOAT,
    time_to_culture_result_hours FLOAT,
    time_to_antibiotic_hours FLOAT,
    fever_episodes INTEGER,
    max_temperature FLOAT,
    hypotension_episodes INTEGER,
    min_systolic_bp INTEGER,
    max_wbc FLOAT,
    min_wbc FLOAT,
    max_crp FLOAT,
    max_procalcitonin FLOAT,
    empiric_antibiotics_appropriate BOOLEAN,
    definitive_antibiotics_appropriate BOOLEAN,
    antibiotic_days INTEGER,
    line_removed_for_infection BOOLEAN,
    transferred_to_icu BOOLEAN,
    length_of_stay_days INTEGER,
    mortality BOOLEAN,
    clabsi_bundle_compliance_score FLOAT,
    hand_hygiene_compliance FLOAT,
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Create indexes for GOLD layer
CREATE INDEX IF NOT EXISTS idx_clabsi_episodes_patient ON GOLD.CLABSI_EPISODES(patient_id);
CREATE INDEX IF NOT EXISTS idx_timeline_patient ON GOLD.CLINICAL_TIMELINE(patient_id);

-- ============================================================================
-- SECTION 5: GOLD_AI LAYER TABLES (LLM Payloads)
-- ============================================================================

CREATE TABLE IF NOT EXISTS GOLD_AI.CLABSI_LLM_PAYLOADS (
    payload_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    episode_id VARCHAR(50),
    payload_version VARCHAR(20) DEFAULT 'v1.0',
    generated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    payload_status VARCHAR(50) DEFAULT 'ACTIVE',
    payload VARIANT NOT NULL,
    has_clabsi_signals BOOLEAN,
    signal_count INTEGER,
    risk_level VARCHAR(20),
    payload_hash VARCHAR(64),
    CONSTRAINT fk_episode FOREIGN KEY (episode_id)
        REFERENCES GOLD.CLABSI_EPISODES(episode_id)
);

-- ============================================================================
-- SECTION 6: LEDGER TABLES (Audit & Vector)
-- ============================================================================

-- Vector Store
CREATE TABLE IF NOT EXISTS LEDGER.VECTOR_STORE (
    chunk_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    episode_id VARCHAR(50),
    chunk_type VARCHAR(100),
    chunk_phase VARCHAR(50),
    chunk_index INTEGER,
    chunk_text TEXT NOT NULL,
    chunk_metadata VARIANT,
    embedding_vector ARRAY,
    embedding_model VARCHAR(100) DEFAULT 'text-embedding-ada-002',
    embedding_dimensions INTEGER DEFAULT 1536,
    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    updated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

-- Abstraction Ledger
CREATE TABLE IF NOT EXISTS LEDGER.ABSTRACTION_LEDGER (
    ledger_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    episode_id VARCHAR(50),
    environment VARCHAR(20) DEFAULT 'TEST',
    session_id VARCHAR(50),
    entry_datetime TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    entry_type VARCHAR(100),
    entry_status VARCHAR(50),
    created_by_user_id VARCHAR(50),
    created_by_system VARCHAR(100),
    entry_content VARIANT NOT NULL,
    parent_ledger_id VARCHAR(50),
    payload_id VARCHAR(50),
    tags ARRAY,
    CONSTRAINT fk_parent FOREIGN KEY (parent_ledger_id)
        REFERENCES LEDGER.ABSTRACTION_LEDGER(ledger_id)
);

-- QA Results
CREATE TABLE IF NOT EXISTS LEDGER.QA_RESULTS (
    qa_id VARCHAR(50) PRIMARY KEY,
    ledger_id VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    episode_id VARCHAR(50),
    qa_datetime TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    qa_version VARCHAR(20) DEFAULT 'v1.0',
    environment VARCHAR(20) DEFAULT 'TEST',
    qa_status VARCHAR(20) NOT NULL,
    qa_score FLOAT,
    rules_evaluated INTEGER,
    rules_passed INTEGER,
    rules_warnings INTEGER,
    rules_failed INTEGER,
    rule_results VARIANT NOT NULL,
    missing_data_fields ARRAY,
    contradictions ARRAY,
    validation_errors ARRAY,
    recommended_actions ARRAY,
    CONSTRAINT fk_qa_ledger FOREIGN KEY (ledger_id)
        REFERENCES LEDGER.ABSTRACTION_LEDGER(ledger_id)
);

-- Clinician Feedback
CREATE TABLE IF NOT EXISTS LEDGER.CLINICIAN_FEEDBACK (
    feedback_id VARCHAR(50) PRIMARY KEY,
    ledger_id VARCHAR(50) NOT NULL,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,
    episode_id VARCHAR(50),
    feedback_datetime TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP(),
    clinician_id VARCHAR(50),
    clinician_name VARCHAR(200),
    clinician_role VARCHAR(100),
    feedback_type VARCHAR(50),
    overall_rating INTEGER,
    accuracy_rating INTEGER,
    completeness_rating INTEGER,
    usefulness_rating INTEGER,
    feedback_text TEXT,
    corrections VARIANT,
    final_decision VARCHAR(50),
    decision_rationale TEXT,
    needs_follow_up BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    CONSTRAINT fk_feedback_ledger FOREIGN KEY (ledger_id)
        REFERENCES LEDGER.ABSTRACTION_LEDGER(ledger_id)
);

-- ============================================================================
-- SECTION 7: VALIDATION
-- ============================================================================

-- Verify all schemas exist
SELECT 'Schema validation:' AS status;
SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA
WHERE SCHEMA_NAME IN ('SILVER', 'GOLD', 'GOLD_AI', 'LEDGER');

-- Verify table counts
SELECT 'Table counts:' AS status;
SELECT
    'SILVER' AS schema_name,
    COUNT(*) AS table_count
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'SILVER'
UNION ALL
SELECT
    'GOLD',
    COUNT(*)
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'GOLD'
UNION ALL
SELECT
    'GOLD_AI',
    COUNT(*)
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'GOLD_AI'
UNION ALL
SELECT
    'LEDGER',
    COUNT(*)
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'LEDGER';

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT '✓ Database infrastructure created successfully!' AS status;
SELECT 'Database: ' || $database_name AS info;
SELECT 'Warehouse: ' || $warehouse_name AS info;
SELECT 'Next step: Load seed data with setup/load_seed_data.sql' AS next_action;

-- ============================================================================
-- END OF FACTORY SCRIPT
-- ============================================================================
