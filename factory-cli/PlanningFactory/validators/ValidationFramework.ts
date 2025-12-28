/**
 * Validation Framework
 *
 * Enforces quality gates at every stage of the CPPO pipeline.
 * Implements 3-Tier Quality Model from QUALITY_CRITERIA.md
 */

import { StageId, ValidationResult, StageResult } from '../types';
import { recordGateOutcome } from '../../EvalsFactory/refinery/observation/ObservationHooks';

// ============================================================================
// Gate Policy
// ============================================================================

export enum GatePolicy {
  /**
   * HALT: Stage validation failed critically - stop pipeline
   * Used for: Tier 1 structural failures
   */
  HALT = 'HALT',

  /**
   * WARN: Stage validation has warnings - log but continue
   * Used for: Tier 2 semantic issues
   */
  WARN = 'WARN',

  /**
   * PASS: Stage validation passed completely
   */
  PASS = 'PASS',
}

export interface GateResult {
  stageId: StageId;
  policy: GatePolicy;
  validationResult: ValidationResult;
  message: string;
}

// ============================================================================
// Validation Framework
// ============================================================================

export class ValidationFramework {
  /**
   * Enforce quality gate for a stage
   *
   * @param stageId Stage identifier (S0-S6)
   * @param validationResult Result from stage's validate() method
   * @returns Gate decision (HALT, WARN, PASS)
   */
  static enforceGate(
    stageId: StageId,
    validationResult: ValidationResult
  ): GateResult {
    // Tier 1 Check: Critical errors = HALT
    if (!validationResult.passed && validationResult.errors.length > 0) {
      recordGateOutcome({
        stageId,
        gateResult: 'HALT',
        runId: validationResult.metadata?.runId,
      });
      return {
        stageId,
        policy: GatePolicy.HALT,
        validationResult,
        message: `🚫 [${stageId}] GATE BLOCKED - Tier 1 failure: ${validationResult.errors.join(', ')}`,
      };
    }

    // Tier 2 Check: Warnings only = WARN but continue
    if (validationResult.warnings.length > 0) {
      recordGateOutcome({
        stageId,
        gateResult: 'WARN',
        runId: validationResult.metadata?.runId,
      });
      return {
        stageId,
        policy: GatePolicy.WARN,
        validationResult,
        message: `⚠️  [${stageId}] GATE WARNING - Tier 2 issues: ${validationResult.warnings.join(', ')}`,
      };
    }

    // No issues = PASS
    recordGateOutcome({
      stageId,
      gateResult: 'PASS',
      runId: validationResult.metadata?.runId,
    });
    return {
      stageId,
      policy: GatePolicy.PASS,
      validationResult,
      message: `✅ [${stageId}] GATE PASSED`,
    };
  }

  /**
   * Log gate result to console
   */
  static logGate(gateResult: GateResult): void {
    console.log(gateResult.message);

    // Show details for non-passing gates
    if (gateResult.policy !== GatePolicy.PASS) {
      if (gateResult.validationResult.errors.length > 0) {
        console.log(`   ❌ Errors (${gateResult.validationResult.errors.length}):`);
        gateResult.validationResult.errors.forEach((err, i) => {
          console.log(`      ${i + 1}. ${err}`);
        });
      }

      if (gateResult.validationResult.warnings.length > 0) {
        console.log(`   ⚠️  Warnings (${gateResult.validationResult.warnings.length}):`);
        gateResult.validationResult.warnings.forEach((warn, i) => {
          console.log(`      ${i + 1}. ${warn}`);
        });
      }

      if (gateResult.validationResult.metadata) {
        console.log(`   📋 Context:`, gateResult.validationResult.metadata);
      }
    }
  }

  /**
   * Convert gate result to StageResult for manifest
   */
  static toStageResult(
    gateResult: GateResult,
    startTime: Date,
    endTime: Date
  ): StageResult {
    const status = gateResult.policy === GatePolicy.HALT ? 'failed' : 'success';

    return {
      stageId: gateResult.stageId,
      status,
      startTime,
      endTime,
      durationMs: endTime.getTime() - startTime.getTime(),
      validator: 'ValidationFramework',
      errors: gateResult.validationResult.errors,
      warnings: gateResult.validationResult.warnings,
    };
  }
}

// ============================================================================
// Stage-Specific Quality Criteria
// ============================================================================

/**
 * Quality criteria checklist for each stage
 * Maps to QUALITY_CRITERIA.md
 */
export const STAGE_QUALITY_CRITERIA: Record<StageId, string[]> = {
  S0: [
    'concern_id extracted successfully',
    'concern_id matches valid format (I25, CLABSI, etc.)',
    'concern_id is in known set (USNWR or HAC)',
  ],

  S1: [
    'domain and archetype resolved',
    'archetype is valid (Process_Auditor, Preventability_Detective, etc.)',
    'USNWR top 20: ranking_context populated',
    'HAC: ranking_context is null (safety focus)',
  ],

  S2: [
    '⭐ CRITICAL: Exactly 5 signal groups',
    'Signal group IDs match domain template',
    'HAC: uses HAC_GROUP_DEFINITIONS',
    'USNWR ranked: uses signal_emphasis from rankings',
    'USNWR unranked: uses domain defaults',
  ],

  S3: [
    'TaskGraph is a DAG (acyclic)',
    'All must_run nodes exist',
    'All task types are valid (signal_enrichment, event_summary, etc.)',
    'Edges reference valid node IDs',
  ],

  S4: [
    'All task nodes have corresponding prompt plan nodes',
    'Prompt template_id exists in registry',
    'response_format is valid (json, json_schema, text)',
    'If json_schema: schema_ref is provided',
  ],

  S5: [
    'All must_run tasks executed',
    'Each task output passes local validation',
    'signal_enrichment: all signals have evidence_type (L1/L2/L3)',
    'event_summary: mentions rank if USNWR top 20',
    '20_80_display_fields: ≤500 tokens',
    'clinical_review_plan: all tool_ids are valid',
  ],

  S6: [
    '⭐ CRITICAL: All 10 sections present (Tier 1)',
    '⭐ CRITICAL: Exactly 5 signal groups (Tier 1)',
    '⭐ CRITICAL: All signals have evidence_type (Tier 1)',
    '⭐ CRITICAL: No broken tool references (Tier 1)',
    'Signal groups match domain template (Tier 2)',
    'USNWR top 20: plan mentions rank (Tier 2)',
    'Signals cite authoritative sources (Tier 2)',
    'Pediatric-safe language (Tier 2)',
  ],
};

/**
 * Get quality criteria for a specific stage
 */
export function getStageQualityCriteria(stageId: StageId): string[] {
  return STAGE_QUALITY_CRITERIA[stageId] || [];
}

/**
 * Check if a stage has critical (Tier 1) criteria
 */
export function hasCriticalCriteria(stageId: StageId): boolean {
  const criteria = STAGE_QUALITY_CRITERIA[stageId];
  return criteria.some((c) => c.includes('⭐ CRITICAL'));
}
