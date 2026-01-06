import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { getConcernMetadata } from '../../config/concernRegistry';
import { BatchStrategy, GenerationScenario, DuetProfile, TaskScenario, CaseContract } from './BatchStrategy';
import { SemanticPacketLoader } from '../../utils/semanticPacketLoader';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DATASET_MODEL = process.env.DATASET_MODEL || 'gpt-4o-mini';
const DATASET_MAX_TOKENS = parseInt(process.env.DATASET_MAX_TOKENS || '8000', 10);
const DATASET_TEMPERATURE = parseFloat(process.env.DATASET_TEMPERATURE || '0.7');
const SECTION_DIVIDER = '--------------------------------------------------------------';

const ARCHETYPE_HINTS: Record<string, string> = {
  Process_Auditor: 'Think like a Process_Auditor focusing on protocol compliance and timestamps.',
  Preventability_Detective: 'Think like a Preventability_Detective focusing on why the event happened and prevention levers.',
  Delay_Driver_Profiler: 'Think like a Delay_Driver_Profiler focusing on systemic reasons for delays.',
  Exclusion_Hunter: 'Think like an Exclusion_Hunter focusing on inclusion/exclusion criteria and edge cases.',
  Safety_Signal: 'Think like a Safety_Signal lens focusing on bad outcomes or risk flags.',
  Documentation_Gap: 'Think like a Documentation_Gap reviewer focusing on missing or conflicting documentation.'
};

function collectScenarios(strategy: BatchStrategy): TaskScenario[] {
  if (strategy.task_scenarios) {
    return Object.values(strategy.task_scenarios).flatMap(ts => ts.scenarios as TaskScenario[]);
  }
  return (strategy.scenarios || []) as TaskScenario[];
}

function deriveIntentOrFail(contract: CaseContract | undefined, label: string): string {
  if (!contract || !Array.isArray(contract.intents) || contract.intents.length === 0) {
    throw new Error(`Scenario "${label}" missing contract.intents (hard gate)`);
  }
  const intents = contract.intents.filter(Boolean);
  if (intents.length === 0) {
    throw new Error(`Scenario "${label}" has empty contract.intents after normalization`);
  }
  return intents.length === 1 ? intents[0] : 'MULTI_INTENT';
}

function enforceStrategyGuards(strategy: BatchStrategy) {
  const scenarios = collectScenarios(strategy);
  const dedupKeys = new Set<string>();

  scenarios.forEach((scenario, idx) => {
    const label = scenario.id || scenario.description || `scenario_${idx + 1}`;
    const intents = scenario.contract?.intents || [];
    if (!intents || intents.length === 0) {
      throw new Error(`Scenario "${label}" has no contract.intents (prevention gate)`);
    }

    const isAmbiguity = scenario.type === 'doubt' || intents.includes('AMBIGUITY');
    if (isAmbiguity) {
      if (!scenario.is_ambiguity_case) {
        scenario.is_ambiguity_case = true;
      }
      if (!scenario.conflict_type) {
        scenario.conflict_type = 'affirm_vs_deny';
      }
      if (!scenario.resolution_policy) {
        scenario.resolution_policy = 'none_allowed';
      }
    }

    // Novelty and dedup guards
    const confounderTag = scenario.confounder_tag || scenario.id || scenario.description || `scenario_${idx + 1}`;
    const newFailureMode = scenario.new_failure_mode || scenario.type || scenario.description || `scenario_${idx + 1}`;
    if (!confounderTag) throw new Error(`Scenario "${label}" missing confounder_tag (required for dedup)`);
    if (!newFailureMode) throw new Error(`Scenario "${label}" missing new_failure_mode (required for novelty)`);

    // Mutate in-place so downstream metadata is present
    scenario.confounder_tag = confounderTag;
    scenario.new_failure_mode = newFailureMode;

    const expectedSignals = scenario.contract?.expected_signals?.map(s => s.signal_id).filter(Boolean).sort() || [];
    const dedupKey = `${expectedSignals.join('|')}|${confounderTag}`;
    if (dedupKeys.has(dedupKey)) {
      throw new Error(`Duplicate scenario detected on (signal set + confounder_tag): "${label}"`);
    }
    dedupKeys.add(dedupKey);
  });
}

function deriveScenarioMarkers(scenario: GenerationScenario, idx: number) {
  return {
    confounder_tag: (scenario as any).confounder_tag || scenario.id || scenario.description || `scenario_${idx + 1}`,
    new_failure_mode: (scenario as any).new_failure_mode || (scenario as any).type || scenario.description || `scenario_${idx + 1}`
  };
}

export interface GeneratorConfig {
  strategy: BatchStrategy;
  output_dir: string;
  batch_size?: number;
  dry_run?: boolean;
  resume?: boolean;
  semantic_overlay?: any; 
}

function buildSystemPrompt(concernId: string, domain: string, globalDuet?: DuetProfile, semantic_overlay?: any): string {
  const metadata = getConcernMetadata(concernId);
  const description = metadata?.description || concernId;
  const safeDomain = domain || metadata?.domain || 'Clinical';

  const loader = SemanticPacketLoader.getInstance();
  const packet = semantic_overlay || loader.load(safeDomain, concernId);
  const metricDef = packet?.metrics[concernId];
  const signals = packet?.signals;

  let metricFrame = `• Domain: ${safeDomain}\n• Description: ${description}\n• Goal: Generate realistic clinical narratives.`;
  if (metricDef) {
    metricFrame += `\n• Clinical Focus: ${metricDef.clinical_focus}`;
    metricFrame += `\n• Rationale: ${metricDef.rationale}`;
    if (metricDef.risk_factors) metricFrame += `\n• Risk Factors: ${metricDef.risk_factors.join(', ')}`;
    if (packet.isSpecialized) {
        metricFrame += `\n• BIOS TIER: SPECIALIZED (Strictly follow definitions)`;
    }
  }

  const archetypeLenses = `
- [Process_Auditor]: Focus on exact timestamps and delays.
- [Preventability_Detective]: Focus on "why" (root cause, prevention).
- [Delay_Driver_Profiler]: Focus on systemic reasons.
- [Exclusion_Hunter]: Focus on inclusion/exclusion criteria.
- [Safety_Signal]: Focus on bad outcomes or risk flags.
- [Documentation_Gap]: Focus on missing/conflicting info.
`;

  let signalScaffolds = `You must generate a "notes" array, then record every signal you inserted in the "trace".`;
  if (signals) {
    signalScaffolds += `\n\nCRITICAL: You MUST use these canonical IDs in your "trace":\n`;
    for (const [group, items] of Object.entries(signals)) {
        if (Array.isArray(items) && items.length > 0) {
            signalScaffolds += `\n[${group.toUpperCase()}]:`;
            items.slice(0, 15).forEach((s: any) => {
                const id = s.id || s.signal_id || s;
                const desc = s.description || s.name || s;
                signalScaffolds += `\n  - ${id}: ${desc}`;
            });
        }
    }
  }

  const duetContext = (globalDuet && (globalDuet.knowledge_source_id || globalDuet.persona)) 
    ? `${SECTION_DIVIDER}\n0. DUET CONTEXT\n${SECTION_DIVIDER}\n- Knowledge Source: ${globalDuet.knowledge_source_id || 'N/A'}\n- Persona: ${globalDuet.persona || 'N/A'}\n\n` 
    : '';

  return `You are a Clinical Data Simulator for ${safeDomain}.
Your goal is to generate "Golden Test Cases" for the "${concernId}" (${description}) metric.

You must produce a JSON object with a "test_cases" array. Each case must be a realistic, multi-note clinical narrative.

${SECTION_DIVIDER}
1. SIMULATION TRACE (CRITICAL)
${SECTION_DIVIDER}
For every signal you insert into the narrative, you MUST record a "trace" entry.
- note_id: which note contains the signal (e.g., "n1").
- signal_id: Use the EXACT canonical ID from the Scaffolds below (e.g., "wound_drainage_erythema"). DO NOT use the group name.
- intent: KNOWLEDGE, AMBIGUITY, SAFETY, or SYNTHESIS.
- polarity: AFFIRM (present) or DENY (negated).
- substring: The EXACT verbatim text you wrote in the note.
- offsets: The [start, end] character indices of that substring within the note text.

**STRICT RULE: NO ID DRIFT.** If you use an ID not listed in the scaffolds, the test will fail verification.

${duetContext}${SECTION_DIVIDER}
2. METRIC FRAME: ${concernId}
${SECTION_DIVIDER}
${metricFrame}

${SECTION_DIVIDER}
3. ARCHETYPE LENSES
${SECTION_DIVIDER}
${archetypeLenses}

${SECTION_DIVIDER}
4. SIGNAL SCAFFOLDS
${SECTION_DIVIDER}
${signalScaffolds}

${SECTION_DIVIDER}
5. OUTPUT FORMAT (Strict JSON)
${SECTION_DIVIDER}
{
  "test_cases": [
    {
      "test_id": "placeholder",
      "description": "One-line summary of scenario...",
      "notes": [
        { "id": "n1", "author": "MD", "timestamp": "2025-01-01T10:00Z", "text": "..." }
      ],
      "trace": {
        "trace_schema_version": "1.0",
        "items": [
          {
            "note_id": "n1",
            "signal_id": "...",
            "intent": "...",
            "polarity": "...",
            "substring": "...",
            "offsets": [start, end]
          }
        ]
      }
    }
  ]
}
`;
}

function buildUserPrompt(scenarios: GenerationScenario[], batchIndex: number): string {
  return `Generating Batch ${batchIndex + 1} (${scenarios.length} cases).\n\nPlease generate test cases for the following scenarios:\n\n${scenarios.map((s, i) => {
    const archetypeHint = ARCHETYPE_HINTS[s.archetype];
    let text = `${i + 1}. Scenario: ${s.description}\n   Archetype Lens: [${s.archetype}] ${archetypeHint || 'Apply lens.'}`;
    if (s.duet) text += `\n   [Knowledge Source]: Apply logic from ${s.duet.knowledge_source_id} (${s.duet.persona}).`;
    if (s.doubt && s.doubt.length > 0) {
      text += `\n   CASE PERTURBATION RULES:`;
      s.doubt.forEach(d => { text += `\n     - ${d.type.toUpperCase()}: ${d.instruction}`; });
    }
    return text;
  }).join('\n\n')}\n\nEnsure distinct patient details for each case.`;
}

async function generateBatch(client: OpenAI, concernId: string, domain: string, scenarios: GenerationScenario[], batchIndex: number, outputDir: string, globalDuet?: DuetProfile, semantic_overlay?: any) {
  console.log(`\n🚀 Generating Batch ${batchIndex + 1} (${scenarios.length} cases):`);
  scenarios.forEach((s, i) => {
      console.log(`   [Case ${i+1}] Intent: "${s.description.slice(0, 80)}..."`);
  });
  
  const systemPrompt = buildSystemPrompt(concernId, domain, globalDuet, semantic_overlay);
  const userPrompt = buildUserPrompt(scenarios, batchIndex);

  try {
    const response = await client.chat.completions.create({
      model: DATASET_MODEL,
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
      temperature: DATASET_TEMPERATURE,
      max_tokens: DATASET_MAX_TOKENS,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response');
    const data = JSON.parse(content);
    const cases = data.test_cases.map((tc: any, i: number) => {
      const scenario = scenarios[i] as any;
      const intent = deriveIntentOrFail(scenario.contract, scenario.id || scenario.description || `scenario_${i + 1}`);
      const markers = deriveScenarioMarkers(scenario, i);
      return {
        ...tc,
        test_id: `${concernId}-BATCH${batchIndex + 1}-${String(i + 1).padStart(3, '0')}`,
        concern_id: concernId,
        metadata: {
          batch_index: batchIndex + 1,
          intent,
          confounder_tag: markers.confounder_tag,
          new_failure_mode: markers.new_failure_mode,
          review_status: 'auto_generated'
        }
      };
    });

    const filename = `${concernId}_batch_${batchIndex + 1}.json`;
    const filepath = path.join(outputDir, filename);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const output = {
      batch_strategy: { batch_index: batchIndex + 1, scenario_count: scenarios.length, scenarios: scenarios },
      test_cases: cases
    };
    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`✅ Saved ${cases.length} cases to ${filepath}`);
  } catch (error: any) {
    console.error(`❌ Error generating batch ${batchIndex + 1}:`, error.message);
  }
}

export { buildSystemPrompt, buildUserPrompt };
export async function runGenerator(config: GeneratorConfig) {
  if (!process.env.OPENAI_API_KEY) { console.error('❌ OPENAI_API_KEY missing'); process.exit(1); }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const BATCH_SIZE = config.batch_size || 5;
  const CONCURRENCY = 5; // Parallel batches

  enforceStrategyGuards(config.strategy);

  let scenarios: GenerationScenario[] = [];
  if (config.strategy.task_scenarios) scenarios = Object.values(config.strategy.task_scenarios).flatMap(ts => ts.scenarios);
  else if (config.strategy.scenarios) scenarios = config.strategy.scenarios;

  const concernId = config.strategy.metric_id;
  const domain = config.strategy.domain;
  const batches = [];
  for (let i = 0; i < scenarios.length; i += BATCH_SIZE) batches.push(scenarios.slice(i, i + BATCH_SIZE));

  if (!fs.existsSync(config.output_dir)) fs.mkdirSync(config.output_dir, { recursive: true });
  fs.writeFileSync(path.join(config.output_dir, 'generation_strategy.json'), JSON.stringify(config.strategy, null, 2));
  
  console.log(`📋 Generation Strategy: ${concernId} | ${scenarios.length} scenarios | ${batches.length} batches`);

  if (config.dry_run) return;

  const totalBatches = batches.length;
  let completedCount = 0;

  // Parallel Execution with Concurrency Limit
  const runBatchWithTracking = async (batch: any[], index: number) => {
    const filename = `${concernId}_batch_${index + 1}.json`;
    if (config.resume && fs.existsSync(path.join(config.output_dir, filename))) {
        completedCount++;
        return;
    }

    await generateBatch(client, concernId, domain, batch, index, config.output_dir, config.strategy.global_duet, config.semantic_overlay);
    completedCount++;
    const pct = Math.round((completedCount / totalBatches) * 100);
    console.log(`\n📊 [PROGRESS] ${completedCount}/${totalBatches} batches complete (${pct}%)\n`);
  };

  // Simple chunked parallel execution
  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk = batches.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map((batch, j) => runBatchWithTracking(batch, i + j)));
  }

  console.log('\n🎉 Generation Complete.');
}
