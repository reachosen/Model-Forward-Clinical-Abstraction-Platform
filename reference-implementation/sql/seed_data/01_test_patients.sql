-- ============================================================================
-- TEST DATA: PATIENTS
-- 6 synthetic patients representing different CLABSI scenarios
-- ============================================================================

INSERT INTO SILVER.PATIENTS (patient_id, mrn, first_name, last_name, date_of_birth, gender, race, ethnicity)
VALUES
    -- Patient 1: Clear positive CLABSI
    ('PAT001', 'MRN100001', 'John', 'Doe', '1965-03-15', 'MALE', 'White', 'Not Hispanic'),

    -- Patient 2: Clear negative (no infection)
    ('PAT002', 'MRN100002', 'Jane', 'Smith', '1978-07-22', 'FEMALE', 'Black', 'Not Hispanic'),

    -- Patient 3: Borderline case
    ('PAT003', 'MRN100003', 'Robert', 'Johnson', '1952-11-08', 'MALE', 'White', 'Hispanic'),

    -- Patient 4: Missing data case
    ('PAT004', 'MRN100004', 'Maria', 'Garcia', '1990-05-30', 'FEMALE', 'Other', 'Hispanic'),

    -- Patient 5: Contamination vs infection
    ('PAT005', 'MRN100005', 'David', 'Wilson', '1945-09-12', 'MALE', 'Asian', 'Not Hispanic'),

    -- Patient 6: Complex multi-organism case
    ('PAT006', 'MRN100006', 'Sarah', 'Martinez', '1982-12-25', 'FEMALE', 'White', 'Hispanic');
