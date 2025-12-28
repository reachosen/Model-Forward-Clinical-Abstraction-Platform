import * as fs from 'fs';
import * as path from 'path';
import { PlannerPlanV2 } from '../../models/PlannerPlan';
import { DomainContext } from '../types';

const METRICS_PATH = path.join(__dirname, '..', '..', 'data', 'orthopedics', 'metrics.json');

// Runtime helper to avoid hardcoding; loads metric config from repo data
function loadMetricConfig(concernId: string): any | undefined {
  if (!fs.existsSync(METRICS_PATH)) return undefined;
  const raw = JSON.parse(fs.readFileSync(METRICS_PATH, 'utf-8'));
  return raw[concernId];
}

export interface SemanticValidationResult {
  errors: string[];
  warnings: string[];
}

export function validatePlanSemantic(plan: PlannerPlanV2, domainContext: DomainContext): SemanticValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const concernId = plan.plan_metadata.concern.concern_id;
  const metricConfig = loadMetricConfig(concernId);
  const packetMetric = domainContext.semantic_context?.packet?.metric;

  const expectedGroups =
    (metricConfig && (metricConfig.expected_signal_groups || metricConfig.signal_groups)) ||
    packetMetric?.signal_groups ||
    [];
  const expectedCount =
    (metricConfig && metricConfig.expected_signal_group_count) ||
    (metricConfig && (metricConfig.expected_signal_groups || metricConfig.signal_groups || []).length) ||
    (packetMetric?.signal_groups || []).length ||
    0;

  const planGroups = plan.clinical_config?.signals?.signal_groups || [];
  const planGroupIds = planGroups.map((g) => g.group_id);
  const expectedGroupStrings = (expectedGroups as any[]).map((g) => String(g));
  const planGroupStrings = planGroupIds.map((g) => String(g));

  // Required groups present
  const missing = expectedGroupStrings.filter((g) => !planGroupStrings.includes(g));
  if (missing.length) {
    errors.push(`Missing expected signal groups: ${missing.join(', ')}`);
  }

  // No unexpected groups
  const extras = planGroupStrings.filter((g) => !expectedGroupStrings.includes(g));
  if (extras.length) {
    warnings.push(`Unexpected signal groups present: ${extras.join(', ')}`);
  }

  // Count check aligned to config
  if (expectedCount > 0 && planGroupStrings.length < expectedCount) {
    errors.push(`Plan has too few signal groups (${planGroupStrings.length}), expected at least ${expectedCount}`);
  }

  // Basic provenance check per signal
  planGroups.forEach((g) => {
    (g.signals || []).forEach((s: any, idx: number) => {
      if (!s.provenance || typeof s.provenance !== 'string') {
        warnings.push(`Signal ${g.group_id}[${idx}] missing provenance`);
      }
    });
  });

  return { errors, warnings };
}
