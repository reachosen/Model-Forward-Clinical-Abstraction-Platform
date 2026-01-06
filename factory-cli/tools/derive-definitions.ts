#!/usr/bin/env ts-node
/**
 * Derive Definitions Tool
 *
 * Generates per-metric definitions (signal_groups.json, review_rules.json)
 * from the domain-level OrthoPacket in _shared/.
 *
 * Usage:
 *   npx ts-node tools/derive-definitions.ts --domain Orthopedics
 *   npx ts-node tools/derive-definitions.ts --metric I32a
 *   npx ts-node tools/derive-definitions.ts --domain Orthopedics --compare-archive
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================
// CLI Argument Parsing
// ============================================

const argv = process.argv.slice(2);

function getArg(name: string): string | undefined {
  const idx = argv.indexOf(name);
  return idx !== -1 ? argv[idx + 1] : undefined;
}

const DOMAIN = getArg('--domain');
const METRIC_ID = getArg('--metric');
const COMPARE_ARCHIVE = argv.includes('--compare-archive');
const FORCE = argv.includes('--force');

if (!DOMAIN && !METRIC_ID) {
  console.error('Usage: ts-node tools/derive-definitions.ts --domain <domain> [--metric <id>] [--compare-archive] [--force]');
  console.error('');
  console.error('Options:');
  console.error('  --domain <domain>    Process all metrics in a domain (e.g., Orthopedics)');
  console.error('  --metric <id>        Process a specific metric (e.g., I32a)');
  console.error('  --compare-archive    Compare generated output against archive');
  console.error('  --force              Overwrite existing definitions');
  process.exit(1);
}

// ============================================
// Paths
// ============================================

const DOMAINS_REGISTRY = path.resolve(__dirname, '../domains_registry');

// ============================================
// Types
// ============================================

interface MetricConfig {
  metric_name: string;
  metric_type: string;
  clinical_focus: string;
  rationale: string;
  submetrics?: string[];
  risk_factors: string[];
  review_questions: string[];
  signal_groups: string[];  // References to signals.json categories
  archetypes: string[];
  primary_archetype: string;
  expected_signal_groups: string[];
  expected_signal_group_count: number;
  priority_for_clinical_review: string;
}

interface DomainSignals {
  [category: string]: string[];  // e.g., "infection_risks": ["Antibiotic prophylaxis not given...", ...]
}

interface DerivedSignal {
  signal_id: string;
  legacy_id?: string;
  display_label: string;
  description: string;
  evidence_type: 'verbatim_text' | 'structured_field';
  required: boolean;
  detection_mode?: {
    target_polarity: 'negative' | 'positive';
    trigger_phrases?: string[];
  };
}

interface IdRegistryMapping {
  exact_phrase?: string;
  phrase_pattern?: string;
  canonical_id: string;
  polarity: 'negative' | 'positive';
  legacy_id?: string;
  description?: string;
}

interface IdRegistryPattern {
  match: string;
  prefix?: string;
  suffix?: string;
  polarity: 'negative' | 'positive';
}

interface IdRegistry {
  mappings: IdRegistryMapping[];
  patterns: IdRegistryPattern[];
}

interface DerivedSignalGroup {
  group_id: string;
  display_name: string;
  description: string;
  priority: number;
  signals: DerivedSignal[];
}

interface DerivedSignalGroups {
  $schema: string;
  _warning?: string;
  metric_id: string;
  version: string;
  description: string;
  signal_groups: DerivedSignalGroup[];
}

interface AmbiguityTrigger {
  trigger_id: string;
  description: string;
  detection: { field: string; operator: string; value?: unknown } | { type: string; prompt_key: string };
  reviewer_prompt: string;
  search_hints: string[];
}

interface RuleCondition {
  field: string;
  operator: string;
  value: unknown;
}

interface RuleInCriteria {
  rule_id: string;
  description: string;
  conditions: RuleCondition[];
  outcome: 'pass' | 'fail' | 'needs_review' | 'excluded';
  confidence: 'high' | 'medium' | 'low';
  requires_documentation?: string[];
}

interface DerivedReviewRules {
  $schema: string;
  _warning?: string;
  metric_id: string;
  version: string;
  description: string;
  decision_framework: {
    possible_outcomes: string[];
    default_if_unclear: string;
  };
  rule_in_criteria: RuleInCriteria[];
  rule_out_criteria: RuleInCriteria[];
  ambiguity_triggers: AmbiguityTrigger[];
}

interface ComparisonResult {
  file: string;
  match: boolean;
  differences?: string[];
}

// ============================================
// Utility Functions
// ============================================

function toSnakeCase(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function toDisplayName(str: string): string {
  return str.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function inferEvidenceType(signal: string): 'verbatim_text' | 'structured_field' {
  // Structured fields typically involve timestamps, counts, durations, codes
  const structuredPatterns = [
    /time/i, /duration/i, /count/i, /volume/i, /rate/i,
    /scheduled/i, /timestamp/i, /date/i, /hours/i, /minutes/i,
    /code/i, /icd/i, /cpt/i
  ];
  return structuredPatterns.some(p => p.test(signal)) ? 'structured_field' : 'verbatim_text';
}

function inferRequired(signal: string, category: string): boolean {
  // High-priority categories have required signals
  const requiredCategories = ['infection_risks', 'bundle_compliance', 'safety_signals'];
  // Signals with "not" or "missing" or "delay" are often critical
  const requiredPatterns = [/not\s+/i, /missing/i, /delay/i, /fail/i, /absent/i];

  return requiredCategories.includes(category) || requiredPatterns.some(p => p.test(signal));
}

// ============================================
// Core Derivation Logic
// ============================================

function deriveSignalGroups(
  metricId: string,
  metricConfig: MetricConfig,
  domainSignals: DomainSignals,
  idRegistry: IdRegistry
): DerivedSignalGroups {
  const signalGroups: DerivedSignalGroup[] = [];

  metricConfig.signal_groups.forEach((category, idx) => {
    const signals = domainSignals[category] || [];

    const derivedSignals: DerivedSignal[] = signals.map(signal => {
      // Canonical Mapping Logic
      let canonicalId = '';
      let legacyId = '';
      let polarity: 'positive' | 'negative' = 'positive'; // Default
      let matched = false;

      // 1. Exact Match
      const exactMatch = idRegistry.mappings.find(m => m.exact_phrase === signal);
      if (exactMatch) {
        canonicalId = exactMatch.canonical_id;
        legacyId = exactMatch.legacy_id || toSnakeCase(signal.substring(0, 40));
        polarity = exactMatch.polarity;
        matched = true;
      } else {
        // 2. Pattern Match (Fallback to heuristic)
        // Check patterns
        const patternMatch = idRegistry.patterns.find(p => signal.toLowerCase().includes(p.match));
        if (patternMatch) {
             const base = signal.toLowerCase().replace(patternMatch.match, '').trim();
             const core = toSnakeCase(base);
             canonicalId = (patternMatch.prefix || '') + core + (patternMatch.suffix || '');
             polarity = patternMatch.polarity;
             legacyId = toSnakeCase(signal.substring(0, 40));
        } else {
             // Default Fallback
             canonicalId = toSnakeCase(signal.substring(0, 50));
             legacyId = toSnakeCase(signal.substring(0, 40));
        }
      }

      // Validation Rules (Phase 4)
      if (canonicalId.match(/^(no_|not_|absence_|missing_)/)) {
         console.warn(`   ⚠️  [Validation] Signal ID starts with negation: ${canonicalId} (Phrase: "${signal}") - Consider adding to id_registry.json`);
      }
      
      const derived: DerivedSignal = {
        signal_id: canonicalId,
        legacy_id: legacyId !== canonicalId ? legacyId : undefined,
        display_label: signal, // Original phrase
        description: `Signal for ${signal}`,
        evidence_type: inferEvidenceType(signal),
        required: inferRequired(signal, category),
        detection_mode: {
            target_polarity: polarity,
            trigger_phrases: [signal]
        }
      };
      
      return derived;
    });

    signalGroups.push({
      group_id: category.toUpperCase(),
      display_name: toDisplayName(category),
      description: `Signals related to ${toDisplayName(category).toLowerCase()} for ${metricConfig.metric_name}`,
      priority: idx + 1,
      signals: derivedSignals
    });
  });

  return {
    $schema: '../../../_shared/definitions/signal_groups.schema.json',
    _warning: "GENERATED FILE - DO NOT EDIT MANUALLY - See factory-cli/tools/derive-definitions.ts",
    metric_id: metricId,
    version: '1.0',
    description: `Signal groups for ${metricId} ${metricConfig.metric_name}`,
    signal_groups: signalGroups
  };
}

function deriveReviewRules(
  metricId: string,
  metricConfig: MetricConfig
): DerivedReviewRules {
  // Derive ambiguity triggers from review_questions
  const ambiguityTriggers: AmbiguityTrigger[] = metricConfig.review_questions.map((question, idx) => {
    // Extract key terms from question for search hints
    const keyTerms = question
      .toLowerCase()
      .replace(/[?.,]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 4 && !['was', 'were', 'the', 'for', 'and', 'this', 'that', 'with', 'clearly', 'documented'].includes(w))
      .slice(0, 5);

    const triggerId = `unclear_${toSnakeCase(keyTerms.slice(0, 3).join('_'))}`;

    return {
      trigger_id: triggerId,
      description: `Review question: ${question}`,
      detection: { field: toSnakeCase(keyTerms[0] || 'unknown'), operator: 'is_null' },
      reviewer_prompt: question,
      search_hints: keyTerms
    };
  });

  // Derive rule_out criteria from risk_factors
  const ruleOutCriteria: RuleInCriteria[] = metricConfig.risk_factors.slice(0, 4).map((risk, idx) => ({
    rule_id: `risk_${idx + 1}`,
    description: risk,
    conditions: [{ field: toSnakeCase(risk.substring(0, 30)), operator: '==', value: true }],
    outcome: 'fail' as const,
    confidence: 'medium' as const
  }));

  // Standard rule-in criteria
  const ruleInCriteria: RuleInCriteria[] = [
    {
      rule_id: 'clear_pass',
      description: 'All documentation complete, no complications, no adverse outcomes',
      conditions: [
        { field: 'documentation_complete', operator: '==', value: true },
        { field: 'has_complication', operator: '==', value: false }
      ],
      outcome: 'pass',
      confidence: 'high'
    },
    {
      rule_id: 'pass_with_minor_gaps',
      description: 'Minor documentation gaps but no adverse outcomes',
      conditions: [
        { field: 'has_complication', operator: '==', value: false },
        { field: 'has_documentation_gap', operator: '==', value: true }
      ],
      outcome: 'pass',
      confidence: 'medium',
      requires_documentation: ['gap_type', 'mitigation_documented']
    }
  ];

  return {
    $schema: '../../../_shared/definitions/review_rules.schema.json',
    _warning: "GENERATED FILE - DO NOT EDIT MANUALLY - See factory-cli/tools/derive-definitions.ts",
    metric_id: metricId,
    version: '1.0',
    description: `Rule-in/rule-out decision criteria for ${metricConfig.metric_name}`,
    decision_framework: {
      possible_outcomes: ['pass', 'fail', 'needs_review', 'excluded'],
      default_if_unclear: 'needs_review'
    },
    rule_in_criteria: ruleInCriteria,
    rule_out_criteria: ruleOutCriteria,
    ambiguity_triggers: ambiguityTriggers
  };
}

// ============================================
// Archive Comparison
// ============================================

function compareWithArchive(
  domain: string,
  metricId: string,
  generated: { signalGroups: DerivedSignalGroups; reviewRules: DerivedReviewRules }
): ComparisonResult[] {
  const results: ComparisonResult[] = [];

  // Find latest archive
  const archivePath = path.join(DOMAINS_REGISTRY, '_archive', 'USNWR', domain);
  if (!fs.existsSync(archivePath)) {
    console.log(`   No archive found for ${domain}`);
    return results;
  }

  const archives = fs.readdirSync(archivePath).sort().reverse();
  if (archives.length === 0) {
    console.log(`   No dated archives found`);
    return results;
  }

  const latestArchive = archives[0];
  const archiveDefPath = path.join(archivePath, latestArchive, 'metrics', metricId, 'definitions');

  if (!fs.existsSync(archiveDefPath)) {
    console.log(`   No archived definitions for ${metricId} in ${latestArchive}`);
    return results;
  }

  // Compare signal_groups.json
  const archivedSGPath = path.join(archiveDefPath, 'signal_groups.json');
  if (fs.existsSync(archivedSGPath)) {
    const archived = JSON.parse(fs.readFileSync(archivedSGPath, 'utf-8'));
    const differences: string[] = [];

    // Compare signal group counts
    const archivedGroupCount = archived.signal_groups?.length || 0;
    const generatedGroupCount = generated.signalGroups.signal_groups.length;

    if (archivedGroupCount !== generatedGroupCount) {
      differences.push(`Signal group count: archived=${archivedGroupCount}, generated=${generatedGroupCount}`);
    }

    // Compare group IDs
    const archivedIds = new Set<string>((archived.signal_groups || []).map((g: any) => g.group_id));
    const generatedIds = new Set<string>(generated.signalGroups.signal_groups.map(g => g.group_id));

    const missingInGenerated = [...archivedIds].filter(id => !generatedIds.has(id));
    const extraInGenerated = [...generatedIds].filter(id => !archivedIds.has(id));

    if (missingInGenerated.length > 0) {
      differences.push(`Missing groups in generated: ${missingInGenerated.join(', ')}`);
    }
    if (extraInGenerated.length > 0) {
      differences.push(`Extra groups in generated: ${extraInGenerated.join(', ')}`);
    }

    results.push({
      file: 'signal_groups.json',
      match: differences.length === 0,
      differences: differences.length > 0 ? differences : undefined
    });
  }

  // Compare review_rules.json
  const archivedRRPath = path.join(archiveDefPath, 'review_rules.json');
  if (fs.existsSync(archivedRRPath)) {
    const archived = JSON.parse(fs.readFileSync(archivedRRPath, 'utf-8'));
    const differences: string[] = [];

    // Compare ambiguity trigger counts
    const archivedTriggerCount = archived.ambiguity_triggers?.length || 0;
    const generatedTriggerCount = generated.reviewRules.ambiguity_triggers.length;

    if (archivedTriggerCount !== generatedTriggerCount) {
      differences.push(`Ambiguity trigger count: archived=${archivedTriggerCount}, generated=${generatedTriggerCount}`);
    }

    results.push({
      file: 'review_rules.json',
      match: differences.length === 0,
      differences: differences.length > 0 ? differences : undefined
    });
  }

  return results;
}

// ============================================
// Main Execution
// ============================================

function processMetric(domain: string, metricId: string, metricsConfig: Record<string, MetricConfig>, domainSignals: DomainSignals): void {
  const metricConfig = metricsConfig[metricId];
  if (!metricConfig) {
    console.error(`   Metric ${metricId} not found in metrics.json`);
    return;
  }

  console.log(`\n   Processing ${metricId}: ${metricConfig.metric_name}`);
  console.log(`   Primary archetype: ${metricConfig.primary_archetype}`);
  console.log(`   Signal groups: ${metricConfig.signal_groups.join(', ')}`);

  // Load ID Registry
  const registryPath = path.join(DOMAINS_REGISTRY, 'USNWR', domain, '_shared', 'id_registry.json');
  let idRegistry: IdRegistry = { mappings: [], patterns: [] };
  if (fs.existsSync(registryPath)) {
    try {
      idRegistry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
      console.log(`   Loaded ID Registry from ${registryPath}`);
    } catch (e) {
      console.warn(`   ⚠️  Failed to parse ID Registry: ${e}`);
    }
  } else {
    console.warn(`   ⚠️  ID Registry not found at ${registryPath}. Canonical mapping disabled.`);
  }

  // Derive definitions
  const signalGroups = deriveSignalGroups(metricId, metricConfig, domainSignals, idRegistry);
  const reviewRules = deriveReviewRules(metricId, metricConfig);

  // Output path
  const outputDir = path.join(DOMAINS_REGISTRY, 'USNWR', domain, 'metrics', metricId, 'definitions');
  const sgPath = path.join(outputDir, 'signal_groups.json');
  const rrPath = path.join(outputDir, 'review_rules.json');

  // Check if files exist
  const sgExists = fs.existsSync(sgPath);
  const rrExists = fs.existsSync(rrPath);

  if ((sgExists || rrExists) && !FORCE) {
    console.log(`   Definitions already exist. Use --force to overwrite.`);

    if (COMPARE_ARCHIVE) {
      console.log(`   Comparing against archive...`);
      const comparisons = compareWithArchive(domain, metricId, { signalGroups, reviewRules });
      comparisons.forEach(c => {
        if (c.match) {
          console.log(`   ${c.file}: MATCH`);
        } else {
          console.log(`   ${c.file}: DIFF`);
          c.differences?.forEach(d => console.log(`      - ${d}`));
        }
      });
    }
    return;
  }

  // Create directory and write files
  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(sgPath, JSON.stringify(signalGroups, null, 2));
  console.log(`   Wrote: ${sgPath}`);

  fs.writeFileSync(rrPath, JSON.stringify(reviewRules, null, 2));
  console.log(`   Wrote: ${rrPath}`);

  // Compare if requested
  if (COMPARE_ARCHIVE) {
    console.log(`   Comparing against archive...`);
    const comparisons = compareWithArchive(domain, metricId, { signalGroups, reviewRules });
    comparisons.forEach(c => {
      if (c.match) {
        console.log(`   ${c.file}: MATCH`);
      } else {
        console.log(`   ${c.file}: DIFF`);
        c.differences?.forEach(d => console.log(`      - ${d}`));
      }
    });
  }
}

try {
  // Determine domain
  let domain = DOMAIN;

  if (!domain && METRIC_ID) {
    // Infer domain from metric ID pattern
    if (METRIC_ID.match(/^I\d+/)) {
      domain = 'Orthopedics';
    } else if (METRIC_ID.match(/^C\d+/)) {
      domain = 'Cardiology';
    } else {
      console.error('Cannot infer domain from metric ID. Please specify --domain');
      process.exit(1);
    }
  }

  console.log(`\n Derive Definitions`);
  console.log(`   Domain: ${domain}`);
  if (METRIC_ID) console.log(`   Metric: ${METRIC_ID}`);
  console.log(`   Compare archive: ${COMPARE_ARCHIVE}`);
  console.log(`   Force overwrite: ${FORCE}`);

  // Load domain data from _shared/
  const sharedPath = path.join(DOMAINS_REGISTRY, 'USNWR', domain!, '_shared');
  const metricsPath = path.join(sharedPath, 'metrics.json');
  const signalsPath = path.join(sharedPath, 'signals.json');

  if (!fs.existsSync(metricsPath)) {
    console.error(`\n   metrics.json not found at: ${metricsPath}`);
    console.error(`   Please ensure OrthoPacket is in domains_registry/USNWR/${domain}/_shared/`);
    process.exit(1);
  }

  if (!fs.existsSync(signalsPath)) {
    console.error(`\n   signals.json not found at: ${signalsPath}`);
    process.exit(1);
  }

  const metricsConfig: Record<string, MetricConfig> = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
  const domainSignals: DomainSignals = JSON.parse(fs.readFileSync(signalsPath, 'utf-8'));

  console.log(`   Loaded ${Object.keys(metricsConfig).length} metrics from metrics.json`);
  console.log(`   Loaded ${Object.keys(domainSignals).length} signal categories from signals.json`);

  // Process metrics
  if (METRIC_ID) {
    processMetric(domain!, METRIC_ID, metricsConfig, domainSignals);
  } else {
    // Process all metrics in domain
    for (const metricId of Object.keys(metricsConfig)) {
      processMetric(domain!, metricId, metricsConfig, domainSignals);
    }
  }

  console.log(`\n Done.`);

} catch (err) {
  console.error('Derive definitions failed:', err);
  process.exit(1);
}
