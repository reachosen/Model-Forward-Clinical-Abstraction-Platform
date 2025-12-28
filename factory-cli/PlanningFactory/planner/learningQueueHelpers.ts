/**
 * Learning Queue Helpers
 *
 * Convenience functions for enqueuing rejected configs from UI/API.
 */

import { PlanningInput } from '../../models/PlanningInput';
import { PlannerPlan } from '../../models/PlannerPlan';
import { LearningQueueItem } from '../../models/LearningQueue';
import { enqueueLearningItem } from './learningQueueStorage';

/**
 * Derive domain type from archetype
 */
function deriveDomainType(archetype: string): 'HAC' | 'USNWR' {
  if (archetype.startsWith('HAC_') || archetype === 'device_associated_infection' || archetype === 'surgical_site_infection') {
    return 'HAC';
  }
  if (archetype.startsWith('USNWR_')) {
    return 'USNWR';
  }
  // Default fallback
  return archetype.toLowerCase().includes('hac') ? 'HAC' : 'USNWR';
}

/**
 * Derive review target from input or output
 */
function deriveReviewTarget(input: PlanningInput, output: PlannerPlan): string {
  // Priority: concern_id from input, then from output metadata
  if (input.concern_id) {
    return input.concern_id;
  }

  // Try to extract from plan_id (e.g., "plan-clabsi-123" -> "clabsi")
  if (output.plan_metadata?.plan_id) {
    const parts = output.plan_metadata.plan_id.split('-');
    if (parts.length > 1) {
      return parts[1].toUpperCase();
    }
  }

  // Fallback to archetype
  return input.archetype || 'UNKNOWN';
}

/**
 * Derive domain from input
 */
function deriveDomain(input: PlanningInput): string {
  if (typeof input.domain === 'string') {
    return input.domain;
  }
  if (input.domain && typeof input.domain === 'object' && 'name' in input.domain) {
    return (input.domain as any).name;
  }
  return 'general';
}

/**
 * Enqueue a rejected planner output for learning
 *
 * This is the main entry point from UI/API when an SME marks a config as "Needs Improvement".
 */
export function enqueueRejectedConfig(params: {
  input: PlanningInput;
  output: PlannerPlan;
  reviewer_comment: string;
  reviewer_name?: string;
}): LearningQueueItem {
  const { input, output, reviewer_comment, reviewer_name } = params;

  // Generate unique ID
  const id = `learning-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Derive metadata
  const archetype = input.archetype || 'UNKNOWN';
  const domain_type = deriveDomainType(archetype);
  const domain = deriveDomain(input);
  const review_target = deriveReviewTarget(input, output);

  // Create learning queue item
  const item: LearningQueueItem = {
    id,
    created_at: new Date().toISOString(),
    input,
    output,
    domain_type,
    archetype,
    domain,
    review_target,
    reviewer_comment,
    reviewer_name,
    status: 'pending',
  };

  // Enqueue
  enqueueLearningItem(item);

  console.log(`✅ Enqueued learning item: ${id}`);
  console.log(`   Type: ${domain_type} | Archetype: ${archetype} | Domain: ${domain}`);
  console.log(`   Review Target: ${review_target}`);
  console.log(`   Comment: ${reviewer_comment.substring(0, 100)}${reviewer_comment.length > 100 ? '...' : ''}`);

  return item;
}

/**
 * Batch enqueue multiple rejected configs
 */
export function enqueueBatch(items: Array<{
  input: PlanningInput;
  output: PlannerPlan;
  reviewer_comment: string;
  reviewer_name?: string;
}>): LearningQueueItem[] {
  return items.map(item => enqueueRejectedConfig(item));
}

/**
 * Validate that a config rejection has required fields
 */
export function validateRejectionRequest(params: {
  input?: PlanningInput;
  output?: PlannerPlan;
  reviewer_comment?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!params.input) {
    errors.push('Missing required field: input');
  }
  if (!params.output) {
    errors.push('Missing required field: output');
  }
  if (!params.reviewer_comment || params.reviewer_comment.trim().length === 0) {
    errors.push('Missing or empty reviewer_comment');
  }
  if (params.reviewer_comment && params.reviewer_comment.length < 10) {
    errors.push('reviewer_comment too short (minimum 10 characters)');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
