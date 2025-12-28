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
    title: 'Scaffold New Domain',
    purpose: 'Initialize a new domain workspace in the registry',
    command: 'npx',
    args: ['ts-node', 'tools/scaffold-domain.ts', '--domain', '{{domain}}', '--source', 'Orthopedics'],
    examples: [
      { name: 'Cardiology', args: ['ts-node', 'tools/scaffold-domain.ts', '--domain', 'Cardiology', '--source', 'Orthopedics'] },
      { name: 'Neurology', args: ['ts-node', 'tools/scaffold-domain.ts', '--domain', 'Neurology', '--source', 'Orthopedics'] },
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
