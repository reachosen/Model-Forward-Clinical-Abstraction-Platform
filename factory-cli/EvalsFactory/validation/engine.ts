import { EngineOutput } from './types';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { SemanticPacketLoader } from '../../utils/semanticPacketLoader';
import { detectDomain } from '../../utils/domainDetection';
import { getPromptText } from '../../PlanningFactory/utils/promptBuilder'; // Import S5 prompt builder

// Ensure env vars are loaded
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// C11: Configuration from .env
const EVAL_MODEL = process.env.EVAL_MODEL || 'gpt-4o-mini';
const EVAL_MAX_TOKENS = parseInt(process.env.EVAL_MAX_TOKENS || '800', 10);
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
 */
export function sampleCases<T>(cases: T[], config?: EvalConfig): T[] {
  const evalConfig = config || getEvalConfig();

  if (evalConfig.fullMode) {
    return cases;
  }

  const sampleSize = evalConfig.sampleSize || EVAL_SAMPLE_SIZE;
  if (cases.length <= sampleSize) {
    return cases;
  }

  // Random sampling without replacement
  const shuffled = [...cases].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, sampleSize);
}

function buildSmartPrompt(concernId: string): string {
  const domain = detectDomain(concernId);
  
  // Load specialized semantics from BIOS
  const loader = SemanticPacketLoader.getInstance();
  const packet = loader.load(domain, concernId);
  
  // Default fallback if loader fails
  if (!packet) {
      console.warn(`⚠️  Semantic Packet not found for ${concernId}. Using generic fallback.`);
      return `Analyze this case for ${concernId}. Extract clinical signals.`;
  }

  // Construct Context Object expected by getPromptText
  // We MUST align with S5 expectations:
  // - ortho_context (the packet)
  // - primary_archetype
  // - archetypes (array)
  const context = {
      concern_id: concernId, // Added for metric lookup
      domain: domain,
      primary_archetype: packet.metrics[concernId]?.primary_archetype || 'Preventability_Detective',
      archetypes: packet.metrics[concernId]?.archetypes || ['Preventability_Detective'],
      ortho_context: packet, 
      semantic_context: {
          packet: packet,
          ranking: {
              specialty_name: domain
          }
      },
      skeleton: null 
  };

  try {
      // Reuse the robust S5 prompt builder
      return getPromptText('signal_enrichment', context);
  } catch (error) {
      console.error(`❌ Failed to build smart prompt via S5 builder:`, error);
      return `Analyze this case for ${concernId}. (Prompt Build Failed)`;
  }
}

export async function runI25Engine(input: {
  concern_id: string;
  patient_payload: string;
  metadata?: Record<string, any>;
  systemPrompt?: string; 
  debug?: boolean;
}): Promise<EngineOutput> {
  
  let promptToUse = input.systemPrompt || buildSmartPrompt(input.concern_id);
  
  // Global Safety Guard: OpenAI requires the word 'json' in the system prompt for json_object mode
  if (!promptToUse.toLowerCase().includes('json')) {
    promptToUse += "\n\nCRITICAL: Your output must be strictly valid JSON.";
  }

  if (input.debug) {
    console.log('\n--- [DEBUG] GENERATED PROMPT ---');
    console.log(promptToUse);
    console.log('--------------------------------\n');
  }

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
    let signalObjects: any[] = []; // Store full objects

    if (parsed.signal_groups && Array.isArray(parsed.signal_groups)) {
      signalObjects = parsed.signal_groups.flatMap((group: any) => group.signals || []);
      flattenedSignals = signalObjects.map((s: any) => s.name || s.signal_id || s.description || s.provenance);
    } else if (parsed.signals && Array.isArray(parsed.signals)) {
      // Fallback to old schema
      flattenedSignals = parsed.signals;
    }

    // If summary is missing (e.g. in signal_enrichment task), providing a placeholder 
    // that won't trigger validation errors if possible, or just be more descriptive.
    const summary = parsed.summary || parsed.event_summary || (parsed.signal_groups ? "N/A - Signal Task" : "Summary skipped in lean mode");

    return {
      raw_input: input.patient_payload,
      summary: summary,
      signals: flattenedSignals,
      signal_objects: signalObjects,
      followup_questions: parsed.followup_questions || [],
      enrichment_20_80: parsed.enrichment_20_80,
      model_name: EVAL_MODEL,
      latency_ms: Date.now() - start
    };

  } catch (error: any) {
    // Silently capture error for aggregation
    return {
      raw_input: input.patient_payload,
      summary: "ENGINE_ERROR",
      error_message: error.message,
      signals: [],
      followup_questions: [],
      model_name: `${EVAL_MODEL}-error`,
      latency_ms: Date.now() - start
    };
  }
}
