/**
 * S2: Structural Skeleton (V9.1)
 *
 * **Quality-Guided Generation**: Build V9.1-compliant skeleton with 5 signal groups
 */

import { randomUUID } from 'crypto';
import { RoutedInput, DomainContext, StructuralSkeleton, SignalGroupSkeleton, ValidationResult } from '../types';
import { HAC_GROUP_DEFINITIONS, ORTHO_GROUP_DEFINITIONS, ENDO_GROUP_DEFINITIONS } from '../../planner/domainRouter';

export class S2_StructuralSkeletonStage {
  async execute(input: RoutedInput, domainCtx: DomainContext): Promise<StructuralSkeleton> {
    console.log('🏗️  [S2] Starting Structural Skeleton Generation');

    const { concern_id } = input;
    const { domain, semantic_context } = domainCtx;
    const ranking_context = semantic_context.ranking;

    console.log(`   Domain: ${domain}`);
    console.log(`   Has ranking context: ${!!ranking_context}`);

    const signal_groups = this.selectSignalGroups(domain, domainCtx);

    console.log(`   ✅ Selected ${signal_groups.length} signal groups:`);
    signal_groups.forEach((g, i) => {
      console.log(`      ${i + 1}. ${g.group_id} - ${g.display_name}`);
    });

    const concern_type = domain === 'HAC' ? 'HAC' : 'USNWR';

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

  private selectSignalGroups(domain: string, domainCtx: DomainContext): SignalGroupSkeleton[] {
    const { semantic_context } = domainCtx;
    const ranking_context = semantic_context.ranking;
    const packet = semantic_context.packet;

    if (domain === 'HAC') {
      console.log('   Using HAC_GROUP_DEFINITIONS (infection prevention focus)');
      return HAC_GROUP_DEFINITIONS.map((def) => ({
        group_id: def.group_id,
        display_name: def.display_name,
        description: def.description,
        signals: [],
      }));
    }

    if (packet) {
      console.log('   Using Semantic Packet signal groups');
      const packetGroups = packet.metric.signal_groups;
      return this.buildGroupsFromEmphasis(packetGroups, domain);
    }

    if (ranking_context && ranking_context.signal_emphasis) {
      console.log('   Using ranking-informed signal_emphasis from top 20 ranking');
      return this.buildGroupsFromEmphasis(ranking_context.signal_emphasis, domain);
    }

    console.log('   Using domain-specific defaults (no ranking/packet data)');
    return this.getDomainDefaultGroups(domain);
  }

  private buildGroupsFromEmphasis(signalEmphasis: string[], domain: string): SignalGroupSkeleton[] {
    const groupDefinitions: Record<string, { display_name: string; description: string }> = {
      bundle_compliance: { display_name: 'Bundle Compliance', description: 'Adherence to evidence-based care bundles and protocols' },
      handoff_failures: { display_name: 'Handoff Failures', description: 'Gaps in care transitions, surgical handoffs, and discharge planning' },
      delay_drivers: { display_name: 'Delay Drivers', description: 'Factors contributing to delays in care delivery or extended LOS' },
      documentation_gaps: { display_name: 'Documentation Gaps', description: 'Missing or incomplete clinical documentation' },
      complication_tracking: { display_name: 'Complication Tracking', description: 'Post-operative complications and adverse events' },
      glycemic_gaps: { display_name: 'Glycemic Gaps', description: 'Hypoglycemia, hyperglycemia, and glycemic variability issues' },
      device_use: { display_name: 'Device Use', description: 'Insulin pump tracking, CGM data quality, device adherence' },
      documentation_quality: { display_name: 'Documentation Quality', description: 'A1c tracking, endocrine consultation documentation, therapy plans' },
      care_transitions: { display_name: 'Care Transitions', description: 'Inpatient-to-outpatient handoffs, diabetes care team coordination' },
      medication_adherence: { display_name: 'Medication Adherence', description: 'Insulin regimen compliance and medication reconciliation' },
      infection_risk: { display_name: 'Infection Risk', description: 'Device-related infections and procedural infection risks' },
      lab_monitoring: { display_name: 'Lab Monitoring', description: 'Laboratory test frequency and critical value follow-up' },
      treatment_adherence: { display_name: 'Treatment Adherence', description: 'Compliance with treatment plans and therapy protocols' },
      safety_monitoring: { display_name: 'Safety Monitoring', description: 'Patient safety assessments and risk mitigation' },
      safety_signals: { display_name: 'Safety Signals', description: 'Pain management, rapid response, and immediate safety concerns' },
      outcome_risks: { display_name: 'Outcome Risks', description: 'Adverse outcomes, ischemic progression, and iatrogenic injury' },
      readmission_risks: { display_name: 'Readmission Risks', description: 'Risk factors for unplanned hospital readmission' },
      infection_risks: { display_name: 'Infection Risks', description: 'Device-related infections and procedural infection risks' },
    };

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

    if (groups.length !== 5) {
      // Pad if less than 5
      const defaults = this.getDomainDefaultGroups(domain);
      for (const def of defaults) {
        if (groups.length >= 5) break;
        if (!groups.find(g => g.group_id === def.group_id)) {
          groups.push(def);
        }
      }
    }

    return groups.slice(0, 5);
  }

  private getDomainDefaultGroups(domain: string): SignalGroupSkeleton[] {
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
    return [
      { group_id: 'rule_in', display_name: 'Rule In', description: 'Evidence supporting metric inclusion', signals: [] },
      { group_id: 'rule_out', display_name: 'Rule Out', description: 'Exclusion criteria', signals: [] },
      { group_id: 'delay_drivers', display_name: 'Delay Drivers', description: 'Factors contributing to delays in care delivery', signals: [] },
      { group_id: 'documentation_gaps', display_name: 'Documentation Gaps', description: 'Missing or incomplete clinical documentation', signals: [] },
      { group_id: 'complication_tracking', display_name: 'Complication Tracking', description: 'Adverse events and complications', signals: [] },
    ];
  }

  validate(output: StructuralSkeleton): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!output.plan_metadata?.plan_id) errors.push('plan_metadata.plan_id is required');
    if (!output.plan_metadata?.concern?.concern_id) errors.push('plan_metadata.concern.concern_id is required');
    
    const signal_groups = output.clinical_config?.signals?.signal_groups;
    if (!signal_groups) {
      errors.push('clinical_config.signals.signal_groups is required');
    } else if (signal_groups.length !== 5) {
      errors.push(`V9.1 requires exactly 5 signal groups, found ${signal_groups.length}`);
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
      metadata: {
        plan_id: output.plan_metadata?.plan_id,
        signal_group_count: signal_groups?.length || 0,
      },
    };
  }
}