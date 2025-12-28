/**
 * Semantic contracts and consistency checks (config-driven).
 *
 * Run with: ts-node tests/semantic/semantic-contracts.test.ts
 */

import {
  getMetricConfig,
  getMetricSignalGroups,
  getSignalDefinitions,
  getArchetypeContracts,
  assertAllowedGroups,
  assertRequiredGroupsPresent,
  assertSignalsRespectArchetypeContract,
  detectCrossArchetypeContradictions,
} from '../utils/semanticSources';
import * as fs from 'fs';
import * as path from 'path';

type SignalGroup = { group_id: string; signals: any[] };

function buildDummySignals(groupId: string, defs: string[]): SignalGroup {
  return {
    group_id: groupId,
    signals: defs.slice(0, 1).map((d, idx) => ({
      id: `${groupId}_sig_${idx + 1}`,
      description: d,
      evidence_type: 'L2',
      provenance: 'dummy provenance',
    })),
  };
}

async function run() {
  console.log('\n=== Semantic Contract Checks (config-driven) ===\n');

  const signalsDef = getSignalDefinitions();
  const metricsPath = path.join(__dirname, '..', '..', 'data', 'orthopedics', 'metrics.json');
  const metricIds = Object.keys(JSON.parse(fs.readFileSync(metricsPath, 'utf-8')));

  let failures = 0;

  for (const metricId of metricIds) {
    const metric = getMetricConfig(metricId);
    const groupsCfg = getMetricSignalGroups(metricId);
    const contracts = getArchetypeContracts(metricId);
    const isMultiArchetype = contracts.length > 1;

    console.log(`Metric ${metricId} (${metric.metric_name}) - archetypes: ${contracts.map(c => c.archetype_id).join(', ') || 'n/a'}`);

    // Build dummy output groups adhering to expected groups
    const outputGroups: SignalGroup[] = groupsCfg.groupIds.map((gid) =>
      buildDummySignals(gid, signalsDef[gid] || ['placeholder signal'])
    );

    try {
      // Metric-level: required/allowed groups
      const outputGroupIds = outputGroups.map((g) => g.group_id);
      assertRequiredGroupsPresent(outputGroupIds, groupsCfg.groupIds);
      assertAllowedGroups(outputGroupIds, groupsCfg.groupIds);

      // Per-archetype contracts
      contracts.forEach((contract) => {
        assertSignalsRespectArchetypeContract(outputGroups, contract);
      });

      // Cross-archetype consistency (simple fact alignment)
      if (isMultiArchetype) {
        const factsByArchetype: Record<string, Record<string, string>> = {};
        contracts.forEach((c) => {
          factsByArchetype[c.archetype_id] = {
            // Placeholder shared facts; in real pipeline, extract from outputs
            key_timestamp: 't0',
            delay_rationale: 'justified_delay',
          };
        });
        const contradictions = detectCrossArchetypeContradictions(factsByArchetype);
        if (contradictions.length) {
          throw new Error(`Cross-archetype contradictions: ${contradictions.join('; ')}`);
        }
      }
    } catch (err: any) {
      failures += 1;
      console.error(`❌ ${metricId}: ${err.message}`);
    }
  }

  if (failures > 0) {
    console.error(`\nSemantic contract checks failed: ${failures}`);
    process.exit(1);
  }

  console.log('\n✅ Semantic contract checks passed for all metrics\n');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
