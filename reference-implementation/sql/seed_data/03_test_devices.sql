-- ============================================================================
-- TEST DATA: DEVICES (Central Lines)
-- ============================================================================

INSERT INTO SILVER.DEVICES (
    device_id, patient_id, encounter_id,
    device_type, device_subtype, device_name,
    insertion_datetime, removal_datetime,
    insertion_site, laterality,
    inserting_provider_id, removing_provider_id,
    device_status, removal_reason
)
VALUES
    -- Patient 1: Central line placed, removed after infection
    ('DEV001', 'PAT001', 'ENC001',
     'CENTRAL_LINE', 'TRIPLE_LUMEN', 'Triple Lumen Central Venous Catheter',
     '2024-01-10 16:00:00', '2024-01-20 10:00:00',
     'SUBCLAVIAN', 'RIGHT',
     'PROV006', 'PROV006',
     'REMOVED', 'Suspected line infection'),

    -- Patient 2: Central line, routine removal
    ('DEV002', 'PAT002', 'ENC002',
     'CENTRAL_LINE', 'DOUBLE_LUMEN', 'Double Lumen Central Venous Catheter',
     '2024-01-12 09:30:00', '2024-01-17 14:00:00',
     'JUGULAR', 'RIGHT',
     'PROV007', 'PROV007',
     'REMOVED', 'No longer needed'),

    -- Patient 3: PICC line
    ('DEV003', 'PAT003', 'ENC003',
     'PICC', 'SINGLE_LUMEN', 'Peripherally Inserted Central Catheter',
     '2024-01-16 11:00:00', '2024-02-01 09:00:00',
     'BASILIC_VEIN', 'LEFT',
     'PROV008', 'PROV008',
     'REMOVED', 'Therapy completed'),

    -- Patient 4: Central line, incomplete documentation
    ('DEV004', 'PAT004', 'ENC004',
     'CENTRAL_LINE', 'TRIPLE_LUMEN', 'Triple Lumen Central Venous Catheter',
     '2024-01-19 01:00:00', NULL,
     'FEMORAL', 'RIGHT',
     'PROV006', NULL,
     'IN_PLACE', NULL),

    -- Patient 5: Central line with possible contamination
    ('DEV005', 'PAT005', 'ENC005',
     'CENTRAL_LINE', 'QUAD_LUMEN', 'Quad Lumen Dialysis Catheter',
     '2024-01-20 05:00:00', '2024-02-04 08:00:00',
     'JUGULAR', 'RIGHT',
     'PROV007', 'PROV007',
     'REMOVED', 'Routine change'),

    -- Patient 6: Multiple lines (complex case)
    ('DEV006A', 'PAT006', 'ENC006',
     'CENTRAL_LINE', 'TRIPLE_LUMEN', 'Triple Lumen Central Venous Catheter',
     '2024-01-22 20:00:00', '2024-01-30 12:00:00',
     'SUBCLAVIAN', 'LEFT',
     'PROV006', 'PROV006',
     'REMOVED', 'Infection suspected'),

    ('DEV006B', 'PAT006', 'ENC006',
     'PICC', 'DOUBLE_LUMEN', 'Peripherally Inserted Central Catheter',
     '2024-01-30 14:00:00', '2024-02-09 10:00:00',
     'BASILIC_VEIN', 'RIGHT',
     'PROV008', 'PROV008',
     'REMOVED', 'No longer needed');
