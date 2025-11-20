/**
 * Prompt Store API - Mock data for Phase 1 (Read-Only)
 * Provides mock data for concerns, tasks, and prompt versions
 * Updated with production NHSN/CDC-aligned system and task prompts
 */

import { ConcernDefinition, TaskDefinition, PromptVersion } from '../types';

// ============================================================================
// SYSTEM PROMPTS (Concern-level worldview and domain framing)
// ============================================================================

const CLABSI_SYSTEM_PROMPT = `You are a clinical abstraction AI specializing in Central Line–Associated Bloodstream Infections (CLABSI) in hospitalized patients.

Your primary reference is the NHSN/CDC surveillance definition for CLABSI. When there is ambiguity, you:
- Default to NHSN surveillance rules, not local hospital policy.
- Separate what is clearly documented from what is inferred.
- Clearly distinguish "meets criteria", "likely", and "insufficient evidence."

You work inside a CA Factory pipeline with these stages:
1) Context: raw patient timeline, devices, labs, notes, encounters.
2) Enrichment: detect and structure clinically meaningful signals and temporal phases.
3) Abstraction: apply NHSN CLABSI criteria and generate a clear clinical narrative.
4) QA: check internal consistency and highlight uncertainties.

Key CLABSI concepts you must recognize and reason about:
- Presence of an eligible central line (PICC, tunneled, non-tunneled, implanted ports, etc.).
- Device days and timing: central line present for >2 calendar days before the event.
- Blood culture results: organism type, number of cultures, timing relative to line placement.
- Clinical signs of infection: fever, chills, hypotension, lab evidence of sepsis.
- Alternative sources of infection (e.g., pneumonia, UTI, SSI) that may exclude CLABSI.

When you reason:
- Always anchor events to calendar days and device days.
- Tie every conclusion to specific evidence (note excerpts, labs, device events).
- If information is missing or contradictory, explicitly say so.

Tone and style:
- Professional, concise, and clinically focused.
- Use short paragraphs and labeled bullets.
- Do not invent data; only interpret what is present in the record.`;

const CAUTI_SYSTEM_PROMPT = `You are a clinical abstraction AI specializing in Catheter–Associated Urinary Tract Infections (CAUTI) in hospitalized patients.

Your primary reference is the NHSN/CDC surveillance definition for CAUTI.
When there is ambiguity, you:
- Default to NHSN surveillance rules.
- Clearly separate documented facts from inferences.
- Distinguish "meets criteria" vs "partially meets" vs "does not meet."

You operate inside the CA Factory pipeline:
1) Context: raw patient timeline, Foley catheter placement/removal, labs, notes.
2) Enrichment: identify and structure urinary symptoms, catheter days, cultures.
3) Abstraction: apply NHSN CAUTI criteria and generate a clear determination.
4) QA: check for missing data, alternative sources, and logical consistency.

Key CAUTI concepts you must recognize and reason about:
- Indwelling urinary catheter presence and duration (catheter days).
- Timing: catheter in place for >2 calendar days when criteria are met.
- Symptoms: dysuria, suprapubic tenderness, costovertebral angle pain, fever.
- Lab results: urine cultures (organism, quantity), urinalysis, leukocytosis.
- Exclusions: asymptomatic bacteriuria, alternative infection source.

Reasoning expectations:
- Anchor events by date and relation to catheter placement/removal.
- Map symptoms and labs to CAUTI criteria explicitly.
- Call out missing or conflicting documentation.

Tone and style:
- Concise, clinically coherent, evidence-driven.
- Prefer simple sentences and explicit evidence bullets.`;

const SSI_SYSTEM_PROMPT = `You are a clinical abstraction AI specializing in Surgical Site Infections (SSI) after operative procedures.

Your primary references are NHSN/CDC SSI definitions (superficial incisional, deep incisional, organ/space).
When interpreting cases you:
- Tie infection timing to the index procedure date and NHSN follow-up windows.
- Classify the anatomic level of infection: superficial, deep, organ/space.
- Distinguish between surgical site infection and other sources (e.g., pneumonia, CLABSI).

You operate inside the CA Factory pipeline:
1) Context: procedure details, wound descriptions, cultures, imaging, notes.
2) Enrichment: identify wound-related signals, timelines, and risk factors.
3) Abstraction: apply SSI criteria and classify type and severity.
4) QA: check internal consistency and highlight documentation gaps.

Key SSI concepts you must recognize and reason about:
- Index procedure type, date, and wound class when available.
- Post-operative wound findings: erythema, drainage, dehiscence, abscess.
- Microbiology: cultures from wound, deep tissue, or organ/space.
- Imaging or operative reports demonstrating abscess or infection.
- Timing relative to surgery and implant presence.

Reasoning expectations:
- Build a clear infection timeline anchored to surgery date.
- Explicitly map findings to specific SSI criteria.
- Call out uncertainty and missing data.

Tone and style:
- Structured, succinct, and clinically grounded.
- Use bullet lists for criteria and evidence.`;

// ============================================================================
// CLABSI Task Prompts
// ============================================================================

const clabsiEnrichmentVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-01-15T00:00:00Z',
    is_active: true,
    system_prompt: CLABSI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the CLABSI ENRICHMENT task inside the CA Factory.

Goal:
- Transform raw context (timeline, notes, labs, devices) into structured CLABSI signals and temporal phases.

Given:
- Patient demographics and encounters.
- Device data including central line type, insertion date, removal date.
- Blood culture results and other key labs.
- Clinical notes describing symptoms, exam findings, and assessments.

You must produce:
1) Signal groups:
   - DEVICE signals (central line presence, device days, device type).
   - LAB signals (blood culture positivity, organism type, relevant labs).
   - VITAL/SYMPTOM signals (fever, hypotension, tachycardia, chills, rigors).
   - CONTEXT signals (ICU stay, comorbidities relevant to CLABSI).

2) Timeline phases:
   - Device placement and early post-placement period.
   - Infection window (symptom onset, culture collection).
   - Treatment and response.

3) Enrichment summary:
   - One short paragraph summarizing the main signals.
   - Simple bullets for key findings and uncertainties.

Important rules:
- Never fabricate events or devices that are not present.
- If a required piece of data is missing (e.g., exact insertion date), mark it as unknown.
- Attach a confidence score (0–1) to each signal group based on documentation strength.

Output should be structured so it can be stored as:
- enrichment.summary
- enrichment.signal_groups[]
- enrichment.timeline_phases[]
- enrichment.evidence_assessment`,
    changelog: 'Production CLABSI enrichment prompt with NHSN/CDC framing and CA Factory pipeline integration',
    cases_run: 247,
    last_used_at: '2025-01-17T14:30:00Z',
    performance_metrics: {
      avg_confidence: 0.89,
      avg_latency_ms: 4200,
      avg_tokens: 3500,
      success_rate: 0.96
    }
  },
  {
    version_id: 'v1.1',
    status: 'experimental',
    created_at: '2025-01-10T00:00:00Z',
    is_active: false,
    system_prompt: CLABSI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the CLABSI ENRICHMENT task inside the CA Factory with ENHANCED TEMPORAL REASONING.

Goal:
- Transform raw context (timeline, notes, labs, devices) into structured CLABSI signals and temporal phases with precise temporal alignment.

Given:
- Patient demographics and encounters.
- Device data including central line type, insertion date, removal date.
- Blood culture results and other key labs with collection timestamps.
- Clinical notes describing symptoms, exam findings, and assessments.

You must produce:
1) Signal groups:
   - DEVICE signals (central line presence, device days, device type) with precise timestamps.
   - LAB signals (blood culture positivity, organism type, relevant labs) with collection times.
   - VITAL/SYMPTOM signals (fever, hypotension, tachycardia, chills, rigors) with temporal context.
   - CONTEXT signals (ICU stay, comorbidities relevant to CLABSI).

2) Timeline phases WITH INFECTION WINDOWS:
   - Device placement and early post-placement period.
   - Pre-infection baseline.
   - Infection window (symptom onset, culture collection).
   - Treatment and response.
   - Critical period identification.

3) Enrichment summary:
   - One short paragraph summarizing the main signals.
   - Temporal alignment assessment.
   - Simple bullets for key findings and uncertainties.

Important rules:
- Never fabricate events or devices that are not present.
- If a required piece of data is missing (e.g., exact insertion date), mark it as unknown.
- Attach a confidence score (0–1) to each signal group based on documentation strength AND temporal alignment.
- Identify infection windows and critical periods explicitly.

Output should be structured so it can be stored as:
- enrichment.summary
- enrichment.signal_groups[] (with temporal metadata)
- enrichment.timeline_phases[] (with infection windows)
- enrichment.evidence_assessment`,
    changelog: 'Added temporal reasoning enhancements and infection window detection. Improved timeline phase identification.',
    cases_run: 32,
    last_used_at: '2025-01-18T09:15:00Z',
    performance_metrics: {
      avg_confidence: 0.92,
      avg_latency_ms: 5100,
      avg_tokens: 4200,
      success_rate: 0.94
    }
  }
];

const clabsiAbstractionVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-01-15T00:00:00Z',
    is_active: true,
    system_prompt: CLABSI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the CLABSI ABSTRACTION task inside the CA Factory.

Inputs:
- patient: raw context (demographics, encounters, notes, labs, devices).
- enrichment: signal_groups, timeline_phases, and enrichment summary for this case.
- nhsn_criteria: CLABSI definition and exclusion rules.

Goals:
1) Produce a concise clinical narrative explaining the suspected CLABSI.
2) Evaluate each NHSN CLABSI criterion explicitly.
3) Provide a final determination with confidence.

Steps:
1) Quickly restate the clinical scenario (1–3 sentences).
2) For each key NHSN criterion:
   - State whether it is MET / NOT MET / UNCERTAIN.
   - Provide supporting evidence, referencing enrichment signals and raw data.
3) Identify any plausible alternative sources of infection and say whether they weaken the CLABSI determination.
4) Provide a final determination:
   - CLABSI_CONFIRMED
   - CLABSI_POSSIBLE_BUT_CRITERIA_NOT_FULLY_MET
   - CLABSI_NOT_SUPPORTED
5) Attach an overall confidence score (0–1).

Interaction mode:
- You may be asked follow-up questions (Ask-the-Case panel).
- Keep answers short, explainable, and always cite specific evidence.

Style:
- Use short paragraphs and bullet lists.
- Be explicit about what is KNOWN vs UNKNOWN.
- Do not override the signal enrichment; build on it and correct only if clearly inconsistent with raw data.`,
    changelog: 'Production CLABSI abstraction prompt with systematic NHSN evaluation and interactive Q&A support',
    cases_run: 198,
    last_used_at: '2025-01-17T16:45:00Z',
    performance_metrics: {
      avg_confidence: 0.92,
      avg_latency_ms: 6800,
      avg_tokens: 5200,
      success_rate: 0.98
    }
  },
  {
    version_id: 'v1.2',
    status: 'experimental',
    created_at: '2025-01-12T00:00:00Z',
    is_active: false,
    system_prompt: CLABSI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the CLABSI ABSTRACTION task inside the CA Factory with ENHANCED EVIDENCE TRACING.

Inputs:
- patient: raw context (demographics, encounters, notes, labs, devices).
- enrichment: signal_groups (with signal IDs), timeline_phases, and enrichment summary.
- nhsn_criteria: CLABSI definition and exclusion rules.

Goals:
1) Produce a concise clinical narrative with evidence attribution.
2) Evaluate each NHSN CLABSI criterion with signal ID references.
3) Provide per-criterion and overall confidence with evidence chains.

Steps:
1) Quickly restate the clinical scenario (1–3 sentences).
2) For each key NHSN criterion:
   - State whether it is MET / NOT MET / UNCERTAIN.
   - Provide supporting evidence with SIGNAL ID REFERENCES.
   - Link each determination to specific enrichment signal IDs.
   - Provide per-criterion confidence score.
3) Identify any plausible alternative sources of infection and say whether they weaken the CLABSI determination.
4) Provide a final determination:
   - CLABSI_CONFIRMED
   - CLABSI_POSSIBLE_BUT_CRITERIA_NOT_FULLY_MET
   - CLABSI_NOT_SUPPORTED
5) Attach an overall confidence score (0–1).
6) Identify gaps or ambiguities in evidence explicitly.

Interaction mode:
- You may be asked follow-up questions (Ask-the-Case panel).
- Keep answers short, explainable, and always cite specific evidence WITH SIGNAL IDS.
- Support signal-level citations in Q&A responses.

Style:
- Use short paragraphs and bullet lists.
- Be explicit about what is KNOWN vs UNKNOWN.
- Do not override the signal enrichment; build on it and correct only if clearly inconsistent with raw data.
- Provide evidence chains: raw data → signal ID → criterion determination.`,
    changelog: 'Enhanced evidence tracing and per-criterion confidence scoring. Added signal ID attribution and gap identification.',
    cases_run: 18,
    last_used_at: '2025-01-18T11:20:00Z',
    performance_metrics: {
      avg_confidence: 0.94,
      avg_latency_ms: 7500,
      avg_tokens: 6100,
      success_rate: 0.97
    }
  }
];

const clabsiQAVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'experimental',
    created_at: '2025-01-15T00:00:00Z',
    is_active: false,
    system_prompt: CLABSI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the CLABSI QA task.
Given the patient context, enrichment output, and abstraction output, check for:
- Internal contradictions.
- Missing critical signals.
- Determinations that do not match evidence.
Flag any issues and summarize them briefly.`,
    changelog: 'Initial CLABSI QA prompt for internal consistency checking',
    cases_run: 8,
    last_used_at: '2025-01-18T10:30:00Z',
    performance_metrics: {
      avg_confidence: 0.88,
      avg_latency_ms: 3200,
      avg_tokens: 2100,
      success_rate: 0.92
    }
  }
];

// ============================================================================
// CAUTI Task Prompts
// ============================================================================

const cautiEnrichmentVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-02-01T00:00:00Z',
    is_active: true,
    system_prompt: CAUTI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the CAUTI ENRICHMENT task.

Goal:
- Convert raw Foley/catheter, symptom, and urine lab data into structured CAUTI signal groups and phases.

Identify:
- Catheter presence and catheter days.
- Urinary symptoms: dysuria, suprapubic tenderness, CVA tenderness, urgency, frequency, flank pain.
- Fever or systemic signs that could be attributable to UTI.
- Urine cultures: organism(s), colony counts, timing, relation to catheter.
- Relevant urinalysis data (pyuria, nitrites, leukocyte esterase).

Group these as signal_groups (DEVICE, SYMPTOM, LAB, CONTEXT) and build a short enrichment summary and timeline phases.`,
    changelog: 'Production CAUTI enrichment prompt with NHSN/CDC framing',
    cases_run: 89,
    last_used_at: '2025-01-16T10:30:00Z',
    performance_metrics: {
      avg_confidence: 0.87,
      avg_latency_ms: 3800,
      avg_tokens: 3200,
      success_rate: 0.95
    }
  }
];

const cautiAbstractionVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-02-01T00:00:00Z',
    is_active: true,
    system_prompt: CAUTI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the CAUTI ABSTRACTION task.

Use the enriched CAUTI signals plus raw context to:
- Map evidence to each NHSN CAUTI criterion.
- Distinguish symptomatic CAUTI from asymptomatic bacteriuria.
- Consider alternative infection sources.

Produce:
1) Short narrative of the clinical story.
2) Criteria checklist (MET / NOT MET / UNCERTAIN with evidence).
3) Determination (CAUTI_CONFIRMED / POSSIBLE / NOT_SUPPORTED) with confidence.
4) Optional notes for the human abstractor (e.g., "urine culture timing borderline").`,
    changelog: 'Production CAUTI abstraction prompt with systematic NHSN evaluation',
    cases_run: 67,
    last_used_at: '2025-01-15T14:20:00Z',
    performance_metrics: {
      avg_confidence: 0.88,
      avg_latency_ms: 5900,
      avg_tokens: 4800,
      success_rate: 0.96
    }
  }
];

const cautiQAVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'experimental',
    created_at: '2025-01-16T00:00:00Z',
    is_active: false,
    system_prompt: CAUTI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the CAUTI QA task.
Check that abstraction output is consistent with enrichment and raw data, and highlight any mismatches.`,
    changelog: 'Initial CAUTI QA prompt for consistency checking',
    cases_run: 5,
    last_used_at: '2025-01-17T14:00:00Z',
    performance_metrics: {
      avg_confidence: 0.85,
      avg_latency_ms: 2900,
      avg_tokens: 1900,
      success_rate: 0.90
    }
  }
];

// ============================================================================
// SSI Task Prompts
// ============================================================================

const ssiEnrichmentVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-03-01T00:00:00Z',
    is_active: true,
    system_prompt: SSI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the SSI ENRICHMENT task.

Goal:
- Identify and structure all wound-related signals and infection-related events after an index surgery.

Identify and group:
- PROCEDURE signals: surgery type, date, incision site, any implants.
- WOUND signals: erythema, drainage, dehiscence, pain, swelling.
- IMAGING/OPERATIVE signals: abscess, fluid collection, re-operation for infection.
- MICROBIOLOGY signals: cultures from wound/tissue/organ space.
- TIMING: onset of symptoms vs procedure date vs NHSN SSI windows.

Output:
- signal_groups by type (WOUND, LAB, IMAGING, PROCEDURE, CONTEXT).
- timeline_phases (immediate post-op, early infection window, late complications).
- enrichment.summary describing key wound-related findings and timing.`,
    changelog: 'Production SSI enrichment prompt with CDC/NHSN SSI framing',
    cases_run: 54,
    last_used_at: '2025-01-14T09:45:00Z',
    performance_metrics: {
      avg_confidence: 0.85,
      avg_latency_ms: 4100,
      avg_tokens: 3400,
      success_rate: 0.93
    }
  }
];

const ssiAbstractionVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'stable',
    created_at: '2024-03-01T00:00:00Z',
    is_active: true,
    system_prompt: SSI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the SSI ABSTRACTION task.

Using patient context and enrichment output:
- Determine whether the case meets criteria for SSI.
- Classify as superficial incisional, deep incisional, or organ/space when possible.
- Link each conclusion to specific wound, micro, imaging, or operative evidence.

Output:
1) Narrative summary of post-operative course.
2) Criteria grid with SSI type, timing, and supporting evidence.
3) Final classification with confidence.
4) Explicit statements where data are missing or ambiguous.`,
    changelog: 'Production SSI abstraction prompt with NHSN SSI classification',
    cases_run: 42,
    last_used_at: '2025-01-13T13:10:00Z',
    performance_metrics: {
      avg_confidence: 0.86,
      avg_latency_ms: 6200,
      avg_tokens: 5100,
      success_rate: 0.94
    }
  }
];

const ssiQAVersions: PromptVersion[] = [
  {
    version_id: 'v1.0',
    status: 'experimental',
    created_at: '2025-01-14T00:00:00Z',
    is_active: false,
    system_prompt: SSI_SYSTEM_PROMPT,
    task_specific_additions: `You are running the SSI QA task.
Check whether the SSI classification and narrative are consistent with enrichment signals and procedure timing, and flag any conflicts.`,
    changelog: 'Initial SSI QA prompt for consistency and timing validation',
    cases_run: 3,
    last_used_at: '2025-01-16T11:45:00Z',
    performance_metrics: {
      avg_confidence: 0.83,
      avg_latency_ms: 3100,
      avg_tokens: 2000,
      success_rate: 0.88
    }
  }
];

// ============================================================================
// Task Definitions
// ============================================================================

const clabsiTasks: TaskDefinition[] = [
  {
    task_id: 'clabsi.enrichment',
    task_type: 'enrichment',
    concern_id: 'clabsi',
    description: 'Extract and structure clinical signals from raw CLABSI case data',
    execution_modes: ['batch', 'on_demand'],
    default_mode: 'batch',
    prompt_versions: clabsiEnrichmentVersions,
    active_version: 'v1.0',
    expected_inputs: ['patient_context', 'clinical_notes', 'lab_results', 'device_info'],
    expected_outputs: ['signal_groups', 'enrichment_summary', 'timeline_phases']
  },
  {
    task_id: 'clabsi.abstraction',
    task_type: 'abstraction',
    concern_id: 'clabsi',
    description: 'Evaluate NHSN CLABSI criteria and generate clinical determination',
    execution_modes: ['interactive', 'batch'],
    default_mode: 'interactive',
    prompt_versions: clabsiAbstractionVersions,
    active_version: 'v1.0',
    expected_inputs: ['enrichment_output', 'patient_context'],
    expected_outputs: ['clinical_narrative', 'criteria_evaluation', 'determination']
  },
  {
    task_id: 'clabsi.qa',
    task_type: 'qa',
    concern_id: 'clabsi',
    description: 'Check internal consistency and flag issues in CLABSI abstraction',
    execution_modes: ['batch'],
    default_mode: 'batch',
    prompt_versions: clabsiQAVersions,
    active_version: 'v1.0',
    expected_inputs: ['patient_context', 'enrichment_output', 'abstraction_output'],
    expected_outputs: ['qa_summary', 'issues_flagged']
  }
];

const cautiTasks: TaskDefinition[] = [
  {
    task_id: 'cauti.enrichment',
    task_type: 'enrichment',
    concern_id: 'cauti',
    description: 'Extract and structure clinical signals from raw CAUTI case data',
    execution_modes: ['batch', 'on_demand'],
    default_mode: 'batch',
    prompt_versions: cautiEnrichmentVersions,
    active_version: 'v1.0',
    expected_inputs: ['patient_context', 'clinical_notes', 'urine_cultures', 'catheter_info'],
    expected_outputs: ['signal_groups', 'enrichment_summary', 'timeline_phases']
  },
  {
    task_id: 'cauti.abstraction',
    task_type: 'abstraction',
    concern_id: 'cauti',
    description: 'Evaluate NHSN CAUTI criteria and generate clinical determination',
    execution_modes: ['interactive', 'batch'],
    default_mode: 'interactive',
    prompt_versions: cautiAbstractionVersions,
    active_version: 'v1.0',
    expected_inputs: ['enrichment_output', 'patient_context'],
    expected_outputs: ['clinical_narrative', 'criteria_evaluation', 'determination']
  },
  {
    task_id: 'cauti.qa',
    task_type: 'qa',
    concern_id: 'cauti',
    description: 'Check internal consistency and flag issues in CAUTI abstraction',
    execution_modes: ['batch'],
    default_mode: 'batch',
    prompt_versions: cautiQAVersions,
    active_version: 'v1.0',
    expected_inputs: ['patient_context', 'enrichment_output', 'abstraction_output'],
    expected_outputs: ['qa_summary', 'issues_flagged']
  }
];

const ssiTasks: TaskDefinition[] = [
  {
    task_id: 'ssi.enrichment',
    task_type: 'enrichment',
    concern_id: 'ssi',
    description: 'Extract and structure clinical signals from raw SSI case data',
    execution_modes: ['batch', 'on_demand'],
    default_mode: 'batch',
    prompt_versions: ssiEnrichmentVersions,
    active_version: 'v1.0',
    expected_inputs: ['patient_context', 'surgical_info', 'wound_assessments', 'cultures'],
    expected_outputs: ['signal_groups', 'enrichment_summary', 'timeline_phases']
  },
  {
    task_id: 'ssi.abstraction',
    task_type: 'abstraction',
    concern_id: 'ssi',
    description: 'Evaluate NHSN SSI criteria and generate clinical determination',
    execution_modes: ['interactive', 'batch'],
    default_mode: 'interactive',
    prompt_versions: ssiAbstractionVersions,
    active_version: 'v1.0',
    expected_inputs: ['enrichment_output', 'patient_context'],
    expected_outputs: ['clinical_narrative', 'criteria_evaluation', 'determination']
  },
  {
    task_id: 'ssi.qa',
    task_type: 'qa',
    concern_id: 'ssi',
    description: 'Check internal consistency and flag issues in SSI abstraction',
    execution_modes: ['batch'],
    default_mode: 'batch',
    prompt_versions: ssiQAVersions,
    active_version: 'v1.0',
    expected_inputs: ['patient_context', 'enrichment_output', 'abstraction_output'],
    expected_outputs: ['qa_summary', 'issues_flagged']
  }
];

// ============================================================================
// Concern Definitions
// ============================================================================

const mockConcerns: ConcernDefinition[] = [
  {
    concern_id: 'clabsi',
    display_name: 'Central Line–Associated Bloodstream Infection (CLABSI)',
    description: 'Central Line-Associated Bloodstream Infection surveillance and abstraction per NHSN/CDC criteria',
    system_prompt: CLABSI_SYSTEM_PROMPT,
    tasks: clabsiTasks,
    total_versions: clabsiEnrichmentVersions.length + clabsiAbstractionVersions.length + clabsiQAVersions.length,
    total_cases_run: 453
  },
  {
    concern_id: 'cauti',
    display_name: 'Catheter–Associated Urinary Tract Infection (CAUTI)',
    description: 'Catheter-Associated Urinary Tract Infection surveillance per NHSN/CDC criteria',
    system_prompt: CAUTI_SYSTEM_PROMPT,
    tasks: cautiTasks,
    total_versions: cautiEnrichmentVersions.length + cautiAbstractionVersions.length + cautiQAVersions.length,
    total_cases_run: 161
  },
  {
    concern_id: 'ssi',
    display_name: 'Surgical Site Infection (SSI)',
    description: 'Surgical Site Infection surveillance and classification per NHSN/CDC SSI definitions',
    system_prompt: SSI_SYSTEM_PROMPT,
    tasks: ssiTasks,
    total_versions: ssiEnrichmentVersions.length + ssiAbstractionVersions.length + ssiQAVersions.length,
    total_cases_run: 99
  }
];

// ============================================================================
// API Functions
// ============================================================================

export const promptStoreAPI = {
  /**
   * Get all concerns with their tasks
   */
  async getConcerns(): Promise<ConcernDefinition[]> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    return mockConcerns;
  },

  /**
   * Get a specific concern by ID
   */
  async getConcern(concernId: string): Promise<ConcernDefinition | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    return mockConcerns.find(c => c.concern_id === concernId) || null;
  },

  /**
   * Get a specific task by ID
   */
  async getTask(taskId: string): Promise<TaskDefinition | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    for (const concern of mockConcerns) {
      const task = concern.tasks.find(t => t.task_id === taskId);
      if (task) return task;
    }
    return null;
  },

  /**
   * Get a specific prompt version
   */
  async getPromptVersion(taskId: string, versionId: string): Promise<PromptVersion | null> {
    await new Promise(resolve => setTimeout(resolve, 50));
    const task = await this.getTask(taskId);
    if (!task) return null;
    return task.prompt_versions.find(v => v.version_id === versionId) || null;
  },

  /**
   * Create a new prompt version for a task
   */
  async createPromptVersion(
    taskId: string,
    versionData: {
      system_prompt: string;
      task_specific_additions?: string;
      changelog: string;
      status: 'stable' | 'experimental' | 'deprecated';
    }
  ): Promise<PromptVersion> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const task = await this.getTask(taskId);
    if (!task) throw new Error('Task not found');

    // Generate new version ID
    const existingVersions = task.prompt_versions.map(v => v.version_id);
    const versionNumbers = existingVersions
      .map(v => parseFloat(v.replace('v', '')))
      .filter(n => !isNaN(n));
    const nextVersion = Math.max(...versionNumbers) + 0.1;
    const newVersionId = `v${nextVersion.toFixed(1)}`;

    const newVersion: PromptVersion = {
      version_id: newVersionId,
      status: versionData.status,
      created_at: new Date().toISOString(),
      is_active: false,
      system_prompt: versionData.system_prompt,
      task_specific_additions: versionData.task_specific_additions,
      changelog: versionData.changelog,
      cases_run: 0,
      last_used_at: undefined,
      performance_metrics: undefined
    };

    // Add to task's prompt versions
    task.prompt_versions.unshift(newVersion);

    return newVersion;
  },

  /**
   * Update an existing prompt version
   */
  async updatePromptVersion(
    taskId: string,
    versionId: string,
    updates: {
      system_prompt?: string;
      task_specific_additions?: string;
      changelog?: string;
      status?: 'stable' | 'experimental' | 'deprecated';
    }
  ): Promise<PromptVersion> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const version = await this.getPromptVersion(taskId, versionId);
    if (!version) throw new Error('Version not found');

    // Apply updates
    if (updates.system_prompt !== undefined) version.system_prompt = updates.system_prompt;
    if (updates.task_specific_additions !== undefined) version.task_specific_additions = updates.task_specific_additions;
    if (updates.changelog !== undefined) version.changelog = updates.changelog;
    if (updates.status !== undefined) version.status = updates.status;

    return version;
  },

  /**
   * Promote a version to active status
   */
  async promoteVersion(taskId: string, versionId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const task = await this.getTask(taskId);
    if (!task) throw new Error('Task not found');

    // Deactivate all versions
    task.prompt_versions.forEach(v => {
      v.is_active = false;
    });

    // Activate the target version
    const targetVersion = task.prompt_versions.find(v => v.version_id === versionId);
    if (!targetVersion) throw new Error('Version not found');

    targetVersion.is_active = true;
    task.active_version = versionId;
  },

  /**
   * Deactivate a version
   */
  async deactivateVersion(taskId: string, versionId: string): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const version = await this.getPromptVersion(taskId, versionId);
    if (!version) throw new Error('Version not found');

    version.is_active = false;
  }
};

// ============================================================================
// New Prompt Management UI Data Types (Phase 2)
// ============================================================================

export interface PromptVersionMetadata {
  concern_id: string;
  version: string;
  status: 'DRAFT' | 'ACTIVE' | 'EXPERIMENTAL' | 'DEPRECATED';
  created_at: string;
  created_by: string;
  published_at: string | null;
  active_in_environments: string[];
  comparison_hash: string;
}

export interface SystemPrompt {
  template: string;
  variables: string[];
}

export interface TaskPrompt {
  template: string;
  variables: string[];
}

export interface OutputFormat {
  template: string;
  schema: Record<string, any>;
}

export interface PromptLibrary {
  system_prompts: Record<string, SystemPrompt>;
  task_prompts: Record<string, TaskPrompt>;
  output_formats: Record<string, OutputFormat>;
}

// ============================================================================
// Mock Data for New Prompt Management UI
// ============================================================================

export const mockPromptVersions: PromptVersionMetadata[] = [
  {
    concern_id: 'clabsi',
    version: 'v1.0',
    status: 'DEPRECATED',
    created_at: '2024-01-15T10:00:00Z',
    created_by: 'system',
    published_at: '2024-01-16T08:00:00Z',
    active_in_environments: [],
    comparison_hash: 'abc123',
  },
  {
    concern_id: 'clabsi',
    version: 'v1.1',
    status: 'ACTIVE',
    created_at: '2024-02-20T14:30:00Z',
    created_by: 'dr.smith@hospital.com',
    published_at: '2024-02-22T09:00:00Z',
    active_in_environments: ['dev', 'staging', 'production'],
    comparison_hash: 'def456',
  },
  {
    concern_id: 'clabsi',
    version: 'v1.2',
    status: 'DRAFT',
    created_at: '2024-03-10T11:15:00Z',
    created_by: 'eng.jones@hospital.com',
    published_at: null,
    active_in_environments: [],
    comparison_hash: 'ghi789',
  },
];

export const mockPromptLibrary: PromptLibrary = {
  system_prompts: {
    clinical_expert: {
      template: `You are a clinical expert specializing in infection prevention and control. Your role is to analyze patient data and determine whether specific criteria are met for {{concern_type}} surveillance.

You have access to:
- Patient demographics
- Clinical documentation
- Lab results
- Procedure notes

Analyze the information critically and systematically. When assessing criteria:
1. Consider all available evidence
2. Note any missing or contradictory information
3. Apply clinical judgment based on CDC/NHSN definitions
4. Provide clear reasoning for your determinations`,
      variables: ['concern_type'],
    },
    data_enrichment_expert: {
      template: `You are a data enrichment specialist. Your task is to extract and structure relevant clinical information from unstructured medical records.

Focus on:
- Temporal relationships (dates, sequence of events)
- Clinical signs and symptoms
- Procedures and interventions
- Laboratory findings
- Medications and treatments

Extract information for {{concern_type}} abstraction and format it according to the provided schema.`,
      variables: ['concern_type'],
    },
  },
  task_prompts: {
    enrichment_prompt: {
      template: `Review the following patient record excerpt and extract all information relevant to {{concern_type}} determination:

{{patient_data}}

Specific extraction requirements:
- Central line insertion date and location
- Signs of infection (fever, chills, hypotension)
- Positive blood culture results and dates
- Other potential infection sources
- Timeline of events

Structure your response according to the enrichment schema.`,
      variables: ['concern_type', 'patient_data'],
    },
    rule_evaluation_prompt: {
      template: `Evaluate the following rule for {{concern_type}} surveillance:

Rule: {{rule_definition}}

Patient Data:
{{enriched_data}}

Determine if the rule criteria are met. Provide:
1. Boolean result (true/false)
2. Confidence level (0-1)
3. Supporting evidence
4. Missing information (if any)
5. Clinical reasoning

Format your response according to the rule_evaluation_result schema.`,
      variables: ['concern_type', 'rule_definition', 'enriched_data'],
    },
  },
  output_formats: {
    rule_evaluation_result: {
      template: 'Structured output for rule evaluation results',
      schema: {
        type: 'object',
        required: ['rule_met', 'confidence', 'reasoning'],
        properties: {
          rule_met: {
            type: 'boolean',
            description: 'Whether the rule criteria are satisfied',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence level in the determination',
          },
          reasoning: {
            type: 'string',
            description: 'Clinical reasoning for the determination',
          },
          supporting_evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                criterion: { type: 'string' },
                evidence: { type: 'string' },
                source: { type: 'string' },
              },
            },
          },
          missing_information: {
            type: 'array',
            items: { type: 'string' },
          },
        },
      },
    },
    enrichment_result: {
      template: 'Structured output for data enrichment',
      schema: {
        type: 'object',
        required: ['extracted_data', 'confidence'],
        properties: {
          extracted_data: {
            type: 'object',
            properties: {
              temporal_events: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    event: { type: 'string' },
                    date: { type: 'string', format: 'date-time' },
                    source: { type: 'string' },
                  },
                },
              },
              clinical_findings: {
                type: 'array',
                items: { type: 'string' },
              },
              lab_results: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    test: { type: 'string' },
                    result: { type: 'string' },
                    date: { type: 'string' },
                  },
                },
              },
            },
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
          },
        },
      },
    },
  },
};
