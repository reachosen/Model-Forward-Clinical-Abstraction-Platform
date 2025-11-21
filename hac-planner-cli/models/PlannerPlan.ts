/**
 * PlannerPlan Interface
 *
 * Output structure from the HAC Planner.
 * Wraps the generated HACConfig with metadata about the planning process.
 */

export interface PlannerPlan {
  /**
   * Planning metadata
   */
  plan_metadata: {
    /**
     * Unique identifier for this plan
     */
    plan_id: string;

    /**
     * Reference to the input planning request
     */
    planning_input_id: string;

    /**
     * Timestamp when plan was generated
     */
    generated_at: string;

    /**
     * Planner version used
     */
    planner_version: string;

    /**
     * LLM model used for planning (if applicable)
     */
    model_used?: string;

    /**
     * Overall confidence in the generated plan (0-1)
     */
    confidence: number;

    /**
     * Whether this plan requires human review before deployment
     */
    requires_review: boolean;

    /**
     * Status of the plan
     */
    status: "draft" | "reviewed" | "approved" | "deployed";
  };

  /**
   * Rationale for the generated configuration
   */
  rationale: {
    /**
     * High-level reasoning summary
     */
    summary: string;

    /**
     * Key decisions made during planning
     */
    key_decisions: KeyDecision[];

    /**
     * Potential concerns or limitations
     */
    concerns?: string[];

    /**
     * Recommendations for improvement
     */
    recommendations?: string[];
  };

  /**
   * The generated HAC configuration
   */
  hac_config: HACConfig;

  /**
   * Validation results
   */
  validation: {
    /**
     * Whether the configuration is valid
     */
    is_valid: boolean;

    /**
     * Validation errors (if any)
     */
    errors: string[];

    /**
     * Validation warnings (non-blocking)
     */
    warnings: string[];

    /**
     * Schema validation passed
     */
    schema_valid: boolean;

    /**
     * Business rules validation passed
     */
    business_rules_valid: boolean;
  };
}

/**
 * Key Decision made during planning
 */
export interface KeyDecision {
  /**
   * Aspect of configuration this decision relates to
   */
  aspect: string; // e.g., "signal_grouping", "timeline_phases", "prompt_structure"

  /**
   * The decision made
   */
  decision: string;

  /**
   * Reasoning behind the decision
   */
  reasoning: string;

  /**
   * Confidence in this decision (0-1)
   */
  confidence?: number;
}

/**
 * HAC Configuration
 *
 * Complete configuration for a Hospital-Acquired Condition detection system.
 */
export interface HACConfig {
  /**
   * Configuration metadata
   */
  config_metadata: {
    /**
     * Configuration identifier
     */
    config_id: string;

    /**
     * Configuration name
     */
    name: string;

    /**
     * Concern this configuration addresses
     */
    concern_id: string;

    /**
     * Configuration version
     */
    version: string;

    /**
     * Archetype or template used
     */
    archetype: string;

    /**
     * Creation timestamp
     */
    created_at: string;

    /**
     * Last modified timestamp
     */
    modified_at?: string;

    /**
     * Configuration status
     */
    status: "draft" | "active" | "deprecated";
  };

  /**
   * Clinical domain configuration
   */
  domain: {
    name: string;
    display_name: string;
    description: string;
    facility_context?: Record<string, any>;
  };

  /**
   * Surveillance and detection parameters
   */
  surveillance: {
    /**
     * Primary objective of surveillance
     */
    objective: string;

    /**
     * Target patient population
     */
    population: string;

    /**
     * Detection window parameters
     */
    detection_window?: {
      lookback_days?: number;
      lookahead_days?: number;
    };

    /**
     * Reporting requirements
     */
    reporting?: {
      frequency: string; // e.g., "daily", "weekly", "monthly"
      frameworks: string[]; // e.g., ["NHSN", "CMS"]
    };
  };

  /**
   * Signal configuration
   */
  signals: {
    /**
     * Signal groups/categories
     */
    signal_groups: SignalGroup[];

    /**
     * Global signal thresholds
     */
    thresholds?: {
      min_confidence?: number;
      max_findings_per_category?: number;
    };
  };

  /**
   * Timeline configuration
   */
  timeline: {
    /**
     * Timeline phases for case presentation
     */
    phases: TimelinePhase[];

    /**
     * Timeline display preferences
     */
    display_preferences?: {
      default_view?: string; // e.g., "chronological", "categorical"
      highlight_critical_events?: boolean;
    };
  };

  /**
   * Prompt configuration for LLM tasks
   */
  prompts: {
    /**
     * System prompt for the domain
     */
    system_prompt: string;

    /**
     * Task-specific prompt templates
     */
    task_prompts: {
      enrichment?: string;
      abstraction?: string;
      qa?: string;
    };

    /**
     * Output format specifications
     */
    output_formats?: Record<string, any>;
  };

  /**
   * Clinical criteria and rules
   */
  criteria: {
    /**
     * NHSN or other regulatory criteria definitions
     */
    rules: ClinicalRule[];

    /**
     * Determination logic
     */
    determination_logic?: string;
  };

  /**
   * Questions to guide clinical review
   */
  questions?: {
    /**
     * Follow-up questions for clinicians
     */
    followup_questions: FollowUpQuestion[];

    /**
     * Question generation rules
     */
    generation_rules?: string[];
  };

  /**
   * 80/20 summary configuration
   */
  summary_config?: {
    /**
     * Key fields to include in summary
     */
    key_fields: string[];

    /**
     * Summary generation rules
     */
    generation_rules?: string[];

    /**
     * Display preferences
     */
    display_preferences?: Record<string, any>;
  };
}

/**
 * Signal Group Configuration
 */
export interface SignalGroup {
  /**
   * Group identifier
   */
  group_id: string;

  /**
   * Display name
   */
  display_name: string;

  /**
   * Group description
   */
  description: string;

  /**
   * Signal types in this group
   */
  signal_types: string[];

  /**
   * Group priority for display (lower = higher priority)
   */
  priority?: number;

  /**
   * Group-specific thresholds
   */
  thresholds?: {
    min_confidence?: number;
    max_signals?: number;
  };
}

/**
 * Timeline Phase Configuration
 */
export interface TimelinePhase {
  /**
   * Phase identifier
   */
  phase_id: string;

  /**
   * Display name
   */
  display_name: string;

  /**
   * Phase description
   */
  description: string;

  /**
   * Relative timing (e.g., "pre_event", "peri_event", "post_event")
   */
  timing: string;

  /**
   * Duration parameters
   */
  duration?: {
    min_days?: number;
    max_days?: number;
    typical_days?: number;
  };

  /**
   * Key events to highlight in this phase
   */
  key_events?: string[];
}

/**
 * Clinical Rule Definition
 */
export interface ClinicalRule {
  /**
   * Rule identifier
   */
  rule_id: string;

  /**
   * Rule name
   */
  name: string;

  /**
   * Rule description
   */
  description: string;

  /**
   * Regulatory framework (e.g., "NHSN", "CMS")
   */
  framework?: string;

  /**
   * Rule logic or criteria
   */
  logic: string;

  /**
   * Required data elements
   */
  required_data?: string[];

  /**
   * Rule weight or importance
   */
  weight?: number;
}

/**
 * Follow-Up Question Configuration
 */
export interface FollowUpQuestion {
  /**
   * Question identifier
   */
  question_id: string;

  /**
   * Question text template
   */
  question_text: string;

  /**
   * Question category
   */
  category: string; // e.g., "clinical", "temporal", "contextual"

  /**
   * Whether this question is required
   */
  required: boolean;

  /**
   * Conditions for asking this question
   */
  conditions?: string[];

  /**
   * Expected answer type
   */
  answer_type?: string; // e.g., "text", "yes_no", "numeric", "date"
}
