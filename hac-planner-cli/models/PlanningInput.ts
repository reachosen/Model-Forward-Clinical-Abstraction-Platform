/**
 * PlanningInput Interface
 *
 * Input structure for the HAC Planner CLI.
 * Contains all information needed to generate a HAC configuration.
 */

export interface PlanningInput {
  /**
   * Unique identifier for this planning request
   */
  planning_id: string;

  /**
   * Hospital-acquired condition concern identifier (e.g., "CLABSI", "VAP", "CAUTI")
   */
  concern_id: string;

  /**
   * Archetype or template to base the configuration on
   * Examples: "device_associated_infection", "surgical_site_infection", "adverse_event"
   */
  archetype: string;

  /**
   * Clinical domain context
   */
  domain: {
    /**
     * Domain name (e.g., "HAC", "Patient Safety", "Quality Metrics")
     */
    name: string;

    /**
     * Target facility information
     */
    facility: {
      type: string; // e.g., "Children's Hospital"
      location: string; // e.g., "United States"
      context?: string; // Additional context
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
