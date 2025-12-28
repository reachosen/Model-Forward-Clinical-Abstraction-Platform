/**
 * Plan Revision Models
 *
 * Supports partial revision of generated plans based on human feedback.
 * Allows updating specific sections (signals, questions, rules, phases, prompt)
 * without regenerating the entire plan.
 */

import { PlanningInput } from './PlanningInput';
import { PlannerPlan } from './PlannerPlan';

/**
 * Revision Type - specifies which part of the plan to revise
 */
export type RevisionType =
  | 'signals'      // Revise signal groups and signal types
  | 'questions'    // Revise USNWR abstraction questions
  | 'rules'        // Revise HAC surveillance rules/criteria
  | 'phases'       // Revise timeline phases
  | 'prompt'       // Update prompt/guidance for future runs
  | 'full';        // Full regeneration with remark as guidance

/**
 * Plan Revision Request
 *
 * Captures human feedback and specifies what to revise in an existing plan.
 */
export interface PlanRevisionRequest {
  /**
   * What to revise
   */
  revision_type: RevisionType;

  /**
   * Human's explanation of what to change
   * Examples:
   * - "Too many signals, keep only core 8 for baseline period"
   * - "Add question about 30-day readmission"
   * - "Simplify phase names, use clinical terminology"
   */
  remark: string;

  /**
   * Original planning input
   */
  original_input: PlanningInput;

  /**
   * Original generated plan to revise
   */
  original_output: PlannerPlan;

  /**
   * Optional: Specific items to focus on
   * Examples:
   * - For signals: ["blood_culture_date", "line_insertion_date"]
   * - For questions: ["I25_Q1", "I25_Q2"]
   */
  focus_items?: string[];
}

/**
 * Revision Metadata
 *
 * Tracks revision history in the plan metadata.
 */
export interface RevisionMetadata {
  /**
   * Revision type applied
   */
  revision_type: RevisionType;

  /**
   * Human remark that triggered revision
   */
  remark: string;

  /**
   * When this revision was applied
   */
  revised_at: string;

  /**
   * ID of the plan that was revised
   */
  previous_plan_id: string;

  /**
   * Optional: Who requested the revision
   */
  revised_by?: string;
}
