import * as fs from 'fs';
import * as path from 'path';

const METRICS_PATH = path.join(__dirname, '..', '..', 'data', 'orthopedics', 'metrics.json');
const SIGNALS_PATH = path.join(__dirname, '..', '..', 'data', 'orthopedics', 'signals.json');

export interface MetricConfig {
  metric_id: string;
  metric_name: string;
  domain: string;
  clinical_focus: string;
  review_questions: string[];
  archetypes: string[];
  primary_archetype: string;
  expected_signal_groups: string[];
  expected_signal_group_count: number;
}

export interface ArchetypeContract {
  archetype_id: string;
  primary_signal_groups: string[];
  forbidden_signal_groups: string[];
}

export function getMetricConfig(concernId: string): MetricConfig {
  const raw = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf-8'));
  const entry = raw[concernId];
  if (!entry) {
    throw new Error(`Metric config not found for ${concernId}`);
  }
  return {
    metric_id: concernId,
    metric_name: entry.metric_name,
    domain: entry.domain || 'Orthopedics',
    clinical_focus: entry.clinical_focus,
    review_questions: entry.review_questions || [],
    archetypes: entry.archetypes || [],
    primary_archetype: entry.primary_archetype || (entry.archetypes || [])[0],
    expected_signal_groups: entry.expected_signal_groups || entry.signal_groups || [],
    expected_signal_group_count: entry.expected_signal_group_count || (entry.expected_signal_groups || entry.signal_groups || []).length,
  };
}

export function getSignalDefinitions(): Record<string, string[]> {
  return JSON.parse(fs.readFileSync(SIGNALS_PATH, 'utf-8'));
}

export function getMetricSignalGroups(concernId: string) {
  const metric = getMetricConfig(concernId);
  return {
    groupIds: metric.expected_signal_groups,
    requiredCount: metric.expected_signal_group_count,
  };
}

export function getArchetypeContracts(concernId: string): ArchetypeContract[] {
  const metric = getMetricConfig(concernId);
  return (metric.archetypes || []).map((a: string) => ({
    archetype_id: a,
    primary_signal_groups: metric.expected_signal_groups,
    forbidden_signal_groups: [],
  }));
}

// Assertion helpers
export function assertAllowedGroups(outputGroupIds: string[], metricGroups: string[]) {
  const extras = outputGroupIds.filter((g) => !metricGroups.includes(g));
  if (extras.length) throw new Error(`Unexpected signal groups: ${extras.join(', ')}`);
}

export function assertRequiredGroupsPresent(outputGroupIds: string[], metricGroups: string[]) {
  const missing = metricGroups.filter((g) => !outputGroupIds.includes(g));
  if (missing.length) throw new Error(`Missing required signal groups: ${missing.join(', ')}`);
}

export function assertSignalsRespectArchetypeContract(
  groups: { group_id: string }[],
  contract: ArchetypeContract
) {
  const groupIds = groups.map((g) => g.group_id);
  const forbidden = groupIds.filter((g) => contract.forbidden_signal_groups.includes(g));
  if (forbidden.length) throw new Error(`Archetype ${contract.archetype_id} produced forbidden groups: ${forbidden.join(', ')}`);
  // If primary groups declared, ensure they are present
  const missingPrimary = contract.primary_signal_groups.filter((g) => !groupIds.includes(g));
  if (missingPrimary.length) throw new Error(`Archetype ${contract.archetype_id} missing primary groups: ${missingPrimary.join(', ')}`);
}

export function detectCrossArchetypeContradictions(
  factsByArchetype: Record<string, Record<string, string>>
): string[] {
  const contradictions: string[] = [];
  const keys = new Set<string>();
  Object.values(factsByArchetype).forEach((facts) => Object.keys(facts).forEach((k) => keys.add(k)));

  keys.forEach((k) => {
    const values = new Set<string>();
    Object.entries(factsByArchetype).forEach(([, facts]) => {
      if (facts[k]) values.add(facts[k]);
    });
    if (values.size > 1) {
      contradictions.push(`Contradiction on ${k}: ${Array.from(values).join(' vs ')}`);
    }
  });
  return contradictions;
}
