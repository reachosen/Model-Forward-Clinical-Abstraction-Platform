/**
 * Context-Aware Quality Criteria
 *
 * Quality criteria that adapt based on:
 * 1. Domain (HAC, Orthopedics, Endocrinology, etc.)
 * 2. Archetype (Process_Auditor, Preventability_Detective, etc.)
 * 3. Task (signal_enrichment, event_summary, etc.)
 *
 * Answers the question: "What quality standards apply to THIS specific context?"
 */

import { ValidationResult, ArchetypeType, TaskType, DomainContext, StructuralSkeleton } from '../types';

// ============================================================================
// Context-Aware Validation Rules
// ============================================================================

export interface ValidationContext {
  domain: string;
  archetype?: ArchetypeType;
  task?: TaskType;
  ranking_context_present?: boolean;
}

/**
 * Get domain-specific quality criteria for S2 (Structural Skeleton)
 */
export function getS2DomainCriteria(domain: string, ranking_context_present: boolean): string[] {
  const criteria: string[] = [
    '⭐ CRITICAL: Exactly 5 signal groups',
  ];

  // Domain-specific criteria
  if (domain === 'HAC') {
    criteria.push(
      '✓ Signal groups are: rule_in, rule_out, delay_drivers, documentation_gaps, bundle_gaps',
      '✓ Groups focus on infection prevention and preventability',
      '✓ No ranking context present (HAC is safety, not rankings)'
    );
  } else if (domain === 'Orthopedics') {
    if (ranking_context_present) {
      criteria.push(
        '✓ Signal groups informed by USNWR rankings (top 20)',
        '✓ Groups include: bundle_compliance, handoff_failures, delay_drivers',
        '✓ Groups align with quality_differentiators from Boston Children\'s/CHOP benchmarks'
      );
    } else {
      criteria.push(
        '✓ Signal groups use ORTHO_GROUP_DEFINITIONS defaults',
        '✓ Groups include: rule_in, rule_out, delay_drivers, bundle_compliance, handoff_failures'
      );
    }
  } else if (domain === 'Endocrinology') {
    if (ranking_context_present) {
      criteria.push(
        '✓ Signal groups informed by USNWR rankings (top 20)',
        '✓ Groups include: glycemic_gaps, device_use, documentation_quality'
      );
    } else {
      criteria.push(
        '✓ Signal groups use ENDO_GROUP_DEFINITIONS defaults',
        '✓ Groups include: rule_in, rule_out, glycemic_gaps, device_use, documentation_quality'
      );
    }
  }

  return criteria;
}

/**
 * Validate S2 output with domain-specific rules
 */
export function validateS2WithDomainContext(
  skeleton: StructuralSkeleton,
  domainContext: DomainContext
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { domain, ranking_context } = domainContext;
  const signal_groups = skeleton.clinical_config?.signals?.signal_groups || [];

  // CRITICAL: Exactly 5 groups (universal)
  if (signal_groups.length !== 5) {
    errors.push(`CRITICAL: Expected exactly 5 signal groups, found ${signal_groups.length}`);
    return { passed: false, errors, warnings };
  }

  const group_ids = signal_groups.map(g => g.group_id);

  // Domain-specific validation
  if (domain === 'HAC') {
    // HAC must use specific group IDs
    const expected_hac_groups = ['rule_in', 'rule_out', 'delay_drivers', 'documentation_gaps', 'bundle_gaps'];
    const has_all_hac_groups = expected_hac_groups.every(id => group_ids.includes(id));

    if (!has_all_hac_groups) {
      errors.push(`HAC domain must use groups: ${expected_hac_groups.join(', ')}`);
      errors.push(`Found groups: ${group_ids.join(', ')}`);
    }

    // HAC should NOT have ranking context
    if (ranking_context) {
      warnings.push('HAC domain should not have ranking_context (HAC is safety focus, not rankings)');
    }

  } else if (domain === 'Orthopedics') {
    // Orthopedics with rankings - check for ranking-informed groups
    if (ranking_context && ranking_context.signal_emphasis) {
      const expected_groups = ranking_context.signal_emphasis;
      const has_all_ranking_groups = expected_groups.every(id => group_ids.includes(id));

      if (!has_all_ranking_groups) {
        warnings.push(`Orthopedics (ranked) should use signal_emphasis groups: ${expected_groups.join(', ')}`);
        warnings.push(`Found groups: ${group_ids.join(', ')}`);
      }

      // Check for quality differentiator alignment
      const quality_focus_groups = ['bundle_compliance', 'handoff_failures', 'complication_tracking'];
      const has_quality_focus = quality_focus_groups.some(g => group_ids.includes(g));

      if (!has_quality_focus) {
        warnings.push('Orthopedics (ranked) should include quality-focused groups (bundle_compliance, handoff_failures, or complication_tracking)');
      }

    } else {
      // Orthopedics without rankings - check for default groups
      const expected_ortho_groups = ['rule_in', 'rule_out', 'delay_drivers', 'bundle_compliance', 'handoff_failures'];
      const missing_groups = expected_ortho_groups.filter(g => !group_ids.includes(g));

      if (missing_groups.length > 0) {
        warnings.push(`Orthopedics (unranked) should use default groups. Missing: ${missing_groups.join(', ')}`);
      }
    }

  } else if (domain === 'Endocrinology') {
    // Endocrinology-specific groups
    const endo_specific_groups = ['glycemic_gaps', 'device_use'];
    const has_endo_groups = endo_specific_groups.some(g => group_ids.includes(g));

    if (!has_endo_groups) {
      warnings.push(`Endocrinology domain should include domain-specific groups: ${endo_specific_groups.join(', ')}`);
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    metadata: {
      domain,
      has_ranking_context: !!ranking_context,
      group_ids,
      validation_type: 'domain_aware'
    }
  };
}

/**
 * Get archetype-specific quality criteria for task execution (S5)
 */
export function getS5ArchetypeCriteria(archetype: ArchetypeType, task: TaskType): string[] {
  const criteria: string[] = [];

  // Archetype-specific requirements
  if (archetype === 'Process_Auditor') {
    criteria.push('✓ Focus on protocol compliance and quality metrics');

    if (task === 'signal_enrichment') {
      criteria.push(
        '✓ Signals emphasize bundle compliance gaps',
        '✓ Signals reference protocol deviations',
        '✓ Each signal has clear compliance threshold'
      );
    }

    if (task === 'event_summary') {
      criteria.push(
        '✓ Summary describes protocol adherence timeline',
        '✓ Mentions ranking if USNWR top 20',
        '✓ Highlights compliance successes and failures'
      );
    }

    if (task === 'clinical_review_plan') {
      criteria.push(
        '✓ Tools focus on compliance checking (checklists, audits)',
        '✓ Review order prioritizes high-impact protocol steps'
      );
    }

  } else if (archetype === 'Preventability_Detective') {
    criteria.push('✓ Focus on preventability assessment and root cause');

    if (task === 'signal_enrichment') {
      criteria.push(
        '✓ Signals clearly marked as rule_in or rule_out',
        '✓ Each signal indicates preventability evidence strength',
        '✓ Signals reference CDC NHSN definitions'
      );
    }

    if (task === 'event_summary') {
      criteria.push(
        '✓ Summary follows HAC investigation narrative arc',
        '✓ Clearly states preventability determination',
        '✓ Identifies root cause if preventable'
      );
    }

    if (task === 'clinical_review_plan') {
      criteria.push(
        '✓ Tools focus on root cause analysis',
        '✓ Review order follows rule_in → rule_out → preventability logic'
      );
    }

  } else if (archetype === 'Preventability_Detective_Metric') {
    criteria.push('✓ Focus on clinical criteria and metric thresholds');

    if (task === 'signal_enrichment') {
      criteria.push(
        '✓ Signals include quantitative thresholds (A1c, glucose levels)',
        '✓ Signals reference clinical guidelines (KDIGO, ADA)',
        '✓ Each signal indicates metric compliance status'
      );
    }
  }

  return criteria;
}

/**
 * Validate task output with archetype-specific rules
 */
export function validateTaskWithArchetypeContext(
  archetype: ArchetypeType,
  task: TaskType,
  output: any
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Task-specific structural validation
  if (task === 'signal_enrichment') {
    const signals = output?.signals || [];

    // Universal requirement: all signals need evidence_type
    const missing_evidence = signals.filter((s: any) => !s.evidence_type);
    if (missing_evidence.length > 0) {
      errors.push(`⭐ CRITICAL: ${missing_evidence.length} signals missing evidence_type (L1/L2/L3)`);
    }

    // Archetype-specific validation
    if (archetype === 'Preventability_Detective') {
      // HAC signals must indicate preventability relevance
      const missing_preventability = signals.filter((s: any) =>
        s.group_id === 'rule_in' && !s.description?.toLowerCase().includes('prevent')
      );

      if (missing_preventability.length > 0) {
        warnings.push(`${missing_preventability.length} rule_in signals don't clearly indicate preventability relevance`);
      }
    }

    if (archetype === 'Process_Auditor') {
      // Process Auditor signals should reference protocols
      const missing_protocol = signals.filter((s: any) =>
        !s.description?.toLowerCase().includes('protocol') &&
        !s.description?.toLowerCase().includes('compliance') &&
        !s.description?.toLowerCase().includes('bundle')
      );

      if (missing_protocol.length > signals.length * 0.7) {
        warnings.push('Most signals should reference protocols/compliance for Process_Auditor archetype');
      }
    }

  } else if (task === 'event_summary') {
    const summary = output?.summary || '';

    // Universal requirement: summary must exist and be substantive
    if (summary.length < 100) {
      errors.push('Event summary must be at least 100 characters');
    }

    // Archetype-specific validation
    if (archetype === 'Preventability_Detective') {
      // HAC summaries should state preventability
      const mentions_preventability = summary.toLowerCase().includes('preventable') ||
                                      summary.toLowerCase().includes('avoidable');

      if (!mentions_preventability) {
        warnings.push('HAC event summary should state preventability determination');
      }
    }

    if (archetype === 'Process_Auditor') {
      // Process Auditor summaries should mention protocols
      const mentions_protocol = summary.toLowerCase().includes('protocol') ||
                               summary.toLowerCase().includes('compliance') ||
                               summary.toLowerCase().includes('bundle');

      if (!mentions_protocol) {
        warnings.push('Process Auditor event summary should mention protocol compliance');
      }
    }

  } else if (task === 'clinical_review_plan') {
    const tools = output?.clinical_tools || [];

    // Archetype-specific tool expectations
    if (archetype === 'Preventability_Detective') {
      const has_rca_tools = tools.some((t: any) =>
        t.description?.toLowerCase().includes('root cause') ||
        t.description?.toLowerCase().includes('fishbone')
      );

      if (!has_rca_tools) {
        warnings.push('Preventability Detective should include root cause analysis tools');
      }
    }

    if (archetype === 'Process_Auditor') {
      const has_audit_tools = tools.some((t: any) =>
        t.description?.toLowerCase().includes('checklist') ||
        t.description?.toLowerCase().includes('audit')
      );

      if (!has_audit_tools) {
        warnings.push('Process Auditor should include compliance checking tools (checklists, audits)');
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings,
    metadata: {
      archetype,
      task,
      validation_type: 'archetype_aware'
    }
  };
}

/**
 * Get domain-specific source requirements for signals
 */
export function getExpectedSourcesByDomain(domain: string): string[] {
  const sourceMap: Record<string, string[]> = {
    'HAC': ['CDC NHSN', 'AHRQ', 'CMS HAC Reduction Program'],
    'Orthopedics': ['AAOS', 'NHSN', 'AHRQ Orthopedic Quality Indicators'],
    'Endocrinology': ['KDIGO', 'ADA', 'Endocrine Society Guidelines'],
    'Cardiology': ['AHA', 'ACC', 'Pediatric Cardiology Guidelines'],
    'Neurology': ['AAN', 'Child Neurology Society'],
  };

  return sourceMap[domain] || ['AHRQ', 'CMS', 'Relevant specialty society'];
}

/**
 * Summary: Context-Aware Quality Matrix
 */
export const QUALITY_MATRIX = {
  // Stage 2: Structural Skeleton
  S2: {
    dimensions: ['domain', 'ranking_context_present'],
    validator: validateS2WithDomainContext,
    criteriaGetter: getS2DomainCriteria,
  },

  // Stage 5: Task Execution
  S5: {
    dimensions: ['archetype', 'task', 'domain'],
    validator: validateTaskWithArchetypeContext,
    criteriaGetter: getS5ArchetypeCriteria,
  },
} as const;

/**
 * Helper: Get all applicable quality criteria for a given context
 */
export function getApplicableQualityCriteria(context: ValidationContext): string[] {
  const criteria: string[] = [];

  // Add domain-specific criteria
  if (context.domain) {
    const sources = getExpectedSourcesByDomain(context.domain);
    criteria.push(`✓ Signals should cite: ${sources.join(', ')}`);
  }

  // Add archetype & task-specific criteria
  if (context.archetype && context.task) {
    criteria.push(...getS5ArchetypeCriteria(context.archetype, context.task));
  }

  return criteria;
}
