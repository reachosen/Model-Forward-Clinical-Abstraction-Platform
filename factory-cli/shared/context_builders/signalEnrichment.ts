// Source: factory-cli/PlanningFactory/prompts/signalEnrichment.ts
// Migrated to Shared Library

export function getSignalEnrichmentVariables(context: any): Record<string, string> {
  const { ortho_context, archetypes } = context;
  const metric = ortho_context?.metric;
  const activeArchetypes = Array.isArray(archetypes) ? archetypes : [context.archetype];
  const signalGroupIds = metric?.signal_groups || ['delay_drivers', 'outcome_risks', 'safety_signals', 'documentation_gaps'];

  const expandedSignalGroups = signalGroupIds.map((gid: string) => {
      const groupSignals = ortho_context?.signals?.[gid] || [];
      const signalList = groupSignals.map((s: any) => {
          if (typeof s === 'string') return s;
          const desc = s.description || s.name || s.signal_id;
          const id = s.id || s.signal_id;
          return id ? `[${id}] ${desc}` : desc;
      }).join('\n  - ');
      return `${gid}:\n  - ${signalList}`;
  }).join('\n- ');

  const riskFactorInstructions = (metric?.risk_factors || []).map((rf: string, idx: number) =>
    `${idx + 1}. Look for evidence related to: ${rf}`
  ).join('\n') || '1. Key clinical events';

  const reviewQuestionGuidance = (metric?.review_questions || []).map((rq: string) =>
    `- Extract signals that help answer: "${rq}"`
  ).join('\n') || '- Extract signals';

  const metricName = metric?.metric_name || 'the specified clinical metric';
  const clinicalFocus = metric?.clinical_focus || 'clinical quality and safety';

  const priorityBlocks: string[] = [];
  const taggingInstruction = `
### CRITICAL: TAGGING RULE (For UI Filtering)
- You MUST populate the "tags" array for EVERY signal you extract.
- The tags MUST be chosen from this exact list: "${activeArchetypes.join('", "')}".
- If a signal is relevant to Process & Timing, tag it "Process_Auditor".
- If a signal is relevant to Delay Analysis, tag it "Delay_Driver_Profiler".
- If a signal serves both, include BOTH tags in the array: ["Process_Auditor", "Delay_Driver_Profiler"].
- NEVER leave the tags array empty.

### CRITICAL: PROVENANCE & TIMING RULES
1. **NO INVENTED PROVENANCE:** If you cannot find an exact substring copy-paste from the patient_payload, DO NOT include provenance. Omit the signal if no direct evidence exists.
2. **NO SUMMARY SENTENCES:** Provenance must be a raw quote, not a summary like "The patient arrived at...".
3. **TIMING GAPS:** If arrival or incision timestamps are missing, DO NOT create a 'delay_driver' signal describing the delay. Instead, create a 'documentation_gaps' signal stating "Missing arrival/incision timestamp".
4. **STRICT RELEVANCE:** Keep signals ONLY if they directly support adjudication (timing, perfusion, NV status, compartment risk).`;

  priorityBlocks.push(taggingInstruction);

  for (const arch of activeArchetypes) {
    if (arch === 'Process_Auditor') {
      priorityBlocks.push(`
TIMING & PROCESS SIGNALS (Archetype: Process_Auditor):
- Extract ALL timestamps that influence metric timing evaluation
- Capture scheduling, arrival, procedure start/end times
- Note any stated or implied causes of delay
- Flag unexplained temporal gaps as documentation_gaps`);
    } else if (arch === 'Preventability_Detective' || arch === 'Preventability_Detective_Metric') {
      priorityBlocks.push(`
PREVENTABILITY SIGNALS (Archetype: Preventability_Detective):
- Bundle compliance and protocol adherence evidence
- Infection prevention measures and gaps
- Root cause indicators for adverse events
- Modifiable risk factors present or addressed

SIGNS VS DIAGNOSIS:
1. **Prefer Signs:** Focus on symptoms and findings. Never output diagnosis signals (e.g., [surgical_site_infection]) unless the source text explicitly states the diagnosis.
2. **Mandatory ID Mapping:** Even if a sign appears benign or non-infectious, you MUST still emit the canonical signal ID if the finding is present.
   - *Exemplar:* If "redness" or "serous drainage" is noted, emit [wound_drainage_erythema] even if the note says "healing well".
3. **Clinical Mapping Rules:**
   - Map ANY mention of "readmitted", "back in ED", "return to hospital", or "presented to ER" to [unplanned_admission].
   - **MANDATORY:** If the narrative describes any return to care (ED, OR, or Admitted), you MUST output the [unplanned_admission] signal.
   - Map ANY mention of "preoperative antibiotics", "Ancef", "Cefazolin", or "Vanco" timing to [antibiotic_prophylaxis_timing].
4. **ZERO-PARAPHRASE RULE:** Provenance must be an EXACT substring copy. If you summarize (e.g., "no signs of infection" instead of quoting "incision clean"), the clinical audit will FAIL.
5. **GRANULARITY RULE:** Every signal entry MUST represent exactly ONE clinical finding. Do NOT combine findings (e.g., "fever and redness") into a single signal entry. Create separate entries for each.
6. **Tie-Breaker:** If both a sign-signal and diagnosis-signal seem applicable, choose the **more specific sign** signal.`);
    } else if (arch === 'Exclusion_Hunter') {
      priorityBlocks.push(`
EXCLUSION CRITERIA SIGNALS (Archetype: Exclusion_Hunter):
- Evidence supporting metric inclusion or exclusion
- Contraindications or special circumstances
- Documentation of exclusion criteria evaluation`);
    }
  }

  const archetypePriorities = priorityBlocks.join('\n');
  const duetPersona = `You are acting as a ${context.primary_archetype || 'Clinical_Reviewer'} for ${context.domain || 'Medical'} reviews.`;
  const ambiguityHandling = `If you encounter conflicting data (e.g., Physician Note says "Infection", Nursing Note says "No Infection"):
  1. Extract BOTH findings as separate signals.
  2. Preserve the provenance for each.
  3. Do NOT attempt to synthesize or resolve the conflict unless one note explicitly corrects the other (e.g. "Correction: previous note error").
  4. Tag these signals with "Ambiguity_Trigger".`;

  return {
    riskFactorInstructions,
    signalGroupIds: expandedSignalGroups,
    signalGroupIdsComma: signalGroupIds.join(', '),
    metricName,
    clinicalFocus,
    reviewQuestionGuidance,
    archetypePriorities,
    duetPersona,
    ambiguityHandling
  };
}