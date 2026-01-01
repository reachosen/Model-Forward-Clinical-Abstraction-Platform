// Source: factory-cli/PlanningFactory/prompts/signalEnrichment.ts
// Migrated to Shared Library for use by Planning, Evals, and Schema Factories.

export function getSignalEnrichmentVariables(context: any): Record<string, string> {
  const { ortho_context, archetypes } = context;
  const metric = ortho_context?.metric;
  
  // Use 'archetypes' (plural) from context, fallback to primary if only one exists
  const activeArchetypes = Array.isArray(archetypes) ? archetypes : [context.archetype];

  const signalGroupIds = metric?.signal_groups || ['delay_drivers', 'outcome_risks', 'safety_signals', 'documentation_gaps'];

  // Enhanced Signal Definitions: Expand group IDs into detailed lists of signals
  const expandedSignalGroups = signalGroupIds.map((gid: string) => {
      const groupSignals = ortho_context?.signals?.[gid] || [];
      const signalList = groupSignals.map((s: any) => 
          typeof s === 'string' ? s : (s.description || s.name || s.signal_id)
      ).join('\n  - ');
      return `${gid}:\n  - ${signalList}`;
  });

  const riskFactorInstructions = (metric?.risk_factors || []).map((rf: string, idx: number) =>
    `${idx + 1}. Look for evidence related to: ${rf}`
  ).join('\n');

  const reviewQuestionGuidance = (metric?.review_questions || []).map((rq: string) =>
    `- Extract signals that help answer: "${rq}"`
  ).join('\n');

  const metricName = metric?.metric_name || 'the specified clinical metric';
  const clinicalFocus = metric?.clinical_focus || 'clinical quality and safety';

  // Build aggregate archetype priorities for all active archetypes
  const priorityBlocks: string[] = [];
  
  // Tagging instruction for the LLM
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
- Modifiable risk factors present or addressed`);
    } else if (arch === 'Exclusion_Hunter') {
      priorityBlocks.push(`
EXCLUSION CRITERIA SIGNALS (Archetype: Exclusion_Hunter):
- Evidence supporting metric inclusion or exclusion
- Contraindications or special circumstances
- Documentation of exclusion criteria evaluation`);
    }
  }

  const archetypePriorities = priorityBlocks.join('\n');

  return {
    riskFactorInstructions: riskFactorInstructions || '1. Key clinical events and their timing\n2. Risk indicators and safety signals\n3. Documentation completeness\n4. Outcome-relevant findings',
    signalGroupIds: expandedSignalGroups.join('\n- '), // Now contains full details
    signalGroupIdsComma: signalGroupIds.join(', '),
    metricName,
    clinicalFocus,
    reviewQuestionGuidance: reviewQuestionGuidance || '- Extract signals that help determine metric compliance\n- Identify timing-related evidence\n- Note any documentation gaps',
    archetypePriorities
  };
}
