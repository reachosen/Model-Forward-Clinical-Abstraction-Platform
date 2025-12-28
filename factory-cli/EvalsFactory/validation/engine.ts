import { EngineOutput } from './types';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { getConcernMetadata } from '../../config/concernRegistry';

// Ensure env vars are loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// C11: Configuration from .env
const EVAL_MODEL = process.env.EVAL_MODEL || 'gpt-4o-mini';
const EVAL_MAX_TOKENS = parseInt(process.env.EVAL_MAX_TOKENS || '400', 10);
const EVAL_TEMPERATURE = parseFloat(process.env.EVAL_TEMPERATURE || '0.0');
const EVAL_SAMPLE_SIZE = parseInt(process.env.EVAL_SAMPLE_SIZE || '50', 10);
const EVAL_FULL_MODE = process.env.EVAL_FULL_MODE === 'true';

export interface EvalConfig {
  maxTokens?: number;
  sampleSize?: number;
  fullMode?: boolean;
}

/**
 * C11: Get evaluation configuration
 */
export function getEvalConfig(): EvalConfig {
  return {
    maxTokens: EVAL_MAX_TOKENS,
    sampleSize: EVAL_SAMPLE_SIZE,
    fullMode: EVAL_FULL_MODE,
  };
}

/**
 * C11: Sample cases for fast iteration mode
 * Returns subset of cases for quick evaluation runs
 */
export function sampleCases<T>(cases: T[], config?: EvalConfig): T[] {
  const evalConfig = config || getEvalConfig();

  if (evalConfig.fullMode) {
    console.log(`  📊 C11: Full eval mode - using all ${cases.length} cases`);
    return cases;
  }

  const sampleSize = evalConfig.sampleSize || EVAL_SAMPLE_SIZE;
  if (cases.length <= sampleSize) {
    console.log(`  📊 C11: Using all ${cases.length} cases (below sample threshold)`);
    return cases;
  }

  // Random sampling without replacement
  const shuffled = [...cases].sort(() => Math.random() - 0.5);
  const sampled = shuffled.slice(0, sampleSize);
  console.log(`  📊 C11: Sampled ${sampled.length}/${cases.length} cases for fast iteration`);
  return sampled;
}

function buildDefaultPrompt(concernId: string): string {
  const meta = getConcernMetadata(concernId);
  const description = meta?.description || concernId;
  const domain = meta?.domain || 'Clinical';

  return `You are a specialized Clinical Signal Extraction Engine for ${domain}.
Your goal is to analyze the provided patient narrative and extract key structured data.

TARGET CONCERN: ${concernId} (${description})

OUTPUT FORMAT (JSON):
{
  "summary": "Brief 1-2 sentence clinical summary.",
  "signals": ["list", "of", "specific", "phrases", "extracted", "verbatim"],
  "followup_questions": ["List of 2-3 relevant follow-up questions"]
}

EXTRACTION RULES:
1. Signals: Extract phrases related to diagnosis, timestamps, signs/symptoms, and outcomes relevant to ${concernId}.
2. Summary: Must capture the essence of the case.
3. Follow-up Questions: Should probe for missing details.
`;
}

export async function runI25Engine(input: {
  concern_id: string;
  patient_payload: string;
  metadata?: Record<string, any>;
  systemPrompt?: string; // Allow overriding the prompt
}): Promise<EngineOutput> {
  
  const promptToUse = input.systemPrompt || buildDefaultPrompt(input.concern_id);
  const start = Date.now();

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  try {
    const response = await client.chat.completions.create({
      model: EVAL_MODEL,
      messages: [
        { role: 'system', content: promptToUse },
        { role: 'user', content: input.patient_payload }
      ],
      response_format: { type: 'json_object' },
      temperature: EVAL_TEMPERATURE,
      max_tokens: EVAL_MAX_TOKENS,
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
      model_name: EVAL_MODEL,
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
      model_name: `${EVAL_MODEL}-error`,
      latency_ms: Date.now() - start
    };
  }
}
