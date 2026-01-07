/**
 * S2: Structural Skeleton (Strict Mode)
 *
 * **Semantic Assembly Engine**: Pure pass-through of Registry Definitions.
 *
 * Replaces dynamic generation with strict loading from the Semantic Packet.
 * If the Semantic Packet is missing, this stage FAILS.
 */

import { randomUUID } from 'crypto';
import { RoutedInput, DomainContext, StructuralSkeleton, SignalGroupSkeleton, ValidationResult } from '../types';

export class S2_StructuralSkeletonStage {
  async execute(input: RoutedInput, domainCtx: DomainContext): Promise<StructuralSkeleton> {
    console.log('🏗️  [S2] Structural Skeleton (Strict Mode)');

    const { concern_id } = input;
    const { domain, semantic_context } = domainCtx;
    
    // STRICT GATE: Semantic Packet MUST exist
    if (!semantic_context.packet) {
      throw new Error(`[S2] CRITICAL FAILURE: No Semantic Packet loaded for ${domain}/${concern_id}. ` + 
        `Ensure 'domains_registry/${domain}/metrics/${concern_id}' exists and is valid.`);
    }

    const signal_groups = this.selectSignalGroups(domainCtx);

    console.log(`   ✅ Loaded ${signal_groups.length} signal groups from Registry:`);
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

  private selectSignalGroups(domainCtx: DomainContext): SignalGroupSkeleton[] {
    const packet = domainCtx.semantic_context.packet!;
    const metricGroups = packet.metric.signal_groups || [];
    
    // In strict mode, we trust the registry explicitly.
    // We map the string IDs (from metric.signal_groups) to the full objects (from signals.json)
    
    // NOTE: SemanticPacketLoader might have already merged signals into 'signals' map
    // Let's assume the packet structure is:
    // packet.metric.signal_groups = ["infection_risks", "bundle_compliance"]
    // packet.signals = { "infection_risks": [...signals...], ... }

    return metricGroups.map(groupId => {
        const signals = packet.signals[groupId] || [];
        // Extract display name from first signal metadata if possible, or beautify ID
        const displayName = groupId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        
        return {
            group_id: groupId,
            display_name: displayName,
            description: `Signals for ${displayName}`, // Placeholder, Description should come from registry
            signals: signals
        };
    });
  }

  validate(output: StructuralSkeleton, domainCtx?: DomainContext): ValidationResult {
    const errors: string[] = [];
    const signal_groups = output.clinical_config?.signals?.signal_groups || [];

    if (signal_groups.length === 0) {
      errors.push('S2 CRITICAL: Semantic Packet contained 0 signal groups.');
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings: [],
      metadata: {
        signal_group_count: signal_groups.length,
      },
    };
  }
}
