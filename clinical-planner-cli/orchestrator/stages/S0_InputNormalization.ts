/**
 * S0: Input Normalization & Routing
 *
 * Purpose: Validate input, extract concern_id, normalize structure
 * Reuses: intentInference.ts for free-text → structured metadata
 */

import { PlanningInput } from '../../models/PlannerPlan';
import { RoutedInput, ValidationResult } from '../types';
import { isConcernKnown } from '../../config/concernRegistry';
// REMOVED: inferPlanningMetadata import - inferred_metadata was not consumed downstream

export class S0_InputNormalizationStage {
  /**
   * Execute S0: Normalize and route the planning input
   */
  async execute(input: PlanningInput): Promise<RoutedInput> {
    console.log('📥 [S0] Starting Input Normalization & Routing');

    // Extract concern_id from the input
    const concern_id = this.extractConcernId(input);
    if (!concern_id) {
      throw new Error('[S0] Failed to extract concern_id from input');
    }

    console.log(`   Concern ID: ${concern_id}`);

    // REMOVED: inferred_metadata construction
    // Domain resolution is now handled entirely by S1 semantic packet lookup
    // This simplifies S0 to pure input normalization without LLM calls

    // Build routed input
    const routedInput: RoutedInput = {
      planning_input: input,
      concern_id,
      raw_domain: input.domain_hint,
    };

    console.log('✅ [S0] Input normalized successfully');
    return routedInput;
  }

  /**
   * Extract concern_id from PlanningInput
   *
   * Priority:
   * 1. Explicit concern_id field (if exists)
   * 2. Pattern matching from concern text (I25, C35, CLABSI, etc.)
   * 3. domain_hint mapping
   */
  private extractConcernId(input: PlanningInput): string | null {
    // Priority 1: Check if there's an explicit concern_id field
    if ('concern_id' in input && (input as any).concern_id) {
      return (input as any).concern_id;
    }

    // Priority 2: Extract from concern text using pattern matching
    const concernText = input.concern?.toUpperCase() || '';

    // USNWR patterns (I25, I26, C35, I32a, I25.1, etc.)
    // Matches: [ICP] + 2 digits + optional letter + optional dot extension
    const usnwrMatch = concernText.match(/\b([ICP]\d{2,3}([a-z])?(\.\d+)?)\b/);
    if (usnwrMatch) {
      return usnwrMatch[1];
    }

    // HAC patterns (CLABSI, CAUTI, VAP, SSI, PSI.09)
    const hacPatterns = [
      /\bCLABSI\b/,
      /\bCAUTI\b/,
      /\bVAP\b/,
      /\bSSI\b/,
      /\bPSI\.09\b/,
      /\bPSI09\b/,
    ];

    for (const pattern of hacPatterns) {
      const match = concernText.match(pattern);
      if (match) {
        return match[0].replace('PSI09', 'PSI.09');
      }
    }

    // Priority 3: Domain hint alone is NOT sufficient to determine concern_id
    // This is intentional - we want explicit concern IDs, not implicit mapping.
    // If only domain_hint is provided, S1 will use the semantic packet for resolution.
    if (input.domain_hint) {
      console.log(`[S0] Domain inference deferred – will use semantic packet in S1 for domain: ${input.domain_hint}`);
    }

    return null;
  }

  /**
   * Validate the routed input
   */
  validate(output: RoutedInput): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!output.concern_id) {
      errors.push('concern_id is required');
    }

    if (!output.planning_input) {
      errors.push('planning_input is required');
    }

    // Concern ID format validation (supports all USNWR formats: I25, I32a, C41.1a, K16.1a, etc.)
    const validConcernIdPattern = /^([A-Z]\d{2,3}([a-z])?(\.\d+[a-z]?\d?)?|CLABSI|CAUTI|VAP|SSI|PSI\.09|NICU\d+|ONCO\d+|UE)$/;
    if (output.concern_id && !validConcernIdPattern.test(output.concern_id)) {
      warnings.push(`concern_id format may be invalid: ${output.concern_id}`);
    }

    // Validate concern_id against centralized registry
    if (output.concern_id && !isConcernKnown(output.concern_id)) {
      // This is a warning, not an error - S1 may still resolve via semantic packet
      warnings.push(`concern_id '${output.concern_id}' not in registry – S1 will attempt semantic packet resolution`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metadata: {
        concern_id: output.concern_id,
        // REMOVED: has_metadata field - inferred_metadata no longer exists
      },
    };
  }
}
