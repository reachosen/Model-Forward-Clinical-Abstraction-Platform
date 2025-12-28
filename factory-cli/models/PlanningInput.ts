/**
 * PlanningInput Interface
 * V9.1 Specification - Production Master
 *
 * This is the strict input schema for the Planner Engine (Section 2 of V9.1 Spec).
 * The planning_input strictly dictates the Archetype and Domain.
 *
 * V9.1 REQUIREMENTS:
 * - domain_hint: Must be one of: HAC, Orthopedics, Endocrinology, Quality
 * - intent: Determines signal group selection and archetype
 * - target_population: Must specify pediatric context
 */

import { DomainType, IntentType } from './PlannerPlan';

export interface PlanningInput {
  /**
   * Unique identifier for this planning request
   * V9.1: Required UUID format
   */
  planning_input_id?: string; // Made optional for backward compat, but required in V9.1

  /**
   * Legacy field name support
   */
  planning_id?: string;

  /**
   * V9.1: Concern identifier
   * Examples: 'CLABSI', 'Hip Fracture Co-Management', 'Sepsis Mortality'
   * Required in V9.1
   */
  concern: string;

  /**
   * V9.1: Domain hint for archetype selection (OPTIONAL)
   * Must be one of: HAC, Orthopedics, Endocrinology, Quality, Safety
   * In V9.1, the Archetype Matrix is the single source of truth.
   * domain_hint is only used as a fallback when no matrix match exists.
   */
  domain_hint?: DomainType;

  /**
   * V9.1: Intent determines signal selection and archetype
   * Required in V9.1
   */
  intent: IntentType;

  /**
   * V9.1: Target population (must specify pediatric context)
   * Examples: 'PICU patients < 18y', 'Pediatric ortho post-op'
   * Required in V9.1
   */
  target_population: string;

  /**
   * V9.1: Specific requirements for the plan
   * Examples: 'Must align with SPS bundles', 'Exclude palliative care'
   * Required in V9.1
   */
  specific_requirements: string[];

  // ==========================================
  // Legacy Fields (for backward compatibility)
  // ==========================================

  /**
   * DEPRECATED: Use 'concern' instead
   */
  concern_id?: string;

  /**
   * DEPRECATED: Intent-first mode no longer used in V9.1
   */
  review_request?: string;

  /**
   * DEPRECATED: V9.1 uses Metric-to-Archetype Matrix (determined automatically)
   * Kept for backward compatibility only
   */
  archetype?: string;

  /**
   * DEPRECATED: Use 'domain_hint' instead
   * Kept for backward compatibility only
   */
  domain?: string | {
    name: string;
    facility: {
      type: string;
      location: string;
      context?: string;
    };
  };

  /**
   * Data profile describing available data sources and structures
   */
  data_profile: {
    /**
     * Available data sources
     */
    sources: DataSource[];

    /**
     * Expected data volumes
     */
    volumes?: {
      daily_admissions?: number;
      monthly_cases?: number;
    };

    /**
     * Data quality indicators
     */
    quality?: {
      completeness?: number; // 0-1 score
      timeliness?: string; // e.g., "real-time", "daily", "weekly"
    };
  };

  /**
   * Clinical context and requirements
   */
  clinical_context: {
    /**
     * Primary clinical objective
     */
    objective: string;

    /**
     * Target patient population
     */
    population?: string;

    /**
     * Narrative patient data for analysis
     * V9.1: Used as the primary factual source for signal extraction
     */
    patient_payload?: string;

    /**
     * Surveillance or reporting requirements
     */
    surveillance_requirements?: string[];

    /**
     * Regulatory or compliance frameworks (e.g., "NHSN", "CMS")
     */
    regulatory_frameworks?: string[];
  };

  /**
   * Configuration preferences
   */
  preferences?: {
    /**
     * Desired confidence threshold for determinations (0-1)
     */
    min_confidence?: number;

    /**
     * Maximum number of signals to generate per category
     */
    max_findings_per_category?: number;

    /**
     * Include experimental features
     */
    include_experimental?: boolean;

    /**
     * Additional custom preferences
     */
    custom?: Record<string, any>;
  };

  /**
   * Metadata about the planning request
   */
  metadata?: {
    /**
     * User or system requesting the plan
     */
    requested_by?: string;

    /**
     * Timestamp of request
     */
    requested_at?: string;

    /**
     * Additional notes or context
     */
    notes?: string;
  };
}

/**
 * Data Source description
 */
export interface DataSource {
  /**
   * Source identifier (e.g., "EHR", "Lab System", "Device Registry")
   */
  source_id: string;

  /**
   * Source type
   */
  type: string; // e.g., "EHR", "Laboratory", "Device", "Pharmacy", "Radiology"

  /**
   * Available data elements from this source
   */
  available_data: string[];

  /**
   * Data update frequency
   */
  update_frequency?: string; // e.g., "real-time", "hourly", "daily"

  /**
   * Integration method
   */
  integration?: string; // e.g., "HL7", "FHIR", "API", "Database"
}
