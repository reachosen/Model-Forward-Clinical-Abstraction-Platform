-- ============================================================================
-- TEST DATA: ENCOUNTERS
-- One encounter per test patient
-- ============================================================================

INSERT INTO SILVER.ENCOUNTERS (
    encounter_id, patient_id, encounter_type,
    admission_datetime, discharge_datetime,
    primary_diagnosis_code, primary_diagnosis_desc,
    department_id, department_name,
    attending_provider_id, discharge_disposition
)
VALUES
    -- Patient 1: ICU admission with sepsis
    ('ENC001', 'PAT001', 'INPATIENT',
     '2024-01-10 14:30:00', '2024-01-25 10:00:00',
     'A41.9', 'Sepsis, unspecified organism',
     'DEPT_ICU', 'Medical Intensive Care Unit',
     'PROV001', 'HOME'),

    -- Patient 2: Routine ICU stay, no infection
    ('ENC002', 'PAT002', 'INPATIENT',
     '2024-01-12 08:00:00', '2024-01-18 16:00:00',
     'I21.0', 'Acute myocardial infarction',
     'DEPT_CICU', 'Cardiac Intensive Care Unit',
     'PROV002', 'HOME'),

    -- Patient 3: Surgical patient, borderline infection
    ('ENC003', 'PAT003', 'INPATIENT',
     '2024-01-15 06:00:00', '2024-02-02 14:00:00',
     'K35.80', 'Acute appendicitis',
     'DEPT_SICU', 'Surgical Intensive Care Unit',
     'PROV003', 'HOME'),

    -- Patient 4: Incomplete documentation
    ('ENC004', 'PAT004', 'INPATIENT',
     '2024-01-18 22:00:00', '2024-01-28 11:00:00',
     'J18.9', 'Pneumonia, unspecified organism',
     'DEPT_ICU', 'Medical Intensive Care Unit',
     'PROV001', 'HOME'),

    -- Patient 5: Possible contamination
    ('ENC005', 'PAT005', 'INPATIENT',
     '2024-01-20 03:00:00', '2024-02-05 09:00:00',
     'N17.9', 'Acute kidney failure',
     'DEPT_ICU', 'Medical Intensive Care Unit',
     'PROV004', 'SKILLED_NURSING'),

    -- Patient 6: Complex case with multiple organisms
    ('ENC006', 'PAT006', 'INPATIENT',
     '2024-01-22 19:00:00', '2024-02-10 15:00:00',
     'C18.9', 'Malignant neoplasm of colon',
     'DEPT_ONCO', 'Oncology Unit',
     'PROV005', 'HOME');
