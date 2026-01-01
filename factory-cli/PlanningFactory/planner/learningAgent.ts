/**
 * Learning Agent
 *
 * Analyzes rejected planner outputs and proposes improvements to libraries/rules/questions.
 * Uses LLM to understand reviewer feedback and generate structured patches.
 */

import { LearningQueueItem, LearningPatch } from '../../models/LearningQueue';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * System prompt for learning agent
 *
 * This will be used when LLM integration is implemented.
 * For now, it serves as documentation of the agent's behavior.
 */
export const LEARNING_AGENT_SYSTEM_PROMPT = `You are a clinical configuration improvement assistant for a U.S. freestanding pediatric hospital that reports to USNWR and participates in the Solutions for Patient Safety (SPS) collaborative.

Your role is to analyze rejected planner configurations and propose small, focused improvements.

## Context

The hospital uses an automated planner to generate:
- HAC surveillance configs (CLABSI, CAUTI, VAP/VAE, SSI) with NHSN criteria
- USNWR quality metric abstraction configs (I21, I25, I60, etc.)

When an SME (Subject Matter Expert) reviews a generated config and marks it as "needs improvement", you see:
1. The original planning input (what was requested)
2. The generated plan/config (what the system produced)
3. The reviewer's comment (what was wrong or missing)

## Your Task

Do NOT regenerate the entire config. Instead, propose small, concrete updates to ONE of:
- **Signal libraries**: Add, remove, rename, or reprioritize signals
- **HAC rule sets**: Add missing criteria or modify existing ones
- **USNWR questions**: Add, modify, or remove abstraction questions
- **Planner prompts**: Suggest additions or modifications to guidance

## Important Constraints

1. **Pediatric Focus**: Always assume PEDIATRIC population (neonates, infants, children, adolescents)
2. **Age-Specific**: Use age-stratified criteria where appropriate (days, months, years)
3. **Parsimony**: Prefer adding 2-3 high-yield signals over 20 low-yield ones
4. **Specificity**: Proposed changes must be concrete, not vague suggestions
5. **Evidence-Based**: Reference NHSN, SPS, or USNWR specs when applicable
6. **Incremental**: Small, focused patches that build on existing libraries

## Handling Validation Failures
- **CR Miss (Missed Signal):** The model failed to extract a required signal.
  - If the concept exists but was missed (e.g., missed "Erythema" when text said "Redness"), add an explicit rule to `prompt_additions` under "EXTRACTION GUIDANCE" (e.g., "Map 'redness' or 'rubor' to 'Wound Erythema'").
  - If the signal definition is missing entirely, add the EXACT signal ID from the failure report to `signals_to_add`.
- **AC Miss (Content Gap):** The summary missed a key phrase.
  - Add a rule to `prompt_additions` requiring this specific content in the summary.
- **AH Violation (Hallucination):** The model invented info.
  - Add a negative constraint to `prompt_additions` (e.g., "Do NOT infer X from Y").

## Prompt Engineering Guidelines
- When patching prompts, respect the existing Markdown structure.
- Use 'prompt_additions' to append new rules or context to the relevant section (e.g., "EXTRACTION GUIDANCE").
- Use 'prompt_modifications' to strictly find and replace text. Ensure 'old_text' is unique and exists in the template.
- Focus on clarity, precision, and alignment with the metric definition.
- Do not remove semantic placeholders like {{metricName}}.

## Output Format

Return a JSON object matching the LearningPatch interface:

{
  "target": "signal_library" | "rules" | "questions" | "prompt",
  "archetype": string,
  "domain": string,
  "review_target": string,
  "proposed_changes": {
    // Structure depends on target - see examples below
  },
  "explanation_summary": string,
  "confidence": number (0-1)
}

## Examples

### Example 1: Missing Signal
Reviewer comment: "Missing TPN status for neonatal CLABSI risk assessment"

Response:
{
  "target": "signal_library",
  "archetype": "HAC_CLABSI",
  "domain": "nicu",
  "review_target": "CLABSI",
  "proposed_changes": {
    "signals_to_add": [
      {
        "id": "tpn_active",
        "name": "Total Parenteral Nutrition (TPN) Active",
        "category": "clinical",
        "priority": "core",
        "rationale": "Neonates on TPN via central line have elevated fungal CLABSI risk per NHSN guidelines"
      }
    ]
  },
  "explanation_summary": "Add TPN status signal to identify high-risk neonatal CLABSI cases",
  "confidence": 0.9
}

### Example 2: Missing USNWR Question
Reviewer comment: "Need to capture 30-day readmission for I25"

Response:
{
  "target": "questions",
  "archetype": "USNWR_ORTHO_METRIC",
  "domain": "orthopedics",
  "review_target": "I25",
  "proposed_changes": {
    "questions_to_add": [
      {
        "question_id": "I25_Q4_READMISSION",
        "question_text": "Was the patient readmitted within 30 days of the index orthopedic procedure?",
        "rationale": "30-day readmission is a key USNWR quality indicator for orthopedic procedures"
      }
    ]
  },
  "explanation_summary": "Add 30-day readmission question to I25 orthopedic metric",
  "confidence": 0.85
}

### Example 3: Incorrect Priority
Reviewer comment: "Blood culture date should be core, not supporting"

Response:
{
  "target": "signal_library",
  "archetype": "HAC_CLABSI",
  "domain": "pediatric_icu",
  "review_target": "CLABSI",
  "proposed_changes": {
    "signals_to_reprioritize": [
      {
        "id": "blood_culture_collection_date",
        "new_priority": "core",
        "rationale": "Blood culture timing is essential for CLABSI infection window calculation per NHSN criteria"
      }
    ]
  },
  "explanation_summary": "Elevate blood culture date to core priority for CLABSI surveillance",
  "confidence": 0.95
}

## Guidelines

- If the comment is vague, propose the most likely improvement based on clinical best practices
- If multiple changes are needed, prioritize the highest-impact one
- Set confidence lower (0.5-0.7) if the reviewer comment is ambiguous
- Always include a clear rationale that references clinical guidelines when possible
`;

/**
 * Propose a learning patch based on a rejected config
 *
 * @param item - Learning queue item with rejected config and reviewer feedback
 * @param useMock - If true, use mock mode instead of LLM (for testing)
 * @returns Learning patch with proposed improvements
 */
export async function proposeLearningPatch(
  item: LearningQueueItem,
  useMock: boolean = false
): Promise<LearningPatch> {
  if (useMock) {
    return generateMockPatch(item);
  }

  console.log(`🤖 Consulting LLM for learning patch...`);
  
  try {
      const userPrompt = `
Analyze the following feedback and propose a configuration patch.

DOMAIN: ${item.domain}
ARCHETYPE: ${item.archetype}
REVIEW TARGET: ${item.review_target}

REVIEWER FEEDBACK:
"${item.reviewer_comment}"

Reflect on the feedback and generate a JSON patch.
`;

      const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          temperature: 0.2, // Low temperature for consistent JSON
          messages: [
              { role: 'system', content: LEARNING_AGENT_SYSTEM_PROMPT },
              { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' }
      });

      const content = completion.choices[0].message.content;
      if (!content) {
          throw new Error("Empty response from LLM");
      }

      const patch = JSON.parse(content) as LearningPatch;
      
      // Enforce metadata linkage
      patch.source_queue_item_id = item.id;
      patch.generated_at = new Date().toISOString();
      
      return patch;

  } catch (error) {
      console.error("❌ LLM Error:", error);
      console.warn("⚠️ Falling back to mock implementation due to error.");
      return generateMockPatch(item);
  }
}

/**
 * Generate a mock learning patch for testing
 */
function generateMockPatch(item: LearningQueueItem): LearningPatch {
  const { archetype, domain, review_target, reviewer_comment } = item;

  // Simple heuristics based on comment keywords
  const comment_lower = reviewer_comment.toLowerCase();

  // Detect what kind of patch is needed
  if (comment_lower.includes('missing') && (comment_lower.includes('signal') || comment_lower.includes('data'))) {
    // Missing signal
    return {
      target: 'signal_library',
      archetype,
      domain,
      review_target,
      proposed_changes: {
        signals_to_add: [
          {
            id: 'suggested_signal',
            name: 'Suggested Signal (based on reviewer comment)',
            category: 'clinical',
            priority: 'core',
            rationale: `Added based on reviewer feedback: ${reviewer_comment.substring(0, 100)}`,
          },
        ],
      },
      explanation_summary: `Add missing signal identified in review: ${reviewer_comment.substring(0, 80)}`,
      confidence: 0.6,
      source_queue_item_id: item.id,
      generated_at: new Date().toISOString(),
    };
  }

  if (comment_lower.includes('question') || comment_lower.includes('abstraction')) {
    // USNWR question issue
    return {
      target: 'questions',
      archetype,
      domain,
      review_target,
      proposed_changes: {
        questions_to_add: [
          {
            question_id: `${review_target}_Q_SUGGESTED`,
            question_text: 'Suggested question based on reviewer feedback',
            rationale: `Added based on reviewer feedback: ${reviewer_comment.substring(0, 100)}`,
          },
        ],
      },
      explanation_summary: `Add or modify question based on review: ${reviewer_comment.substring(0, 80)}`,
      confidence: 0.6,
      source_queue_item_id: item.id,
      generated_at: new Date().toISOString(),
    };
  }

  if (comment_lower.includes('criteria') || comment_lower.includes('rule')) {
    // HAC rule issue
    return {
      target: 'rules',
      archetype,
      domain,
      review_target,
      proposed_changes: {
        criteria_to_add: [
          {
            id: `${review_target}_SUGGESTED`,
            name: 'Suggested Criterion',
            description: 'Added based on reviewer feedback',
            type: 'inclusion' as const,
            logic: 'TBD - requires SME review',
            rationale: `Added based on reviewer feedback: ${reviewer_comment.substring(0, 100)}`,
          },
        ],
      },
      explanation_summary: `Add or modify criterion based on review: ${reviewer_comment.substring(0, 80)}`,
      confidence: 0.5,
      source_queue_item_id: item.id,
      generated_at: new Date().toISOString(),
    };
  }

  // Default: suggest prompt improvement
  return {
    target: 'prompt',
    archetype,
    domain,
    review_target,
    proposed_changes: {
      prompt_additions: [
        `Consider reviewer feedback: ${reviewer_comment}`,
      ],
    },
    explanation_summary: `Update planner prompt based on review: ${reviewer_comment.substring(0, 80)}`,
    confidence: 0.5,
    source_queue_item_id: item.id,
    generated_at: new Date().toISOString(),
  };
}

/**
 * Batch process multiple learning queue items
 */
export async function batchProposeLearningPatches(
  items: LearningQueueItem[],
  useMock: boolean = false
): Promise<LearningPatch[]> {
  const patches: LearningPatch[] = [];

  for (const item of items) {
    try {
      const patch = await proposeLearningPatch(item, useMock);
      patches.push(patch);
    } catch (error) {
      console.error(`Error proposing patch for item ${item.id}:`, error);
    }
  }

  return patches;
}

/**
 * Validate a learning patch before saving
 */
export function validateLearningPatch(patch: LearningPatch): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!patch.target) {
    errors.push('Missing required field: target');
  }
  if (!patch.archetype) {
    errors.push('Missing required field: archetype');
  }
  if (!patch.domain) {
    errors.push('Missing required field: domain');
  }
  if (!patch.review_target) {
    errors.push('Missing required field: review_target');
  }
  if (!patch.explanation_summary || patch.explanation_summary.trim().length === 0) {
    errors.push('Missing or empty explanation_summary');
  }
  if (patch.confidence < 0 || patch.confidence > 1) {
    errors.push('Confidence must be between 0 and 1');
  }
  if (!patch.proposed_changes || Object.keys(patch.proposed_changes).length === 0) {
    errors.push('proposed_changes is empty or missing');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
