/**
 * LLM-Powered Plan Generation - V9.1
 *
 * Phase 3: Strict V9.1 compliance with no auto-filling
 * - Removed normalizeHacConfig() to enforce strict validation
 * - Unified generation pipeline (no HAC/USNWR branching)
 * - Comprehensive error messages for missing sections
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlanningInput } from '../models/PlanningInput';
import {
  PlannerPlan,
  ClinicalConfig,
  ArchetypeType,
  DomainType,
} from '../models/PlannerPlan';
import { callLLMForJSON } from './llmClient';
import { validatePlanV91 } from './validateV91';

/**
 * Build JSON schema for structured outputs
 * Enforces exact signal group structure
 */
function buildSignalGroupSchema(requiredGroupIds: string[]) {
  return {
    type: "object",
    properties: {
      clinical_config: {
        type: "object",
        properties: {
          signals: {
            type: "object",
            properties: {
              signal_groups: {
                type: "array",
                minItems: 5,
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    group_id: {
                      type: "string",
                      enum: requiredGroupIds  // Only allow specified group IDs!
                    },
                    signals: {
                      type: "array",
                      minItems: 1,
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          evidence_type: {
                            type: "string",
                            enum: ["L1", "L2", "L3"]
                          }
                        },
                        required: ["id", "evidence_type"],
                        additionalProperties: true  // Allows linked_tool_id and other optional fields
                      }
                    }
                  },
                  required: ["group_id", "signals"],
                  additionalProperties: false  // Strict mode requires false
                }
              }
            },
            required: ["signal_groups"],
            additionalProperties: false  // Strict mode requires false
          }
        },
        required: ["signals"],
        additionalProperties: false  // Strict mode requires false
      }
    },
    required: ["clinical_config"],
    additionalProperties: false  // Strict mode requires false
  };
}

interface PlannerConfig {
  apiKey?: string;
  model?: string;
  useMock?: boolean;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Load planner system prompt - V9.1 by default
 */
function loadPlannerSystemPrompt(): string {
  // V9.1 is now the default (Phase 3)
  const version = process.env.PLANNER_PROMPT_VERSION || 'v9.1';
  const fileName = version ? `plannerPrompt_${version}.md` : 'plannerPrompt.md';
  const promptPath = path.join(__dirname, fileName);

  if (!fs.existsSync(promptPath)) {
    throw new Error(
      `Planner prompt not found: ${promptPath}\n` +
      `Expected version: ${version}\n` +
      `Set PLANNER_PROMPT_VERSION environment variable to use a different version.`
    );
  }

  return fs.readFileSync(promptPath, 'utf-8');
}

/**
 * PHASE 3: Strict V9.1 Parser - NO AUTO-FILLING
 *
 * This function validates that the LLM response contains all mandatory sections
 * and adheres to V9.1 specification. It FAILS FAST if anything is missing.
 */
function parseStrictV91Plan(response: any, input: PlanningInput): ClinicalConfig {
  const errors: string[] = [];

  // CRITICAL: Check root structure
  const clinicalConfig = response.clinical_config || response;

  // V9.1 Section 6.1: Schema Completeness Check
  const requiredSections = [
    'config_metadata',
    'clinical_tools',
    'surveillance',
    'signals',
    'timeline',
    'criteria',
    'questions',
    'prompts',
    'fieldMappings',
    'domain',
  ];

  for (const section of requiredSections) {
    if (!clinicalConfig[section]) {
      errors.push(`CRITICAL: Missing mandatory section '${section}'`);
    }
  }

  // If critical sections are missing, fail immediately
  if (errors.length > 0) {
    throw new Error(
      `V9.1 Schema Completeness FAILED:\n${errors.join('\n')}\n\n` +
      `The LLM must generate ALL mandatory sections. ` +
      `Phase 3 does not auto-fill missing data.\n` +
      `Please review the prompt (${process.env.PLANNER_PROMPT_VERSION || 'v9.1'}) ` +
      `and ensure it instructs the LLM to generate complete schemas.`
    );
  }

  // V9.1 Section 6.2: 5-Group Rule Enforcement
  const signalGroups = clinicalConfig.signals?.signal_groups || [];
  if (signalGroups.length !== 5) {
    errors.push(
      `CRITICAL: Domain Structure violation - Expected exactly 5 signal groups, got ${signalGroups.length}`
    );
  }

  // V9.1 Section 6.4: Evidence Typing Check
  const evidenceErrors: string[] = [];
  for (const group of signalGroups) {
    for (const signal of group.signals || []) {
      if (!signal.evidence_type) {
        evidenceErrors.push(`Signal '${signal.id || signal.name}' missing evidence_type`);
      } else if (!['L1', 'L2', 'L3'].includes(signal.evidence_type)) {
        evidenceErrors.push(
          `Signal '${signal.id}' has invalid evidence_type: '${signal.evidence_type}' ` +
          `(must be 'L1', 'L2', or 'L3')`
        );
      }
    }
  }

  if (evidenceErrors.length > 0) {
    errors.push(`CRITICAL: Evidence typing violations:\n  - ${evidenceErrors.join('\n  - ')}`);
  }

  // V9.1 Section 6.5: Dependency Integrity (signals ↔ tools)
  const toolIds = new Set(
    (clinicalConfig.clinical_tools || []).map((t: any) => t.tool_id)
  );
  const dependencyErrors: string[] = [];

  for (const group of signalGroups) {
    for (const signal of group.signals || []) {
      if (signal.linked_tool_id && !toolIds.has(signal.linked_tool_id)) {
        dependencyErrors.push(
          `Signal '${signal.id}' references undefined tool '${signal.linked_tool_id}'`
        );
      }
    }
  }

  if (dependencyErrors.length > 0) {
    errors.push(`CRITICAL: Dependency integrity violations:\n  - ${dependencyErrors.join('\n  - ')}`);
  }

  // If any critical errors occurred, fail
  if (errors.length > 0) {
    throw new Error(
      `V9.1 Validation FAILED:\n${errors.join('\n\n')}\n\n` +
      `This plan does not meet V9.1 requirements and cannot be used.`
    );
  }

  return clinicalConfig as ClinicalConfig;
}

/**
 * Build V9.1 User Prompt with Ranking Intelligence
 */
function buildV91UserPrompt(
  input: PlanningInput,
  archetype: ArchetypeType,
  domain: DomainType
): string {
  // Import ranking utilities
  const { getRankingContext, getSignalEmphasis, getTopPerformerBenchmarks } = require('../utils/rankingsLoader');

  // Get ranking context if available (only for top 20 specialties)
  const rankingContext = getRankingContext(input.concern);
  const signalEmphasis = getSignalEmphasis(domain);
  const topPerformerBenchmarks = getTopPerformerBenchmarks(domain);

  // Build base prompt
  let prompt = `Generate a V9.1-compliant clinical configuration for the following:

PLANNING INPUT:
- Concern: ${input.concern}
- Domain: ${domain}
- Archetype: ${archetype}
- Intent: ${input.intent}
- Target Population: ${input.target_population}
${input.specific_requirements.length > 0 ? `- Requirements: ${input.specific_requirements.join(', ')}` : ''}
`;

  // Inject ranking context if available (drives quality toward #1)
  if (rankingContext) {
    prompt += `
INSTITUTIONAL CONTEXT:
${rankingContext}

⚠️ CRITICAL: This institution's ranking depends on clinical quality in this domain.
Focus on these REQUIRED signal groups for ${domain}:
- ${signalEmphasis.map((sg: string) => sg.replace(/_/g, ' ')).join('\n- ')}

These signal groups MUST be included in your configuration to align with top performer practices.
`;
  }

  // Inject top performer benchmarks for competitive intelligence
  if (topPerformerBenchmarks) {
    prompt += topPerformerBenchmarks;
    prompt += `\n⚠️ YOUR TASK: Design signal groups and prompts that can measure and track these quality differentiators.
The system_prompt should reference ranking position and quality improvement goals.
`;
  }

  prompt += `

CRITICAL V9.1 REQUIREMENTS:
1. ALL signals MUST have 'evidence_type' field set to 'L1', 'L2', or 'L3'
2. Generate EXACTLY 5 signal groups (no more, no less)
3. Include ALL mandatory sections: config_metadata, clinical_tools, surveillance, signals, timeline, criteria, questions, prompts, fieldMappings, domain
4. If linking signals to tools, ensure the tool exists in clinical_tools array
5. Target population is PEDIATRIC - use only pediatric-appropriate guidelines
6. The system_prompt in the 'prompts' section MUST include context about ranking position (#${rankingContext ? rankingContext.match(/#(\d+)/)?.[1] || 'unknown' : 'unknown'}) and quality improvement goals

⚠️ CRITICAL - PRE-DEFINED SIGNAL GROUPS FOR ${domain}:
You MUST populate ALL ${signalEmphasis.length} signal groups below. DO NOT skip any, DO NOT change the group_ids.
Each group needs 1-3 clinically relevant signals with evidence_type (L1, L2, or L3).

MANDATORY STRUCTURE - Fill in the signals array for each group:
{
  "signal_groups": [
${signalEmphasis.map((sg: string, idx: number) => `    {
      "group_id": "${sg}",
      "signals": [
        // TODO: Add 1-3 signals here that detect ${sg.replace(/_/g, ' ')}
        // Each signal must have: "id", "evidence_type" (L1/L2/L3)
        // Optional: "linked_tool_id" (only if tool exists in clinical_tools)
      ]
    }${idx < signalEmphasis.length - 1 ? ',' : ''}`).join('\n')}
  ]
}

Your task: Replace the TODO comments with actual signal definitions.
IMPORTANT: Before linking a signal to a tool (linked_tool_id), ensure that tool exists in clinical_tools array.

ARCHETYPE GUIDANCE FOR ${archetype}:
${getArchetypeGuidance(archetype)}

Generate the complete clinical_config object now.`;

  return prompt;
}

/**
 * Get archetype-specific guidance
 */
function getArchetypeGuidance(archetype: ArchetypeType): string {
  switch (archetype) {
    case 'Preventability_Detective':
      return '- Focus on preventable harm detection\n- Emphasize bundle compliance and care gaps\n- Track timing of preventive interventions';
    case 'Process_Auditor':
      return '- Focus on process adherence and timing\n- Track delays and deviations from protocols\n- Emphasize documentation completeness';
    case 'Data_Scavenger':
      return '- Focus on data completeness and quality\n- Identify missing lab values and documentation\n- Track external data sources';
    case 'Exclusion_Hunter':
      return '- Focus on identifying exclusion criteria\n- Emphasize rule-out signals\n- Track competing diagnoses';
    default:
      return '- Follow V9.1 specification strictly';
  }
}

/**
 * PHASE 3: Unified Plan Generation with LLM
 *
 * Single entry point for all plan generation (replaces HAC/USNWR split)
 */
export async function generatePlanWithLLM(
  input: PlanningInput,
  archetype: ArchetypeType,
  domain: DomainType,
  config: PlannerConfig,
  planId: string
): Promise<PlannerPlan> {
  console.log(`   🤖 Generating V9.1 plan with LLM (${archetype})...`);

  const systemPrompt = loadPlannerSystemPrompt();
  let userPrompt = buildV91UserPrompt(input, archetype, domain);

  // Get required signal groups for schema enforcement
  const { getSignalEmphasis } = require('../utils/rankingsLoader');
  const requiredSignalGroups = getSignalEmphasis(domain);

  // Check if model supports structured outputs (gpt-4o-2024-08-06 or later)
  const model = config.model || 'gpt-4o';
  // Structured outputs with strict:true is too restrictive for optional fields
  // The improved prompts + retry logic work well without it
  const supportsStructuredOutputs = false;

  const maxAttempts = 3;
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (attempt > 1) {
      console.log(`   🔄 Retry attempt ${attempt}/${maxAttempts}...`);
      // Add validation feedback to prompt
      userPrompt += `\n\n⚠️ PREVIOUS ATTEMPT FAILED WITH ERRORS:\n${lastError}\n\nPlease fix these issues and try again.`;
    }

    let response: any;
    try {
      const llmConfig: any = {
        apiKey: config.apiKey,
        model,
        temperature: config.temperature ?? 0.1,  // Low temp for strict schema compliance
        maxTokens: config.maxTokens || 16000,  // Max for gpt-4o
      };

      // Add JSON schema for strict structure enforcement (if supported)
      if (supportsStructuredOutputs) {
        console.log(`   🔒 Using structured outputs with ${requiredSignalGroups.length} required signal groups`);
        llmConfig.jsonSchema = {
          name: 'clinical_config_v91',
          schema: buildSignalGroupSchema(requiredSignalGroups),
          strict: false  // Strict mode is too restrictive for optional fields
        };
      }

      response = await callLLMForJSON<any>(
        systemPrompt,
        userPrompt,
        llmConfig
      );
    } catch (error: any) {
      throw new Error(
        `LLM generation failed: ${error.message}\n` +
        `This may be due to network issues, API key problems, or prompt size.`
      );
    }

    // STRICT PARSING - No normalization, fail fast
    let clinicalConfig: ClinicalConfig;
    try {
      clinicalConfig = parseStrictV91Plan(response, input);

      // Success! Break out of retry loop
      lastError = null;

      // Continue with rest of the function (moved outside the loop)
      return buildFinalPlan(clinicalConfig, response, input, config, planId, archetype);

    } catch (error: any) {
      lastError = error.message;
      console.warn(`   ⚠️  Attempt ${attempt} validation failed: ${error.message.split('\n')[0]}`);

      if (attempt === maxAttempts) {
        // Final attempt failed
        console.error('   ❌ All retry attempts exhausted');
        throw error;
      }
      // Continue to next attempt
    }
  }

  // Should never reach here, but TypeScript needs it
  throw new Error('Plan generation failed after all retry attempts');
}

/**
 * Build the final PlannerPlan object with validation
 * Extracted to separate function for retry logic
 */
function buildFinalPlan(
  clinicalConfig: ClinicalConfig,
  response: any,
  input: PlanningInput,
  config: PlannerConfig,
  planId: string,
  archetype: ArchetypeType
): PlannerPlan {

  // Extract rationale from LLM response
  const rationale = response.rationale || {
    summary: 'LLM-generated V9.1 configuration',
    key_decisions: [],
    pediatric_focus_areas: [],
    archetype_selection_reason: `Selected ${archetype} via Archetype Matrix`,
  };

  // Build V9.1 compliant plan (initial structure, validation added below)
  const plan: PlannerPlan = {
    plan_metadata: {
      plan_id: planId,
      planner_version: '9.1.0',
      status: 'draft',
      planning_input_id: input.planning_input_id || `input_${Date.now()}`,
      generated_at: new Date().toISOString(),
      model_used: config.model || 'gpt-4o',
    },
    rationale: {
      summary: rationale.summary,
      key_decisions: rationale.key_decisions || [],
      pediatric_focus_areas: rationale.pediatric_focus_areas || ['Age-appropriate criteria'],
      archetype_selection_reason: `Selected ${archetype} via Metric-to-Archetype Matrix`,
      concerns: rationale.concerns || [],
      recommendations: rationale.recommendations || [],
    },
    clinical_config: clinicalConfig,
    validation: {
      // Will be populated immediately below with REAL validation results
      checklist: [],
      tiers: { tier1_passed: false, tier2_has_critical: false },
      summary: { critical_count: 0, high_count: 0, medium_count: 0, info_count: 0 },
    } as any,  // Temporary type to allow immediate validation below
  };

  // TIER 1 + 2: Run comprehensive V9.1 validation and populate REAL checklist
  console.log(`   🔍 Running V9.1 validation...`);
  const validationResult = validatePlanV91(plan);
  plan.validation = validationResult as any;  // Attach real validation results

  // Log validation summary
  if (!validationResult.tiers.tier1_passed) {
    console.warn(`   ❌ Tier 1 (Structural) FAILED - plan has critical issues`);
  } else {
    console.log(`   ✅ Tier 1 (Structural) PASSED`);
  }

  if (validationResult.tiers.tier2_has_critical) {
    console.warn(`   ⚠️  Tier 2 (Semantic) has CRITICAL issues`);
  } else {
    console.log(`   ✅ Tier 2 (Semantic) PASSED`);
  }

  // Log issues if any
  const failedChecks = validationResult.checklist.filter(c => !c.passed);
  if (failedChecks.length > 0) {
    console.warn(`   ℹ️  Validation issues (${failedChecks.length}):`);
    failedChecks.slice(0, 3).forEach(check => {
      console.warn(`      - [${check.severity}] ${check.id}: ${check.message}`);
    });
    if (failedChecks.length > 3) {
      console.warn(`      ... and ${failedChecks.length - 3} more`);
    }
  }

  console.log(`   ✅ V9.1 plan generated successfully`);
  return plan;
}

// ==========================================
// DEPRECATED: Legacy Functions (Phase 3)
// These are kept for backward compatibility during migration
// ==========================================

/**
 * @deprecated Use generatePlanWithLLM() instead
 * This function is maintained for backward compatibility only
 */
export async function generateHACPlanWithLLM(
  input: PlanningInput,
  config: PlannerConfig,
  planId: string,
  validationWarnings: string[] = []
): Promise<PlannerPlan> {
  console.warn('   ⚠️  generateHACPlanWithLLM() is deprecated. Use generatePlanWithLLM() instead.');

  // Infer archetype and domain for legacy calls
  const archetype: ArchetypeType = 'Preventability_Detective'; // Default HAC archetype
  const domain: DomainType = 'HAC';

  return generatePlanWithLLM(input, archetype, domain, config, planId);
}

/**
 * @deprecated Use generatePlanWithLLM() instead
 * This function is maintained for backward compatibility only
 */
export async function generateUSNWRPlanWithLLM(
  input: PlanningInput,
  config: PlannerConfig,
  planId: string,
  validationWarnings: string[] = []
): Promise<PlannerPlan> {
  console.warn('   ⚠️  generateUSNWRPlanWithLLM() is deprecated. Use generatePlanWithLLM() instead.');

  // Infer archetype and domain for legacy calls
  const archetype: ArchetypeType = 'Process_Auditor'; // Default USNWR archetype
  const domain: DomainType = 'Orthopedics';

  return generatePlanWithLLM(input, archetype, domain, config, planId);
}
