import * as fs from 'fs';
import * as path from 'path';
import {
  BatchStrategy,
  TaskScenarioConfig,
  TaskScenario,
  Intent
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

// Registry Path
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
 * Auto-derive scenarios from semantic definitions using Balanced 50 matrix
 */
function deriveTaskScenarios(
  semantics: SemanticDefinitions,
  archetype: string
): Record<string, TaskScenarioConfig> {
  const taskScenarios: Record<string, TaskScenarioConfig> = {};

  const slices = [
    { intent: 'KNOWLEDGE', count: 20, description: "Registry Coverage: specific signal detection" },
    { intent: 'AMBIGUITY', count: 15, description: "Dissonance: conflicting notes (Affirm/Deny)" },
    { intent: 'SAFETY', count: 10, description: "Hard Negatives: distractor symptoms and out-of-window cases" },
    { intent: 'SYNTHESIS', count: 5, description: "Timeline: POD calculation and primary/return linking" }
  ];

  for (const taskId of TASK_IDS) {
    const scenarios: TaskScenario[] = [];

    slices.forEach(slice => {
      for (let i = 0; i < slice.count; i++) {
        const signal = semantics.signal_groups[i % semantics.signal_groups.length];

        scenarios.push({
          id: `${taskId}_${slice.intent.toLowerCase()}_${i + 1}`,
          type: slice.intent === 'AMBIGUITY' ? 'doubt' : (i % 2 === 0 ? 'pass' : 'fail'),
          description: `${slice.description} using ${signal?.display_name || 'core'} definitions.`,
          archetype,
          contract: {
            intents: [slice.intent as Intent]
          } as any
        });
      }
    });

    taskScenarios[taskId] = {
      description: `Balanced 50 suite for ${taskId}`,
      output_schema: `${taskId}_output.schema.json`,
      scenarios
    };
  }

  return taskScenarios;
}

function deriveLegacyScenarios(
  leanPlan: any,
  primaryArchetype: string
): TaskScenario[] {
  const scenarios: TaskScenario[] = [];
  const metricInfo = leanPlan.schema_definitions.metric_info;
  const metricName = metricInfo.metric_name || metricInfo.name || 'this metric';

  // 1. Base Scenario
  scenarios.push({
    description: `Standard presentation of ${metricName} with clear documentation.`,
    archetype: primaryArchetype,
    contract: {
      intents: ['KNOWLEDGE']
    }
  });

  // 2. Signal-Driven Scenarios
  // Convert map to array
  const signalCatalog = leanPlan.schema_definitions.signal_catalog || {};
  Object.entries(signalCatalog).forEach(([groupId, signals]) => {
    const topSignals = (signals as any[]).slice(0, 2);
    topSignals.forEach((sig: any) => {
      const sigName = sig.id || sig.description || 'Unknown Signal';
      scenarios.push({
        description: `Patient case involving ${sigName} (${groupId}).`,
        archetype: primaryArchetype,
        doubt: groupId === 'delay_drivers' ? [{ type: 'conflict', instruction: 'Conflicting times' }] : undefined,
        contract: {
          intents: [groupId === 'delay_drivers' ? 'AMBIGUITY' : 'KNOWLEDGE']
        }
      });
    });
  });

  return scenarios;
}

try {
  // 1. Load Plan (Supports LeanPlan)
  const fileContent = fs.readFileSync(PLAN_PATH, 'utf-8');
  let leanPlan;
  
  try {
      const json = JSON.parse(fileContent);
      if (json.handoff_metadata) {
          leanPlan = json; // Native Lean Plan
      } else {
          // Adapt Legacy Plan structure to simple structure for derivation
          leanPlan = {
              handoff_metadata: {
                  metric_id: json.plan_metadata.concern.concern_id,
                  domain: json.plan_metadata.concern.domain
              },
              schema_definitions: {
                  metric_info: json.clinical_config.metric_context,
                  signal_catalog: {} // Complex map needed, but we might skip legacy derivation for legacy plans
              }
          };
      }
  } catch (e) {
      throw new Error("Failed to parse plan JSON");
  }

  // 2. Determine archetype
  let primaryArchetype = 'Preventability_Detective'; // Default
  // Try to find it in task sequence
  const tasks = leanPlan.execution_registry?.task_sequence || [];
  if (tasks.length > 0 && tasks[0].archetypes_involved?.length > 0) {
      primaryArchetype = tasks[0].archetypes_involved[0];
  }

  const domain = leanPlan.handoff_metadata.domain || 'Orthopedics';

  // 3. Try to load semantic definitions for auto-derive mode
  const semantics = loadSemanticDefinitions(domain, METRIC_ID);

  // 4. Build strategy
  let newStrategy: BatchStrategy;

  if (AUTO_DERIVE && semantics && semantics.signal_groups.length > 0) {
    console.log(`   Auto-deriving from ${semantics.signal_groups.length} signal groups`);
    const taskScenarios = deriveTaskScenarios(semantics, primaryArchetype);
    
    // Count stats
    const flattened = Object.values(taskScenarios).flatMap(ts => ts.scenarios);
    const totalScenarios = flattened.length;
    const doubtScenarios = flattened.filter(s => s.type === 'doubt').length;

    newStrategy = {
      metric_id: METRIC_ID,
      domain: domain,
      task_scenarios: taskScenarios,
      coverage_goals: {
        signal_groups: semantics.signal_groups.length,
        min_scenarios: totalScenarios,
        doubt_ratio: doubtScenarios / totalScenarios,
        doubt_mix: ['ambiguity', 'missing_data', 'conflict']
      }
    };
    console.log(`   Generated ${totalScenarios} total scenarios (${doubtScenarios} doubt)`);

  } else {
    console.log(`   Using derivation from Lean Plan signal_catalog`);
    const scenarios = deriveLegacyScenarios(leanPlan, primaryArchetype);

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