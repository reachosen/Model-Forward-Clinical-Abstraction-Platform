/**
 * Discovery Agent
 *
 * Helps discover candidate phases and signals for new archetype/domain combinations.
 * This is a "first-time setup" mode that uses LLM or heuristics to propose
 * phases and signals that can then be curated by SMEs.
 *
 * Flow: Discovery → Curation → Library
 */

import { PlanningInput } from '../models/PlanningInput';

export interface SignalDiscoveryOutput {
  archetype: string;
  domain: string;
  phases: Array<{
    id: string;
    name: string;
    description?: string;
    timing?: string; // 'pre_event' | 'peri_event' | 'post_event' | 'surveillance'
    typical_duration_days?: number;
  }>;
  candidate_signals: Array<{
    id: string;
    name: string;
    category?: string; // 'device' | 'vital' | 'lab' | 'micro' | 'vent_setting' | 'note' | etc.
    phase_id?: string;
    priority?: 'core' | 'supporting' | 'optional';
    rationale?: string;
    example_source_hint?: string; // e.g., "device days table", "flowsheet", "lab table"
    follow_up_questions?: string[]; // what the SME might ask about this signal
  }>;
  metadata: {
    discovery_method: 'mock' | 'llm' | 'hybrid';
    confidence: number;
    generated_at: string;
    notes?: string;
  };
}

/**
 * Discover signals and phases for a given archetype/domain combination
 */
export async function discoverSignals(
  input: PlanningInput,
  useMock: boolean = true
): Promise<SignalDiscoveryOutput> {
  const archetype = input.archetype || 'UNKNOWN';
  const domain = typeof input.domain === 'string' ? input.domain : (input.domain?.name || 'general');
  const concernId = input.concern_id || '';

  if (useMock) {
    return discoverSignalsMock(archetype, domain, concernId, input);
  } else {
    // Future: LLM-based discovery
    throw new Error('LLM-based discovery not yet implemented. Use mock mode.');
  }
}

/**
 * Mock discovery using pattern-based heuristics
 */
function discoverSignalsMock(
  archetype: string,
  domain: string,
  concernId: string,
  input: PlanningInput
): SignalDiscoveryOutput {
  const isPediatric = domain.includes('pediatric') || domain.includes('nicu') || domain.includes('picu');

  // Generate phases based on archetype
  const phases = generateDiscoveryPhases(archetype, concernId, domain);

  // Generate candidate signals based on archetype + domain
  const candidate_signals = generateDiscoverySignals(archetype, concernId, domain, phases);

  return {
    archetype,
    domain,
    phases,
    candidate_signals,
    metadata: {
      discovery_method: 'mock',
      confidence: 0.75,
      generated_at: new Date().toISOString(),
      notes: isPediatric
        ? 'Pediatric-focused discovery. Signals include age-appropriate vital signs, weight-based dosing considerations.'
        : 'General discovery output. Review for domain-specific adjustments.'
    }
  };
}

/**
 * Generate discovery phases
 */
function generateDiscoveryPhases(
  archetype: string,
  concernId: string,
  domain: string
): SignalDiscoveryOutput['phases'] {
  // HAC-style phases (device-associated infections)
  if (archetype.includes('CLABSI') || archetype.includes('CAUTI') || concernId === 'CLABSI' || concernId === 'CAUTI') {
    return [
      {
        id: 'baseline',
        name: 'Baseline Period',
        description: 'Clinical status before device insertion',
        timing: 'pre_event',
        typical_duration_days: 1
      },
      {
        id: 'device_insertion',
        name: 'Device Insertion',
        description: 'Device placement and immediate post-insertion period',
        timing: 'peri_event',
        typical_duration_days: 1
      },
      {
        id: 'device_maintenance',
        name: 'Device Maintenance Period',
        description: 'Ongoing device days and care bundle compliance',
        timing: 'surveillance',
        typical_duration_days: 7
      },
      {
        id: 'infection_window',
        name: 'Infection Detection Window',
        description: 'Period during which device-associated infection may be detected',
        timing: 'surveillance',
        typical_duration_days: 2
      },
      {
        id: 'post_removal',
        name: 'Post-Removal Period',
        description: `Up to ${concernId === 'CLABSI' ? '1' : '2'} days after device removal`,
        timing: 'post_event',
        typical_duration_days: concernId === 'CLABSI' ? 1 : 2
      }
    ];
  }

  // VAP/VAE phases
  if (archetype.includes('VAP') || archetype.includes('VAE') || concernId === 'VAP' || concernId === 'VAE') {
    return [
      {
        id: 'intubation',
        name: 'Intubation',
        description: 'Mechanical ventilation initiation',
        timing: 'peri_event',
        typical_duration_days: 1
      },
      {
        id: 'baseline_stability',
        name: 'Baseline Stability Period',
        description: 'Minimum 2 days of stable/improving oxygenation required for VAE surveillance',
        timing: 'surveillance',
        typical_duration_days: 2
      },
      {
        id: 'worsening_oxygenation',
        name: 'Worsening Oxygenation',
        description: 'VAC detection: sustained increase in FiO2 or PEEP',
        timing: 'surveillance',
        typical_duration_days: 2
      },
      {
        id: 'infection_evaluation',
        name: 'Infection Evaluation (IVAC/PVAP)',
        description: 'Window for IVAC (infection signs + abx) and PVAP (positive culture) evaluation',
        timing: 'surveillance',
        typical_duration_days: 4
      },
      {
        id: 'extubation_recovery',
        name: 'Extubation and Recovery',
        description: 'Post-extubation period',
        timing: 'post_event',
        typical_duration_days: 1
      }
    ];
  }

  // USNWR surgical/procedural phases
  if (archetype.includes('ORTHO') || archetype.includes('CARDIO') || archetype.includes('NEURO') || concernId.startsWith('I')) {
    const procedureType = domain.includes('ortho') ? 'surgical' :
                         domain.includes('cardiac') || domain.includes('cardio') ? 'cardiac' :
                         domain.includes('neuro') ? 'neurological' : 'procedural';

    return [
      {
        id: 'pre_procedure',
        name: `Pre-${procedureType} Period`,
        description: 'Baseline assessment and preparation',
        timing: 'pre_event',
        typical_duration_days: 7
      },
      {
        id: 'intra_procedure',
        name: procedureType === 'surgical' ? 'Intra-operative' : 'During Procedure',
        description: `During ${procedureType} intervention`,
        timing: 'peri_event',
        typical_duration_days: 1
      },
      {
        id: 'acute_post_procedure',
        name: 'Acute Post-Procedure',
        description: 'Immediate post-procedure period (in-hospital)',
        timing: 'post_event',
        typical_duration_days: 3
      },
      {
        id: 'recovery',
        name: 'Recovery Period',
        description: 'Ongoing recovery and complication surveillance',
        timing: 'surveillance',
        typical_duration_days: 30
      }
    ];
  }

  // Default generic phases
  return [
    {
      id: 'baseline',
      name: 'Baseline',
      description: 'Pre-event clinical status',
      timing: 'pre_event',
      typical_duration_days: 1
    },
    {
      id: 'event',
      name: 'Event Period',
      description: 'Period of clinical significance',
      timing: 'peri_event',
      typical_duration_days: 1
    },
    {
      id: 'surveillance',
      name: 'Surveillance Period',
      description: 'Ongoing monitoring',
      timing: 'surveillance',
      typical_duration_days: 7
    }
  ];
}

/**
 * Generate discovery signals
 */
function generateDiscoverySignals(
  archetype: string,
  concernId: string,
  domain: string,
  phases: SignalDiscoveryOutput['phases']
): SignalDiscoveryOutput['candidate_signals'] {
  const signals: SignalDiscoveryOutput['candidate_signals'] = [];
  const isPediatric = domain.includes('pediatric') || domain.includes('nicu') || domain.includes('picu');

  // CLABSI-specific signals
  if (concernId === 'CLABSI' || archetype.includes('CLABSI')) {
    signals.push(
      {
        id: 'central_line_insertion_date',
        name: 'Central Line Insertion Date',
        category: 'device',
        phase_id: 'device_insertion',
        priority: 'core',
        rationale: 'Required for device days calculation and infection window attribution',
        example_source_hint: 'device days table, procedure notes',
        follow_up_questions: ['What EHR table/view contains line insertion dates?', 'Is there a device days mart?']
      },
      {
        id: 'central_line_type',
        name: 'Central Line Type',
        category: 'device',
        phase_id: 'device_insertion',
        priority: 'core',
        rationale: 'Differentiates PICC, non-tunneled CVC, tunneled CVC, port',
        example_source_hint: 'device table, procedure code',
        follow_up_questions: ['Are PICCs coded separately from CVCs?']
      },
      {
        id: 'central_line_site',
        name: 'Central Line Insertion Site',
        category: 'device',
        phase_id: 'device_insertion',
        priority: 'supporting',
        rationale: 'Femoral lines may have higher infection risk',
        example_source_hint: 'procedure notes, device table'
      },
      {
        id: 'blood_culture_collection_date',
        name: 'Blood Culture Collection Date/Time',
        category: 'micro',
        phase_id: 'infection_window',
        priority: 'core',
        rationale: 'Establishes date of event (DOE) for CLABSI',
        example_source_hint: 'microbiology lab table',
        follow_up_questions: ['Are blood culture collection times documented?', 'Is specimen source (peripheral vs central line) captured?']
      },
      {
        id: 'blood_culture_organism',
        name: 'Blood Culture Organism',
        category: 'micro',
        phase_id: 'infection_window',
        priority: 'core',
        rationale: 'Determines recognized pathogen vs common commensal',
        example_source_hint: 'microbiology results table',
        follow_up_questions: ['Are organisms standardized to NHSN organism list?']
      },
      {
        id: 'blood_culture_specimen_source',
        name: 'Blood Culture Specimen Source',
        category: 'micro',
        phase_id: 'infection_window',
        priority: 'supporting',
        rationale: 'Peripheral vs central line draw affects interpretation',
        example_source_hint: 'microbiology order, specimen table'
      }
    );

    if (isPediatric) {
      signals.push(
        {
          id: 'tpn_status',
          name: 'Total Parenteral Nutrition (TPN) Status',
          category: 'clinical',
          phase_id: 'device_maintenance',
          priority: 'core',
          rationale: 'Pediatric patients on TPN via central line have elevated CLABSI risk, especially for fungal infections',
          example_source_hint: 'pharmacy orders, nutrition table, medication admin',
          follow_up_questions: ['Is TPN documented in meds or orders?', 'Can we identify lipid-containing TPN?']
        },
        {
          id: 'patient_weight',
          name: 'Patient Weight (kg)',
          category: 'vital',
          phase_id: 'baseline',
          priority: 'supporting',
          rationale: 'Weight-based antimicrobial dosing for pediatric CLABSI treatment',
          example_source_hint: 'vitals flowsheet, admission assessment'
        },
        {
          id: 'immunocompromised_oncology',
          name: 'Immunocompromised/Oncology Status',
          category: 'clinical',
          phase_id: 'baseline',
          priority: 'core',
          rationale: 'Oncology patients have different risk profiles and pathogen susceptibility',
          example_source_hint: 'problem list, oncology service flag',
          follow_up_questions: ['Is there an oncology patient flag?', 'Are immunosuppressive meds documented?']
        }
      );
    }
  }

  // CAUTI-specific signals
  if (concernId === 'CAUTI' || archetype.includes('CAUTI')) {
    signals.push(
      {
        id: 'catheter_insertion_date',
        name: 'Urinary Catheter Insertion Date',
        category: 'device',
        phase_id: 'device_insertion',
        priority: 'core',
        rationale: 'Required for catheter days and infection window',
        example_source_hint: 'device days table, nursing documentation'
      },
      {
        id: 'catheter_type',
        name: 'Urinary Catheter Type',
        category: 'device',
        phase_id: 'device_insertion',
        priority: 'core',
        rationale: 'Foley vs suprapubic vs straight cath',
        example_source_hint: 'device table'
      },
      {
        id: 'urine_culture_collection_date',
        name: 'Urine Culture Collection Date',
        category: 'micro',
        phase_id: 'infection_window',
        priority: 'core',
        rationale: 'Must be within catheter-associated window',
        example_source_hint: 'microbiology lab table'
      },
      {
        id: 'urine_culture_organism',
        name: 'Urine Culture Organism',
        category: 'micro',
        phase_id: 'infection_window',
        priority: 'core',
        rationale: 'Must meet >=10^5 CFU/mL threshold for <=2 species',
        example_source_hint: 'microbiology results'
      },
      {
        id: 'urine_culture_colony_count',
        name: 'Urine Culture Colony Count (CFU/mL)',
        category: 'micro',
        phase_id: 'infection_window',
        priority: 'core',
        rationale: 'NHSN requires >=10^5 CFU/mL',
        example_source_hint: 'microbiology results',
        follow_up_questions: ['Are colony counts structured or free text?']
      },
      {
        id: 'urinalysis_wbc',
        name: 'Urinalysis WBC Count',
        category: 'lab',
        phase_id: 'infection_window',
        priority: 'supporting',
        rationale: 'Pyuria (>=10 WBC/hpf) supports UTI diagnosis',
        example_source_hint: 'lab results table'
      }
    );

    if (isPediatric) {
      signals.push(
        {
          id: 'patient_age_months',
          name: 'Patient Age (months)',
          category: 'clinical',
          phase_id: 'baseline',
          priority: 'core',
          rationale: 'Age <12 months may have different culture thresholds and symptom interpretation',
          example_source_hint: 'demographics, calculated from DOB'
        },
        {
          id: 'verbal_status',
          name: 'Verbal/Nonverbal Status',
          category: 'clinical',
          phase_id: 'baseline',
          priority: 'supporting',
          rationale: 'Affects symptom assessment (dysuria vs irritability)',
          example_source_hint: 'developmental milestones, age-based inference',
          follow_up_questions: ['Can we reliably determine if patient is verbal from age or nursing notes?']
        }
      );
    }
  }

  // VAP/VAE-specific signals
  if (concernId === 'VAP' || concernId === 'VAE' || archetype.includes('VAP') || archetype.includes('VAE')) {
    signals.push(
      {
        id: 'intubation_date',
        name: 'Intubation Date/Time',
        category: 'device',
        phase_id: 'intubation',
        priority: 'core',
        rationale: 'Day 1 of ventilator days',
        example_source_hint: 'respiratory therapy documentation, procedure notes'
      },
      {
        id: 'daily_minimum_fio2',
        name: 'Daily Minimum FiO2 (%)',
        category: 'vent_setting',
        phase_id: 'baseline_stability',
        priority: 'core',
        rationale: 'Required for VAC detection (sustained increase >=0.20)',
        example_source_hint: 'ventilator flowsheet, respiratory therapy charting',
        follow_up_questions: ['Are vent settings captured in flowsheet or separate RT system?', 'How to calculate daily minimum?']
      },
      {
        id: 'daily_minimum_peep',
        name: 'Daily Minimum PEEP (cm H2O)',
        category: 'vent_setting',
        phase_id: 'baseline_stability',
        priority: 'core',
        rationale: 'Required for VAC detection (sustained increase >=3 cm H2O)',
        example_source_hint: 'ventilator flowsheet'
      },
      {
        id: 'respiratory_culture_result',
        name: 'Respiratory Culture Result',
        category: 'micro',
        phase_id: 'infection_evaluation',
        priority: 'core',
        rationale: 'Required for PVAP (Possible VAP)',
        example_source_hint: 'microbiology lab'
      },
      {
        id: 'respiratory_specimen_type',
        name: 'Respiratory Specimen Type',
        category: 'micro',
        phase_id: 'infection_evaluation',
        priority: 'supporting',
        rationale: 'Tracheal aspirate, BAL, mini-BAL, sputum',
        example_source_hint: 'microbiology order'
      },
      {
        id: 'purulent_secretions',
        name: 'Purulent Respiratory Secretions',
        category: 'clinical',
        phase_id: 'infection_evaluation',
        priority: 'core',
        rationale: 'Required for Probable VAP (in addition to positive culture)',
        example_source_hint: 'nursing notes, respiratory therapy notes',
        follow_up_questions: ['Are secretion characteristics documented in structured fields or free text?']
      }
    );

    if (isPediatric) {
      signals.push(
        {
          id: 'oxygenation_index',
          name: 'Oxygenation Index (OI) or OSI',
          category: 'vent_setting',
          phase_id: 'worsening_oxygenation',
          priority: 'supporting',
          rationale: 'Pediatric-specific oxygenation metric: OI = MAP × FiO2 / PaO2 × 100',
          example_source_hint: 'calculated field or manual entry',
          follow_up_questions: ['Is OI/OSI calculated and documented?']
        },
        {
          id: 'gestational_age',
          name: 'Gestational Age (for neonates)',
          category: 'clinical',
          phase_id: 'intubation',
          priority: 'supporting',
          rationale: 'Preterm neonates may have different VAE patterns due to lung immaturity',
          example_source_hint: 'NICU admission data'
        }
      );
    }
  }

  // Add common signals for all HAC types
  if (archetype.startsWith('HAC')) {
    signals.push(
      {
        id: 'admission_date',
        name: 'Hospital Admission Date',
        category: 'clinical',
        phase_id: 'baseline',
        priority: 'core',
        rationale: 'Determines hospital-acquired vs present on admission',
        example_source_hint: 'encounters table, ADT'
      },
      {
        id: 'temperature',
        name: 'Temperature (°C)',
        category: 'vital',
        phase_id: 'infection_window',
        priority: 'core',
        rationale: 'Fever/hypothermia criteria for infection',
        example_source_hint: 'vitals flowsheet'
      },
      {
        id: 'wbc_count',
        name: 'WBC Count (cells/mm³)',
        category: 'lab',
        phase_id: 'infection_window',
        priority: 'core',
        rationale: 'Leukocytosis/leukopenia criteria',
        example_source_hint: 'lab results table',
        follow_up_questions: isPediatric ? ['Are age-adjusted WBC normal ranges available?'] : []
      },
      {
        id: 'antimicrobial_start_date',
        name: 'Antimicrobial Start Date',
        category: 'clinical',
        phase_id: 'infection_window',
        priority: 'core',
        rationale: 'Treatment for suspected/confirmed infection',
        example_source_hint: 'medication administration records',
        follow_up_questions: ['Are antimicrobials flagged or categorized?', 'Can we identify new (not continued from before) antimicrobials?']
      }
    );
  }

  return signals;
}
