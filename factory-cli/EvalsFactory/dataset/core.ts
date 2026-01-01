import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { getConcernMetadata } from '../../config/concernRegistry';
import { BatchStrategy, GenerationScenario, DuetProfile } from './BatchStrategy';
import { SemanticPacketLoader } from '../../utils/semanticPacketLoader';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const DATASET_MODEL = process.env.DATASET_MODEL || 'gpt-4o-mini';
const DATASET_MAX_TOKENS = parseInt(process.env.DATASET_MAX_TOKENS || '8000', 10);
const DATASET_TEMPERATURE = parseFloat(process.env.DATASET_TEMPERATURE || '0.7');
const NARRATIVE_MIN_WORDS = process.env.DATASET_NARRATIVE_MIN_WORDS || '80';
const NARRATIVE_MAX_WORDS = process.env.DATASET_NARRATIVE_MAX_WORDS || '120';
const SECTION_DIVIDER = '--------------------------------------------------------------';

const ARCHETYPE_HINTS: Record<string, string> = {
  Process_Auditor: 'Think like a Process_Auditor focusing on protocol compliance and timestamps.',
  Preventability_Detective: 'Think like a Preventability_Detective focusing on why the event happened and prevention levers.',
  Delay_Driver_Profiler: 'Think like a Delay_Driver_Profiler focusing on systemic reasons for delays.',
  Exclusion_Hunter: 'Think like an Exclusion_Hunter focusing on inclusion/exclusion criteria and edge cases.',
  Safety_Signal: 'Think like a Safety_Signal lens focusing on bad outcomes or risk flags.',
  Documentation_Gap: 'Think like a Documentation_Gap reviewer focusing on missing or conflicting documentation.'
};

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

  let signalScaffolds = `You must generate a "patient_payload" narrative first, then extract EXACT phrases for "must_find_signals".`;
  if (signals) {
    signalScaffolds += `\n\nCRITICAL: Use these EXACT signal concepts in your narrative and expectations:\n`;
    for (const [group, items] of Object.entries(signals)) {
        if (Array.isArray(items) && items.length > 0) {
            signalScaffolds += `\n[${group.toUpperCase()}]: ${items.slice(0, 15).join('; ')}`;
        }
    }
  }

  const duetContext = (globalDuet && (globalDuet.knowledge_source_id || globalDuet.persona)) 
    ? `${SECTION_DIVIDER}\n0. DUET CONTEXT\n${SECTION_DIVIDER}\n- Knowledge Source: ${globalDuet.knowledge_source_id || 'N/A'}\n- Persona: ${globalDuet.persona || 'N/A'}\n\n` 
    : '';

  return `You are a Clinical Data Simulator for ${safeDomain}.
Your goal is to generate "Golden Test Cases" for the "${concernId}" (${description}) metric.

You must produce a JSON object with a "test_cases" array. Each case must be clinically realistic and aligned with the provided scenario.

${duetContext}${SECTION_DIVIDER}
1. METRIC FRAME: ${concernId}
${SECTION_DIVIDER}
${metricFrame}

${SECTION_DIVIDER}
2. ARCHETYPE LENSES
${SECTION_DIVIDER}
${archetypeLenses}

${SECTION_DIVIDER}
3. SIGNAL SCAFFOLDS
${SECTION_DIVIDER}
${signalScaffolds}

${SECTION_DIVIDER}
4. GENERATION PROCESS
${SECTION_DIVIDER}
For each scenario provided by the user:
1. Analyze the Scenario: Identify Archetype, Clinical Pattern, Context, and Outcome Label.
2. Draft Narrative: Write ${NARRATIVE_MIN_WORDS}-${NARRATIVE_MAX_WORDS} words. Ensure you include evidence for all required signals from the scenario.
3. Apply Challenges (Doubt/Duet): If the scenario specifies "Doubt" (e.g., conflicting data) or "Duet" (specific guidelines), incorporate them into the narrative.
4. Extract Expectations:
   - signal_generation: Pick 3-5 EXACT VERBATIM substrings from YOUR generated narrative.
   - event_summary: You MUST include at least 3 phrases from the SIGNAL SCAFFOLDS above in your "must_contain_phrases", provided they are present verbatim in your narrative.

CRITICAL: "must_find_signals" and "must_contain_phrases" MUST be present in your "patient_payload" exactly as written. 
BIOS SYNCHRONIZATION: Your generated narrative should be the "Clinical Proof" that these signals exist.

${SECTION_DIVIDER}
5. OUTPUT FORMAT (Strict JSON)
${SECTION_DIVIDER}
{
  "test_cases": [
    {
      "test_id": "placeholder",
      "concern_id": "${concernId}",
      "description": "One-line summary...",
      "patient_payload": "Full clinical narrative...",
      "expectations": {
        "signal_generation": {
          "must_find_signals": ["exact substring 1", "exact substring 2", ...],
          "min_signal_count": 3
        },
        "event_summary": {
          "must_contain_phrases": ["phrase 1", "phrase 2"]
        },
        "followup_questions": {
          "required_themes": ["theme 1", "theme 2"],
          "forbidden_terms": ["policy", "guideline"]
        }
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
    const cases = data.test_cases.map((tc: any, i: number) => ({
      ...tc,
      test_id: `${concernId}-BATCH${batchIndex + 1}-${String(i + 1).padStart(3, '0')}`,
      concern_id: concernId
    }));

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
  let scenarios: GenerationScenario[] = [];
  if (config.strategy.task_scenarios) scenarios = Object.values(config.strategy.task_scenarios).flatMap(ts => ts.scenarios);
  else if (config.strategy.scenarios) scenarios = config.strategy.scenarios;

  const concernId = config.strategy.metric_id;
  const domain = config.strategy.domain;
  const batches = [];
  for (let i = 0; i < scenarios.length; i += BATCH_SIZE) batches.push(scenarios.slice(i, i + BATCH_SIZE));

  if (!fs.existsSync(config.output_dir)) fs.mkdirSync(config.output_dir, { recursive: true });
  fs.writeFileSync(path.join(config.output_dir, 'generation_strategy.json'), JSON.stringify(config.strategy, null, 2));
  
  console.log(`📋 Generation Strategy saved to ${config.output_dir}/generation_strategy.json`);
  console.log(`   Metric: ${concernId} | Scenarios: ${scenarios.length} | Batches: ${batches.length}`);

  if (config.dry_run) return;

  for (let i = 0; i < batches.length; i++) {
    const filename = `${concernId}_batch_${i + 1}.json`;
    if (config.resume && fs.existsSync(path.join(config.output_dir, filename))) {
        console.log(`   ⏭️  Batch ${i + 1} already exists. Skipping.`);
        continue;
    }
    await generateBatch(client, concernId, domain, batches[i], i, config.output_dir, config.strategy.global_duet, config.semantic_overlay);
  }
  console.log('\n🎉 Generation Complete.');
}
