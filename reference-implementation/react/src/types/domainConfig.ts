/**
 * Domain Configuration Types
 * Enables domain-agnostic UI that works for CLABSI, CAUTI, SSI, etc.
 */

export interface TimelinePhase {
  phase_id: string;
  label: string;
  description: string;
}

export interface SignalGroup {
  group_id: string;
  label: string;
  description: string;
  icon: string;
}

export interface FollowUpQuestionTemplate {
  question_id: string;
  question_text: string;
  category: string;
  required: boolean;
  linked_rules: string[];
}

export interface FeedbackOption {
  value: string;
  label: string;
  description: string;
}

export interface RiskLevel {
  label: string;
  color: string;
  description: string;
}

export interface DomainMetadata {
  version: string;
  created_date: string;
  last_updated: string;
  nhsn_version?: string;
  author?: string;
}

export interface DomainConfig {
  // Core identification
  domain_name: string;
  display_name: string;
  episode_label: string;
  determination_label: string;
  short_description: string;

  // Timeline configuration
  timeline_phases: TimelinePhase[];

  // Signal grouping
  signal_groups: SignalGroup[];

  // Follow-up questions
  followup_question_templates: FollowUpQuestionTemplate[];

  // Feedback options
  feedback_options: FeedbackOption[];

  // "Ask the Case" examples
  ask_examples: string[];

  // Risk level definitions
  risk_levels: {
    CRITICAL: RiskLevel;
    HIGH: RiskLevel;
    MODERATE: RiskLevel;
    LOW: RiskLevel;
  };

  // Branding
  primary_color?: string;
  secondary_color?: string;

  // Metadata
  metadata: DomainMetadata;
}

// Default CLABSI configuration (fallback)
export const DEFAULT_DOMAIN_CONFIG: DomainConfig = {
  domain_name: 'CLABSI',
  display_name: 'Central Line-Associated Bloodstream Infection',
  episode_label: 'CLABSI Episode',
  determination_label: 'CLABSI Determination',
  short_description: 'Surveillance and abstraction for central line-associated bloodstream infections',
  timeline_phases: [
    { phase_id: 'PRE_LINE', label: 'Pre-Line Placement', description: 'Events before central line insertion' },
    { phase_id: 'LINE_PLACEMENT', label: 'Line Placement', description: 'Central line insertion procedure' },
    { phase_id: 'MONITORING', label: 'Monitoring Period', description: 'Daily monitoring while line is in place' },
    { phase_id: 'CULTURE', label: 'Culture Collection', description: 'Blood culture collection and results' },
    { phase_id: 'POST_CULTURE', label: 'Post-Culture', description: 'Events after positive culture' },
  ],
  signal_groups: [
    { group_id: 'DEVICE', label: 'Device Exposure Signals', description: 'Central line presence', icon: '🔌' },
    { group_id: 'LAB', label: 'Laboratory Findings', description: 'Blood cultures', icon: '🧪' },
    { group_id: 'VITAL', label: 'Clinical Symptoms', description: 'Fever, vital signs', icon: '❤️' },
    { group_id: 'MEDICATION', label: 'Medication Signals', description: 'Antibiotics', icon: '💊' },
    { group_id: 'PROCEDURE', label: 'Procedural Signals', description: 'Line maintenance', icon: '🏥' },
  ],
  followup_question_templates: [],
  feedback_options: [
    { value: 'CONFIRMED_CLABSI', label: 'Confirmed CLABSI', description: 'Meets all NHSN criteria' },
    { value: 'RULED_OUT', label: 'Ruled Out', description: 'Does not meet criteria' },
    { value: 'NEEDS_REVIEW', label: 'Needs Review', description: 'Requires additional review' },
  ],
  ask_examples: [
    'Why is the risk level HIGH?',
    'Show me the blood culture timeline',
    'What evidence supports this determination?',
  ],
  risk_levels: {
    CRITICAL: { label: 'Critical', color: '#dc2626', description: 'Critical risk' },
    HIGH: { label: 'High', color: '#ef4444', description: 'High risk' },
    MODERATE: { label: 'Moderate', color: '#f59e0b', description: 'Moderate risk' },
    LOW: { label: 'Low', color: '#10b981', description: 'Low risk' },
  },
  primary_color: '#667eea',
  secondary_color: '#764ba2',
  metadata: {
    version: '1.0.0',
    created_date: '2025-01-15',
    last_updated: '2025-01-15',
  },
};
