-- ============================================================================
-- GOLD.INFECTION_RISK_FACTORS
-- Patient-encounter level risk factors for CLABSI
-- ============================================================================

CREATE OR REPLACE TABLE GOLD.INFECTION_RISK_FACTORS (
    risk_factor_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,

    -- Demographics
    age_at_admission INTEGER,
    age_category VARCHAR(20),  -- PEDIATRIC, ADULT, ELDERLY

    -- Clinical characteristics
    admission_diagnosis VARCHAR(500),
    admission_department VARCHAR(200),
    is_icu_admission BOOLEAN,
    icu_days INTEGER,

    -- Comorbidities
    has_immunosuppression BOOLEAN,
    has_malignancy BOOLEAN,
    has_diabetes BOOLEAN,
    has_renal_failure BOOLEAN,
    has_liver_disease BOOLEAN,

    -- Procedure risk factors
    has_tpn BOOLEAN,  -- Total parenteral nutrition
    has_hemodialysis BOOLEAN,
    has_surgery BOOLEAN,
    surgery_count INTEGER,

    -- Device factors
    central_line_count INTEGER,
    central_line_total_days INTEGER,
    has_multiple_lumens BOOLEAN,
    femoral_line_present BOOLEAN,  -- Higher infection risk

    -- Antibiotic exposure
    prior_antibiotic_use BOOLEAN,
    antibiotic_days_before_culture INTEGER,

    -- Calculated composite scores
    comorbidity_score INTEGER,  -- 0-10 scale
    procedural_risk_score INTEGER,  -- 0-10 scale
    overall_risk_score INTEGER,  -- 0-100 scale

    -- Calculated
    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);

CREATE INDEX idx_risk_patient ON GOLD.INFECTION_RISK_FACTORS(patient_id);
CREATE INDEX idx_risk_encounter ON GOLD.INFECTION_RISK_FACTORS(encounter_id);
