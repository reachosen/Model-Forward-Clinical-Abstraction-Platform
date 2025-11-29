/**
 * Research-Augmented Planner
 *
 * Generates plans enhanced with research context from authoritative sources
 */

import { PlanningInput } from '../models/PlanningInput';
import { PlannerPlanV2 } from '../models/PlannerPlan';
import { ResearchBundle } from '../models/ResearchBundle';
import { Provenance } from '../models/Provenance';
import { callLLMForJSON } from './llmClient';
import { assessPlanQuality } from './qualityAssessment';
import { HAC_GROUP_DEFINITIONS, ORTHO_GROUP_DEFINITIONS, ENDO_GROUP_DEFINITIONS } from './domainRouter';
import * as crypto from 'crypto';

export interface PlannerConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

/**
 * Generate plan with research augmentation
 */
export async function generatePlanWithResearch(
  input: PlanningInput,
  research: ResearchBundle,
  config: PlannerConfig
): Promise<PlannerPlanV2> {
  console.log(`\n🛠 Generating plan with research context...`);

  // Build enhanced system prompt with research
  const systemPrompt = buildResearchAugmentedPrompt(research);

  // Build user prompt
  const userPrompt = buildUserPrompt(input, research);

  console.log(`   → Model: ${config.model || 'gpt-4o-mini'}`);
  console.log(`   → Sources: ${research.sources.length}`);
  console.log(`   → Clinical Tools: ${research.clinical_tools.length}`);
  console.log(`   → Timeout: ${Math.round((config.timeout || 180000) / 1000)}s (extended for complex generation)`);

  // Call LLM (with extended timeout for complex plan generation)
  const llmResponse = await callLLMForJSON(systemPrompt, userPrompt, {
    apiKey: config.apiKey,
    model: config.model || 'gpt-4o-mini',
    temperature: config.temperature ?? 0.7,
    maxTokens: config.maxTokens || 12000,
    timeout: config.timeout || 180000  // 3 minutes for research-augmented planning
  });

  // Generate plan ID
  const planId = generatePlanId(input.concern_id!, input.domain);

  // Build plan with enhanced metadata
  const plan: PlannerPlanV2 = {
    plan_metadata: {
      plan_id: planId,
      plan_version: '1.0.0',
      schema_version: '2.0.0',
      planning_input_id: input.planning_id || 'unknown',

      concern: {
        concern_id: input.concern_id!,
        concern_type: isHACConcern(input.concern_id!) ? 'HAC' : 'USNWR',
        domain: typeof input.domain === 'string' ? input.domain : (input.domain?.name || 'general'),
        care_setting: inferCareSetting(typeof input.domain === 'string' ? input.domain : (input.domain?.name || ''))
      },

      workflow: {
        mode: 'research_plan_implement',
        generated_at: new Date().toISOString(),
        generated_by: `planner-cli-v2.0.0`,
        model_used: config.model || 'gpt-4o-mini'
      },

      status: {
        deployment_status: 'draft',
        requires_review: false,
        last_modified: new Date().toISOString(),
        modified_by: 'system'
      }
    },

    quality: {
      // Will be calculated below
      overall_score: 0,
      deployment_ready: false,
      quality_grade: 'D',
      dimensions: {} as any,
      quality_gates: {} as any,
      flagged_areas: [],
      recommendations: []
    },

    provenance: buildProvenance(research),

    clinical_config: llmResponse.clinical_config || llmResponse.hac_config || llmResponse,

    validation: {
      checklist: {
        schema_completeness: { result: 'YES', severity: 'CRITICAL' },
        domain_structure_5_groups: { result: 'YES', severity: 'HIGH' },
        provenance_safety: { result: 'YES', severity: 'HIGH' },
        pediatric_compliance: { result: 'YES', severity: 'CRITICAL' },
        dependency_integrity: { result: 'YES', severity: 'MEDIUM' }
      },
      is_valid: true,
      errors: [],
      warnings: []
    }
  };

  // Assess quality
  console.log(`\n✓ Assessing plan quality...`);
  const quality = assessPlanQuality(plan);
  plan.quality = quality;

  // Update validation based on quality
  if (!quality.deployment_ready) {
    plan.validation.errors.push({
      code: 'QUALITY_THRESHOLD',
      message: `Plan quality below deployment threshold (${Math.round(quality.overall_score * 100)}%)`
    });
    plan.validation.is_valid = false;
  }

  // Log results
  console.log(`\n✓ Plan Generation Complete`);
  console.log(`   Overall Score: ${Math.round(quality.overall_score * 100)}% (Grade ${quality.quality_grade})`);
  console.log(`   Spec Compliance: ${Math.round((quality.dimensions.spec_compliance?.score || 0) * 100)}%`);
  console.log(`   Clinical Accuracy: ${Math.round(quality.dimensions.clinical_accuracy.score * 100)}%`);
  console.log(`   Deployment Ready: ${quality.deployment_ready ? 'YES ✅' : 'NO ❌'}`);

  return plan;
}

/**
 * Build research-augmented system prompt
 */
function buildResearchAugmentedPrompt(research: ResearchBundle): string {
  let prompt = `You are a clinical abstraction planning expert generating configurations based on AUTHORITATIVE SOURCES.\n\n`;

  prompt += `# RESEARCH CONTEXT\n\n`;
  prompt += `Concern: ${research.concern_id}\n`;
  prompt += `Domain: ${research.domain}\n`;
  prompt += `Research Coverage: ${Math.round(research.coverage.coverage_score * 100)}%\n\n`;

  // Add each source
  prompt += `# AUTHORITATIVE SOURCES\n\n`;
  research.sources.forEach((source, idx) => {
    prompt += `## Source ${idx + 1}: ${source.authority}\n`;
    prompt += `Title: ${source.title}\n`;
    prompt += `Version: ${source.version}\n`;
    prompt += `URL: ${source.url}\n\n`;

    if (source.content.inclusion_criteria) {
      prompt += `Inclusion Criteria:\n`;
      source.content.inclusion_criteria.forEach(c => prompt += `- ${c}\n`);
      prompt += `\n`;
    }

    if (source.content.exclusion_criteria) {
      prompt += `Exclusion Criteria:\n`;
      source.content.exclusion_criteria.forEach(c => prompt += `- ${c}\n`);
      prompt += `\n`;
    }

    if (source.content.bundle_elements) {
      prompt += `Prevention Bundle Elements:\n`;
      source.content.bundle_elements.forEach(e => prompt += `- ${e}\n`);
      prompt += `\n`;
    }

    if (source.content.measurement_period) {
      prompt += `Measurement Period: ${source.content.measurement_period}\n`;
    }

    if (source.content.reporting_unit) {
      prompt += `Reporting Unit: ${source.content.reporting_unit}\n`;
    }

    prompt += `\n---\n\n`;
  });

  // Add clinical tools
  if (research.clinical_tools.length > 0) {
    prompt += `# CLINICAL TOOLS AVAILABLE\n\n`;
    research.clinical_tools.forEach(tool => {
      prompt += `## ${tool.tool_name} (${tool.version})\n`;
      prompt += `URL: ${tool.url}\n`;
      prompt += `Use Case: ${tool.use_case}\n`;
      prompt += `Pediatric Validated: ${tool.pediatric_validated ? 'Yes' : 'No'}\n`;
      prompt += `Inputs: ${tool.inputs.join(', ')}\n`;
      prompt += `Outputs: ${tool.outputs.join(', ')}\n\n`;

      if (tool.computation_logic) {
        prompt += `Computation Logic:\n`;
        Object.entries(tool.computation_logic).forEach(([key, value]) => {
          prompt += `- ${key}: ${value}\n`;
        });
      }

      prompt += `\n`;
    });
  }

  // Generation rules
  prompt += `# GENERATION RULES\n\n`;
  prompt += `1. PROVENANCE REQUIRED: Every signal and criterion MUST include a 'provenance' field\n`;
  prompt += `   - source: The authoritative source name (e.g., "CDC NHSN CLABSI Definition v2025")\n`;
  prompt += `   - source_url: The URL of the source\n`;
  prompt += `   - source_section: Optional - specific section (e.g., "Inclusion Criteria #2")\n`;
  prompt += `   - confidence: 0.95-0.99 for directly sourced, 0.85-0.94 for inferred\n\n`;

  prompt += `2. SPEC ALIGNMENT: Ensure 100% alignment with the provided sources\n`;
  prompt += `   - Use exact terminology from sources when possible\n`;
  prompt += `   - If sources conflict, prefer the most specific source\n`;
  prompt += `   - Document any necessary adaptations\n\n`;

  prompt += `3. CLINICAL TOOLS: Integrate clinical tools as signals when relevant\n`;
  prompt += `   - For each clinical tool, generate 1-3 signals based on outputs\n`;
  prompt += `   - Include tool provenance in signal metadata\n\n`;

  prompt += `4. PEDIATRIC CONTEXT: This is for a pediatric hospital\n`;
  prompt += `   - Adapt criteria for pediatric populations when needed\n`;
  prompt += `   - Consider age-specific thresholds and presentations\n\n`;

  return prompt;
}

/**
 * Build user prompt
 */
function buildUserPrompt(input: PlanningInput, research: ResearchBundle): string {
  const isHAC =
    !!research.concern_id &&
    /CLABSI|CAUTI|VAP|VAE|SSI/i.test(research.concern_id);

  const domain =
    typeof input.domain === "string"
      ? input.domain
      : input.domain?.name || "general";

  const concernId = research.concern_id || "ClinicalConcern";
  const createdAtIso = new Date().toISOString();
  const archetype = input.archetype || (isHAC ? "HAC" : "USNWR");

  // V9.1: Determine signal groups based on domain (move to top for use in all sections)
  const domainStr = domain;
  const domainLower = domainStr.toLowerCase();

  // Use generic type to allow different group definitions
  let groupDefs: Array<{ group_id: string; display_name: string; description: string; priority: number }>;
  if (domainLower.includes('ortho') || domainLower.includes('cardio')) {
    groupDefs = ORTHO_GROUP_DEFINITIONS as any;
  } else if (domainLower.includes('endo') || domainLower.includes('diabetes')) {
    groupDefs = ENDO_GROUP_DEFINITIONS as any;
  } else {
    groupDefs = HAC_GROUP_DEFINITIONS as any;
  }

  // V9.1: Always use group_id (unified across all domains)
  const exampleGroupId = groupDefs[0].group_id;

  const clinicalToolsSection =
    (research.clinical_tools || [])
      .map((tool) => {
        const inputs = (tool.inputs || []).join(", ");
        const outputs = (tool.outputs || []).join(", ");
        return `- TOOL: ${tool.tool_name}
  Inputs: ${inputs}
  Outputs: ${outputs}
  REQUIREMENT: Generate one signal per output in "${exampleGroupId}" group (first/primary group).
  Each signal MUST have:
    - group_id: "${exampleGroupId}"
    - evidence_type: "L2" (derived from clinical tool)
    - provenance: { source: "${tool.tool_name}", source_url: "${tool.url}", confidence: 0.95 }`;
      })
      .join("\n") || "- No clinical tools provided.";

  const sourcesSection =
    (research.sources || [])
      .map((s, idx) => {
        const inclCount = s.content?.inclusion_criteria?.length ?? 0;
        const exclCount = s.content?.exclusion_criteria?.length ?? 0;
        const bundleCount = s.content?.bundle_elements?.length ?? 0;
        return `${idx + 1}. "${s.authority || "Unknown"}" - ${s.title || "Untitled Source"} (${s.version || "v1"})
   URL: ${s.url}
   Inclusion criteria: ${inclCount}
   Exclusion criteria: ${exclCount}
   Bundle elements: ${bundleCount}`;
      })
      .join("\n") || "None provided.";

  const groupInstructions = `You MUST create all 5 signal groups. Each signal MUST use "group_id" field:

REQUIRED GROUPS (${domainStr} domain):
${groupDefs.map((g, idx) => `${idx + 1}. ${g.group_id} (priority: ${g.priority})
   Display: "${g.display_name}"
   Purpose: ${g.description}
   Signals: ${idx === 0 ? '5-8 signals from inclusion criteria/core measures' : idx === 1 ? '3-5 signals from exclusion criteria or delay factors' : '1-3 signals'}
`).join('\n')}

Target: ${isHAC ? '15-25' : '10-16'} signals total across all groups.
CRITICAL: Every signal MUST include:
- group_id: one of [${groupDefs.map(g => `"${g.group_id}"`).join(', ')}]
- evidence_type: "L1" (direct), "L2" (derived), or "L3" (narrative)
- provenance: { source, source_url, confidence }`;

  return `Generate a ${concernId} surveillance configuration for the "${domain}" domain.

CRITICAL: Return ONLY a single valid JSON object with NO wrapper keys.
- Do NOT wrap in "hac_config", "HACConfig", or any other key
- Do NOT include comments in JSON
- Do NOT use placeholder text like "<fill this>" or "TBD"
- ALL fields MUST be populated with real content derived from sources

================================================================
REQUIRED JSON STRUCTURE (V9.1 EXACT FORMAT)
================================================================

{
  "config_metadata": {
    "config_id": "config-${concernId.toLowerCase()}-v1",
    "name": "${concernId} Detection Configuration",
    "concern_id": "${concernId}",
    "version": "1.0.0",
    "archetype": "${archetype}",
    "domain": "${domainStr}",
    "created_at": "${createdAtIso}",
    "status": "draft"
  },

  "domain": "${domainStr}",

  "surveillance": {
    "objective": "Derive from research sources - describe the surveillance goal",
    "population": "Derive from research sources - define target population",
    "detection_window": {
      "lookback_days": 30,
      "lookahead_days": 7
    },
    "reporting_frameworks": ["${isHAC ? 'NHSN' : 'USNWR'}"]
  },

  "signals": {
    "signal_groups": [
      {
        "group_id": "${exampleGroupId}",
        "display_name": "${groupDefs[0].display_name}",
        "description": "${groupDefs[0].description}",
        "priority": ${groupDefs[0].priority},
        "signals": [
          {
            "id": "${concernId.toLowerCase()}_example_signal_001",
            "name": "Example Signal From Source",
            "description": "Map from inclusion criteria or core measure in research source",
            "group_id": "${exampleGroupId}",
            "evidence_type": "L1",
            "trigger_expr": "Derive from source criteria - e.g., device.type == 'central_line'",
            "severity": "warn",
            "provenance": {
              "source": "Source name from research bundle",
              "source_url": "Source URL from research bundle",
              "source_section": "Specific section reference",
              "confidence": 0.95
            }
          }
        ]
      }
    ]
  },

  "timeline": {
    "phases": [
      {
        "phase_id": "baseline",
        "display_name": "Baseline Period",
        "description": "Clinical status before index event",
        "timing": "pre_event",
        "duration": { "typical_days": 2 }
      },
      {
        "phase_id": "event",
        "display_name": "Event Period",
        "description": "Period of clinical significance",
        "timing": "peri_event",
        "duration": { "typical_days": 3 }
      },
      {
        "phase_id": "surveillance",
        "display_name": "Surveillance Period",
        "description": "Ongoing monitoring period",
        "timing": "post_event",
        "duration": { "typical_days": 7 }
      }
    ]
  },

  "prompts": {
    "system_prompt": "You are a ${concernId} surveillance agent for clinical abstraction. Your role is to identify and evaluate cases based on authoritative ${isHAC ? 'NHSN' : 'USNWR'} criteria.",
    "task_prompts": {
      "patient_event_summary": {
        "instruction": "Generate patient event summary for ${concernId}",
        "output_schema_ref": "patient_event_summary_schema"
      },
      "enrichment": {
        "instruction": "Extract and structure relevant clinical signals for ${concernId} surveillance in ${domainStr} setting",
        "output_schema_ref": "enrichment_schema"
      },
      "qa": {
        "instruction": "Evaluate against ${isHAC ? 'NHSN regulatory criteria' : 'USNWR metric definitions'} and generate determination",
        "output_schema_ref": "qa_schema"
      }
    }
  },

  "criteria": {
    "rules": [
      {
        "rule_id": "${concernId.toLowerCase()}_inc_01",
        "name": "Primary Inclusion Criterion",
        "description": "Full criterion text from authoritative source",
        "logic_type": "boolean_expression",
        "expression": "Specific evaluation logic for this criterion",
        "provenance": {
          "source": "Source name from research bundle",
          "source_url": "Source URL from research bundle",
          "confidence": 0.95
        }
      }
    ]
  },

  "questions": {
    "metric_questions": []
  }
}

================================================================
SIGNAL GROUP INSTRUCTIONS
================================================================

${groupInstructions}

CRITICAL: Every signal MUST include "group_id" field (one of the ${groupDefs.length} required groups above).

================================================================
CRITERIA MAPPING INSTRUCTIONS (MANDATORY)
================================================================

Convert research source criteria into criteria.rules array:

1. For EACH inclusion criterion in sources:
   - Create ONE rule with rule_id: "${concernId.toLowerCase()}_inc_##"
   - Use exact text from source as description
   - Add provenance linking to that source
   - Framework: "${isHAC ? 'NHSN' : 'USNWR'}"

2. For EACH exclusion criterion in sources:
   - Create ONE rule with rule_id: "${concernId.toLowerCase()}_exc_##"
   - Same structure as inclusion rules

3. ${isHAC ? 'For EACH prevention bundle element (optional):' : 'For denominator logic:'}
   - Create supporting rules as needed
   - Always include provenance

Target: ${isHAC ? '5-10 rules total' : '3-8 rules total'}
Minimum: At least ${isHAC ? '3' : '2'} rules REQUIRED.

================================================================
CLINICAL TOOLS → SIGNALS (MANDATORY)
================================================================

For each clinical tool, generate signals based on outputs:
${clinicalToolsSection}

Place tool-based signals in "${exampleGroupId}" group (first/primary group).

================================================================
PROVENANCE REQUIREMENTS (MANDATORY)
================================================================

- EVERY signal MUST have provenance object
- EVERY criterion/rule MUST have provenance object
- Use EXACT source names, URLs, and versions from research sources below
- confidence: 0.95-0.99 for direct source content
- confidence: 0.85-0.94 for inferred/adapted content
- NEVER invent sources - only use provided sources

================================================================
RESEARCH SOURCES AVAILABLE
================================================================

${sourcesSection}

================================================================
SIGNAL MAPPING FROM SOURCES (V9.1)
================================================================

Map source content to the 5 required signal groups:
${groupDefs.map((g, idx) => {
  if (idx === 0) {
    return `- Inclusion criteria / Core measures → "${g.group_id}" signals (group_id: "${g.group_id}")`;
  } else if (idx === 1) {
    return `- Exclusion criteria / Rule-outs → "${g.group_id}" signals (group_id: "${g.group_id}")`;
  } else if (g.group_id.includes('delay')) {
    return `- Pending results / External records needed → "${g.group_id}" signals (group_id: "${g.group_id}")`;
  } else if (g.group_id.includes('doc')) {
    return `- Missing documentation / Documentation gaps → "${g.group_id}" signals (group_id: "${g.group_id}")`;
  } else {
    return `- ${g.description} → "${g.group_id}" signals (group_id: "${g.group_id}")`;
  }
}).join('\n')}
- Clinical tools outputs → "${exampleGroupId}" signals (first group)

================================================================
PLANNING INPUT CONTEXT
================================================================

${JSON.stringify(input, null, 2)}

================================================================
FINAL V9.1 CHECKLIST
================================================================

Before returning JSON, verify:
✅ No wrapper keys ("hac_config", "HACConfig", etc.)
✅ All 5 signal groups present (${groupDefs.map(g => `"${g.group_id}"`).join(', ')})
✅ All signals have "group_id" field (one of the 5 groups above)
✅ All signals have "evidence_type" field ("L1", "L2", or "L3")
✅ All signals have "provenance" object with source, source_url, confidence
✅ All criteria/rules have "logic_type" and "expression" (NOT "logic")
✅ All criteria/rules have provenance
✅ Clinical tools converted to signals in "${exampleGroupId}" group
✅ Signal count within target (${isHAC ? '15-25' : '10-16'} total)
✅ Criteria count within target (${isHAC ? '5-10' : '3-8'} total)
✅ domain field is string "${domainStr}" (NOT an object)
✅ reporting_frameworks field (NOT reporting.frameworks)
✅ task_prompts are objects with instruction and output_schema_ref (NOT strings)
✅ No placeholder text or comments in JSON`;
}

/**
 * Build provenance metadata
 */
function buildProvenance(research: ResearchBundle): Provenance {
  return {
    research_enabled: true,
    research_bundle_id: research.research_id,
    sources: research.sources.map(s => ({
      authority: s.authority,
      title: s.title,
      version: s.version,
      url: s.url,
      fetched_at: s.fetched_at,
      cache_status: s.cache_status,
      cached_date: s.cached_date,
      checksum: s.checksum,
      elements_sourced: s.elements_sourced || []
    })),
    clinical_tools: research.clinical_tools,
    conflicts_resolved: research.conflicts
  };
}

/**
 * Generate meaningful, deterministic plan ID
 */
function generatePlanId(
  concernId: string,
  domain: string | { name: string } | undefined,
  timestamp: Date = new Date()
): string {
  const domainStr = typeof domain === 'string'
    ? domain
    : (domain?.name || 'general');

  const cleanConcern = concernId.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanDomain = domainStr.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
  const dateStr = timestamp.toISOString().split('T')[0].replace(/-/g, '');

  const hashInput = `${concernId}-${domainStr}-${timestamp.toISOString()}`;
  const hash = crypto.createHash('sha256')
    .update(hashInput)
    .digest('hex')
    .substring(0, 8);

  return `plan_${cleanConcern}_${cleanDomain}_${dateStr}_${hash}`;
}

/**
 * Check if concern is HAC-related
 */
function isHACConcern(concernId: string): boolean {
  return ['CLABSI', 'CAUTI', 'VAP', 'VAE', 'SSI'].includes(concernId.toUpperCase()) ||
         concernId.startsWith('HAC_');
}

/**
 * Infer care setting from domain
 */
function inferCareSetting(domain: string): string {
  const domainLower = domain.toLowerCase();

  if (domainLower.includes('picu')) return 'pediatric_intensive_care';
  if (domainLower.includes('nicu')) return 'neonatal_intensive_care';
  if (domainLower.includes('icu')) return 'intensive_care';
  if (domainLower.includes('surgical') || domainLower.includes('or')) return 'surgical';
  if (domainLower.includes('emergency') || domainLower.includes('ed')) return 'emergency';

  return 'general_pediatric';
}
