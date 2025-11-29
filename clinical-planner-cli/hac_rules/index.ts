/**
 * HAC Rule Set Definitions
 *
 * Structured clinical rules for Hospital-Acquired Conditions (HACs)
 * based on NHSN surveillance definitions, adapted for pediatric populations.
 *
 * These rule sets are designed for:
 * - Freestanding pediatric hospitals
 * - Solutions for Patient Safety (SPS) collaborative reporting
 * - Age-appropriate criteria (neonates, infants, children, adolescents)
 */

export interface HacRuleCriterion {
  id: string;
  name: string;
  description: string;
  type: 'inclusion' | 'exclusion';
  /**
   * Age applicability for pediatric-specific rules
   */
  age_range?: {
    min_days?: number;
    max_days?: number;
    label?: string; // e.g., "neonate", "infant", "child", "adolescent"
  };
  /**
   * Required data elements to evaluate this criterion
   */
  required_signals?: string[];
  /**
   * Logic expression (simplified for now, could be expanded to AST)
   */
  logic?: string;
  /**
   * Clinical rationale or reference
   */
  rationale?: string;
}

export interface HacRuleSet {
  id: 'CLABSI' | 'CAUTI' | 'VAP_VAE' | 'SSI';
  version: string;
  framework: 'NHSN' | 'SPS' | 'CUSTOM';
  /**
   * Pediatric-specific adaptations or notes
   */
  pediatric_notes?: string;
  criteria: HacRuleCriterion[];
  /**
   * Surveillance window definitions
   */
  surveillance_windows?: {
    device_days_minimum?: number;
    infection_window_days?: number;
    post_removal_days?: number;
  };
}

/**
 * Get HAC rule set by ID
 */
export function getHacRuleSet(hacId: 'CLABSI' | 'CAUTI' | 'VAP_VAE' | 'SSI'): HacRuleSet {
  const ruleSets: Record<string, HacRuleSet> = {
    CLABSI: getCLABSIRuleSet(),
    CAUTI: getCAUTIRuleSet(),
    VAP_VAE: getVAPVAERuleSet(),
    SSI: getSSIRuleSet()
  };

  return ruleSets[hacId];
}

/**
 * CLABSI Rule Set - Pediatric-adapted NHSN criteria
 */
function getCLABSIRuleSet(): HacRuleSet {
  return {
    id: 'CLABSI',
    version: 'NHSN_2025_PEDIATRIC',
    framework: 'NHSN',
    pediatric_notes: 'Adapted for pediatric populations including neonates in NICU. Age-specific pathogen interpretation and weight-based antimicrobial considerations.',
    surveillance_windows: {
      device_days_minimum: 2,
      infection_window_days: 2,
      post_removal_days: 1
    },
    criteria: [
      {
        id: 'CLABSI_INC_1',
        name: 'Central Line Presence',
        description: 'Patient has a central line in place for >2 calendar days on the date of event, with day 1 being the day the device was placed',
        type: 'inclusion',
        required_signals: ['central_line_insertion_date', 'central_line_type', 'device_days'],
        logic: 'device_days >= 2 AND line_present_on_doe',
        rationale: 'NHSN requires minimum 2 days of central line exposure to attribute BSI to the line'
      },
      {
        id: 'CLABSI_INC_2A',
        name: 'Recognized Pathogen from Blood',
        description: 'Patient has a recognized bacterial or fungal pathogen identified from one or more blood specimens by culture or non-culture based microbiologic testing method',
        type: 'inclusion',
        required_signals: ['blood_culture_organism', 'blood_culture_date', 'specimen_source'],
        logic: 'recognized_pathogen = true AND blood_culture_positive = true',
        rationale: 'Single positive blood culture with recognized pathogen (e.g., S. aureus, E. coli, Candida) is sufficient'
      },
      {
        id: 'CLABSI_INC_2B',
        name: 'Common Commensal - Pediatric Criteria',
        description: 'Patient has common commensal organism identified from two or more blood specimens drawn on separate occasions within 2 days. Pediatric consideration: evaluate for contaminant vs true pathogen based on clinical context.',
        type: 'inclusion',
        required_signals: ['blood_culture_organism', 'blood_culture_date', 'multiple_specimens'],
        logic: 'common_commensal = true AND blood_cultures >= 2 AND time_between_cultures <= 2_days AND clinical_signs_present = true',
        rationale: 'Common commensals (CoNS, Bacillus, Propionibacterium) require >=2 separate draws. In neonates, even single CoNS may be clinically significant; review with SME.'
      },
      {
        id: 'CLABSI_INC_3',
        name: 'Infection Window Timing',
        description: 'Positive blood culture is collected during the infection window period (day of device placement through day after device removal)',
        type: 'inclusion',
        required_signals: ['blood_culture_date', 'line_insertion_date', 'line_removal_date'],
        logic: 'culture_date >= (insertion_date + 2_days) AND culture_date <= (removal_date + 1_day)',
        rationale: 'NHSN infection window extends 1 day after line removal'
      },
      {
        id: 'CLABSI_EXC_1',
        name: 'Alternate Primary Source Identified',
        description: 'An alternate anatomic site infection with matching organism is identified and is the likely primary source of the bloodstream infection',
        type: 'exclusion',
        required_signals: ['primary_source_identified', 'matching_organism_site'],
        logic: 'alternate_source_present = true AND organism_matches = true',
        rationale: 'If UTI, pneumonia, or other site infection explains the BSI, it is not attributed to the central line'
      },
      {
        id: 'CLABSI_EXC_2',
        name: 'Infection Present on Admission (POA)',
        description: 'Positive blood culture drawn <=2 days after central line insertion and clinical evidence suggests infection was present on admission',
        type: 'exclusion',
        required_signals: ['admission_date', 'line_insertion_date', 'culture_date', 'poa_indicator'],
        logic: 'culture_date <= (insertion_date + 2_days) AND poa_documented = true',
        rationale: 'CLABSI must be hospital-acquired, not present on admission. Early cultures may represent POA infections.'
      },
      {
        id: 'CLABSI_PEDIATRIC_1',
        name: 'Neonatal TPN Consideration',
        description: 'For NICU patients on total parenteral nutrition (TPN) via central line, increased vigilance for fungal CLABSI (especially Candida species)',
        type: 'inclusion',
        required_signals: ['patient_age_days', 'tpn_status', 'blood_culture_organism'],
        age_range: {
          min_days: 0,
          max_days: 90,
          label: 'neonate'
        },
        logic: 'age_days <= 90 AND tpn_active = true AND fungal_organism = true',
        rationale: 'Neonates on TPN have elevated CLABSI risk, particularly for Candida. Early recognition critical for outcomes.'
      },
      {
        id: 'CLABSI_PEDIATRIC_2',
        name: 'Immunocompromised Pediatric Patient',
        description: 'Oncology/immunocompromised patients may have atypical organisms or lower threshold for clinical significance',
        type: 'inclusion',
        required_signals: ['immunocompromised_status', 'oncology_patient'],
        logic: 'immunocompromised = true OR oncology = true',
        rationale: 'Immunocompromised children at higher risk; even single common commensal may be significant. Requires clinical judgment.'
      }
    ]
  };
}

/**
 * CAUTI Rule Set - Pediatric-adapted NHSN criteria
 */
function getCAUTIRuleSet(): HacRuleSet {
  return {
    id: 'CAUTI',
    version: 'NHSN_2025_PEDIATRIC',
    framework: 'NHSN',
    pediatric_notes: 'Pediatric CAUTI surveillance includes age-specific urine culture thresholds and symptom interpretation. Developmentally appropriate symptom assessment required.',
    surveillance_windows: {
      device_days_minimum: 2,
      infection_window_days: 7,
      post_removal_days: 2
    },
    criteria: [
      {
        id: 'CAUTI_INC_1',
        name: 'Indwelling Urinary Catheter Presence',
        description: 'Patient has an indwelling urinary catheter in place for >2 calendar days on the date of event, with day 1 being the day the catheter was placed',
        type: 'inclusion',
        required_signals: ['catheter_insertion_date', 'catheter_type', 'catheter_days'],
        logic: 'catheter_days >= 2 AND catheter_present_on_doe',
        rationale: 'NHSN requires minimum 2 days of catheter exposure'
      },
      {
        id: 'CAUTI_INC_2',
        name: 'Specimen Collection Timing',
        description: 'Urine specimen for culture was collected within the catheter-associated infection window (catheter in place or removed within 2 days)',
        type: 'inclusion',
        required_signals: ['urine_culture_date', 'catheter_insertion_date', 'catheter_removal_date'],
        logic: 'culture_date >= insertion_date AND culture_date <= (removal_date + 2_days)',
        rationale: 'Specimen must be collected while catheter is in place or within 2 days of removal'
      },
      {
        id: 'CAUTI_INC_3A',
        name: 'Positive Urine Culture - Pediatric >=1 year',
        description: 'Urine culture shows >=10^5 CFU/mL of <=2 bacterial species. For children >=1 year old.',
        type: 'inclusion',
        age_range: {
          min_days: 365,
          label: 'child/adolescent >=1 year'
        },
        required_signals: ['urine_culture_result', 'colony_count', 'organism_count', 'patient_age_days'],
        logic: 'age_days >= 365 AND colony_count >= 100000 AND organism_species <= 2',
        rationale: 'Standard NHSN threshold for pediatric patients >=1 year'
      },
      {
        id: 'CAUTI_INC_3B',
        name: 'Positive Urine Culture - Pediatric <1 year',
        description: 'Urine culture shows >=10^5 CFU/mL of <=2 bacterial species OR any growth of single uropathogen in catheterized specimen. For infants <1 year.',
        type: 'inclusion',
        age_range: {
          min_days: 0,
          max_days: 364,
          label: 'infant <1 year'
        },
        required_signals: ['urine_culture_result', 'colony_count', 'organism_count', 'patient_age_days'],
        logic: 'age_days < 365 AND ((colony_count >= 100000 AND organism_species <= 2) OR (organism_species = 1 AND uropathogen = true))',
        rationale: 'Infants may have lower colony counts that are clinically significant, especially with known uropathogens'
      },
      {
        id: 'CAUTI_INC_4A',
        name: 'Compatible Symptoms - Verbal Patients',
        description: 'Patient has at least one of: fever (>38.0°C), suprapubic tenderness, costovertebral angle pain/tenderness, dysuria, urgency, frequency. For patients who can communicate symptoms.',
        type: 'inclusion',
        age_range: {
          min_days: 1095, // ~3 years
          label: 'verbal child/adolescent'
        },
        required_signals: ['fever', 'suprapubic_tenderness', 'cva_tenderness', 'dysuria', 'urgency', 'frequency'],
        logic: 'fever > 38.0 OR suprapubic_tenderness = true OR cva_tenderness = true OR dysuria = true OR urgency = true OR frequency = true',
        rationale: 'Standard UTI symptoms for patients able to report subjective symptoms'
      },
      {
        id: 'CAUTI_INC_4B',
        name: 'Compatible Symptoms - Nonverbal/Infant Patients',
        description: 'Patient has at least one of: fever (>38.0°C), hypothermia (<36.0°C for neonates), irritability, lethargy, vomiting. For patients unable to communicate symptoms.',
        type: 'inclusion',
        age_range: {
          min_days: 0,
          max_days: 1095, // ~3 years
          label: 'nonverbal infant/toddler'
        },
        required_signals: ['fever', 'hypothermia', 'irritability', 'lethargy', 'vomiting'],
        logic: 'fever > 38.0 OR hypothermia < 36.0 OR irritability = true OR lethargy = true OR vomiting = true',
        rationale: 'Nonverbal children require age-appropriate symptom interpretation; may present with nonspecific findings'
      },
      {
        id: 'CAUTI_EXC_1',
        name: 'Specimen from Diaper or Bag Collection',
        description: 'Urine specimen collected via bag collection or diaper sample (not catheterized specimen)',
        type: 'exclusion',
        required_signals: ['specimen_collection_method'],
        logic: 'collection_method IN ["bag", "diaper", "clean_catch_unreliable"]',
        rationale: 'NHSN CAUTI requires catheterized specimen; bag/diaper specimens have high contamination rates'
      },
      {
        id: 'CAUTI_EXC_2',
        name: 'Asymptomatic Bacteriuria',
        description: 'Positive culture without compatible clinical signs or symptoms',
        type: 'exclusion',
        required_signals: ['symptoms_present'],
        logic: 'symptoms_present = false',
        rationale: 'CAUTI requires both positive culture AND symptoms; asymptomatic bacteriuria is not reportable'
      },
      {
        id: 'CAUTI_PEDIATRIC_1',
        name: 'Congenital Urinary Anomaly Consideration',
        description: 'Patient with known congenital urinary tract anomaly (vesicoureteral reflux, neurogenic bladder, posterior urethral valves) - may have baseline colonization',
        type: 'inclusion',
        required_signals: ['urinary_anomaly', 'baseline_cultures'],
        logic: 'urinary_anomaly = true',
        rationale: 'Children with urinary anomalies may have chronic colonization; compare organism to baseline and assess for clinical change'
      }
    ]
  };
}

/**
 * VAP/VAE Rule Set - Pediatric-adapted NHSN criteria
 */
function getVAPVAERuleSet(): HacRuleSet {
  return {
    id: 'VAP_VAE',
    version: 'NHSN_2025_PEDIATRIC_VAE',
    framework: 'NHSN',
    pediatric_notes: 'Pediatric VAE surveillance uses age-specific FiO2/PEEP thresholds and oxygenation criteria. Tiered approach: VAC → IVAC → Possible/Probable VAP.',
    surveillance_windows: {
      device_days_minimum: 2,
      infection_window_days: 14
    },
    criteria: [
      {
        id: 'VAE_INC_1',
        name: 'Mechanical Ventilation Baseline',
        description: 'Patient on mechanical ventilation for >=2 calendar days, with day 1 being the day of intubation. Baseline period of stability or improvement required.',
        type: 'inclusion',
        required_signals: ['intubation_date', 'ventilator_days', 'baseline_peep', 'baseline_fio2'],
        logic: 'ventilator_days >= 2 AND baseline_period_stable >= 2_days',
        rationale: 'NHSN VAE requires >=2 days baseline stability to detect worsening'
      },
      {
        id: 'VAC_INC_1',
        name: 'Ventilator-Associated Condition (VAC) - Worsening Oxygenation',
        description: 'After >=2 days of stable/improving oxygenation (FiO2 or PEEP), sustained increase in FiO2 >=0.20 (20 points) or PEEP >=3 cm H2O for >=2 days',
        type: 'inclusion',
        required_signals: ['daily_min_fio2', 'daily_min_peep', 'worsening_start_date'],
        logic: '(delta_fio2 >= 0.20 OR delta_peep >= 3) AND sustained_days >= 2',
        rationale: 'VAC tier 1: objective worsening of oxygenation suggesting pulmonary complication'
      },
      {
        id: 'IVAC_INC_1',
        name: 'Infection-related VAC (IVAC) - Temperature Criterion',
        description: 'On or within 2 days before/after worsening oxygenation: temperature <36°C or >38°C',
        type: 'inclusion',
        required_signals: ['temperature', 'worsening_window'],
        logic: '(temp < 36.0 OR temp > 38.0) AND within_ivac_window = true',
        rationale: 'IVAC tier 2: adds infectious signs to VAC'
      },
      {
        id: 'IVAC_INC_2',
        name: 'IVAC - WBC Criterion',
        description: 'On or within 2 days before/after worsening: WBC <=4,000 or >=12,000 cells/mm³. Pediatric note: age-appropriate WBC ranges vary.',
        type: 'inclusion',
        age_range: {
          min_days: 365, // >=1 year use standard thresholds
          label: 'child/adolescent'
        },
        required_signals: ['wbc_count', 'worsening_window'],
        logic: '(wbc <= 4000 OR wbc >= 12000) AND within_ivac_window = true',
        rationale: 'Standard adult/child WBC criteria. For neonates/infants, use age-adjusted normal ranges.'
      },
      {
        id: 'IVAC_INC_3',
        name: 'IVAC - New Antimicrobial Agent',
        description: 'New antimicrobial agent started and continued for >=4 qualifying antimicrobial days (QAD) within infection window',
        type: 'inclusion',
        required_signals: ['antimicrobial_start_date', 'antimicrobial_qad', 'worsening_window'],
        logic: 'new_abx_started = true AND qad >= 4 AND within_ivac_window = true',
        rationale: 'IVAC requires new treatment suggesting clinician concern for infection'
      },
      {
        id: 'PVAP_INC_1',
        name: 'Possible VAP (PVAP) - Positive Respiratory Culture',
        description: 'Positive culture or PCR from respiratory specimen (sputum, BAL, mini-BAL, tracheal aspirate) collected on or within 2 days before/after VAC onset',
        type: 'inclusion',
        required_signals: ['respiratory_culture_result', 'respiratory_specimen_type', 'worsening_window'],
        logic: 'respiratory_culture_positive = true AND within_pvap_window = true',
        rationale: 'PVAP tier 3: adds microbiologic evidence of pulmonary infection'
      },
      {
        id: 'PVAP_INC_2',
        name: 'Probable VAP - Purulent Secretions',
        description: 'In addition to positive culture: purulent respiratory secretions documented (from endotracheal aspirate, sputum) within VAP window',
        type: 'inclusion',
        required_signals: ['respiratory_culture_result', 'purulent_secretions', 'secretion_description'],
        logic: 'respiratory_culture_positive = true AND purulent_secretions = true',
        rationale: 'Probable VAP: adds clinical evidence (purulent secretions) to microbiologic findings'
      },
      {
        id: 'VAE_EXC_1',
        name: 'Exclusion - Temporary PEEP Increase',
        description: 'PEEP increase is temporary (e.g., for procedure, suctioning) and returns to baseline within same day',
        type: 'exclusion',
        required_signals: ['peep_reason', 'peep_duration'],
        logic: 'peep_increase_temporary = true AND duration_hours < 24',
        rationale: 'Exclude transient procedural changes; VAE requires sustained worsening'
      },
      {
        id: 'VAE_PEDIATRIC_1',
        name: 'Pediatric Oxygenation Index (OI) Consideration',
        description: 'For pediatric patients, may use Oxygenation Index (OI = MAP × FiO2 / PaO2 × 100) or OSI (SpO2-based) to assess severity, especially in complex cases',
        type: 'inclusion',
        age_range: {
          min_days: 0,
          max_days: 6570, // <18 years
          label: 'pediatric'
        },
        required_signals: ['oxygenation_index', 'mean_airway_pressure', 'pao2', 'spo2'],
        logic: 'OI_calculated = true OR OSI_calculated = true',
        rationale: 'Pediatric critical care often uses OI/OSI for oxygenation assessment; complements FiO2/PEEP criteria'
      },
      {
        id: 'VAE_PEDIATRIC_2',
        name: 'Neonatal VAE Considerations',
        description: 'Neonates (especially preterm) may have baseline ventilator changes due to lung immaturity, apnea, or developmental factors. Review with clinical context.',
        type: 'inclusion',
        age_range: {
          min_days: 0,
          max_days: 90,
          label: 'neonate'
        },
        required_signals: ['gestational_age', 'corrected_age', 'apnea_events'],
        logic: 'age_days <= 90',
        rationale: 'Neonatal ventilation patterns differ from older children; VAE surveillance in NICU requires careful clinical correlation'
      }
    ]
  };
}

/**
 * SSI Rule Set - Pediatric-adapted NHSN criteria
 */
function getSSIRuleSet(): HacRuleSet {
  return {
    id: 'SSI',
    version: 'NHSN_2025_PEDIATRIC',
    framework: 'NHSN',
    pediatric_notes: 'Pediatric SSI surveillance includes age-specific wound healing considerations and common pediatric surgical procedures.',
    surveillance_windows: {
      infection_window_days: 30 // or 90 for implant procedures
    },
    criteria: [
      {
        id: 'SSI_INC_1',
        name: 'Surgical Procedure Performed',
        description: 'Patient underwent an NHSN operative procedure with documented incision',
        type: 'inclusion',
        required_signals: ['procedure_date', 'procedure_code', 'incision_type'],
        logic: 'nhsn_procedure = true AND incision_documented = true',
        rationale: 'SSI surveillance requires documented operative procedure'
      },
      {
        id: 'SSI_INC_2',
        name: 'Infection Within Surveillance Window',
        description: 'Infection occurs within 30 days of procedure (or 90 days if implant placed)',
        type: 'inclusion',
        required_signals: ['procedure_date', 'infection_date', 'implant_placed'],
        logic: 'infection_date <= (procedure_date + 30_days) OR (implant_placed = true AND infection_date <= (procedure_date + 90_days))',
        rationale: 'NHSN surveillance window: 30 days standard, 90 days for implants'
      },
      {
        id: 'SSI_SUPERFICIAL_1',
        name: 'Superficial Incisional SSI - Signs/Symptoms',
        description: 'Involves only skin and subcutaneous tissue with at least one: purulent drainage, organism from fluid/tissue, pain/tenderness/swelling/redness/heat, surgeon diagnosis',
        type: 'inclusion',
        required_signals: ['incision_depth', 'purulent_drainage', 'wound_culture', 'local_signs', 'surgeon_diagnosis'],
        logic: 'depth = "superficial" AND (purulent_drainage = true OR culture_positive = true OR local_signs = true OR surgeon_diagnosis = true)',
        rationale: 'Superficial SSI: limited to skin/subcutaneous tissue'
      },
      {
        id: 'SSI_DEEP_1',
        name: 'Deep Incisional SSI',
        description: 'Involves deep soft tissues (fascial/muscle layers) with fever, localized pain/tenderness, AND purulent drainage or dehiscence or abscess or organism isolated',
        type: 'inclusion',
        required_signals: ['incision_depth', 'fever', 'deep_pain', 'purulent_drainage', 'dehiscence', 'abscess', 'deep_culture'],
        logic: 'depth = "deep" AND (fever = true OR deep_pain = true) AND (purulent_drainage = true OR dehiscence = true OR abscess = true OR deep_culture_positive = true)',
        rationale: 'Deep SSI: involves fascial/muscle layers, more severe than superficial'
      },
      {
        id: 'SSI_ORGAN_SPACE_1',
        name: 'Organ/Space SSI',
        description: 'Involves any part of the body deeper than fascial/muscle layers opened or manipulated during procedure, with purulent drainage, abscess, or positive culture',
        type: 'inclusion',
        required_signals: ['infection_site', 'purulent_drainage', 'abscess', 'organ_culture'],
        logic: 'site = "organ_space" AND (purulent_drainage = true OR abscess = true OR organ_culture_positive = true)',
        rationale: 'Organ/space SSI: most serious tier, involves body cavity or organ'
      },
      {
        id: 'SSI_EXC_1',
        name: 'Exclusion - Stitch Abscess',
        description: 'Minimal inflammation and discharge confined to suture points',
        type: 'exclusion',
        required_signals: ['infection_type', 'inflammation_extent'],
        logic: 'infection_type = "stitch_abscess" AND minimal_inflammation = true',
        rationale: 'Stitch abscesses are not reportable SSIs per NHSN'
      },
      {
        id: 'SSI_PEDIATRIC_1',
        name: 'Pediatric Surgical Procedures',
        description: 'Common pediatric procedures: appendectomy, hernia repair, spinal fusion, cardiac surgery, neurosurgery. Age-appropriate healing timeline.',
        type: 'inclusion',
        age_range: {
          min_days: 0,
          max_days: 6570, // <18 years
          label: 'pediatric'
        },
        required_signals: ['procedure_type', 'patient_age_days'],
        logic: 'age_days < 6570',
        rationale: 'Pediatric patients have different baseline healing rates and procedure types than adults'
      }
    ]
  };
}
