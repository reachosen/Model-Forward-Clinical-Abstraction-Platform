/**
 * Revision Agent
 *
 * Handles partial revision of generated plans based on human feedback.
 * Only updates the specified section while keeping other parts intact.
 */

import { PlanRevisionRequest, RevisionMetadata } from '../../models/PlanRevision';
import { PlanningInput } from '../../models/PlanningInput';
import { PlannerPlan } from '../../models/PlannerPlan';
import { validatePlan } from './validatePlan';
import { assessPlanQuality } from './qa';

/**
 * Revise a specific section of an existing plan
 *
 * @param revision - Revision request with type, remark, and original plan
 * @param useMock - If true, use mock mode instead of LLM
 * @returns Updated plan with revised section
 */
export async function reviseSection(
  revision: PlanRevisionRequest,
  useMock: boolean = false
): Promise<PlannerPlan> {
  const { revision_type, remark, original_input, original_output } = revision;

  console.log(`\n🔄 Revising Plan: ${revision_type}`);
  console.log(`   Original Plan: ${original_output.plan_metadata.plan_id}`);
  console.log(`   Remark: ${remark.substring(0, 100)}${remark.length > 100 ? '...' : ''}`);

  // Dispatch to specific revision handler
  let revisedPlan: PlannerPlan;

  switch (revision_type) {
    case 'signals':
      revisedPlan = await reviseSignals(remark, original_input, original_output, useMock);
      break;
    case 'questions':
      revisedPlan = await reviseQuestions(remark, original_input, original_output, useMock);
      break;
    case 'rules':
      revisedPlan = await reviseRules(remark, original_input, original_output, useMock);
      break;
    case 'phases':
      revisedPlan = await revisePhases(remark, original_input, original_output, useMock);
      break;
    case 'prompt':
      revisedPlan = await revisePrompt(remark, original_input, original_output, useMock);
      break;
    case 'full':
    default:
      revisedPlan = await runFullPlannerWithRemark(remark, original_input, original_output, useMock);
      break;
  }

  // Add revision metadata
  const revisionMetadata: RevisionMetadata = {
    revision_type,
    remark,
    revised_at: new Date().toISOString(),
    previous_plan_id: original_output.plan_metadata.plan_id,
  };

  // Store revision history (extend plan_metadata if needed)
  (revisedPlan.plan_metadata as any).revision = revisionMetadata;

  // Re-validate the revised plan
  const validation = validatePlan(revisedPlan);
  revisedPlan.validation = validation as any;

  // Re-assess quality (V2 field)
  const quality = assessPlanQuality(revisedPlan, original_input);
  (revisedPlan as any).quality = quality;

  console.log(`   ✅ Revision complete`);
  console.log(`   New Plan ID: ${revisedPlan.plan_metadata.plan_id}`);
  console.log(`   Validation: ${validation.is_valid ? 'PASS' : 'FAIL'}`);
  console.log(`   Quality Grade: ${quality?.overall_grade || 'N/A'}`);

  return revisedPlan;
}

/**
 * Revise signals only
 */
async function reviseSignals(
  remark: string,
  input: PlanningInput,
  original: PlannerPlan,
  useMock: boolean
): Promise<PlannerPlan> {
  if (useMock) {
    return mockReviseSignals(remark, input, original);
  }

  // TODO: LLM-based signal revision
  console.log(`⚠️  LLM mode not yet implemented for signal revision, using mock`);
  return mockReviseSignals(remark, input, original);
}

/**
 * Mock signal revision (pattern-based)
 */
function mockReviseSignals(
  remark: string,
  input: PlanningInput,
  original: PlannerPlan
): PlannerPlan {
  const revised = JSON.parse(JSON.stringify(original)); // Deep clone

  // Update plan ID
  revised.plan_metadata.plan_id = `${original.plan_metadata.plan_id}-rev-signals-${Date.now()}`;
  revised.plan_metadata.generated_at = new Date().toISOString();

  // Apply heuristic changes based on remark
  const remark_lower = remark.toLowerCase();

  if (revised.clinical_config?.signals?.signal_groups) {
    // If remark mentions "too many" or "reduce", reduce signal count
    if (remark_lower.includes('too many') || remark_lower.includes('reduce') || remark_lower.includes('fewer')) {
      revised.clinical_config.signals.signal_groups = revised.clinical_config.signals.signal_groups.map((group: any) => ({
        ...group,
        signal_types: group.signal_types?.slice(0, Math.ceil(group.signal_types.length * 0.6)) || [],
      }));

      // Add to rationale
      if (!revised.rationale.concerns) {
        revised.rationale.concerns = [];
      }
      revised.rationale.concerns.push(`Signal count reduced based on feedback: ${remark}`);
    }

    // If remark mentions "add" or "missing", indicate need for specific signals
    if (remark_lower.includes('add') || remark_lower.includes('missing')) {
      if (!revised.rationale.recommendations) {
        revised.rationale.recommendations = [];
      }
      revised.rationale.recommendations.push(`Consider adding signals mentioned in feedback: ${remark}`);
    }
  }

  return revised;
}

/**
 * Revise questions only
 */
async function reviseQuestions(
  remark: string,
  input: PlanningInput,
  original: PlannerPlan,
  useMock: boolean
): Promise<PlannerPlan> {
  if (useMock) {
    return mockReviseQuestions(remark, input, original);
  }

  // TODO: LLM-based question revision
  console.log(`⚠️  LLM mode not yet implemented for question revision, using mock`);
  return mockReviseQuestions(remark, input, original);
}

/**
 * Mock question revision
 */
function mockReviseQuestions(
  remark: string,
  input: PlanningInput,
  original: PlannerPlan
): PlannerPlan {
  const revised = JSON.parse(JSON.stringify(original)); // Deep clone

  revised.plan_metadata.plan_id = `${original.plan_metadata.plan_id}-rev-questions-${Date.now()}`;
  revised.plan_metadata.generated_at = new Date().toISOString();

  const remark_lower = remark.toLowerCase();

  if (revised.questions?.usnwr_questions) {
    // If remark mentions "too many", reduce question count
    if (remark_lower.includes('too many') || remark_lower.includes('reduce')) {
      revised.questions.usnwr_questions = revised.questions.usnwr_questions.slice(0, Math.ceil(revised.questions.usnwr_questions.length * 0.6));

      if (!revised.rationale.concerns) {
        revised.rationale.concerns = [];
      }
      revised.rationale.concerns.push(`Question count reduced based on feedback: ${remark}`);
    }

    // If remark mentions "add" or "missing"
    if (remark_lower.includes('add') || remark_lower.includes('missing')) {
      if (!revised.rationale.recommendations) {
        revised.rationale.recommendations = [];
      }
      revised.rationale.recommendations.push(`Consider adding questions mentioned in feedback: ${remark}`);
    }
  }

  return revised;
}

/**
 * Revise rules only
 */
async function reviseRules(
  remark: string,
  input: PlanningInput,
  original: PlannerPlan,
  useMock: boolean
): Promise<PlannerPlan> {
  if (useMock) {
    return mockReviseRules(remark, input, original);
  }

  // TODO: LLM-based rules revision
  console.log(`⚠️  LLM mode not yet implemented for rules revision, using mock`);
  return mockReviseRules(remark, input, original);
}

/**
 * Mock rules revision
 */
function mockReviseRules(
  remark: string,
  input: PlanningInput,
  original: PlannerPlan
): PlannerPlan {
  const revised = JSON.parse(JSON.stringify(original)); // Deep clone

  revised.plan_metadata.plan_id = `${original.plan_metadata.plan_id}-rev-rules-${Date.now()}`;
  revised.plan_metadata.generated_at = new Date().toISOString();

  if (revised.clinical_config?.criteria?.rules) {
    // Add note about rule revision
    if (!revised.rationale.recommendations) {
      revised.rationale.recommendations = [];
    }
    revised.rationale.recommendations.push(`HAC criteria may need revision based on feedback: ${remark}`);
  }

  return revised;
}

/**
 * Revise phases only
 */
async function revisePhases(
  remark: string,
  input: PlanningInput,
  original: PlannerPlan,
  useMock: boolean
): Promise<PlannerPlan> {
  if (useMock) {
    return mockRevisePhases(remark, input, original);
  }

  // TODO: LLM-based phases revision
  console.log(`⚠️  LLM mode not yet implemented for phases revision, using mock`);
  return mockRevisePhases(remark, input, original);
}

/**
 * Mock phases revision
 */
function mockRevisePhases(
  remark: string,
  input: PlanningInput,
  original: PlannerPlan
): PlannerPlan {
  const revised = JSON.parse(JSON.stringify(original)); // Deep clone

  revised.plan_metadata.plan_id = `${original.plan_metadata.plan_id}-rev-phases-${Date.now()}`;
  revised.plan_metadata.generated_at = new Date().toISOString();

  const remark_lower = remark.toLowerCase();

  if (revised.clinical_config?.timeline?.phases) {
    // If remark mentions "simplify" or "rename"
    if (remark_lower.includes('simplify') || remark_lower.includes('rename') || remark_lower.includes('clinical')) {
      if (!revised.rationale.recommendations) {
        revised.rationale.recommendations = [];
      }
      revised.rationale.recommendations.push(`Phase names may need simplification based on feedback: ${remark}`);
    }
  }

  return revised;
}

/**
 * Revise prompt/guidance
 */
async function revisePrompt(
  remark: string,
  input: PlanningInput,
  original: PlannerPlan,
  useMock: boolean
): Promise<PlannerPlan> {
  // Prompt revision affects future runs, not this plan
  // For now, just return original with note
  const revised = JSON.parse(JSON.stringify(original));

  revised.plan_metadata.plan_id = `${original.plan_metadata.plan_id}-rev-prompt-${Date.now()}`;
  revised.plan_metadata.generated_at = new Date().toISOString();

  if (!revised.rationale.recommendations) {
    revised.rationale.recommendations = [];
  }
  revised.rationale.recommendations.push(
    `Prompt guidance to be updated for future runs: ${remark}`
  );

  console.log(`   ℹ️  Prompt revision noted for future planning runs`);

  return revised;
}

/**
 * Full regeneration with remark as guidance
 */
async function runFullPlannerWithRemark(
  remark: string,
  input: PlanningInput,
  original: PlannerPlan,
  useMock: boolean
): Promise<PlannerPlan> {
  // For full revision, delegate to main planner but inject remark as guidance
  // This would call the main planHAC or planUSNWR functions
  // For now, return a mock full revision

  console.log(`   ℹ️  Full revision: would regenerate entire plan with guidance: ${remark}`);

  const revised = JSON.parse(JSON.stringify(original));
  revised.plan_metadata.plan_id = `${original.plan_metadata.plan_id}-rev-full-${Date.now()}`;
  revised.plan_metadata.generated_at = new Date().toISOString();

  if (!revised.rationale.key_decisions) {
    revised.rationale.key_decisions = [];
  }
  revised.rationale.key_decisions.push({
    decision: 'Full plan regeneration requested',
    reasoning: remark,
    alternatives_considered: ['Partial revision', 'No changes'],
  });

  return revised;
}

/**
 * System prompt for LLM-based revision (for future implementation)
 */
export const REVISION_AGENT_SYSTEM_PROMPT = `You are revising ONE part of an existing clinical review plan for a U.S. freestanding pediatric hospital.

## Context

You see:
- The original PlanningInput (what was requested)
- The original generated plan/config
- A human remark explaining what to change
- A revision_type that limits what you can modify

## Your Task

Based on the revision_type, you are ONLY allowed to modify:
- "signals": signal_groups and signal_types
- "questions": USNWR abstraction questions
- "rules": HAC surveillance criteria/rules
- "phases": timeline phases (names, descriptions, sequence)
- "prompt": prompt/guidance fields

## Rules

1. **Keep all other parts intact** - do not modify sections outside your revision_type
2. **Preserve IDs** - maintain existing IDs for items you're not changing
3. **Follow pediatric focus** - all changes must maintain pediatric-specific considerations
4. **Be surgical** - make the minimum changes needed to address the remark
5. **Validate changes** - ensure revised section is internally consistent

## Output Format

Return ONLY the updated subsection as JSON, in the same structure as the original.

For example, if revision_type is "signals", return:
{
  "signal_groups": [
    // updated signal groups only
  ]
}

The system will merge this back into the full plan.`;
