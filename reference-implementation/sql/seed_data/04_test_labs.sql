-- ============================================================================
-- TEST DATA: LABS (Blood Cultures and other relevant labs)
-- ============================================================================

-- Patient 1: Clear positive CLABSI - S. aureus bacteremia
INSERT INTO SILVER.LABS (
    lab_id, patient_id, encounter_id,
    order_datetime, collection_datetime, result_datetime,
    lab_test_code, lab_test_name, component_code, component_name,
    result_value, result_numeric, result_unit, abnormal_flag,
    specimen_type, specimen_source
)
VALUES
    -- Blood culture - positive for S. aureus
    ('LAB001_001', 'PAT001', 'ENC001',
     '2024-01-15 08:00:00', '2024-01-15 08:30:00', '2024-01-16 14:00:00',
     '600-7', 'Blood Culture', 'ORG', 'Organism',
     'Staphylococcus aureus', NULL, NULL, 'CRITICAL',
     'BLOOD', 'Blood culture - central line'),

    -- WBC elevated
    ('LAB001_002', 'PAT001', 'ENC001',
     '2024-01-15 08:00:00', '2024-01-15 08:30:00', '2024-01-15 10:00:00',
     '6690-2', 'WBC', 'WBC', 'White Blood Cell Count',
     '18.5', 18.5, 'K/uL', 'HIGH',
     'BLOOD', 'Venipuncture'),

    -- CRP elevated
    ('LAB001_003', 'PAT001', 'ENC001',
     '2024-01-15 08:00:00', '2024-01-15 08:30:00', '2024-01-15 11:30:00',
     '1988-5', 'CRP', 'CRP', 'C-Reactive Protein',
     '15.8', 15.8, 'mg/dL', 'HIGH',
     'BLOOD', 'Venipuncture');

-- Patient 2: Negative - no growth
INSERT INTO SILVER.LABS (
    lab_id, patient_id, encounter_id,
    order_datetime, collection_datetime, result_datetime,
    lab_test_code, lab_test_name, component_code, component_name,
    result_value, result_numeric, result_unit, abnormal_flag,
    specimen_type, specimen_source
)
VALUES
    -- Blood culture - no growth
    ('LAB002_001', 'PAT002', 'ENC002',
     '2024-01-14 06:00:00', '2024-01-14 06:30:00', '2024-01-17 06:00:00',
     '600-7', 'Blood Culture', 'ORG', 'Organism',
     'No growth', NULL, NULL, 'NORMAL',
     'BLOOD', 'Blood culture - peripheral'),

    -- Normal WBC
    ('LAB002_002', 'PAT002', 'ENC002',
     '2024-01-14 06:00:00', '2024-01-14 06:30:00', '2024-01-14 08:00:00',
     '6690-2', 'WBC', 'WBC', 'White Blood Cell Count',
     '7.2', 7.2, 'K/uL', 'NORMAL',
     'BLOOD', 'Venipuncture');

-- Patient 3: Borderline - coagulase-negative staph (possible contaminant)
INSERT INTO SILVER.LABS (
    lab_id, patient_id, encounter_id,
    order_datetime, collection_datetime, result_datetime,
    lab_test_code, lab_test_name, component_code, component_name,
    result_value, result_numeric, result_unit, abnormal_flag,
    specimen_type, specimen_source
)
VALUES
    -- Single positive culture with CoNS
    ('LAB003_001', 'PAT003', 'ENC003',
     '2024-01-19 14:00:00', '2024-01-19 14:30:00', '2024-01-21 10:00:00',
     '600-7', 'Blood Culture', 'ORG', 'Organism',
     'Staphylococcus epidermidis (Coagulase-negative)', NULL, NULL, 'ABNORMAL',
     'BLOOD', 'Blood culture - PICC line'),

    -- Concurrent peripheral culture negative
    ('LAB003_002', 'PAT003', 'ENC003',
     '2024-01-19 14:00:00', '2024-01-19 14:35:00', '2024-01-21 10:00:00',
     '600-7', 'Blood Culture', 'ORG', 'Organism',
     'No growth', NULL, NULL, 'NORMAL',
     'BLOOD', 'Blood culture - peripheral'),

    -- Mildly elevated WBC
    ('LAB003_003', 'PAT003', 'ENC003',
     '2024-01-19 14:00:00', '2024-01-19 14:30:00', '2024-01-19 16:00:00',
     '6690-2', 'WBC', 'WBC', 'White Blood Cell Count',
     '11.8', 11.8, 'K/uL', 'HIGH',
     'BLOOD', 'Venipuncture');

-- Patient 4: Missing follow-up cultures
INSERT INTO SILVER.LABS (
    lab_id, patient_id, encounter_id,
    order_datetime, collection_datetime, result_datetime,
    lab_test_code, lab_test_name, component_code, component_name,
    result_value, result_numeric, result_unit, abnormal_flag,
    specimen_type, specimen_source
)
VALUES
    -- Initial culture ordered but incomplete
    ('LAB004_001', 'PAT004', 'ENC004',
     '2024-01-22 10:00:00', '2024-01-22 10:30:00', NULL,
     '600-7', 'Blood Culture', 'ORG', 'Organism',
     'Pending', NULL, NULL, NULL,
     'BLOOD', 'Blood culture - central line'),

    -- High WBC
    ('LAB004_002', 'PAT004', 'ENC004',
     '2024-01-22 10:00:00', '2024-01-22 10:30:00', '2024-01-22 12:00:00',
     '6690-2', 'WBC', 'WBC', 'White Blood Cell Count',
     '22.3', 22.3, 'K/uL', 'CRITICAL_HIGH',
     'BLOOD', 'Venipuncture');

-- Patient 5: Contamination pattern - skin flora, single culture
INSERT INTO SILVER.LABS (
    lab_id, patient_id, encounter_id,
    order_datetime, collection_datetime, result_datetime,
    lab_test_code, lab_test_name, component_code, component_name,
    result_value, result_numeric, result_unit, abnormal_flag,
    specimen_type, specimen_source
)
VALUES
    -- Skin contaminant
    ('LAB005_001', 'PAT005', 'ENC005',
     '2024-01-25 16:00:00', '2024-01-25 16:30:00', '2024-01-27 08:00:00',
     '600-7', 'Blood Culture', 'ORG', 'Organism',
     'Cutibacterium acnes', NULL, NULL, 'ABNORMAL',
     'BLOOD', 'Blood culture - peripheral'),

    -- Repeat culture negative
    ('LAB005_002', 'PAT005', 'ENC005',
     '2024-01-26 06:00:00', '2024-01-26 06:30:00', '2024-01-28 06:00:00',
     '600-7', 'Blood Culture', 'ORG', 'Organism',
     'No growth', NULL, NULL, 'NORMAL',
     'BLOOD', 'Blood culture - peripheral');

-- Patient 6: Complex - multiple organisms
INSERT INTO SILVER.LABS (
    lab_id, patient_id, encounter_id,
    order_datetime, collection_datetime, result_datetime,
    lab_test_code, lab_test_name, component_code, component_name,
    result_value, result_numeric, result_unit, abnormal_flag,
    specimen_type, specimen_source
)
VALUES
    -- Polymicrobial infection - E. coli
    ('LAB006_001', 'PAT006', 'ENC006',
     '2024-01-28 20:00:00', '2024-01-28 20:30:00', '2024-01-30 06:00:00',
     '600-7', 'Blood Culture', 'ORG', 'Organism',
     'Escherichia coli', NULL, NULL, 'CRITICAL',
     'BLOOD', 'Blood culture - central line'),

    -- Polymicrobial infection - K. pneumoniae
    ('LAB006_002', 'PAT006', 'ENC006',
     '2024-01-28 20:00:00', '2024-01-28 20:30:00', '2024-01-30 06:00:00',
     '600-7', 'Blood Culture', 'ORG', 'Organism',
     'Klebsiella pneumoniae', NULL, NULL, 'CRITICAL',
     'BLOOD', 'Blood culture - central line'),

    -- Severely elevated WBC
    ('LAB006_003', 'PAT006', 'ENC006',
     '2024-01-28 20:00:00', '2024-01-28 20:30:00', '2024-01-28 22:00:00',
     '6690-2', 'WBC', 'WBC', 'White Blood Cell Count',
     '28.7', 28.7, 'K/uL', 'CRITICAL_HIGH',
     'BLOOD', 'Venipuncture'),

    -- Very high CRP
    ('LAB006_004', 'PAT006', 'ENC006',
     '2024-01-28 20:00:00', '2024-01-28 20:30:00', '2024-01-29 01:00:00',
     '1988-5', 'CRP', 'CRP', 'C-Reactive Protein',
     '25.4', 25.4, 'mg/dL', 'CRITICAL_HIGH',
     'BLOOD', 'Venipuncture');
