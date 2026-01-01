import * as fs from 'fs';
import * as path from 'path';
import { PlannerPlan } from '../models/PlannerPlan';
import {
  BatchStrategy,
  GenerationScenario,
  TaskScenarioConfig,
  TaskScenario,
  AutoDeriveConfig,
  DRExpectation
} from '../EvalsFactory/dataset/BatchStrategy';

const argv = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

const METRIC_ID = getArg('--metric');
const PLAN_PATH = getArg('--plan');
const OUT_PATH = getArg('--out');
const AUTO_DERIVE = argv.includes('--auto-derive');

// Registry Path: factory-cli/EvalsFactory/dataset/batch_strategies.metadata.json
const REGISTRY_PATH = path.resolve(__dirname, '../EvalsFactory/dataset/batch_strategies.metadata.json');
const DOMAINS_REGISTRY_PATH = path.resolve(__dirname, '../domains_registry');

// Task IDs for per-task scenario generation
const TASK_IDS = ['signal_enrichment', 'event_summary', 'followup_questions', 'clinical_review_plan'];

interface SignalGroup {
  group_id: string;
  display_name: string;
  description: string;
  priority: number;
  signals: Array<{
    signal_id: string;
    description: string;
    evidence_type: string;
    required: boolean;
  }>;
}

interface AmbiguityTrigger {
  trigger_id: string;
  description: string;
  detection: unknown;
  reviewer_prompt?: string;
  search_hints?: string[];
}

interface SemanticDefinitions {
  signal_groups: SignalGroup[];
  ambiguity_triggers: AmbiguityTrigger[];
}

if (!METRIC_ID || !PLAN_PATH) {
  console.error('Usage: ts-node tools/derive-strategy.ts --metric <id> --plan <path> [--out <path>] [--auto-derive]');
  process.exit(1);
}

/**
 * Find and load semantic definitions from domains_registry
 */
function loadSemanticDefinitions(domain: string, metricId: string): SemanticDefinitions | null {
  // Try common paths in domains_registry
  const possiblePaths = [
    path.join(DOMAINS_REGISTRY_PATH, 'USNWR', domain, 'metrics', metricId, 'definitions'),
    path.join(DOMAINS_REGISTRY_PATH, domain, 'metrics', metricId, 'definitions'),
  ];

  for (const defPath of possiblePaths) {
    const signalGroupsPath = path.join(defPath, 'signal_groups.json');
    const reviewRulesPath = path.join(defPath, 'review_rules.json');

    if (fs.existsSync(signalGroupsPath)) {
      console.log(`   Found semantic definitions at: ${defPath}`);

      const signalGroups = JSON.parse(fs.readFileSync(signalGroupsPath, 'utf-8'));
      let ambiguityTriggers: AmbiguityTrigger[] = [];

      if (fs.existsSync(reviewRulesPath)) {
        const reviewRules = JSON.parse(fs.readFileSync(reviewRulesPath, 'utf-8'));
        ambiguityTriggers = reviewRules.ambiguity_triggers || [];
      }

      return {
        signal_groups: signalGroups.signal_groups || [],
        ambiguity_triggers: ambiguityTriggers
      };
    }
  }

  console.log(`   No semantic definitions found for ${metricId} in domains_registry`);
  return null;
}

/**
 * Generate task-specific DR expectation for doubt scenarios
 */
function generateDRExpectation(task: string, trigger: AmbiguityTrigger): DRExpectation {
  const keywords = trigger.search_hints || [trigger.trigger_id.replace(/_/g, ' ')];

  switch (task) {
    case 'clinical_review_plan':
      return {
        should_escalate: true,
        expected_concern_keywords: keywords
      };
    case 'event_summary':
      return {
        should_flag_incomplete: true
      };
    case 'signal_enrichment':
      return {
        expected_signal_gap: true,
        uncertainty_keywords: ['unclear', 'unspecified', 'not documented', ...keywords]
      };
    case 'followup_questions':
      return {
        should_probe_ambiguity: true,
        probe_keywords: keywords
      };
    default:
      return { should_escalate: true };
  }
}

/**
 * Auto-derive scenarios from semantic definitions using DuetDoubt formula
 */
function deriveTaskScenarios(
  semantics: SemanticDefinitions,
  archetype: string,
  config: AutoDeriveConfig
): Record<string, TaskScenarioConfig> {
  const taskScenarios: Record<string, TaskScenarioConfig> = {};

  for (const taskId of TASK_IDS) {
    const scenarios: TaskScenario[] = [];

    // Pass scenarios: one per signal group
    semantics.signal_groups.forEach((group, idx) => {
      for (let i = 0; i < config.pass_per_signal_group; i++) {
        scenarios.push({
          id: `${taskId}_pass_${group.group_id}_${i + 1}`,
          type: 'pass',
          description: `Clear ${group.display_name} documentation - all required signals present`,
          archetype,
          signals: Object.fromEntries(
            group.signals.filter(s => s.required).map(s => [s.signal_id, 'present'])
          )
        });
      }
    });

    // Fail scenarios: one per signal group (missing required signals)
    semantics.signal_groups.forEach((group, idx) => {
      for (let i = 0; i < config.fail_per_signal_group; i++) {
        scenarios.push({
          id: `${taskId}_fail_${group.group_id}_${i + 1}`,
          type: 'fail',
          description: `Missing ${group.display_name} - required signals absent or problematic`,
          archetype,
          signals: Object.fromEntries(
            group.signals.filter(s => s.required).map(s => [s.signal_id, 'absent'])
          )
        });
      }
    });

    // Doubt scenarios: one per ambiguity trigger
    semantics.ambiguity_triggers.forEach((trigger, idx) => {
      for (let i = 0; i < config.doubt_per_ambiguity_trigger; i++) {
        scenarios.push({
          id: `${taskId}_doubt_${trigger.trigger_id}_${i + 1}`,
          type: 'doubt',
          description: trigger.description,
          archetype,
          doubt: [{
            type: 'ambiguity',
            instruction: trigger.reviewer_prompt || trigger.description
          }],
          doubt_recognition: generateDRExpectation(taskId, trigger)
        });
      }
    });

    // Ensure minimum doubt ratio
    const totalScenarios = scenarios.length;
    const doubtScenarios = scenarios.filter(s => s.type === 'doubt').length;
    const currentRatio = doubtScenarios / totalScenarios;

    if (currentRatio < config.minimum_doubt_ratio && totalScenarios > 0) {
      const targetDoubt = Math.ceil(totalScenarios * config.minimum_doubt_ratio);
      const additionalDoubt = targetDoubt - doubtScenarios;

      // Add additional doubt scenarios by cycling through triggers
      for (let i = 0; i < additionalDoubt; i++) {
        const trigger = semantics.ambiguity_triggers[i % semantics.ambiguity_triggers.length];
        if (trigger) {
          scenarios.push({
            id: `${taskId}_doubt_extra_${i + 1}`,
            type: 'doubt',
            description: `Edge case: ${trigger.description}`,
            archetype,
            doubt: [{
              type: 'ambiguity',
              instruction: trigger.reviewer_prompt || trigger.description
            }],
            doubt_recognition: generateDRExpectation(taskId, trigger)
          });
        }
      }
    }

    taskScenarios[taskId] = {
      description: `Scenarios for ${taskId} task`,
      output_schema: `${taskId}_output.schema.json`,
      scenarios
    };
  }

  return taskScenarios;
}

/**
 * Legacy: derive shared scenarios (for backwards compatibility)
 */
function deriveLegacyScenarios(
  config: any,
  meta: any,
  primaryArchetype: string
): GenerationScenario[] {
  const scenarios: GenerationScenario[] = [];

  // 1. Base Scenario
  scenarios.push({
    description: `Standard presentation of ${meta.concern.concern_id} with clear documentation.`,
    archetype: primaryArchetype
  });

  // 2. Signal-Driven Scenarios
  (config.signals.signal_groups || []).forEach((group: any) => {
    const topSignals = group.signals.slice(0, 2);
    topSignals.forEach((sig: any) => {
      const sigName = sig.name || sig.description || sig.signal_id || 'Unknown Signal';
      scenarios.push({
        description: `Patient case involving ${sigName} (${group.display_name}).`,
        archetype: primaryArchetype,
        doubt: group.group_id === 'delay_drivers' ? [{ type: 'conflict', instruction: 'Conflicting times' }] : undefined
      });
    });
  });

  return scenarios;
}

try {
  // 1. Load Plan
  const plan: PlannerPlan = JSON.parse(fs.readFileSync(PLAN_PATH, 'utf-8'));
  const config = plan.clinical_config;
  const meta = plan.plan_metadata as any;

  // 2. Determine archetype
  let primaryArchetype = 'Process_Auditor';
  if (config.config_metadata?.archetype) {
    primaryArchetype = config.config_metadata.archetype;
  } else if (meta.planning_input_snapshot?.archetype) {
    primaryArchetype = meta.planning_input_snapshot.archetype;
  } else if (meta.concern?.archetype) {
    primaryArchetype = meta.concern.archetype;
  }

  const domain = meta.concern?.domain || 'Orthopedics';

  // 3. Try to load semantic definitions for auto-derive mode
  const semantics = loadSemanticDefinitions(domain, METRIC_ID);

  // 4. Build strategy
  let newStrategy: BatchStrategy;

  if (AUTO_DERIVE && semantics && semantics.signal_groups.length > 0) {
    // Auto-derive mode: use semantic definitions
    console.log(`   Auto-deriving from ${semantics.signal_groups.length} signal groups and ${semantics.ambiguity_triggers.length} ambiguity triggers`);

    const autoConfig: AutoDeriveConfig = {
      enabled: true,
      pass_per_signal_group: 1,
      fail_per_signal_group: 1,
      doubt_per_ambiguity_trigger: 1,
      minimum_doubt_ratio: 0.20
    };

    const taskScenarios = deriveTaskScenarios(semantics, primaryArchetype, autoConfig);

    // Count total scenarios
    const flattened = Object.values(taskScenarios).flatMap(ts => ts.scenarios);
    const totalScenarios = flattened.length;
    const doubtScenarios = flattened.filter(s => s.type === 'doubt').length;

    newStrategy = {
      metric_id: METRIC_ID,
      domain: domain,
      task_scenarios: taskScenarios,
      auto_derive: autoConfig,
      coverage_goals: {
        signal_groups: semantics.signal_groups.length,
        min_scenarios: totalScenarios,
        doubt_ratio: doubtScenarios / totalScenarios,
        doubt_mix: ['ambiguity', 'missing_data', 'conflict']
      }
    };

    console.log(`   Generated ${totalScenarios} total scenarios (${doubtScenarios} doubt) across ${TASK_IDS.length} tasks`);

  } else {
    // Legacy mode: use plan's signal_groups
    console.log(`   Using legacy derivation from plan.json signal_groups`);

    const scenarios = deriveLegacyScenarios(config, meta, primaryArchetype);

    newStrategy = {
      metric_id: METRIC_ID,
      domain: domain,
      task_ids: ['eval_main'],
      scenarios: scenarios,
      coverage_goals: {
        min_scenarios: scenarios.length,
        min_archetypes: 1,
        doubt_ratio: 0.2
      }
    };
  }

  // 5. Output Handling
  if (OUT_PATH) {
    fs.writeFileSync(OUT_PATH, JSON.stringify(newStrategy, null, 2));
    console.log(`Generated strategy at ${OUT_PATH}`);
  } else {
    console.log(`Updating registry at: ${REGISTRY_PATH}`);

    let registry = { strategies: [] as BatchStrategy[] };
    if (fs.existsSync(REGISTRY_PATH)) {
      registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
    }

    const idx = registry.strategies.findIndex(s => s.metric_id === METRIC_ID);
    if (idx >= 0) {
      console.log(`   Overwriting existing strategy for ${METRIC_ID}`);
      registry.strategies[idx] = newStrategy;
    } else {
      console.log(`   Adding new strategy for ${METRIC_ID}`);
      registry.strategies.push(newStrategy);
    }

    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
    console.log(`✅ Successfully updated Batch Strategy Registry for ${METRIC_ID}`);
  }

} catch (err) {
  console.error('Strategy derivation failed:', err);
  process.exit(1);
}
