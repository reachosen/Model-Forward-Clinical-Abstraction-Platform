/**
 * S2: Structural Skeleton (V9.1)
 *
 * Purpose: Build V9.1-compliant skeleton with 5 signal groups
 * Reuses:
 * - HAC_GROUP_DEFINITIONS, ORTHO_GROUP_DEFINITIONS, ENDO_GROUP_DEFINITIONS from domainRouter.ts
 * - getSignalEmphasis() from rankingsLoader.ts (USNWR only)
 *
 * CRITICAL: Exactly 5 signal groups required for V9.1 compliance
 *
 * Signal Group Selection Logic:
 * 1. HAC domains: Use HAC_GROUP_DEFINITIONS
 * 2. USNWR domains WITH rankings (rank ≤ 20):
 *    - Use getSignalEmphasis(domain) to get ranking-informed groups
 * 3. USNWR domains WITHOUT rankings (rank > 20 or no ranking):
 *    - Use domain-specific defaults from domainRouter.ts
 */

import { randomUUID } from 'crypto';
import { RoutedInput, DomainContext, StructuralSkeleton, SignalGroupSkeleton, ValidationResult } from '../types';
import { HAC_GROUP_DEFINITIONS, ORTHO_GROUP_DEFINITIONS, ENDO_GROUP_DEFINITIONS } from '../../planner/domainRouter';

export class S2_StructuralSkeletonStage {
  /**
   * Execute S2: Build structural skeleton with 5 signal groups
   */
  async execute(input: RoutedInput, domainCtx: DomainContext): Promise<StructuralSkeleton> {
    console.log('🏗️  [S2] Starting Structural Skeleton Generation');

    const { concern_id } = input;
    const { domain, ranking_context } = domainCtx;

    console.log(`   Domain: ${domain}`);
    console.log(`   Has ranking context: ${!!ranking_context}`);

    // Step 1: Select signal groups based on domain and ranking context
    const signal_groups = this.selectSignalGroups(domain, ranking_context);

    console.log(`   ✅ Selected ${signal_groups.length} signal groups:`);
    signal_groups.forEach((g, i) => {
      console.log(`      ${i + 1}. ${g.group_id} - ${g.display_name}`);
    });

    // Step 2: Determine concern_type
    const concern_type = domain === 'HAC' ? 'HAC' : 'USNWR';

    // Step 3: Build V9.1 skeleton
    const skeleton: StructuralSkeleton = {
      plan_metadata: {
        plan_id: randomUUID(),
        concern: {
          concern_id,
          concern_type,
          domain,
        },
      },
      clinical_config: {
        signals: {
          signal_groups,
        },
      },
    };

    console.log('✅ [S2] Structural skeleton generated');
    return skeleton;
  }

  /**
   * Select 5 signal groups based on domain and ranking context
   */
  private selectSignalGroups(domain: string, ranking_context?: any): SignalGroupSkeleton[] {
    // Case 1: HAC domain - use HAC_GROUP_DEFINITIONS
    if (domain === 'HAC') {
      console.log('   Using HAC_GROUP_DEFINITIONS (infection prevention focus)');
      return HAC_GROUP_DEFINITIONS.map((def) => ({
        group_id: def.group_id,
        display_name: def.display_name,
        description: def.description,
        signals: [],
      }));
    }

    // Case 2: USNWR domain WITH ranking context (top 20)
    if (ranking_context && ranking_context.signal_emphasis) {
      console.log('   Using ranking-informed signal_emphasis from top 20 ranking');
      const signalEmphasis = ranking_context.signal_emphasis as string[];

      // Map signal_emphasis IDs to full group definitions
      return this.buildGroupsFromEmphasis(signalEmphasis, domain);
    }

    // Case 3: USNWR domain WITHOUT ranking context (rank > 20 or no data)
    // Use domain-specific defaults
    console.log('   Using domain-specific defaults (no ranking data)');
    return this.getDomainDefaultGroups(domain);
  }

  /**
   * Build signal groups from ranking-informed signal_emphasis
   */
  private buildGroupsFromEmphasis(signalEmphasis: string[], domain: string): SignalGroupSkeleton[] {
    // Define mappings from group_id to display_name and description
    // These are general definitions that apply across domains
    const groupDefinitions: Record<string, { display_name: string; description: string }> = {
      bundle_compliance: {
        display_name: 'Bundle Compliance',
        description: 'Adherence to evidence-based care bundles and protocols'
      },
      handoff_failures: {
        display_name: 'Handoff Failures',
        description: 'Gaps in care transitions, surgical handoffs, and discharge planning'
      },
      delay_drivers: {
        display_name: 'Delay Drivers',
        description: 'Factors contributing to delays in care delivery or extended LOS'
      },
      documentation_gaps: {
        display_name: 'Documentation Gaps',
        description: 'Missing or incomplete clinical documentation'
      },
      complication_tracking: {
        display_name: 'Complication Tracking',
        description: 'Post-operative complications and adverse events'
      },
      glycemic_gaps: {
        display_name: 'Glycemic Gaps',
        description: 'Hypoglycemia, hyperglycemia, and glycemic variability issues'
      },
      device_use: {
        display_name: 'Device Use',
        description: 'Insulin pump tracking, CGM data quality, device adherence'
      },
      documentation_quality: {
        display_name: 'Documentation Quality',
        description: 'A1c tracking, endocrine consultation documentation, therapy plans'
      },
      care_transitions: {
        display_name: 'Care Transitions',
        description: 'Inpatient-to-outpatient handoffs, diabetes care team coordination'
      },
      medication_adherence: {
        display_name: 'Medication Adherence',
        description: 'Insulin regimen compliance and medication reconciliation'
      },
      infection_risk: {
        display_name: 'Infection Risk',
        description: 'Device-related infections and procedural infection risks'
      },
      lab_monitoring: {
        display_name: 'Lab Monitoring',
        description: 'Laboratory test frequency and critical value follow-up'
      },
      treatment_adherence: {
        display_name: 'Treatment Adherence',
        description: 'Compliance with treatment plans and therapy protocols'
      },
      safety_monitoring: {
        display_name: 'Safety Monitoring',
        description: 'Patient safety assessments and risk mitigation'
      },
    };

    // Map signal_emphasis to full group skeletons
    const groups: SignalGroupSkeleton[] = signalEmphasis.map((group_id) => {
      const def = groupDefinitions[group_id];
      if (!def) {
        console.warn(`   ⚠️  Unknown signal group ID from emphasis: ${group_id}`);
        return {
          group_id,
          display_name: group_id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          description: `${group_id} analysis`,
          signals: [],
        };
      }

      return {
        group_id,
        display_name: def.display_name,
        description: def.description,
        signals: [],
      };
    });

    // Ensure exactly 5 groups
    if (groups.length !== 5) {
      console.warn(`   ⚠️  signal_emphasis returned ${groups.length} groups, expected 5. Falling back to domain defaults.`);
      return this.getDomainDefaultGroups(domain);
    }

    return groups;
  }

  /**
   * Get domain-specific default signal groups (when no ranking data available)
   */
  private getDomainDefaultGroups(domain: string): SignalGroupSkeleton[] {
    // Use domain-specific definitions from domainRouter
    if (domain === 'Orthopedics') {
      return ORTHO_GROUP_DEFINITIONS.map((def) => ({
        group_id: def.group_id,
        display_name: def.display_name,
        description: def.description,
        signals: [],
      }));
    }

    if (domain === 'Endocrinology') {
      return ENDO_GROUP_DEFINITIONS.map((def) => ({
        group_id: def.group_id,
        display_name: def.display_name,
        description: def.description,
        signals: [],
      }));
    }

    // For other USNWR domains, use a generic 5-group structure
    console.warn(`   ⚠️  No specific group definitions for domain ${domain}, using generic structure`);

    return [
      {
        group_id: 'rule_in',
        display_name: 'Rule In',
        description: 'Evidence supporting metric inclusion',
        signals: [],
      },
      {
        group_id: 'rule_out',
        display_name: 'Rule Out',
        description: 'Exclusion criteria',
        signals: [],
      },
      {
        group_id: 'delay_drivers',
        display_name: 'Delay Drivers',
        description: 'Factors contributing to delays in care delivery',
        signals: [],
      },
      {
        group_id: 'documentation_gaps',
        display_name: 'Documentation Gaps',
        description: 'Missing or incomplete clinical documentation',
        signals: [],
      },
      {
        group_id: 'complication_tracking',
        display_name: 'Complication Tracking',
        description: 'Adverse events and complications',
        signals: [],
      },
    ];
  }

  /**
   * Validate the structural skeleton
   */
  validate(output: StructuralSkeleton): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!output.plan_metadata?.plan_id) {
      errors.push('plan_metadata.plan_id is required');
    }

    if (!output.plan_metadata?.concern?.concern_id) {
      errors.push('plan_metadata.concern.concern_id is required');
    }

    if (!output.plan_metadata?.concern?.concern_type) {
      errors.push('plan_metadata.concern.concern_type is required');
    } else {
      const validTypes = ['HAC', 'USNWR'];
      if (!validTypes.includes(output.plan_metadata.concern.concern_type)) {
        errors.push(`Invalid concern_type: ${output.plan_metadata.concern.concern_type}`);
      }
    }

    // V9.1 CRITICAL: Exactly 5 signal groups required
    const signal_groups = output.clinical_config?.signals?.signal_groups;
    if (!signal_groups) {
      errors.push('clinical_config.signals.signal_groups is required');
    } else {
      if (signal_groups.length !== 5) {
        errors.push(`V9.1 requires exactly 5 signal groups, found ${signal_groups.length}`);
      }

      // Validate each signal group
      signal_groups.forEach((group, index) => {
        if (!group.group_id) {
          errors.push(`Signal group ${index} missing group_id`);
        }
        if (!group.display_name) {
          errors.push(`Signal group ${index} missing display_name`);
        }
        if (!group.description) {
          warnings.push(`Signal group ${index} missing description`);
        }
        if (!Array.isArray(group.signals)) {
          errors.push(`Signal group ${index} signals must be an array`);
        }
      });

      // Check for duplicate group_ids
      const groupIds = signal_groups.map((g) => g.group_id);
      const uniqueIds = new Set(groupIds);
      if (uniqueIds.size !== groupIds.length) {
        errors.push('Duplicate signal group IDs detected');
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metadata: {
        plan_id: output.plan_metadata?.plan_id,
        concern_id: output.plan_metadata?.concern?.concern_id,
        signal_group_count: signal_groups?.length || 0,
      },
    };
  }
}
