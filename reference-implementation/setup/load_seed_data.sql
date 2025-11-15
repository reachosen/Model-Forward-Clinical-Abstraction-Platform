-- ============================================================================
-- SEED DATA LOADER - Test Data for Development/Testing
-- ============================================================================
-- Purpose: Load synthetic test patients for development and testing
-- Usage: snowsql -f setup/load_seed_data.sql -D env=DEV
-- DBA: Run after snowflake_factory.sql in DEV/TEST environments only
-- WARNING: DO NOT run in PROD
-- ============================================================================

SET env = 'DEV';
SET database_name = 'CLINICAL_ABSTRACTION_' || $env;
USE DATABASE IDENTIFIER($database_name);

-- Verify we're not in PROD
SELECT CASE
    WHEN $env = 'PROD' THEN ERROR('SEED DATA SHOULD NOT BE LOADED IN PROD')
    ELSE 'Environment validated: ' || $env
END AS validation;

-- ============================================================================
-- PATIENTS
-- ============================================================================

INSERT INTO SILVER.PATIENTS (patient_id, mrn, first_name, last_name, date_of_birth, gender, race, ethnicity)
VALUES
    ('PAT001', 'MRN100001', 'John', 'Doe', '1965-03-15', 'MALE', 'White', 'Not Hispanic'),
    ('PAT002', 'MRN100002', 'Jane', 'Smith', '1978-07-22', 'FEMALE', 'Black', 'Not Hispanic'),
    ('PAT003', 'MRN100003', 'Robert', 'Johnson', '1952-11-08', 'MALE', 'White', 'Hispanic'),
    ('PAT004', 'MRN100004', 'Maria', 'Garcia', '1990-05-30', 'FEMALE', 'Other', 'Hispanic'),
    ('PAT005', 'MRN100005', 'David', 'Wilson', '1945-09-12', 'MALE', 'Asian', 'Not Hispanic'),
    ('PAT006', 'MRN100006', 'Sarah', 'Martinez', '1982-12-25', 'FEMALE', 'White', 'Hispanic');

-- ============================================================================
-- ENCOUNTERS
-- ============================================================================

INSERT INTO SILVER.ENCOUNTERS (
    encounter_id, patient_id, encounter_type,
    admission_datetime, discharge_datetime,
    primary_diagnosis_code, primary_diagnosis_desc,
    department_id, department_name,
    attending_provider_id, discharge_disposition
)
VALUES
    ('ENC001', 'PAT001', 'INPATIENT',
     '2024-01-10 14:30:00', '2024-01-25 10:00:00',
     'A41.9', 'Sepsis, unspecified organism',
     'DEPT_ICU', 'Medical Intensive Care Unit',
     'PROV001', 'HOME'),
    ('ENC002', 'PAT002', 'INPATIENT',
     '2024-01-12 08:00:00', '2024-01-18 16:00:00',
     'I21.0', 'Acute myocardial infarction',
     'DEPT_CICU', 'Cardiac Intensive Care Unit',
     'PROV002', 'HOME'),
    ('ENC003', 'PAT003', 'INPATIENT',
     '2024-01-15 06:00:00', '2024-02-02 14:00:00',
     'K35.80', 'Acute appendicitis',
     'DEPT_SICU', 'Surgical Intensive Care Unit',
     'PROV003', 'HOME'),
    ('ENC004', 'PAT004', 'INPATIENT',
     '2024-01-18 22:00:00', '2024-01-28 11:00:00',
     'J18.9', 'Pneumonia, unspecified organism',
     'DEPT_ICU', 'Medical Intensive Care Unit',
     'PROV001', 'HOME'),
    ('ENC005', 'PAT005', 'INPATIENT',
     '2024-01-20 03:00:00', '2024-02-05 09:00:00',
     'N17.9', 'Acute kidney failure',
     'DEPT_ICU', 'Medical Intensive Care Unit',
     'PROV004', 'SKILLED_NURSING'),
    ('ENC006', 'PAT006', 'INPATIENT',
     '2024-01-22 19:00:00', '2024-02-10 15:00:00',
     'C18.9', 'Malignant neoplasm of colon',
     'DEPT_ONCO', 'Oncology Unit',
     'PROV005', 'HOME');

-- ============================================================================
-- DEVICES (Central Lines)
-- ============================================================================

INSERT INTO SILVER.DEVICES (
    device_id, patient_id, encounter_id,
    device_type, device_subtype, device_name,
    insertion_datetime, removal_datetime,
    insertion_site, laterality,
    inserting_provider_id, device_status, removal_reason
)
VALUES
    ('DEV001', 'PAT001', 'ENC001',
     'CENTRAL_LINE', 'TRIPLE_LUMEN', 'Triple Lumen Central Venous Catheter',
     '2024-01-10 16:00:00', '2024-01-20 10:00:00',
     'SUBCLAVIAN', 'RIGHT',
     'PROV006', 'REMOVED', 'Suspected line infection'),
    ('DEV002', 'PAT002', 'ENC002',
     'CENTRAL_LINE', 'DOUBLE_LUMEN', 'Double Lumen Central Venous Catheter',
     '2024-01-12 09:30:00', '2024-01-17 14:00:00',
     'JUGULAR', 'RIGHT',
     'PROV007', 'REMOVED', 'No longer needed'),
    ('DEV003', 'PAT003', 'ENC003',
     'PICC', 'SINGLE_LUMEN', 'Peripherally Inserted Central Catheter',
     '2024-01-16 11:00:00', '2024-02-01 09:00:00',
     'BASILIC_VEIN', 'LEFT',
     'PROV008', 'REMOVED', 'Therapy completed');

-- ============================================================================
-- VALIDATION
-- ============================================================================

SELECT 'Seed data loaded:' AS status;
SELECT
    'Patients: ' || COUNT(*) AS loaded
FROM SILVER.PATIENTS
UNION ALL
SELECT
    'Encounters: ' || COUNT(*)
FROM SILVER.ENCOUNTERS
UNION ALL
SELECT
    'Devices: ' || COUNT(*)
FROM SILVER.DEVICES;

SELECT '✓ Seed data load complete!' AS status;
SELECT 'Next step: Run application and review test cases' AS next_action;
