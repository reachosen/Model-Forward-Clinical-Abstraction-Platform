/**
 * Mission Catalog - Core missions for the Model-Forward Factory
 *
 * 9 essential missions organized by factory owner:
 * - plan:*   → PlanningFactory (Inception)
 * - eval:*   → EvalsFactory (Refinement)
 * - schema:* → SchemaFactory (Materialization)
 * - ops:*    → Operations (Demo & Campaigns)
 */

export type Owner = 'Planning' | 'Evals' | 'Schema' | 'Ops';

export interface Mission {
  id: string;
  owner: Owner;
  title: string;
  purpose: string;
  command: string;
  args: string[];
  examples?: MissionExample[];
}

export interface MissionExample {
  name: string;
  args: string[];
}

/**
 * Extract owner from mission ID prefix
 */
export function getOwner(id: string): Owner {
  if (id.startsWith('plan:')) return 'Planning';
  if (id.startsWith('eval:')) return 'Evals';
  if (id.startsWith('schema:')) return 'Schema';
  if (id.startsWith('ops:')) return 'Ops';
  return 'Ops'; // default
}

/**
 * Owner descriptions for help text
 */
export const OWNER_DESCRIPTIONS: Record<Owner, string> = {
  Planning: 'Seed configs & manifests for new metrics (Inception)',
  Evals: 'Battle-test & harden prompts (Refinement)',
  Schema: 'Compile contracts & certify releases (Materialization)',
  Ops: 'Demo, validate & run campaigns (Operations)',
};

/**
 * The 9 core missions
 */
export const MISSIONS: Mission[] = [
  // ===========================================================================
  // PlanningFactory: Inception
  // ===========================================================================
  {
    id: 'plan:scaffold',
    owner: 'Planning',
    title: 'Scaffold Metric (Inception)',
    purpose: 'One-click inception roundtrip: Init Prompts -> Derive Definitions -> Plan -> Simulate -> Score',
    command: 'npx',
    args: ['ts-node', 'tools/scaffold.ts', '--domain', '{{domain}}', '--metric', '{{metric}}'],
    examples: [
      { name: 'Cardiology C01', args: ['ts-node', 'tools/scaffold.ts', '--domain', 'Cardiology', '--metric', 'C01'] },
    ],
  },
  {
    id: 'plan:generate',
    owner: 'Planning',
    title: 'Generate Manifest',
    purpose: 'Generate a plan.json manifest for a metric',
    command: 'npx',
    args: ['ts-node', 'bin/planner.ts', 'generate', '--concern', '{{concern}}', '--domain', '{{domain}}'],
    examples: [
      { name: 'I25 Ortho', args: ['ts-node', 'bin/planner.ts', 'generate', '--concern', 'I25', '--domain', 'orthopedics', '--output', './output/plan_i25.json'] },
      { name: 'CLABSI PICU', args: ['ts-node', 'bin/planner.ts', 'generate', '--concern', 'CLABSI', '--domain', 'picu', '--output', './output/plan_clabsi.json'] },
    ],
  },

  // ===========================================================================
  // EvalsFactory: Refinement
  // ===========================================================================
  {
    id: 'eval:roundtrip',
    owner: 'Evals',
    title: 'Balanced 50 Roundtrip',
    purpose: 'Full automated cycle: Derive Strategy -> Generate (S1) -> Audit (S2) -> Materialize Golden Set',
    command: 'npx',
    args: ['ts-node', 'tools/eval-roundtrip.ts', '{{metric}}'],
    examples: [
      { name: 'I32a Full Cycle', args: ['ts-node', 'tools/eval-roundtrip.ts', 'I32a'] },
    ],
  },
  {
    id: 'eval:task-check',
    owner: 'Evals',
    title: 'Eval Task Checklist',
    purpose: 'Verify EvalTaskIndex steps are present (plan, prompts, strategy, batches/golden, SAFE, cert)',
    command: 'npx',
    args: ['ts-node', 'tools/eval-task-check.ts', '{{metric}}'],
    examples: [
      { name: 'I32a', args: ['ts-node', 'tools/eval-task-check.ts', 'I32a'] },
    ],
  },
  {
    id: 'eval:status',
    owner: 'Evals',
    title: 'QA Status Overview',
    purpose: 'Show workflow state for a metric - what exists, where to resume',
    command: 'npx',
    args: ['ts-node', 'bin/planner.ts', 'eval:status', '--metric', '{{metric}}'],
    examples: [
      { name: 'I25', args: ['ts-node', 'bin/planner.ts', 'eval:status', '--metric', 'I25'] },
      { name: 'I32a', args: ['ts-node', 'bin/planner.ts', 'eval:status', '--metric', 'I32a'] },
      { name: 'All', args: ['ts-node', 'bin/planner.ts', 'eval:status', '--all'] },
    ],
  },
  {
    id: 'eval:qa-scorecard',
    owner: 'Evals',
    title: 'Run QA Scorecard',
    purpose: 'Generate high-fidelity clinical scorecard using Dual-Truth (CR/AH) logic',
    command: 'npx',
    args: ['ts-node', 'bin/planner.ts', 'safe:score', '--concern', '{{metric}}', '--batch', '{{batch}}', '--verbose'],
    examples: [
      { name: 'I32a Duet/Doubt', args: ['ts-node', 'bin/planner.ts', 'safe:score', '--concern', 'I32a', '--batch', 'duet_doubt_contract_test', '--verbose'] },
      { name: 'I25 Golden Set', args: ['ts-node', 'bin/planner.ts', 'safe:score', '--concern', 'I25', '--batch', 'golden_set', '--verbose'] },
    ],
  },
  {
    id: 'eval:score',
    owner: 'Evals',
    title: 'SAFE Evaluation',
    purpose: 'Run SAFE v0 scoring on test batches with live pattern detection',
    command: 'npx',
    args: ['ts-node', 'bin/planner.ts', 'safe:score', '-c', '{{concern}}', '-b', '{{batch}}'],
    examples: [
      { name: 'I25 All', args: ['ts-node', 'bin/planner.ts', 'safe:score', '-c', 'I25', '-b', 'I25_batch_*'] },
      { name: 'I32a All', args: ['ts-node', 'bin/planner.ts', 'safe:score', '-c', 'I32a', '-b', 'I32a_batch_*'] },
      { name: 'I25 Subset', args: ['ts-node', 'bin/planner.ts', 'safe:score', '-c', 'I25', '-b', 'batch_1', '--cases', 'test-001,test-002'] },
    ],
  },
  {
    id: 'eval:optimize',
    owner: 'Evals',
    title: 'Prompt Optimizer (Flywheel)',
    purpose: 'Run agentic loop to auto-fix prompts based on failure evidence',
    command: 'npx',
    args: ['ts-node', 'EvalsFactory/optimizer/loop.ts', '--metric', '{{metric}}', '--loops', '{{loops}}', '--task', '{{task}}'],
    examples: [
      { name: 'I32a Signal Loop', args: ['ts-node', 'EvalsFactory/optimizer/loop.ts', '--metric', 'I32a', '--loops', '3', '--task', 'signal_enrichment'] },
      { name: 'I32a Summary Loop', args: ['ts-node', 'EvalsFactory/optimizer/loop.ts', '--metric', 'I32a', '--loops', '3', '--task', 'event_summary'] },
    ],
  },
  {
    id: 'eval:leap',
    owner: 'Evals',
    title: 'Leap Forward (Golden Set Upgrade)',
    purpose: 'Mine failures to build a higher-difficulty Golden Set',
    command: 'npx',
    args: ['ts-node', 'EvalsFactory/optimizer/golden_upgrade.ts', '--metric', '{{metric}}'],
    examples: [
      { name: 'I32a Level Up', args: ['ts-node', 'EvalsFactory/optimizer/golden_upgrade.ts', '--metric', 'I32a'] },
    ],
  },
  {
    id: 'eval:strategize',
    owner: 'Evals',
    title: 'Define Test Strategy',
    purpose: 'Derive BatchStrategy from signal definitions (test coverage)',
    command: 'npx',
    args: ['ts-node', 'tools/derive-strategy.ts', '--metric', '{{metric}}', '--plan', '{{plan}}'],
    examples: [
      { name: 'I25', args: ['ts-node', 'tools/derive-strategy.ts', '--metric', 'I25', '--plan', 'output/plan_i25.json'] },
    ],
  },
  {
    id: 'eval:generate',
    owner: 'Evals',
    title: 'Generate Test Cases',
    purpose: 'Generate test cases from BatchStrategy',
    command: 'npx',
    args: ['ts-node', 'EvalsFactory/dataset/generate.ts', 'run', '{{metric}}'],
    examples: [
      { name: 'I25', args: ['ts-node', 'EvalsFactory/dataset/generate.ts', 'run', 'I25'] },
    ],
  },
  {
    id: 'eval:refine',
    owner: 'Evals',
    title: 'Battle Test & Refine',
    purpose: 'Run the refinery loop to battle-test and improve prompts',
    command: 'npx',
    args: ['ts-node', 'EvalsFactory/refinery/cli.ts', 'run', '{{task}}', '{{dataset}}', '--plan', '{{plan}}'],
    examples: [
      { name: 'Signal Enrichment', args: ['ts-node', 'EvalsFactory/refinery/cli.ts', 'run', 'signal_enrichment', 'golden_set', '--plan', 'output/plan_i25.json'] },
      { name: 'Event Summary', args: ['ts-node', 'EvalsFactory/refinery/cli.ts', 'run', 'event_summary', 'golden_set', '--plan', 'output/plan_i25.json'] },
    ],
  },

  // ===========================================================================
  // SchemaFactory: Materialization
  // ===========================================================================
  {
    id: 'schema:synthesize',
    owner: 'Schema',
    title: 'Synthesize Contracts',
    purpose: 'Compile hydrated prompts + JSON schemas into Zod validators',
    command: 'npx',
    args: ['ts-node', 'SchemaFactory/cli.ts', 'synthesize', '--plan', '{{plan}}'],
    examples: [
      { name: 'I32a Ortho', args: ['ts-node', 'SchemaFactory/cli.ts', 'synthesize', '--plan', 'output/i32a-Orthopedics/plan.json'] },
    ],
  },
  {
    id: 'schema:certify',
    owner: 'Schema',
    title: 'Certify Release',
    purpose: 'Freeze logic into a versioned release in certified/',
    command: 'npx',
    args: ['ts-node', 'SchemaFactory/cli.ts', 'certify', '--plan', '{{plan}}'],
    examples: [
      { name: 'I32a Ortho', args: ['ts-node', 'SchemaFactory/cli.ts', 'certify', '--plan', 'output/i32a-Orthopedics/plan.json'] },
    ],
  },
  {
    id: 'schema:seed',
    owner: 'Schema',
    title: 'Generate DB Seed',
    purpose: 'Generate production Snowflake SQL seed with hydrated prompts',
    command: 'npx',
    args: ['ts-node', 'tools/generate_snowflake_seed.ts', '--metric', '{{metric}}'],
    examples: [
      { name: 'I32a Ortho', args: ['ts-node', 'tools/generate_snowflake_seed.ts', '--metric', 'I32a'] },
    ],
  },

  // ===========================================================================
  // Ops: Demo & Campaigns
  // ===========================================================================
  {
    id: 'ops:demo',
    owner: 'Ops',
    title: 'Demo Pipeline',
    purpose: 'Run a clinical case through the full S0-S5 pipeline (Emily)',
    command: 'npx',
    args: ['ts-node', 'MissionControl/process-case.ts', 'demo', '--case', '{{case}}', '--metric', '{{metric}}'],
    examples: [
      { name: 'Emily I32a', args: ['ts-node', 'MissionControl/process-case.ts', 'demo', '--case', 'emily', '--metric', 'I32a'] },
    ],
  },
  {
    id: 'ops:teardown',
    owner: 'Ops',
    title: 'Clean Workspace (Metric-Specific)',
    purpose: 'Wipe all generated outputs and history for a metric (preserves /certified)',
    command: 'npx',
    args: ['ts-node', 'tools/teardown.ts', '--metric', '{{metric}}'],
    examples: [
      { name: 'I32a Teardown', args: ['ts-node', 'tools/teardown.ts', '--metric', 'I32a'] },
    ],
  },
  {
    id: 'ops:launch',
    owner: 'Ops',
    title: 'Launch Campaign',
    purpose: 'Launch a multi-metric campaign via the Conductor',
    command: 'npx',
    args: ['ts-node', 'tools/conductor/cli.ts', 'launch', '--manifest', '{{manifest}}'],
    examples: [
      { name: 'USNWR Ortho 2025', args: ['ts-node', 'tools/conductor/cli.ts', 'launch', '--manifest', 'campaigns/usnwr_ortho_2025.json'] },
    ],
  },
];
