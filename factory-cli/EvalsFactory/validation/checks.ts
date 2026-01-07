import { TestCase, EngineOutput } from './types';
import { recordRecallCoverageResult } from '../refinery/observation/ObservationHooks';
import { resolveSignalId } from '../../utils/signalResolver';

export function validateStructural(output: EngineOutput): {
  passed: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!output.signals || !Array.isArray(output.signals)) errors.push("Missing 'signals' array");
  if (typeof output.summary !== 'string') errors.push("Missing 'summary' string");
  if (!output.followup_questions || !Array.isArray(output.followup_questions)) errors.push("Missing 'followup_questions' array");

  return {
    passed: errors.length === 0,
    errors
  };
}

export function validateSignals(tc: TestCase, output: EngineOutput): {
  ok: boolean;
  recall: number | null;
  errors: string[];
} {
  const errors: string[] = [];
  
  // SUPPORT DUAL-TRUTH CONTRACT
  let mustFindIds: string[] = [];
  let minCount = 0;

  if (tc.contract?.expected_signals) {
      mustFindIds = tc.contract.expected_signals.map(s => s.signal_id);
      minCount = mustFindIds.length;
  } else {
      mustFindIds = tc.expectations?.signal_generation?.must_find_signals || [];
      minCount = tc.expectations?.signal_generation?.min_signal_count || 0;
  }

  // Normalize extracted signals using Resolver
  const resolve = (id: string) => resolveSignalId(id, []) || id.toLowerCase();
  
  // 1. Get all extracted canonical IDs
  const extractedIds = (output.signal_objects || []).map(s => resolve(s.signal_id || s.name || ""));
  
  // 2. Get all extracted text for fuzzy fallback
  const extractedText = (output.signals || []).join(' ').toLowerCase() + " " + (output.summary || "").toLowerCase();
  
  let foundCount = 0;
  const missingSignals = [];

  for (const expId of mustFindIds) {
    const normExpId = resolve(expId);
    
    // MATCH STRATEGY:
    // A. Direct ID Match (Canonical)
    // B. Fuzzy Substring Match (Case Insensitive)
    const isIdMatch = extractedIds.includes(normExpId);
    const isFuzzyMatch = extractedText.includes(expId.toLowerCase().replace(/_/g, ' ')); // Try with spaces too

    if (isIdMatch || isFuzzyMatch) {
      foundCount++;
    } else {
      missingSignals.push(expId);
    }
  }

  const recall = mustFindIds.length > 0 ? foundCount / mustFindIds.length : 1;
  
  if (missingSignals.length > 0) {
    errors.push(`Missing must_find_signals: ${missingSignals.slice(0, 3).join(", ")}...`);
  }

  if ((output.signals?.length || 0) < minCount) {
    errors.push(`Extracted signal count ${output.signals?.length} < min ${minCount}`);
  }

  recordRecallCoverageResult({
    promptName: 'signal_enrichment',
    promptCategory: 'enrichment',
    mustFindMissingCount: missingSignals.length,
    forbiddenFoundCount: 0,
  });

  return {
    ok: errors.length === 0,
    recall,
    errors: errors.map(e => `signals:${e}`)
  };
}

export function validateSummary(tc: TestCase, output: EngineOutput): {
  ok: boolean;
  coverage: number | null;
  errors: string[];
} {
  const errors: string[] = [];
  
  let requiredPhrases: string[] = [];
  if (tc.contract?.expected_signals) {
      // For summary, if contract exists, we might look for signal descriptions or provenance
      requiredPhrases = tc.contract.expected_signals.flatMap(s => s.required_provenance || []);
  } else {
      requiredPhrases = tc.expectations?.event_summary?.must_contain_phrases || [];
  }

  const summaryText = (output.summary || "").toLowerCase();

  let foundCount = 0;
  const missingPhrases = [];

  for (const phrase of requiredPhrases) {
    if (summaryText.includes(phrase.toLowerCase())) {
      foundCount++;
    } else {
      missingPhrases.push(phrase);
    }
  }

  const coverage = requiredPhrases.length > 0 ? foundCount / requiredPhrases.length : 1;

  if (missingPhrases.length > 0) {
    errors.push(`Summary missing phrases: ${missingPhrases.slice(0, 3).join(", ")}...`);
  }

  return {
    ok: errors.length === 0,
    coverage,
    errors: errors.map(e => `summary:${e}`)
  };
}

export function validateFollowups(tc: TestCase, output: EngineOutput): {
  ok: boolean;
  coverage: number | null;
  errors: string[];
} {
  const errors: string[] = [];
  const requiredThemes = tc.expectations?.followup_questions?.required_themes || [];
  const forbiddenTerms = tc.expectations?.followup_questions?.forbidden_terms || [];
  
  const questionsText = (output.followup_questions || []).join(' ').toLowerCase();

  // Check Themes (simple substring match on the whole block for now, ideal is semantic but fuzzy is ok)
  let foundThemes = 0;
  const missingThemes = [];
  for (const theme of requiredThemes) {
    if (questionsText.includes(theme.toLowerCase())) {
      foundThemes++;
    } else {
      missingThemes.push(theme);
    }
  }

  const coverage = requiredThemes.length > 0 ? foundThemes / requiredThemes.length : 1;
  if (missingThemes.length > 0) {
    errors.push(`Missing themes in follow-ups: ${missingThemes.join(", ")}`);
  }

  // Check Forbidden
  for (const term of forbiddenTerms) {
    if (questionsText.includes(term.toLowerCase())) {
      errors.push(`Forbidden term found in follow-ups: "${term}"`);
    }
  }

  recordRecallCoverageResult({
    promptName: 'followup_questions',
    promptCategory: 'questions',
    mustFindMissingCount: missingThemes.length,
    forbiddenFoundCount: (errors.filter(e => e.includes('Forbidden term')).length),
  });

  return {
    ok: errors.length === 0,
    coverage,
    errors: errors.map(e => `followups:${e}`)
  };
}

export function validateEnrichment(tc: TestCase, output: EngineOutput): {
  ok: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const enrichmentSpecs = tc.expectations as any; // Access optional fields

  // Example check: 20/80 summary
  if (enrichmentSpecs.enrichment_20_80) {
    if (!output.enrichment_20_80) {
      errors.push("enrichment:20_80 summary missing");
    } else {
      const text = output.enrichment_20_80.toLowerCase();
      const keywords = enrichmentSpecs.enrichment_20_80.required_keywords || [];
      const missing = keywords.filter((k: string) => !text.includes(k.toLowerCase()));
      if (missing.length > 0) {
        errors.push(`enrichment:20_80 missing keywords: ${missing.join(", ")}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
