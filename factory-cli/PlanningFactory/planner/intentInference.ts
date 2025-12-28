/**
 * Intent Inference Module
 *
 * Extracts structured planning metadata from free-text review requests.
 * Supports "Suggest Details" functionality in the Clinical Review Planning Console.
 */

import { callLLMForJSON } from './llmClient';

export interface InferredMetadata {
  clinical_domain: string | null;
  review_template_type: string | null;
  review_target: string | null;
  confidence: number; // 0-1
  reasoning: string;
}

const INTENT_INFERENCE_SYSTEM_PROMPT = `You are an expert clinical workflow inference engine specializing in PEDIATRIC healthcare.

Your task is to extract structured planning metadata from a short free-text description written by a business user.

The user's text will describe a desired clinical review workflow for either Hospital-Acquired Conditions (HAC) or USNWR metrics in a PEDIATRIC HOSPITAL context.

From the text, extract three items:

1. clinical_domain
   PEDIATRIC-SPECIFIC DOMAINS (prefer these):
   - pediatric_icu / picu - Pediatric Intensive Care Unit
   - nicu - Neonatal Intensive Care Unit
   - pediatric_surgery - Pediatric surgical units
   - pediatric_cardiology - Pediatric cardiology/cardiac care
   - pediatric_oncology - Pediatric cancer care
   - pediatric_emergency - Pediatric emergency department
   - pediatric_ward - General pediatric inpatient unit
   - adolescent_medicine - Adolescent/teen specialty unit

   AGE-SPECIFIC UNITS (when age is specified):
   - neonatal (0-28 days)
   - infant (1 month - 1 year)
   - toddler (1-3 years)
   - child (3-12 years)
   - adolescent (12-18 years)

   GENERAL DOMAINS (use only if clearly not pediatric-specific):
   - adult_icu, orthopedics, neurology, respiratory_care, etc.

   BE ALERT FOR: "peds", "pediatric", "children", "kids", "neonatal", "infant"

2. review_template_type
   - 'HAC_CLABSI', 'HAC_CAUTI', 'HAC_VAP', 'HAC_SSI' for HACs
   - 'USNWR_ORTHO_METRIC', 'USNWR_CARDIO_METRIC', 'USNWR_NEURO_METRIC' for USNWR
   - If unclear, return null

3. review_target
   - Specific metric or HAC (e.g., CLABSI, CAUTI, VAP, SSI, I25, I26, I21, I60)
   - Normalize to uppercase
   - If not provided, return null

Return ONLY a JSON object with exactly these three fields:

{
  "clinical_domain": "...",
  "review_template_type": "...",
  "review_target": "..."
}

CRITICAL: This is for a PEDIATRIC hospital - always prefer pediatric-specific domain names.
If you cannot infer something, return null for that field.
Do NOT include explanations. Do NOT add extra fields. Do NOT generate plans here.`;

/**
 * Infer planning metadata from a free-text review request
 *
 * @param review_request - Free-text description of the review workflow
 * @param useLLM - If true, use OpenAI for inference; if false, use pattern matching
 * @param apiKey - OpenAI API key (optional, will use env var if not provided)
 * @returns Inferred metadata with clinical_domain, review_template_type, review_target
 */
export async function inferPlanningMetadata(
  review_request: string,
  useLLM: boolean = false,
  apiKey?: string
): Promise<InferredMetadata> {
  console.log(`🧠 Inferring metadata from: "${review_request}"`);

  // Use LLM if available and requested
  if (useLLM) {
    try {
      return await inferWithLLM(review_request, apiKey);
    } catch (error) {
      console.warn('LLM inference failed, falling back to pattern matching:', error);
      // Fall through to pattern matching
    }
  }

  // Pattern matching fallback
  const text = review_request.toLowerCase();

  let clinical_domain: string | null = null;
  let review_template_type: string | null = null;
  let review_target: string | null = null;
  let confidence = 0.5;
  let reasoning = 'Mock inference using pattern matching';

  // Infer domain - PEDIATRIC FIRST (since this is for a pediatric hospital)

  // Pediatric-specific units (highest priority)
  if (text.includes('picu') || text.includes('pediatric icu') || text.includes('peds icu')) {
    clinical_domain = 'pediatric_icu';
    confidence += 0.15;
  } else if (text.includes('nicu') || text.includes('neonatal')) {
    clinical_domain = 'nicu';
    confidence += 0.15;
  } else if (text.includes('pediatric surgery') || text.includes('peds surgery')) {
    clinical_domain = 'pediatric_surgery';
    confidence += 0.15;
  } else if (text.includes('pediatric cardio') || text.includes('peds cardio') || text.includes('pediatric heart')) {
    clinical_domain = 'pediatric_cardiology';
    confidence += 0.15;
  } else if (text.includes('pediatric oncology') || text.includes('peds oncology') || text.includes('pediatric cancer')) {
    clinical_domain = 'pediatric_oncology';
    confidence += 0.15;
  } else if (text.includes('pediatric emergency') || text.includes('peds er') || text.includes('peds ed')) {
    clinical_domain = 'pediatric_emergency';
    confidence += 0.15;
  } else if (text.includes('pediatric ward') || text.includes('peds ward') || text.includes('general pediatric')) {
    clinical_domain = 'pediatric_ward';
    confidence += 0.15;
  } else if (text.includes('adolescent') || text.includes('teen')) {
    clinical_domain = 'adolescent_medicine';
    confidence += 0.15;
  }
  // General pediatric keywords
  else if (text.includes('pediatric') || text.includes('peds') || text.includes('children') || text.includes('kids')) {
    clinical_domain = 'pediatric_ward'; // default to general pediatric
    confidence += 0.1;
  }
  // Age-specific (if pediatric not already matched)
  else if (text.includes('infant') || text.includes('baby') || text.includes('babies')) {
    clinical_domain = 'infant';
    confidence += 0.12;
  } else if (text.includes('toddler')) {
    clinical_domain = 'toddler';
    confidence += 0.12;
  } else if (text.includes('child') && !text.includes('children')) { // "child" but not "children"
    clinical_domain = 'child';
    confidence += 0.12;
  }
  // General domains (lower priority for pediatric hospital)
  else if (text.includes('orthopedic') || text.includes('ortho') || text.includes('joint') || text.includes('bone')) {
    clinical_domain = 'orthopedics';
    confidence += 0.08; // Lower confidence for non-pediatric
  } else if (text.includes('cardiac') || text.includes('heart') || text.includes('cardio')) {
    clinical_domain = 'cardiology';
    confidence += 0.08;
  } else if (text.includes('neuro') || text.includes('brain') || text.includes('stroke')) {
    clinical_domain = 'neurology';
    confidence += 0.08;
  } else if (text.includes('icu') || text.includes('intensive care')) {
    // If ICU mentioned without "pediatric", assume pediatric in pediatric hospital
    clinical_domain = 'pediatric_icu';
    confidence += 0.1;
  } else if (text.includes('respiratory') || text.includes('pulmonary') || text.includes('lung')) {
    clinical_domain = 'respiratory_care';
    confidence += 0.08;
  }

  // Infer HAC vs USNWR and specific metrics
  if (text.includes('clabsi') || text.includes('central line') || text.includes('bloodstream infection')) {
    review_template_type = 'HAC_CLABSI';
    review_target = 'CLABSI';
    confidence += 0.2;
  } else if (text.includes('cauti') || text.includes('catheter') || text.includes('urinary tract infection')) {
    review_template_type = 'HAC_CAUTI';
    review_target = 'CAUTI';
    confidence += 0.2;
  } else if (text.includes('vap') || text.includes('ventilator') || text.includes('pneumonia')) {
    review_template_type = 'HAC_VAP';
    review_target = 'VAP';
    confidence += 0.2;
  } else if (text.includes('ssi') || text.includes('surgical site infection')) {
    review_template_type = 'HAC_SSI';
    review_target = 'SSI';
    confidence += 0.2;
  } else if (text.includes('i25')) {
    review_template_type = 'USNWR_ORTHO_METRIC';
    review_target = 'I25';
    clinical_domain = clinical_domain || 'orthopedics';
    confidence += 0.2;
  } else if (text.includes('i21')) {
    review_template_type = 'USNWR_CARDIO_METRIC';
    review_target = 'I21';
    clinical_domain = clinical_domain || 'cardiology';
    confidence += 0.2;
  } else if (text.includes('i60')) {
    review_template_type = 'USNWR_NEURO_METRIC';
    review_target = 'I60';
    clinical_domain = clinical_domain || 'neurology';
    confidence += 0.2;
  } else if (text.includes('usnwr') || text.includes('quality metric')) {
    // Generic USNWR
    if (clinical_domain === 'orthopedics') {
      review_template_type = 'USNWR_ORTHO_METRIC';
    } else if (clinical_domain === 'cardiology') {
      review_template_type = 'USNWR_CARDIO_METRIC';
    } else if (clinical_domain === 'neurology') {
      review_template_type = 'USNWR_NEURO_METRIC';
    }
    confidence += 0.1;
  }

  // Extract explicit metric IDs (I##, I##a patterns)
  const metricMatch = text.match(/\bi\d{1,3}[a-z]?\b/i);
  if (metricMatch) {
    review_target = metricMatch[0].toUpperCase();
    confidence += 0.2;
  }

  // Extract explicit HAC IDs
  const hacMatch = text.match(/\b(CLABSI|CAUTI|VAP|SSI)\b/i);
  if (hacMatch) {
    review_target = hacMatch[0].toUpperCase();
    confidence += 0.2;
  }

  console.log(`   → Domain: ${clinical_domain || 'null'}`);
  console.log(`   → Template: ${review_template_type || 'null'}`);
  console.log(`   → Target: ${review_target || 'null'}`);
  console.log(`   → Confidence: ${(confidence * 100).toFixed(0)}%`);

  return {
    clinical_domain,
    review_template_type,
    review_target,
    confidence: Math.min(confidence, 1.0),
    reasoning
  };
}

/**
 * Infer metadata using LLM (OpenAI)
 */
async function inferWithLLM(
  review_request: string,
  apiKey?: string
): Promise<InferredMetadata> {
  console.log(`   🤖 Using LLM for intent inference...`);

  interface LLMInferenceResult {
    clinical_domain: string | null;
    review_template_type: string | null;
    review_target: string | null;
  }

  const result = await callLLMForJSON<LLMInferenceResult>(
    INTENT_INFERENCE_SYSTEM_PROMPT,
    review_request,
    {
      apiKey,
      model: 'gpt-4o-mini',
      temperature: 0.3, // Lower temperature for more deterministic extraction
      maxTokens: 500,
    }
  );

  const metadata: InferredMetadata = {
    clinical_domain: result.clinical_domain,
    review_template_type: result.review_template_type,
    review_target: result.review_target,
    confidence: 0.9, // LLM-based inference generally has higher confidence
    reasoning: 'LLM-based inference using GPT-4o mini (pediatric-aware)',
  };

  console.log(`   → Domain: ${metadata.clinical_domain || 'null'}`);
  console.log(`   → Template: ${metadata.review_template_type || 'null'}`);
  console.log(`   → Target: ${metadata.review_target || 'null'}`);
  console.log(`   → Confidence: ${(metadata.confidence * 100).toFixed(0)}%`);
  console.log(`   → Method: LLM`);

  return metadata;
}

/**
 * Build the LLM prompt for real intent inference (when OpenAI/Anthropic is available)
 *
 * @param review_request - Free-text review request
 * @returns LLM prompt for intent inference
 */
export function buildIntentInferencePrompt(review_request: string): string {
  return `${INTENT_INFERENCE_SYSTEM_PROMPT}

USER REQUEST:
${review_request}

Return the JSON object:`;
}

/**
 * Validate inferred metadata quality
 *
 * @param metadata - Inferred metadata to validate
 * @returns true if metadata is usable, false otherwise
 */
export function isInferenceUsable(metadata: InferredMetadata): boolean {
  // At minimum, we need a review_target or template_type
  if (!metadata.review_target && !metadata.review_template_type) {
    return false;
  }

  // Low confidence inference should be flagged
  if (metadata.confidence < 0.4) {
    return false;
  }

  return true;
}
