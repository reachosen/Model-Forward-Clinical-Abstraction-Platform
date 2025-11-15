-- ============================================================================
-- BUILD CLABSI LLM PAYLOADS
-- This script generates the LLM-ready payloads from GOLD layer tables
-- ============================================================================

CREATE OR REPLACE PROCEDURE GOLD_AI.BUILD_CLABSI_PAYLOADS(
    P_EPISODE_ID VARCHAR DEFAULT NULL,  -- If NULL, rebuilds all active episodes
    P_MODE VARCHAR DEFAULT 'INCREMENTAL'  -- INCREMENTAL or FULL
)
RETURNS VARCHAR
LANGUAGE SQL
AS
$$
DECLARE
    rows_processed INTEGER DEFAULT 0;
BEGIN

    -- Build payloads for each CLABSI episode
    MERGE INTO GOLD_AI.CLABSI_LLM_PAYLOADS AS target
    USING (
        WITH episode_base AS (
            SELECT
                e.episode_id,
                e.patient_id,
                e.encounter_id,
                p.mrn,
                DATEDIFF('year', p.date_of_birth, enc.admission_datetime) AS age,
                p.gender,
                enc.admission_datetime,
                enc.discharge_datetime,
                DATEDIFF('day', enc.admission_datetime,
                         COALESCE(enc.discharge_datetime, CURRENT_TIMESTAMP())) AS los_days,
                enc.department_name,
                e.episode_status,
                e.risk_score,
                e.risk_category
            FROM GOLD.CLABSI_EPISODES e
            JOIN SILVER.PATIENTS p ON e.patient_id = p.patient_id
            JOIN SILVER.ENCOUNTERS enc ON e.encounter_id = enc.encounter_id
            WHERE (P_EPISODE_ID IS NULL OR e.episode_id = P_EPISODE_ID)
              AND e.episode_status IN ('POTENTIAL', 'CONFIRMED', 'INDETERMINATE')
        ),

        -- Build signals array
        signals_array AS (
            SELECT
                t.episode_id,
                ARRAY_AGG(
                    OBJECT_CONSTRUCT(
                        'signal_id', t.timeline_id,
                        'signal_name', t.event_type,
                        'signal_type', t.event_category,
                        'value', t.event_description,
                        'severity', t.event_severity,
                        'rationale', COALESCE(t.event_details:rationale::STRING, ''),
                        'timestamp', t.event_datetime,
                        'source_table', 'CLINICAL_TIMELINE',
                        'source_id', t.timeline_id,
                        'confidence', COALESCE(t.significance_score / 10.0, 0.5)
                    )
                ) WITHIN GROUP (ORDER BY t.event_datetime) AS signals
            FROM GOLD.CLINICAL_TIMELINE t
            WHERE t.is_clabsi_relevant = TRUE
              AND (P_EPISODE_ID IS NULL OR t.episode_id = P_EPISODE_ID)
            GROUP BY t.episode_id
        ),

        -- Build timeline by phase
        timeline_array AS (
            SELECT
                t.episode_id,
                ARRAY_AGG(
                    OBJECT_CONSTRUCT(
                        'phase',
                        CASE
                            WHEN t.days_from_line_insertion < 0 THEN 'PRE_LINE'
                            WHEN t.days_from_line_insertion = 0 THEN 'LINE_PLACEMENT'
                            WHEN t.days_from_index_culture < 0 THEN 'MONITORING'
                            WHEN t.days_from_index_culture = 0 THEN 'CULTURE'
                            ELSE 'POST_CULTURE'
                        END,
                        'events', ARRAY_AGG(
                            OBJECT_CONSTRUCT(
                                'event_id', t.timeline_id,
                                'event_datetime', t.event_datetime,
                                'event_type', t.event_type,
                                'description', t.event_description,
                                'severity', t.event_severity,
                                'relative_day', t.days_from_admission,
                                'details', t.event_details
                            ) WITHIN GROUP (ORDER BY t.event_datetime)
                        )
                    )
                ) AS timeline_phases
            FROM GOLD.CLINICAL_TIMELINE t
            WHERE (P_EPISODE_ID IS NULL OR t.episode_id = P_EPISODE_ID)
            GROUP BY t.episode_id
        )

        -- Construct full payload
        SELECT
            CONCAT('PAYLOAD_', eb.episode_id) AS payload_id,
            eb.patient_id,
            eb.encounter_id,
            eb.episode_id,

            -- Build complete JSON payload
            OBJECT_CONSTRUCT(
                'metadata', OBJECT_CONSTRUCT(
                    'patient_id', eb.patient_id,
                    'encounter_id', eb.encounter_id,
                    'episode_id', eb.episode_id,
                    'mrn', eb.mrn,
                    'age', eb.age,
                    'gender', eb.gender,
                    'admission_date', eb.admission_datetime,
                    'discharge_date', eb.discharge_datetime,
                    'los_days', eb.los_days,
                    'department', eb.department_name
                ),

                'signals', COALESCE(sig.signals, ARRAY_CONSTRUCT()),

                'timelines', COALESCE(tl.timeline_phases, ARRAY_CONSTRUCT()),

                'note_bundles', ARRAY_CONSTRUCT(),  -- Simplified for now

                'rule_flags', OBJECT_CONSTRUCT(
                    'has_central_line', TRUE,
                    'at_risk', eb.risk_category IN ('HIGH', 'MODERATE'),
                    'suspected_clabsi', eb.episode_status = 'POTENTIAL',
                    'confirmed_clabsi', eb.episode_status = 'CONFIRMED'
                ),

                'metrics', OBJECT_CONSTRUCT(
                    'risk_score', eb.risk_score
                ),

                'follow_up_questions', ARRAY_CONSTRUCT(),

                'abstraction_hints', OBJECT_CONSTRUCT(
                    'likely_outcome', eb.episode_status,
                    'key_decision_points', ARRAY_CONSTRUCT()
                )
            ) AS payload,

            -- Flattened fields
            ARRAY_SIZE(COALESCE(sig.signals, ARRAY_CONSTRUCT())) > 0 AS has_clabsi_signals,
            ARRAY_SIZE(COALESCE(sig.signals, ARRAY_CONSTRUCT())) AS signal_count,
            eb.risk_category AS risk_level,

            -- Content hash
            SHA2(TO_JSON(OBJECT_CONSTRUCT('episode_id', eb.episode_id, 'version', CURRENT_TIMESTAMP()))) AS payload_hash,

            CURRENT_TIMESTAMP() AS generated_at

        FROM episode_base eb
        LEFT JOIN signals_array sig ON eb.episode_id = sig.episode_id
        LEFT JOIN timeline_array tl ON eb.episode_id = tl.episode_id

    ) AS source
    ON target.episode_id = source.episode_id

    WHEN MATCHED AND P_MODE = 'FULL' THEN
        UPDATE SET
            payload = source.payload,
            has_clabsi_signals = source.has_clabsi_signals,
            signal_count = source.signal_count,
            risk_level = source.risk_level,
            payload_hash = source.payload_hash,
            generated_at = source.generated_at

    WHEN NOT MATCHED THEN
        INSERT (
            payload_id, patient_id, encounter_id, episode_id,
            payload, has_clabsi_signals, signal_count, risk_level,
            payload_hash, generated_at
        )
        VALUES (
            source.payload_id, source.patient_id, source.encounter_id, source.episode_id,
            source.payload, source.has_clabsi_signals, source.signal_count, source.risk_level,
            source.payload_hash, source.generated_at
        );

    rows_processed := SQLROWCOUNT;

    RETURN 'Processed ' || rows_processed || ' payloads';
END;
$$;
