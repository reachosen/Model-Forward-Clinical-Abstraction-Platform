/**
 * Learning Queue Model
 *
 * Captures rejected/flagged planner outputs for continuous improvement.
 * SMEs can mark configs as "needs improvement" and provide feedback.
 * Later, a human-triggered learning run proposes patches to libraries/rules.
 */

import { PlanningInput } from './PlanningInput';
import { PlannerPlan } from './PlannerPlan';

/**
 * Learning Queue Item
 *
 * Represents a single rejected or flagged planner output that needs improvement.
 */
export interface LearningQueueItem {
  id: string;                          // Unique ID (timestamp-based)
  created_at: string;                  // ISO timestamp

  // Original request and output
  input: PlanningInput;
  output: PlannerPlan;                 // The generated plan that was rejected

  // Metadata for categorization
  domain_type: 'HAC' | 'USNWR';
  archetype: string;                   // e.g., "HAC_CLABSI", "USNWR_CARDIO_METRIC"
  domain: string;                      // e.g., "pediatric_icu", "cardiology"
  review_target: string;               // e.g., "CLABSI", "I25"

  // Human feedback
  reviewer_comment: string;            // SME explanation of what was wrong/missing
  reviewer_name?: string;              // Optional: who flagged it

  // Lifecycle status
  status: 'pending' | 'draft_proposed' | 'patched' | 'discarded';
}

/**
 * Learning Patch
 *
 * Proposed improvement to libraries/rules/questions based on learning queue analysis.
 */
export interface LearningPatch {
  // What to patch
  target: 'signal_library' | 'rules' | 'questions' | 'prompt';
  archetype: string;
  domain: string;
  review_target: string;

  // Proposed changes (structure depends on target)
  proposed_changes: {
    // For signal_library
    signals_to_add?: Array<{
      id: string;
      name: string;
      category: string;
      priority: 'core' | 'supporting' | 'optional';
      rationale: string;
    }>;
    signals_to_remove?: string[];      // Signal IDs to remove
    signals_to_reprioritize?: Array<{
      id: string;
      new_priority: 'core' | 'supporting' | 'optional';
      rationale: string;
    }>;

    // For rules (HAC criteria)
    criteria_to_add?: Array<{
      id: string;
      name: string;
      description: string;
      type: 'inclusion' | 'exclusion';
      logic?: string;
      rationale: string;
    }>;
    criteria_to_modify?: Array<{
      id: string;
      field: string;
      old_value: unknown;
      new_value: unknown;
      rationale: string;
    }>;

    // For questions (USNWR)
    questions_to_add?: Array<{
      question_id: string;
      question_text: string;
      rationale: string;
    }>;
    questions_to_modify?: Array<{
      question_id: string;
      field: string;
      old_value: unknown;
      new_value: unknown;
      rationale: string;
    }>;
    questions_to_remove?: string[];    // Question IDs to remove

    // For prompts
    prompt_additions?: string[];       // Text snippets to add
    prompt_modifications?: Array<{
      section: string;
      old_text: string;
      new_text: string;
      rationale: string;
    }>;
  };

  // Human-readable explanation
  explanation_summary: string;         // Short summary for SME review
  confidence: number;                  // 0-1, how confident the LLM is in this patch

  // Metadata
  source_queue_item_id: string;        // Links back to LearningQueueItem
  generated_at: string;                // ISO timestamp
}

/**
 * Learning Summary
 *
 * Aggregated insights across multiple learning queue items.
 */
export interface LearningSummary {
  total_items: number;
  by_status: {
    pending: number;
    draft_proposed: number;
    patched: number;
    discarded: number;
  };
  by_archetype: Record<string, number>;
  common_themes: string[];             // Frequently mentioned issues
  generated_at: string;
}
