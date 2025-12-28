/**
 * Domain Router
 *
 * Detects whether a plan is for HAC or USNWR and provides the correct signal grouping schema.
 *
 * CRITICAL: Never mix HAC grouping with USNWR grouping
 *
 * HAC Review Groups (5):
 * - rule_in, rule_out, delay_drivers, documentation_gaps, bundle_gaps
 *
 * USNWR Signal Groups (5):
 * - core, delay_drivers, documentation, ruleouts, overrides
 */

import type {
  HACReviewGroup,
  USNWRSignalGroupId,
  HACSignalGroup,
  USNWRSignalGroup,
} from '../../models/PlannerPlan';

/**
 * Domain type for clinical review
 */
export type DomainType = 'HAC' | 'USNWR';

/**
 * HAC Group Definitions (5 review groups)
 */
export const HAC_GROUP_DEFINITIONS: Array<{
  group_id: HACReviewGroup;
  display_name: string;
  description: string;
  priority: number;
}> = [
  {
    group_id: 'rule_in',
    display_name: 'Rule In',
    description: 'Evidence supporting HAC presence or positive determination',
    priority: 1,
  },
  {
    group_id: 'rule_out',
    display_name: 'Rule Out',
    description: 'Evidence against HAC or supporting exclusion',
    priority: 2,
  },
  {
    group_id: 'delay_drivers',
    display_name: 'Delay Drivers',
    description: 'Factors affecting review timeline or case complexity',
    priority: 3,
  },
  {
    group_id: 'documentation_gaps',
    display_name: 'Documentation Gaps',
    description: 'Missing, incomplete, or ambiguous documentation impacting determination',
    priority: 4,
  },
  {
    group_id: 'bundle_gaps',
    display_name: 'Bundle Gaps',
    description: 'Missed or delayed elements of the expected care bundle or SPS quality bundle',
    priority: 5,
  },
];
/**
 * V9.1: Orthopedics Domain Group Definitions (5 signal groups)
 * Used for Process_Auditor archetype (USNWR I06-I08: Hip/Knee procedures)
 *
 * Design focus: Protocol compliance, VTE prophylaxis, LOS outliers, post-op rehab delays
 */
export const ORTHO_GROUP_DEFINITIONS: Array<{
  group_id: 'rule_in' | 'rule_out' | 'delay_drivers' | 'bundle_compliance' | 'handoff_failures';
  display_name: string;
  description: string;
  priority: number;
}> = [
  {
    group_id: 'rule_in',
    display_name: 'Rule In',
    description: 'Evidence supporting metric inclusion (procedure confirmed, patient eligible)',
    priority: 1,
  },
  {
    group_id: 'rule_out',
    display_name: 'Rule Out',
    description: 'Exclusion criteria (contraindications, ineligible patient population)',
    priority: 2,
  },
  {
    group_id: 'delay_drivers',
    display_name: 'Delay Drivers',
    description: 'LOS outliers, post-op rehab delays, surgical timeline deviations',
    priority: 3,
  },
  {
    group_id: 'bundle_compliance',
    display_name: 'Bundle Compliance',
    description: 'Surgical bundle adherence, VTE prophylaxis, infection prevention protocols',
    priority: 4,
  },
  {
    group_id: 'handoff_failures',
    display_name: 'Handoff Failures',
    description: 'Gaps in rehab transitions, surgical-to-floor handoffs, discharge planning',
    priority: 5,
  },
];

/**
 * V9.1: Endocrinology Domain Group Definitions (5 signal groups)
 * Used for Preventability_Detective + Exclusion_Hunter archetypes (C35: Diabetes/Glycemic metrics)
 *
 * Design focus: Avoidable glycemic excursions, eligibility for tighter controls, A1c documentation, pump/CGM tracking
 */
export const ENDO_GROUP_DEFINITIONS: Array<{
  group_id: 'rule_in' | 'rule_out' | 'glycemic_gaps' | 'device_use' | 'documentation_quality';
  display_name: string;
  description: string;
  priority: number;
}> = [
  {
    group_id: 'rule_in',
    display_name: 'Rule In',
    description: 'Evidence supporting metric inclusion (diagnosis confirmed, glycemic events present)',
    priority: 1,
  },
  {
    group_id: 'rule_out',
    display_name: 'Rule Out',
    description: 'Exclusion criteria (ineligible for tighter control, contraindications)',
    priority: 2,
  },
  {
    group_id: 'glycemic_gaps',
    display_name: 'Glycemic Gaps',
    description: 'Avoidable hypoglycemia, hyperglycemia episodes, A1c excursions',
    priority: 3,
  },
  {
    group_id: 'device_use',
    display_name: 'Device Use',
    description: 'Insulin pump tracking, CGM data quality, device adherence signals',
    priority: 4,
  },
  {
    group_id: 'documentation_quality',
    display_name: 'Documentation Quality',
    description: 'A1c documentation, pump settings recording, glycemic event charting completeness',
    priority: 5,
  },
];

/**
 * LEGACY: USNWR Group Definitions (5 signal groups)
 * DEPRECATED in V9.1: Use ORTHO_GROUP_DEFINITIONS or ENDO_GROUP_DEFINITIONS
 * Maintained for backward compatibility
 */
export const USNWR_GROUP_DEFINITIONS: Array<{
  group_id: USNWRSignalGroupId;
  display_name: string;
  description: string;
  priority: number;
}> = ORTHO_GROUP_DEFINITIONS as any; // Alias to Ortho for now
/**
 * Detects the domain type (HAC or USNWR) based on archetype and concern_id
 *
 * @deprecated This function uses old archetype prefixes (HAC_, USNWR_) which are not V9.1 compliant.
 * V9.1 uses lookupArchetype() in plannerAgent.ts with the Archetype Matrix for domain detection.
 * Maintained for backward compatibility only.
 *
 * Rules:
 * - If archetype starts with "HAC_" → HAC
 * - If archetype starts with "USNWR_" → USNWR
 * - If concern_id matches known HAC concerns → HAC
 * - Default: HAC (backward compatibility)
 *
 * @param archetype - The archetype string (e.g., "HAC_CLABSI", "USNWR_ORTHO_I25")
 * @param concernId - The concern ID (e.g., "CLABSI", "ORTHO_I25")
 * @returns 'HAC' or 'USNWR'
 */
export function detectDomain(archetype: string, concernId: string): DomainType {
  const archetypeUpper = (archetype || '').toUpperCase();
  const concernIdUpper = (concernId || '').toUpperCase();

  // Check archetype prefix first (most reliable)
  if (archetypeUpper.startsWith('HAC_')) {
    return 'HAC';
  }
  if (archetypeUpper.startsWith('USNWR_')) {
    return 'USNWR';
  }

  // Check concern_id for known patterns
  // HAC concerns: CLABSI, CAUTI, SSI, VAE, CDI, Falls, Pressure_Injury, etc.
  const hacConcerns = [
    'CLABSI',
    'CAUTI',
    'SSI',
    'VAE',
    'CDI',
    'FALLS',
    'PRESSURE_INJURY',
    'PRESSURE_ULCER',
    'DVT',
    'PE',
  ];

  if (hacConcerns.some((hac) => concernIdUpper.includes(hac))) {
    return 'HAC';
  }

  // USNWR concerns typically have format like ORTHO_I25, CARDIO_I26, etc.
  // or contain metric identifiers I25, I26, I32A, etc.
  if (
    concernIdUpper.includes('ORTHO') ||
    concernIdUpper.includes('CARDIO') ||
    concernIdUpper.includes('_I25') ||
    concernIdUpper.includes('_I26') ||
    concernIdUpper.includes('_I32')
  ) {
    return 'USNWR';
  }

  // Default to HAC for backward compatibility
  return 'HAC';
}

/**
 * Gets HAC signal group templates (without signals)
 *
 * Returns empty group structures ready to be populated with signals
 *
 * @returns Array of HAC signal group templates
 */

export function getHACGroupTemplates(): HACSignalGroup[] {
  return HAC_GROUP_DEFINITIONS.map((def) => ({
    group_id: def.group_id,
    display_name: def.display_name,
    description: def.description,
    signals: [],
    signal_types: [], // <--- ADD THIS LINE
    priority: def.priority,
  }));
}

/**
 * Gets USNWR signal group templates (without signals)
 *
 * Returns empty group structures ready to be populated with signals
 *
 * @returns Array of USNWR signal group templates
 */
export function getUSNWRGroupTemplates(): USNWRSignalGroup[] {
  return USNWR_GROUP_DEFINITIONS.map((def) => ({
    group_id: def.group_id,
    display_name: def.display_name,
    description: def.description,
    signals: [],
    signal_types: [], // <--- ADD THIS LINE
    priority: def.priority,
  }));
}

/**
 * Gets the appropriate group templates based on domain
 *
 * @param domain - 'HAC' or 'USNWR'
 * @returns HAC or USNWR group templates
 */
export function getGroupTemplatesForDomain(
  domain: DomainType
): HACSignalGroup[] | USNWRSignalGroup[] {
  return domain === 'HAC' ? getHACGroupTemplates() : getUSNWRGroupTemplates();
}

/**
 * Validates that a signal group matches the expected domain
 *
 * @param group - Signal group to validate
 * @param expectedDomain - Expected domain type
 * @returns True if group matches domain, false otherwise
 */
export function validateGroupDomain(
  group: HACSignalGroup | USNWRSignalGroup,
  expectedDomain: DomainType
): boolean {
  const groupId = group.group_id;

  if (expectedDomain === 'HAC') {
    // Check if group_id is a valid HAC review group
    const validHACGroups: HACReviewGroup[] = [
      'rule_in',
      'rule_out',
      'delay_drivers',
      'documentation_gaps',
      'bundle_gaps',
    ];
    return validHACGroups.includes(groupId as HACReviewGroup);
  } else {
    // Check if group_id is a valid USNWR signal group (V9.1: same as Ortho)
    const validUSNWRGroups: USNWRSignalGroupId[] = [
      'core_criteria',
      'delay_drivers',
      'documentation',
      'rule_outs',
      'overrides',
    ];
    return validUSNWRGroups.includes(groupId as USNWRSignalGroupId);
  }
}
