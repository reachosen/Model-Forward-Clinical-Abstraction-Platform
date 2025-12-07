import { runGenerator } from './core';
import * as path from 'path';
import * as fs from 'fs';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

// Adjusted output path
const OUTPUT_DIR = path.join(__dirname, '../../data/flywheel/testcases');

async function generatePlanAndExecute() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is missing in .env');
    process.exit(1);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  console.log("🧠 Generating thoughtful batch plan via LLM (iterative)...");

  const TOTAL_BATCHES = 6;
  const BATCH_SIZE = 50;
  const fullPlan = {
    concern_id: "I25",
    total_scenarios: TOTAL_BATCHES * BATCH_SIZE,
    batch_size: BATCH_SIZE,
    total_batches: TOTAL_BATCHES,
    archetype: "Mixed_Distribution",
    batches: [] as any[]
  };

  try {
    for (let i = 0; i < TOTAL_BATCHES; i++) {
      const batchIndex = i + 1;
      console.log(`   🔹 Planning Batch ${batchIndex}/${TOTAL_BATCHES}...`);

      const BATCH_PROMPT = `You are a Clinical Test Planner for Pediatric Orthopedics (I25 Supracondylar Humerus Fracture).
      
Target: Generate a list of ${BATCH_SIZE} distinct test case scenarios for Batch ${batchIndex} of ${TOTAL_BATCHES}.

Strict Constraints:
1. Numbering: Start exactly from "Generated Case ${(i * BATCH_SIZE) + 1}". Numbering must be contiguous.
2. Content: Every single case MUST be about a pediatric supracondylar humerus fracture (I25).
   - NO generic "QI review" or "policy audit" cases.
3. Archetypes: Use ONLY these 6 tags at the start:
   [Process_Auditor], [Preventability_Detective], [Delay_Driver_Profiler], [Exclusion_Hunter], [Safety_Signal], [Documentation_Gap].
4. Required Elements per line:
   - Patient Age (e.g., "5yo", "8-year-old").
   - Injury Context (e.g., "monkey bars fall", "trampoline", "MVC").
   - Specific Clinical Pattern (Pink pulseless, AIN palsy, Pucker sign, Compartment syndrome, etc.).
   - Timing Element (e.g., "arrived 22:00", "weekend presentation", "delayed transfer").
   - Outcome Logic Label (MUST include one of: "Clear Pass", "Clear Fail", "Borderline").

Format Example:
"Generated Case 101: [Process_Auditor] 5yo male with supracondylar fracture from trampoline fall, pink pulseless hand, arrived Friday 23:00, surgery Saturday 08:00 (17h delay), Borderline."

Output Schema:
{
  "scenarios": [
    "Generated Case ${(i * BATCH_SIZE) + 1}: ...",
    ...
  ]
}
`;

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: "You are a helpful JSON-generating assistant." },
          { role: 'user', content: BATCH_PROMPT }
        ],
        response_format: { type: 'json_object' }
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('Empty response');
      const batchData = JSON.parse(content);

      fullPlan.batches.push({
        batch_index: batchIndex,
        scenarios: batchData.scenarios
      });
    }

    // 1. Compute total_scenarios dynamically
    const allScenarios: string[] = [];
    fullPlan.batches.forEach((b: any) => {
      allScenarios.push(...b.scenarios);
    });
    fullPlan.total_scenarios = allScenarios.length;
    
    // Save full plan
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(OUTPUT_DIR, 'generation_plan.json'), JSON.stringify(fullPlan, null, 2));
    console.log(`📋 Full Plan saved to ${path.join(OUTPUT_DIR, 'generation_plan.json')}`);
    console.log(`   Total Scenarios: ${fullPlan.total_scenarios}`);

    // 4. Generate Sidecar Metadata
    console.log("📊 Generating Metadata...");
    const metadata = allScenarios.map(s => {
      const idMatch = s.match(/Generated Case (\d+):/);
      const archetypeMatch = s.match(/\[(.*?)\]/);
      const outcomeMatch = s.match(/(Clear Pass|Clear Fail|Borderline)/i);
      
      // Simple delay extraction heuristic (looking for "Xh delay" or similar)
      const delayMatch = s.match(/(\d+(\.\d+)?)h\s*(delay|wait)/i);

      return {
        case_id: idMatch ? `I25-CASE-${idMatch[1].padStart(3, '0')}` : 'UNKNOWN',
        raw_text: s,
        archetype: archetypeMatch ? archetypeMatch[1] : 'Unknown',
        outcome: outcomeMatch ? outcomeMatch[1] : 'Unknown',
        estimated_delay_hours: delayMatch ? parseFloat(delayMatch[1]) : null
      };
    });

    fs.writeFileSync(path.join(OUTPUT_DIR, 'generation_plan_metadata.json'), JSON.stringify(metadata, null, 2));
    console.log(`📊 Metadata saved to ${path.join(OUTPUT_DIR, 'generation_plan_metadata.json')}`);

    // 3. Validation Step
    console.log("🔍 Running Quality Checks...");
    const issues: string[] = [];
    metadata.forEach(m => {
      if (m.archetype === 'Unknown') issues.push(`Case ${m.case_id}: Missing Archetype`);
      if (m.outcome === 'Unknown') issues.push(`Case ${m.case_id}: Missing Outcome`);
      if (m.raw_text.includes("north circulation")) issues.push(`Case ${m.case_id}: Typo "north circulation"`); // Specific check from user feedback
    });

    if (issues.length > 0) {
      console.warn("⚠️  Quality Issues Found:");
      issues.slice(0, 10).forEach(i => console.warn(`   - ${i}`));
      if (issues.length > 10) console.warn(`   ...and ${issues.length - 10} more.`);
    } else {
      console.log("✅ No obvious quality issues found.");
    }

    console.log(`🚀 Plan loaded. Executing in plan-only mode...`);

    // Pass to Generator
    await runGenerator({
      concern_id: 'I25',
      archetype: 'Mixed_Distribution',
      scenarios: allScenarios,
      output_dir: OUTPUT_DIR,
      batch_size: 50,
      plan_only: true
    });

  } catch (error: any) {
    console.error("❌ Error in planning:", error);
  }
}

generatePlanAndExecute();
