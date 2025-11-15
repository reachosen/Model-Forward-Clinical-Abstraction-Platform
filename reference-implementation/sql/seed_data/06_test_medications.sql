-- ============================================================================
-- TEST DATA: MEDICATIONS (Antibiotics critical for CLABSI)
-- ============================================================================

-- Patient 1: Empiric antibiotics started, then targeted therapy
INSERT INTO SILVER.MEDICATIONS (
    medication_id, patient_id, encounter_id,
    medication_code, medication_name, generic_name,
    order_datetime, administration_datetime,
    dose, dose_unit, route, frequency, indication,
    is_antibiotic, antibiotic_class
)
VALUES
    ('MED001_001', 'PAT001', 'ENC001',
     'RX001', 'Vancomycin', 'Vancomycin',
     '2024-01-15 09:00:00', '2024-01-15 10:00:00',
     1000, 'mg', 'IV', 'Q12H', 'Suspected CLABSI',
     TRUE, 'Glycopeptide'),

    ('MED001_002', 'PAT001', 'ENC001',
     'RX002', 'Cefepime', 'Cefepime',
     '2024-01-15 09:00:00', '2024-01-15 10:30:00',
     2000, 'mg', 'IV', 'Q8H', 'Suspected CLABSI',
     TRUE, 'Cephalosporin');

-- Patient 2: No antibiotics
-- (No entries for PAT002)

-- Patient 3: Single antibiotic course
INSERT INTO SILVER.MEDICATIONS (
    medication_id, patient_id, encounter_id,
    medication_code, medication_name, generic_name,
    order_datetime, administration_datetime,
    dose, dose_unit, route, frequency, indication,
    is_antibiotic, antibiotic_class
)
VALUES
    ('MED003_001', 'PAT003', 'ENC003',
     'RX003', 'Cefazolin', 'Cefazolin',
     '2024-01-19 15:00:00', '2024-01-19 16:00:00',
     1000, 'mg', 'IV', 'Q8H', 'Surgical prophylaxis',
     TRUE, 'Cephalosporin');

-- Patient 4: Broad spectrum started but incomplete data
INSERT INTO SILVER.MEDICATIONS (
    medication_id, patient_id, encounter_id,
    medication_code, medication_name, generic_name,
    order_datetime, administration_datetime,
    dose, dose_unit, route, frequency, indication,
    is_antibiotic, antibiotic_class
)
VALUES
    ('MED004_001', 'PAT004', 'ENC004',
     'RX004', 'Meropenem', 'Meropenem',
     '2024-01-22 11:00:00', '2024-01-22 12:00:00',
     1000, 'mg', 'IV', 'Q8H', 'Sepsis',
     TRUE, 'Carbapenem');

-- Patient 5: No targeted antibiotics
-- (No entries for PAT005)

-- Patient 6: Broad spectrum combination therapy
INSERT INTO SILVER.MEDICATIONS (
    medication_id, patient_id, encounter_id,
    medication_code, medication_name, generic_name,
    order_datetime, administration_datetime,
    dose, dose_unit, route, frequency, indication,
    is_antibiotic, antibiotic_class
)
VALUES
    ('MED006_001', 'PAT006', 'ENC006',
     'RX005', 'Piperacillin-Tazobactam', 'Piperacillin-Tazobactam',
     '2024-01-28 21:00:00', '2024-01-28 22:00:00',
     4500, 'mg', 'IV', 'Q6H', 'Septic shock',
     TRUE, 'Penicillin'),

    ('MED006_002', 'PAT006', 'ENC006',
     'RX006', 'Gentamicin', 'Gentamicin',
     '2024-01-28 21:00:00', '2024-01-28 22:30:00',
     240, 'mg', 'IV', 'Q24H', 'Septic shock',
     TRUE, 'Aminoglycoside');
