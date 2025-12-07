// Spec: docs/PromptSpecs/SignalEnrichment.md
/**
 * Metric-agnostic signal enrichment prompt generator
 * Dynamically builds extraction instructions based on semantic packet
 */
export function getSignalEnrichmentCoreBody(context: any): string {
  const { ortho_context, archetype } = context;
  const metric = ortho_context?.metric;
  const signals = ortho_context?.signals;

  // Build dynamic signal group list from metric definition
  const signalGroupIds = metric?.signal_groups || ['delay_drivers', 'outcome_risks', 'safety_signals', 'documentation_gaps'];
  const signalGroupList = signalGroupIds.map((gid: string) => {
    const sigs = signals?.[gid] || [];
    return `- **${gid}**: ${sigs.length > 0 ? sigs.slice(0, 3).join(', ') + (sigs.length > 3 ? '...' : '') : 'extract relevant signals'}`;
  }).join('\n');

  // Build extraction requirements from risk_factors
  const riskFactorInstructions = (metric?.risk_factors || []).map((rf: string, idx: number) =>
    `${idx + 1}. Look for evidence related to: ${rf}`
  ).join('\n');

  // Build review question guidance
  const reviewQuestionGuidance = (metric?.review_questions || []).map((rq: string) =>
    `- Extract signals that help answer: "${rq}"`
  ).join('\n');

  // Metric name and focus for anchor
  const metricName = metric?.metric_name || 'the specified clinical metric';
  const clinicalFocus = metric?.clinical_focus || 'clinical quality and safety';

  return `
**TASK:**
Analyze the encounter context below and extract clinical signals relevant to:
${riskFactorInstructions || '1. Key clinical events and their timing\n2. Risk indicators and safety signals\n3. Documentation completeness\n4. Outcome-relevant findings'}

Use ONLY the patient_payload as your factual source.

**TARGET SIGNAL GROUPS:**
${signalGroupList}

**REQUIRED JSON SCHEMA:**
{
  "signal_groups": [
    {
      "group_id": "string (one of: ${signalGroupIds.join(', ')})",
      "signals": [
        {
          "signal_id": "<short id>",
          "description": "<short clinical description>",
          "evidence_type": "verbatim_text | structured_field",
          "provenance": "<exact text snippet supporting this signal>"
        }
      ]
    }
  ]
}

**STRICT RULES:**
- DO NOT invent facts, timestamps, symptoms, or documentation.
- DO NOT use guidelines, protocols, best-practice teaching, or general clinical theory.
- Every signal MUST have provenance: a verbatim text snippet from patient_payload.
- All extracted signals MUST be directly relevant to evaluating ${metricName}.

**EXTRACTION GUIDANCE:**
${reviewQuestionGuidance || '- Extract signals that help determine metric compliance\n- Identify timing-related evidence\n- Note any documentation gaps'}

**SIGNAL TYPE PRIORITIES:**
${archetype === 'Process_Auditor' ? `
TIMING & PROCESS SIGNALS (Priority for Process_Auditor):
- Extract ALL timestamps that influence metric timing evaluation
- Capture scheduling, arrival, procedure start/end times
- Note any stated or implied causes of delay
- Flag unexplained temporal gaps as documentation_gaps
` : ''}
${archetype === 'Preventability_Detective' || archetype === 'Preventability_Detective_Metric' ? `
PREVENTABILITY SIGNALS (Priority for Preventability analysis):
- Bundle compliance and protocol adherence evidence
- Infection prevention measures and gaps
- Root cause indicators for adverse events
- Modifiable risk factors present or addressed
` : ''}
${archetype === 'Exclusion_Hunter' ? `
EXCLUSION CRITERIA SIGNALS (Priority for Exclusion analysis):
- Evidence supporting metric inclusion or exclusion
- Contraindications or special circumstances
- Documentation of exclusion criteria evaluation
` : ''}

SAFETY SIGNALS (All archetypes):
- Complications or near-misses documented
- Red flag symptoms or findings
- Escalation events or code situations

DOCUMENTATION GAPS (All archetypes):
- Missing required assessments or evaluations
- Incomplete procedural documentation
- Ambiguities that prevent metric determination

**QUALITY EXPECTATIONS:**
- Prefer fewer high-yield signals over many low-value ones.
- Keep descriptions short and clinical.
- Ensure every signal helps evaluate ${metricName}.

**REMINDER (METRIC ANCHOR):**
All extracted signals MUST help determine whether THIS case meets:

"${metricName}"

Clinical Focus: ${clinicalFocus}

Do NOT extract unrelated findings.
`;
}