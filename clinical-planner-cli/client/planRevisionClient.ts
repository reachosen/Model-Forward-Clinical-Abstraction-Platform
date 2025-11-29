/**
 * Plan Revision Client
 *
 * Client-side helper functions for requesting plan revisions from the UI.
 * Use this in your Next.js frontend components.
 */

import { RevisionType } from '../models/PlanRevision';
import { PlanningInput } from '../models/PlanningInput';
import { PlannerPlan } from '../models/PlannerPlan';

/**
 * Request a plan revision from the backend
 *
 * @param revision_type - What to revise (signals/questions/rules/phases/prompt/full)
 * @param remark - Human explanation of what to change
 * @param input - Original planning input
 * @param output - Original generated plan
 * @param focus_items - Optional: specific items to focus on
 * @returns Revised plan
 *
 * @example
 * ```typescript
 * const revisedPlan = await requestPlanRevision(
 *   'signals',
 *   'Too many signals, keep only core 8 for baseline period',
 *   originalInput,
 *   originalPlan
 * );
 * ```
 */
export async function requestPlanRevision(
  revision_type: RevisionType,
  remark: string,
  input: PlanningInput,
  output: PlannerPlan,
  focus_items?: string[]
): Promise<PlannerPlan> {
  const response = await fetch('/api/hac/planner/revise', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      revision_type,
      remark,
      input,
      output,
      focus_items,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Revision failed: ${response.statusText}`
    );
  }

  return await response.json();
}

/**
 * Revise signals only
 *
 * Shorthand for requestPlanRevision with revision_type='signals'
 */
export async function reviseSignals(
  remark: string,
  input: PlanningInput,
  output: PlannerPlan
): Promise<PlannerPlan> {
  return requestPlanRevision('signals', remark, input, output);
}

/**
 * Revise questions only
 *
 * Shorthand for requestPlanRevision with revision_type='questions'
 */
export async function reviseQuestions(
  remark: string,
  input: PlanningInput,
  output: PlannerPlan
): Promise<PlannerPlan> {
  return requestPlanRevision('questions', remark, input, output);
}

/**
 * Revise rules only
 *
 * Shorthand for requestPlanRevision with revision_type='rules'
 */
export async function reviseRules(
  remark: string,
  input: PlanningInput,
  output: PlannerPlan
): Promise<PlannerPlan> {
  return requestPlanRevision('rules', remark, input, output);
}

/**
 * Revise phases only
 *
 * Shorthand for requestPlanRevision with revision_type='phases'
 */
export async function revisePhases(
  remark: string,
  input: PlanningInput,
  output: PlannerPlan
): Promise<PlannerPlan> {
  return requestPlanRevision('phases', remark, input, output);
}

/**
 * Full plan regeneration with remark as guidance
 *
 * Shorthand for requestPlanRevision with revision_type='full'
 */
export async function reviseFullPlan(
  remark: string,
  input: PlanningInput,
  output: PlannerPlan
): Promise<PlannerPlan> {
  return requestPlanRevision('full', remark, input, output);
}

/**
 * React Hook for plan revision (optional)
 *
 * Use this in React components for state management.
 *
 * @example
 * ```typescript
 * const { revise, isRevising, error } = usePlanRevision();
 *
 * const handleReviseSignals = async () => {
 *   const revised = await revise('signals', remark, input, output);
 *   setPlan(revised);
 * };
 * ```
 */
export function usePlanRevision() {
  const [isRevising, setIsRevising] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const revise = async (
    revision_type: RevisionType,
    remark: string,
    input: PlanningInput,
    output: PlannerPlan,
    focus_items?: string[]
  ): Promise<PlannerPlan> => {
    setIsRevising(true);
    setError(null);

    try {
      const revised = await requestPlanRevision(
        revision_type,
        remark,
        input,
        output,
        focus_items
      );
      return revised;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setIsRevising(false);
    }
  };

  return { revise, isRevising, error };
}

/**
 * Validation helper - check if revision request is valid
 */
export function validateRevisionRequest(
  revision_type: RevisionType,
  remark: string,
  input: PlanningInput | null | undefined,
  output: PlannerPlan | null | undefined
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!revision_type) {
    errors.push('revision_type is required');
  }

  const validTypes: RevisionType[] = [
    'signals',
    'questions',
    'rules',
    'phases',
    'prompt',
    'full',
  ];
  if (revision_type && !validTypes.includes(revision_type)) {
    errors.push(`Invalid revision_type: ${revision_type}`);
  }

  if (!remark || remark.trim().length === 0) {
    errors.push('remark is required and cannot be empty');
  }

  if (remark && remark.trim().length < 10) {
    errors.push('remark must be at least 10 characters');
  }

  if (!input) {
    errors.push('input is required');
  }

  if (!output) {
    errors.push('output is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Note: If using this in a React component, import React
// import * as React from 'react';
