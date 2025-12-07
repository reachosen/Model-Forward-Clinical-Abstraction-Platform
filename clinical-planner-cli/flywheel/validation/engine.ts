import { EngineOutput } from './types';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Ensure env vars are loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Default extraction prompt (baseline)
const DEFAULT_SYSTEM_PROMPT = `You are a specialized Clinical Signal Extraction Engine for pediatric orthopedics.
Your goal is to analyze the provided patient narrative and extract key structured data.

TARGET CONCERN: I25 (Supracondylar Humerus Fracture)

OUTPUT FORMAT (JSON):
{
  "summary": "Brief 1-2 sentence clinical summary including age, injury, and key outcome/delay.",
  "signals": ["list", "of", "specific", "phrases", "extracted", "verbatim", "or", "near-verbatim"],
  "followup_questions": ["List of 2-3 relevant follow-up questions"]
}

EXTRACTION RULES:
1. Signals: Extract phrases related to:
   - Diagnosis (e.g., "Gartland type II")
   - Timestamps/Delays (e.g., "arrived at 20:00", "13h delay")
   - Clinical Signs (e.g., "pink pulseless hand", "pucker sign", "compartment syndrome")
   - Outcomes/Reasons (e.g., "OR capacity issues")
2. Summary: Must capture the essence of the case.
3. Follow-up Questions: Should probe for missing details or clarify the timeline/decision-making.
`;

export async function runI25Engine(input: {
  concern_id: string;
  patient_payload: string;
  metadata?: Record<string, any>;
  systemPrompt?: string; // Allow overriding the prompt
}): Promise<EngineOutput> {
  
  const promptToUse = input.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  const start = Date.now();

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: promptToUse },
        { role: 'user', content: input.patient_payload }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.0 // Deterministic for testing
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("Empty response from Engine LLM");

    const parsed = JSON.parse(content);

    // Adapter: Flatten 'signal_groups' -> 'signals' array if using new schema
    let flattenedSignals: string[] = [];
    if (parsed.signal_groups && Array.isArray(parsed.signal_groups)) {
      flattenedSignals = parsed.signal_groups.flatMap((group: any) => 
        (group.signals || []).map((s: any) => s.provenance)
      );
    } else if (parsed.signals && Array.isArray(parsed.signals)) {
      // Fallback to old schema
      flattenedSignals = parsed.signals;
    }

    return {
      raw_input: input.patient_payload,
      summary: parsed.summary || "Summary skipped in lean mode",
      signals: flattenedSignals,
      followup_questions: parsed.followup_questions || [],
      enrichment_20_80: parsed.enrichment_20_80, 
      model_name: 'gpt-4o-mini',
      latency_ms: Date.now() - start
    };

  } catch (error: any) {
    console.error(`Engine Error (Case ${input.metadata?.test_id}):`, error.message);
    // Return a safe failure object so batch doesn't crash
    return {
      raw_input: input.patient_payload,
      summary: "ENGINE_ERROR",
      signals: [],
      followup_questions: [],
      model_name: 'gpt-4o-mini-error',
      latency_ms: Date.now() - start
    };
  }
}