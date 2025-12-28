Clinical_Insight_Factory_PlannerSpec_v9.1.md.Markdown
# Clinical Insight Factory – Planner Specification V9.1 (Production Master)
**Status:** Active | **Version:** 9.1.0 | **Focus:** Input Strictness, Granular Interactivity, & Closed-Loop Validation

---

# 1. Purpose & Architecture
This document is the **Single Source of Truth** for the Planner Engine. It transforms a `planning_input` into a deterministic, strictly validated `PlannerPlan`.

**Core Philosophy:**
1.  **Input-Driven Determinism:** The `planning_input` schema strictly dictates the Archetype.
2.  **Pediatric Exclusive:** Adult scoring systems are treated as hallucinations.
3.  **Strict Provenance:** Domain and Source must align.
4.  **Structure Enforcement:** Every Domain MUST use exactly 5 defined Signal Groups.

---

# 2. Input Specification (`planning_input`)
The Planner strictly accepts this JSON structure. This is the seed for all downstream logic.

```json
{
  "planning_input_id": "UUID",
  "concern": "string (e.g., 'CLABSI', 'Hip Fracture Co-Management')",
  "domain_hint": "HAC | Orthopedics | Endocrinology | Quality",
  "intent": "surveillance | quality_reporting | clinical_decision_support",
  "target_population": "string (e.g., 'PICU patients < 18y')",
  "specific_requirements": [
    "string (e.g., 'Must align with SPS bundles')",
    "string (e.g., 'Exclude palliative care')"
  ]
}
3. Logic Core: Archetypes & Mappings3.1 Metric → Archetype Matrix (Deterministic)The Planner MUST use this table to assign the archetype and domain.Metric IDConcernDomainPrimary ArchetypeCLABSICentral Line InfectionHAC / SafetyPreventability_DetectiveCAUTICatheter UTIHAC / SafetyPreventability_DetectiveI25Ortho Co-ManagementOrthopedics (Quality)Process_AuditorC35.xDiabetes (A1c/LDL)Endocrinology (Quality)Data_ScavengerPSI-09Perioperative Hem/PEHAC / SafetyExclusion_HunterMORTMortality (Cardiac/PICU)Quality / OutcomesExclusion_Hunter4. Domain Templates (The "5-Group" Rule)Every configuration must use exactly these signal_groups.HAC: rule_in, rule_out, delay_drivers, documentation_gaps, bundle_gaps.Ortho: core_criteria, delay_drivers, documentation, rule_outs, overrides.Endo: core_criteria, lab_evidence, external_evidence, care_gaps, overrides.5. The Comprehensive Schema (V9.1)The output must be a valid JSON object. All sections below are MANDATORY.5.1 Root: PlannerPlanJSON{
  "plan_metadata": { "plan_id": "UUID", "planner_version": "9.1.0", "status": "draft" },
  "rationale": { 
    "summary": "...", 
    "key_decisions": [], 
    "pediatric_focus_areas": [],
    "archetype_selection_reason": "Selected [Archetype] because intent is [Intent]..."
  },
  "clinical_config": { /* Sections 5.2 - 5.8 */ },
  "validation": { /* Section 6 */ }
}
5.2 config_metadata & domainJSON{
  "config_metadata": {
    "config_id": "string",
    "name": "string",
    "concern_id": "string",
    "version": "string",
    "archetype": "Preventability_Detective | Process_Auditor | Data_Scavenger | Exclusion_Hunter",
    "domain": "HAC | Orthopedics | Endocrinology | Quality",
    "created_at": "ISO8601",
    "status": "draft | active"
  },
  "domain": {
    "name": "HAC | Orthopedics | Endocrinology | Quality",
    "display_name": "string (user-friendly name)",
    "description": "string (brief description of domain focus)"
  }
}
5.3 clinical_tools (Dependency Root)JSON[
  {
    "tool_id": "string",
    "name": "string",
    "use_case": "risk_scoring | unit_conversion | reference_lookup",
    "ui_hint": "inline | modal | background",
    "inputs": ["string"],
    "outputs": ["string"],
    "pediatric_notes": "string (Validation Source)"
  }
]
5.4 surveillance & timelineSurveillance: objective, population, detection_window, reporting_frameworks.Timeline: phases (pre_event, peri_event, post_event).5.5 signals (The Engine)
Rule: Must use the 5 Required Groups. Must link to tool_id. Must specify evidence_type (L1/L2/L3).

SIGNAL SELECTION RULES (CRITICAL):

1. For each signal_group, first enumerate ALL clinically meaningful candidate signals.
   - For each candidate, set:
     - priority: "MUST_HAVE" | "NICE_TO_HAVE"
     - reason: short rationale

2. Then select the final signals for the plan:
   - Include ALL "MUST_HAVE" signals.
   - Add "NICE_TO_HAVE" signals only until you reach at most 5 signals per group.
   - If there are fewer than 5 clinically meaningful signals, return fewer. DO NOT invent weak or redundant signals just to reach 5.

3. In each signal_group, populate:
   - `selection_summary`: {
       total_candidates,
       must_have_candidates,
       selected_signals,
       excluded_signals_with_reasons
     }

4. You must always fill `id`, `name`, `evidence_type`, and `provenance` for every selected signal.5.5 criteria (Granular Logic)JSON{
  "rules": [
    {
      "rule_id": "string",
      "name": "string",
      "logic_type": "boolean_expression | threshold_check",
      "expression": "string (e.g., 'sig_a AND sig_b')",
      "provenance": { "source": "SPS", "confidence": 1.0 }
    }
  ]
}
5.6 questions (Granular Interactivity)JSON{
  "metric_questions": [
    {
      "question_id": "string",
      "text": "string",
      "category": "inclusion | exclusion | preventability",
      "sme_status": "draft | verified",
      "display_order": 1,
      "evidence_rules": {
        "required_signals": ["string"],
        "suggested_evidence_type": ["L1", "L3"]
      }
    }
  ]
}
5.7 prompts (Task Definitions & Schema Binding)Must explicitly bind agent tasks to internal schemas.JSON{
  "system_prompt": "string",
  "task_prompts": {
    "patient_event_summary": {
      "instruction": "string",
      "output_schema_ref": "Schema_PatientEventSummary"
    },
    "enrichment": {
      "instruction": "string",
      "output_schema_ref": "Schema_SignalEnrichment"
    },
    "qa": {
      "instruction": "string",
      "output_schema_ref": "Schema_QAReport"
    }
  }
}
5.8 fieldMappings (EHR Binding)JSON{
  "signal_id_key": {
    "ehr_path": ["string"],
    "fhir_resource": "Observation",
    "transform_function": "string (optional)"
  }
}
6. Validation Framework (Closed Loop)The Planner MUST generate this object. Use the errors array to block deployment.JSON"validation": {
  "checklist": {
    "schema_completeness": { "result": "YES|NO", "severity": "CRITICAL" },
    "domain_structure_5_groups": { "result": "YES|NO", "severity": "CRITICAL" },
    "provenance_safety": { "result": "YES|NO", "severity": "CRITICAL" },
    "pediatric_compliance": { "result": "YES|NO", "severity": "HIGH" },
    "dependency_integrity": { "result": "YES|NO", "severity": "CRITICAL" }
  },
  "is_valid": true,
  "errors": [
    { "code": "ERR_MISSING_TOOL", "message": "Signal 'sig_x' links to undefined tool 'tool_y'." }
  ],
  "warnings": [
    { "code": "WARN_LOW_CONFIDENCE", "message": "Signal 'sig_z' has confidence < 0.7." }
  ]
}
Logic:Run Checklist.If CRITICAL fail -> Set is_valid: false, append to errors.If HIGH fail -> Append to warnings.7. Execution PromptRole: Clinical Insight Factory Planner (V9.1).Task: Convert planning_input to PlannerPlan.Steps:Ingest: Parse planning_input.Lookup: Assign Domain/Archetype via Matrix.Draft: Create Rationale.Construct: Build clinical_config (Tools -> Surveillance -> Signals (5-Group) -> Questions -> Prompts).Validate: Run Checklist, populate errors/warnings.Output: JSON Only.8. Appendix: Structural Examples8.1 Example: CLABSI (HAC)JSON{
  "config_metadata": { "archetype": "Preventability_Detective", "domain": "HAC" },
  "domain": { "name": "HAC", "display_name": "Hospital-Acquired Conditions", "description": "CLABSI surveillance" },
  "clinical_tools": [ { "tool_id": "tool_device_days", "ui_hint": "inline", "use_case": "risk_scoring" } ],
  "surveillance": { "objective": "Detect CLABSI per SPS", "population": "PICU" },
  "signals": {
    "signal_groups": [
      { "group_id": "rule_in", "signals": [ { "id": "sig_pos_culture", "evidence_type": "L1", "linked_tool_id": "tool_device_days" } ] },
      { "group_id": "rule_out", "signals": [...] },
      { "group_id": "delay_drivers", "signals": [...] },
      { "group_id": "documentation_gaps", "signals": [...] },
      { "group_id": "bundle_gaps", "signals": [...] }
    ]
  },
  "questions": {
    "metric_questions": [
       { "question_id": "q_mbi", "text": "Is this MBI?", "sme_status": "verified", "category": "exclusion" }
    ]
  },
  "validation": { "is_valid": true, "errors": [], "warnings": [] }
}