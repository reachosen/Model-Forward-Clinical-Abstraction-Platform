-- ============================================================================
-- TEST DATA: VITALS (Fever patterns critical for CLABSI)
-- ============================================================================

-- Patient 1: Fever spike coinciding with positive culture
INSERT INTO SILVER.VITALS (vital_id, patient_id, encounter_id, recorded_datetime, vital_type, vital_value, vital_unit, temperature, temperature_unit)
VALUES
    ('VIT001_001', 'PAT001', 'ENC001', '2024-01-15 06:00:00', 'TEMP', 101.8, 'F', 101.8, 'F'),
    ('VIT001_002', 'PAT001', 'ENC001', '2024-01-15 12:00:00', 'TEMP', 102.4, 'F', 102.4, 'F'),
    ('VIT001_003', 'PAT001', 'ENC001', '2024-01-15 18:00:00', 'TEMP', 103.1, 'F', 103.1, 'F'),
    ('VIT001_004', 'PAT001', 'ENC001', '2024-01-16 00:00:00', 'TEMP', 101.2, 'F', 101.2, 'F');

-- Patient 2: No fever
INSERT INTO SILVER.VITALS (vital_id, patient_id, encounter_id, recorded_datetime, vital_type, vital_value, vital_unit, temperature, temperature_unit)
VALUES
    ('VIT002_001', 'PAT002', 'ENC002', '2024-01-14 08:00:00', 'TEMP', 98.6, 'F', 98.6, 'F'),
    ('VIT002_002', 'PAT002', 'ENC002', '2024-01-14 14:00:00', 'TEMP', 98.4, 'F', 98.4, 'F');

-- Patient 3: Low-grade fever
INSERT INTO SILVER.VITALS (vital_id, patient_id, encounter_id, recorded_datetime, vital_type, vital_value, vital_unit, temperature, temperature_unit)
VALUES
    ('VIT003_001', 'PAT003', 'ENC003', '2024-01-19 16:00:00', 'TEMP', 100.2, 'F', 100.2, 'F'),
    ('VIT003_002', 'PAT003', 'ENC003', '2024-01-19 22:00:00', 'TEMP', 100.6, 'F', 100.6, 'F');

-- Patient 4: High fever, incomplete monitoring
INSERT INTO SILVER.VITALS (vital_id, patient_id, encounter_id, recorded_datetime, vital_type, vital_value, vital_unit, temperature, temperature_unit)
VALUES
    ('VIT004_001', 'PAT004', 'ENC004', '2024-01-22 08:00:00', 'TEMP', 102.8, 'F', 102.8, 'F');

-- Patient 5: Borderline temperature
INSERT INTO SILVER.VITALS (vital_id, patient_id, encounter_id, recorded_datetime, vital_type, vital_value, vital_unit, temperature, temperature_unit)
VALUES
    ('VIT005_001', 'PAT005', 'ENC005', '2024-01-25 18:00:00', 'TEMP', 99.8, 'F', 99.8, 'F');

-- Patient 6: High fever with sepsis
INSERT INTO SILVER.VITALS (vital_id, patient_id, encounter_id, recorded_datetime, vital_type, vital_value, vital_unit, temperature, temperature_unit)
VALUES
    ('VIT006_001', 'PAT006', 'ENC006', '2024-01-28 22:00:00', 'TEMP', 104.2, 'F', 104.2, 'F'),
    ('VIT006_002', 'PAT006', 'ENC006', '2024-01-29 04:00:00', 'TEMP', 103.5, 'F', 103.5, 'F');
