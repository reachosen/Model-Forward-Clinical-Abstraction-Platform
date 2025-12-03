/**
 * S0: Input Normalization & Routing
 *
 * Purpose: Validate input, extract concern_id, normalize structure
 * Reuses: intentInference.ts for free-text → structured metadata
 */

import { PlanningInput } from '../../models/PlannerPlan';
import { inferPlanningMetadata } from '../../planner/intentInference';
import { RoutedInput, ValidationResult, InferredMetadata } from '../types';
import { getAllConcernIds } from '../../config/concernRegistry';

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

    // Infer metadata using intentInference (pattern matching by default)
    let inferred_metadata: InferredMetadata | undefined;

    try {
      const metadata = await inferPlanningMetadata(
        input.concern || '',
        false // Use pattern matching, not LLM (faster for S0)
      );

      inferred_metadata = {
        domain_hints: metadata.clinical_domain ? [metadata.clinical_domain] : undefined,
        patient_context: metadata.review_template_type || undefined,
        confidence: metadata.confidence,
      };

      console.log(`   Inferred domain hints: ${inferred_metadata.domain_hints?.join(', ') || 'none'}`);
    } catch (error) {
      console.warn('[S0] Intent inference failed, continuing without metadata:', error);
      inferred_metadata = undefined;
    }

    // Build routed input
    const routedInput: RoutedInput = {
      planning_input: input,
      concern_id,
      raw_domain: input.domain_hint,
      inferred_metadata,
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

    // USNWR patterns (I25, I26, C35, etc.)
    const usnwrMatch = concernText.match(/\b([ICP]\d{2})\b/);
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

    // Priority 3: Map from domain_hint (fallback)
    const domainToConcernId: Record<string, string> = {
      'HAC': 'CLABSI', // Default HAC
      'orthopedics': 'I25',
      'endocrinology': 'I26',
      'cardiology': 'I21',
    };

    if (input.domain_hint && domainToConcernId[input.domain_hint]) {
      console.warn(`[S0] Using fallback concern_id from domain_hint: ${input.domain_hint}`);
      return domainToConcernId[input.domain_hint];
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

    // Load recognized concern IDs from centralized config
    const knownConcernIds = getAllConcernIds();

    if (output.concern_id && !knownConcernIds.includes(output.concern_id)) {
      warnings.push(`concern_id not in known set: ${output.concern_id}`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metadata: {
        concern_id: output.concern_id,
        has_metadata: !!output.inferred_metadata,
      },
    };
  }
}
