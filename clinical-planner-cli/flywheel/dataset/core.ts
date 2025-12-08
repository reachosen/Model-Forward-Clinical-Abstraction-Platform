import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// C10: Configuration from .env
const DATASET_MODEL = process.env.DATASET_MODEL || 'gpt-4o-mini';
const DATASET_MAX_TOKENS = parseInt(process.env.DATASET_MAX_TOKENS || '8000', 10);
const DATASET_TEMPERATURE = parseFloat(process.env.DATASET_TEMPERATURE || '0.7');
const NARRATIVE_MIN_WORDS = process.env.DATASET_NARRATIVE_MIN_WORDS || '80';
const NARRATIVE_MAX_WORDS = process.env.DATASET_NARRATIVE_MAX_WORDS || '120';

export interface GeneratorConfig {
  concern_id: string;
  archetype: string;
  scenarios: string[];
  output_dir: string;
  batch_size?: number;
  plan_only?: boolean;
}

// C10: Build system prompt with configurable narrative length
function buildSystemPrompt(): string {
  return `You are a Clinical Data Simulator for Pediatric Orthopedics.
Your goal is to generate "Golden Test Cases" for the "I25" (Supracondylar Humerus Fracture) metric.

You must produce a JSON object with a "test_cases" array. Each case must be mathematically consistent, clinically realistic, and aligned with the provided scenario.

────────────────────────────────────────────────
1. METRIC FRAME: I25 (Supracondylar Humerus Fracture)
────────────────────────────────────────────────
• Domain: Pediatric upper extremity trauma.
• Target: Time from Arrival to OR Start < 18 hours.
• High Risk (Speed Matters): Pink pulseless hand, white/cold hand, compartment syndrome signs.
• Exclusions: Polytrauma affecting care, Transfer delays (sometimes), Refractures (sometimes).
• Scoring:
  - Clear Pass: < 12 hours OR specific exclusion met.
  - Borderline: 12-18 hours OR complex clinical picture.
  - Clear Fail: > 18 hours without valid medical justification.

────────────────────────────────────────────────
2. ARCHETYPE LENSES (Apply strict logic)
────────────────────────────────────────────────
- [Process_Auditor]: Focus on exact timestamps and delay intervals (e.g., "17.5h delay").
- [Preventability_Detective]: Focus on "why" the delay happened (missed signs, slow decisions).
- [Delay_Driver_Profiler]: Focus on systemic reasons (OR capacity, NPO violation, transfer).
- [Exclusion_Hunter]: Focus on valid reasons to exclude (polytrauma, other medical stability).
- [Safety_Signal]: Focus on bad outcomes (compartment syndrome, nerve palsy, readmission).
- [Documentation_Gap]: Focus on missing/conflicting info (e.g., "neurovascular status not documented").

────────────────────────────────────────────────
3. SIGNAL SCAFFOLDS (Must extract verbatim text)
────────────────────────────────────────────────
You must generate a "patient_payload" narrative first, then extract EXACT phrases for "must_find_signals".
Signals must cover:
- Injury/Diagnosis (e.g., "Gartland type III supracondylar humerus fracture")
- Timestamps (e.g., "arrived at 20:00", "surgery at 09:00 next day")
- Clinical Signs (e.g., "pink pulseless hand", "pucker sign", "AIN palsy")
- Delay/Outcome Reasons (e.g., "OR capacity issues", "NPO violation")

────────────────────────────────────────────────
4. GENERATION PROCESS (Mental Scratchpad)
────────────────────────────────────────────────
For each scenario provided by the user:
1. Analyze the Scenario: Identify Archetype, Clinical Pattern, Context, and Outcome Label.
2. Plan the Math: Pick Arrival Time and Surgery Time to match the label (e.g., 18h delay = Fail).
3. Draft Narrative: Write ${NARRATIVE_MIN_WORDS}-${NARRATIVE_MAX_WORDS} words. MUST include explicit times, age, and signs.
   - If [Documentation_Gap], purposefully omit or contradict a key detail (e.g., "notes conflict on pulse").
4. Extract Expectations:
   - signal_generation: Pick 3-5 VERBATIM phrases from your text.
   - event_summary: 3-5 key phrases (Age + Injury + Delay + Outcome).
   - followup_questions: 2 questions relevant to the Archetype (e.g., "reason for delay?").

────────────────────────────────────────────────
5. OUTPUT FORMAT (Strict JSON)
────────────────────────────────────────────────
{
  "test_cases": [
    {
      "test_id": "placeholder",
      "concern_id": "I25",
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

async function generateBatch(client: OpenAI, config: GeneratorConfig, batchScenarios: string[], batchIndex: number) {
  console.log(`\n🚀 Generating Batch ${batchIndex + 1} (${batchScenarios.length} scenarios)...`);
  
  const userPrompt = `
Target Concern: ${config.concern_id}
Primary Archetype: ${config.archetype}

/*
You MUST:
- Obey the Concern Map in the system prompt.
- Keep anatomy and pathology STRICTLY aligned with the Target Concern.
- Make each scenario clearly pediatric and orthopedic.
*/

Please generate ${batchScenarios.length} test cases based on these specific scenarios:
${batchScenarios.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Ensure:
- Distinct patient demographics and clinical details for each.
- For I25/I25.1, ALL cases involve supracondylar humerus fractures at the elbow.
- For I26, ALL cases involve femoral shaft fractures.
- For I27, ALL cases involve forearm fractures / Monteggia variants.
- For I32a/I32b, ALL cases involve spinal fusion for scoliosis (AIS vs NMS as appropriate).
`;

  try {
    const response = await client.chat.completions.create({
      model: DATASET_MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: userPrompt }
      ],
      temperature: DATASET_TEMPERATURE,
      max_tokens: DATASET_MAX_TOKENS,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('Empty response from LLM');

    const data = JSON.parse(content);
    
    // Validate/Fix IDs
    const cases = data.test_cases.map((tc: any, i: number) => ({
      ...tc,
      test_id: `${config.concern_id}-BATCH${batchIndex + 1}-${String(i + 1).padStart(3, '0')}`,
      concern_id: config.concern_id
    }));

    // Save to file
    const filename = `${config.concern_id}_batch_${batchIndex + 1}.json`;
    const filepath = path.join(config.output_dir, filename);
    
    // Ensure dir exists
    if (!fs.existsSync(config.output_dir)) {
      fs.mkdirSync(config.output_dir, { recursive: true });
    }

    // Structure with Batch Plan
    const output = {
      batch_plan: {
        batch_index: batchIndex + 1,
        scenario_count: batchScenarios.length,
        scenarios: batchScenarios
      },
      test_cases: cases
    };

    fs.writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`✅ Saved ${cases.length} cases to ${filepath}`);

  } catch (error: any) {
    console.error(`❌ Error generating batch ${batchIndex + 1}:`, error.message);
  }
}

export async function runGenerator(config: GeneratorConfig) {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing in .env');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const BATCH_SIZE = config.batch_size || 5; // Conservative default
  
  // Chunk scenarios
  const batches = [];
  for (let i = 0; i < config.scenarios.length; i += BATCH_SIZE) {
    batches.push(config.scenarios.slice(i, i + BATCH_SIZE));
  }

  const plan = {
    concern_id: config.concern_id,
    total_scenarios: config.scenarios.length,
    batch_size: BATCH_SIZE,
    total_batches: batches.length,
    archetype: config.archetype,
    batches: batches.map((batch, i) => ({
      batch_index: i + 1,
      scenarios: batch
    }))
  };

  // Ensure dir exists
  if (!fs.existsSync(config.output_dir)) {
    fs.mkdirSync(config.output_dir, { recursive: true });
  }

  const planPath = path.join(config.output_dir, 'generation_plan.json');
  fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
  console.log(`📋 Generation Plan saved to ${planPath}`);
  console.log(`   Total Cases: ${config.scenarios.length}`);
  console.log(`   Batches: ${batches.length}`);

  if (config.plan_only) {
    console.log('🛑 Plan-only mode enabled. Exiting without generating cases.');
    return;
  }

  console.log(`📋 Executing Plan: Generate ${config.scenarios.length} cases in ${batches.length} batches.`);

  for (let i = 0; i < batches.length; i++) {
    await generateBatch(client, config, batches[i], i);
  }
  
  console.log('\n🎉 Generation Complete.');
}
