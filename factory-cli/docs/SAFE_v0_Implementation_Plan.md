# SAFE v0 Implementation Plan

## File Structure Overview

```
factory-cli/
├── flywheel/
│   ├── safe/                          # NEW DIRECTORY
│   │   ├── types.ts                   # SAFE v0 type definitions
│   │   ├── scorer.ts                  # Core scoring logic (CR, AH, AC)
│   │   ├── aggregator.ts              # Batch aggregation logic
│   │   ├── reporter.ts                # Output formatters (JSON, console, markdown)
│   │   ├── config.ts                  # Thresholds and configuration
│   │   └── index.ts                   # Public API exports
│   └── validation/
│       └── checks.ts                  # MODIFY: extract reusable matching helpers
├── commands/
│   └── safeScore.ts                   # NEW: safe:score CLI command
├── bin/
│   └── planner.ts                     # MODIFY: register safe:score command
└── types/
    └── safety.ts                      # MODIFY: add SAFEv0 types
```

---

## 1. New Files

### 1.1 `flywheel/safe/types.ts`

```typescript
// Type definitions for SAFE v0

export type SAFEv0Metric = 'CR' | 'AH' | 'AC';
export type SAFEv0Label = 'Pass' | 'Review' | 'Fail';

export interface SAFEv0Thresholds {
  CR: { pass: number; review: number };
  AH: { pass: number; review: number };
  AC: { pass: number; review: number };
}

export interface SAFEv0Weights {
  CR: number;
  AH: number;
  AC: number;
}

export interface SAFEv0Config {
  thresholds: SAFEv0Thresholds;
  weights: SAFEv0Weights;
  strictAH: boolean;
}

export interface SAFEv0Scores {
  CR: number;
  AH: number;
  AC: number;
  composite: number;
}

export interface SAFEv0Details {
  CR: { found: string[]; missing: string[] };
  AH: { violations: string[] };
  AC: { found: string[]; missing: string[] };
}

export interface SAFEv0Result {
  test_id: string;
  concern_id: string;
  archetype: string | null;
  scores: SAFEv0Scores;
  details: SAFEv0Details;
  label: SAFEv0Label;
}

export interface SAFEv0BatchReport {
  report_type: 'SAFE_v0';
  generated_at: string;
  batch_id: string;
  concern_id: string;

  summary: {
    total_cases: number;
    pass: number;
    review: number;
    fail: number;
    overall_pass_rate: number;
  };

  mean_scores: SAFEv0Scores;

  pass_rates: {
    CR: number;
    AH: number;
    AC: number;
  };

  by_archetype: Record<string, {
    count: number;
    mean_CR: number;
    mean_AH: number;
    mean_AC: number;
    pass_rate: number;
  }>;

  failure_analysis: {
    worst_performers: SAFEv0Result[];
    common_CR_misses: Array<{ signal: string; count: number }>;
    common_AH_violations: Array<{ term: string; count: number }>;
    common_AC_misses: Array<{ phrase: string; count: number }>;
  };

  results: SAFEv0Result[];
}
```

---

### 1.2 `flywheel/safe/config.ts`

```typescript
import { SAFEv0Config, SAFEv0Thresholds, SAFEv0Weights } from './types';

export const DEFAULT_THRESHOLDS: SAFEv0Thresholds = {
  CR: { pass: 0.8, review: 0.5 },
  AH: { pass: 1.0, review: 0.5 },
  AC: { pass: 0.8, review: 0.5 },
};

export const DEFAULT_WEIGHTS: SAFEv0Weights = {
  CR: 1.0,
  AH: 1.0,
  AC: 1.0,
};

export function loadConfig(): SAFEv0Config;
export function loadConfigFromEnv(): Partial<SAFEv0Config>;
export function mergeConfig(base: SAFEv0Config, overrides: Partial<SAFEv0Config>): SAFEv0Config;
```

---

### 1.3 `flywheel/safe/scorer.ts`

```typescript
import { TestCase, EngineOutput } from '../validation/types';
import { SAFEv0Scores, SAFEv0Details, SAFEv0Label, SAFEv0Result, SAFEv0Config } from './types';

/**
 * Compute CR (Correct Recall) score
 * @param mustFindSignals - Expected signals from test case
 * @param extractedText - Combined signals + summary text from engine output
 * @returns { score: number, found: string[], missing: string[] }
 */
export function computeCR(
  mustFindSignals: string[],
  extractedText: string
): { score: number; found: string[]; missing: string[] };

/**
 * Compute AH (Avoids Harm) score
 * @param forbiddenTerms - Terms that should not appear
 * @param followupText - Combined followup questions text
 * @param strict - If true, any violation = 0.0; else proportional
 * @returns { score: number, violations: string[] }
 */
export function computeAH(
  forbiddenTerms: string[],
  followupText: string,
  strict?: boolean
): { score: number; violations: string[] };

/**
 * Compute AC (All Content) score
 * @param mustContainPhrases - Required phrases
 * @param summaryText - Summary from engine output
 * @returns { score: number, found: string[], missing: string[] }
 */
export function computeAC(
  mustContainPhrases: string[],
  summaryText: string
): { score: number; found: string[]; missing: string[] };

/**
 * Compute composite score from individual metrics
 */
export function computeComposite(
  cr: number,
  ah: number,
  ac: number,
  weights: { CR: number; AH: number; AC: number }
): number;

/**
 * Determine Pass/Review/Fail label based on scores and thresholds
 */
export function computeLabel(
  scores: SAFEv0Scores,
  config: SAFEv0Config
): SAFEv0Label;

/**
 * Score a single test case against engine output
 */
export function scoreTestCase(
  testCase: TestCase,
  engineOutput: EngineOutput,
  config: SAFEv0Config
): SAFEv0Result;
```

---

### 1.4 `flywheel/safe/aggregator.ts`

```typescript
import { SAFEv0Result, SAFEv0BatchReport, SAFEv0Config } from './types';

/**
 * Aggregate multiple test case results into a batch report
 */
export function aggregateBatch(
  batchId: string,
  concernId: string,
  results: SAFEv0Result[],
  config: SAFEv0Config
): SAFEv0BatchReport;

/**
 * Compute mean scores across results
 */
export function computeMeanScores(results: SAFEv0Result[]): {
  CR: number;
  AH: number;
  AC: number;
  composite: number;
};

/**
 * Group results by archetype and compute per-archetype stats
 */
export function aggregateByArchetype(
  results: SAFEv0Result[],
  config: SAFEv0Config
): SAFEv0BatchReport['by_archetype'];

/**
 * Analyze common failures across the batch
 */
export function analyzeFailures(results: SAFEv0Result[]): SAFEv0BatchReport['failure_analysis'];

/**
 * Compute pass rates for each metric
 */
export function computePassRates(
  results: SAFEv0Result[],
  config: SAFEv0Config
): { CR: number; AH: number; AC: number };
```

---

### 1.5 `flywheel/safe/reporter.ts`

```typescript
import { SAFEv0BatchReport, SAFEv0Result } from './types';

export type ReportFormat = 'json' | 'console' | 'markdown';

/**
 * Format batch report as JSON string
 */
export function formatJSON(report: SAFEv0BatchReport): string;

/**
 * Format batch report for console output (with colors/box drawing)
 */
export function formatConsole(report: SAFEv0BatchReport): string;

/**
 * Format batch report as Markdown
 */
export function formatMarkdown(report: SAFEv0BatchReport): string;

/**
 * Write report to file based on format
 */
export async function writeReport(
  report: SAFEv0BatchReport,
  outputPath: string,
  format: ReportFormat
): Promise<void>;

/**
 * Print report to stdout
 */
export function printReport(
  report: SAFEv0BatchReport,
  format: ReportFormat
): void;
```

---

### 1.6 `flywheel/safe/index.ts`

```typescript
// Public API exports

export * from './types';
export * from './config';
export * from './scorer';
export * from './aggregator';
export * from './reporter';

// Convenience function for CLI
export async function runSAFEv0(options: {
  concernId: string;
  batchPattern: string;
  testDataDir?: string;
  outputPath?: string;
  format?: ReportFormat | 'all';
  strictAH?: boolean;
  verbose?: boolean;
}): Promise<{ report: SAFEv0BatchReport; exitCode: number }>;
```

---

### 1.7 `commands/safeScore.ts`

```typescript
import { Command } from 'commander';
import { runSAFEv0, ReportFormat } from '../flywheel/safe';

export const safeScore = new Command('safe:score')
  .description('Run SAFE v0 evaluation on test batches')
  .requiredOption('-c, --concern <id>', 'Concern ID (e.g., I25)')
  .requiredOption('-b, --batch <pattern>', 'Batch file pattern (e.g., "I25_batch_*" or "golden_set")')
  .option('-o, --output <path>', 'Output file path for report')
  .option('-f, --format <format>', 'Output format: json, console, markdown, all', 'console')
  .option('--strict-ah', 'Use strict AH scoring (any violation = fail)')
  .option('-v, --verbose', 'Show detailed per-case output')
  .option('-t, --test-dir <path>', 'Test data directory', './data/flywheel/testcases')
  .action(async (options) => {
    // Implementation:
    // 1. Load test cases matching batch pattern
    // 2. Run LLM engine on each test case (reuse existing runI25Engine)
    // 3. Score each result with SAFE v0
    // 4. Aggregate into batch report
    // 5. Output in requested format
    // 6. Return appropriate exit code
  });
```

---

## 2. Modified Files

### 2.1 `bin/planner.ts`

**Changes**:
- Import `safeScore` command
- Add command to program: `program.addCommand(safeScore)`

```typescript
// Add after line 228 (flywheel import)
import { safeScore } from '../commands/safeScore';

// Add after line 235 (program.addCommand(flywheel))
program.addCommand(safeScore);
```

---

### 2.2 `flywheel/validation/checks.ts`

**Changes**:
- Extract `normalizeText()` helper for reuse
- Extract `substringMatch()` helper for reuse
- Export these helpers for use in `safe/scorer.ts`

```typescript
// Add exports at top of file:
export function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

export function substringMatch(haystack: string, needle: string): boolean {
  return normalizeText(haystack).includes(normalizeText(needle));
}
```

---

### 2.3 `types/safety.ts`

**Changes**:
- Add SAFEv0-specific types that integrate with existing SAFE framework

```typescript
// Add after existing types:

export type SAFEv0Metric = 'CR' | 'AH' | 'AC';

// Map v0 metrics to full SAFE criteria
export const SAFE_V0_CRITERION_MAP: Record<SAFEv0Metric, SAFECriterion> = {
  CR: 'CR',  // Correct Recall
  AH: 'AH',  // Avoids Harm
  AC: 'AC',  // All Content
};

// Factory to create SAFEScorecard from v0 result
export function createScorecardFromV0(
  runId: string,
  taskId: string,
  metricId: string,
  archetype: string,
  v0Scores: { CR: number; AH: number; AC: number },
  label: 'Pass' | 'Review' | 'Fail'
): SAFEScorecard;
```

---

## 3. Implementation Order

| Phase | File | Priority | Effort |
|-------|------|----------|--------|
| 1a | `flywheel/safe/types.ts` | P0 | S |
| 1b | `flywheel/safe/config.ts` | P0 | S |
| 2a | `flywheel/validation/checks.ts` (extract helpers) | P0 | S |
| 2b | `flywheel/safe/scorer.ts` | P0 | M |
| 3 | `flywheel/safe/aggregator.ts` | P1 | M |
| 4 | `flywheel/safe/reporter.ts` | P1 | M |
| 5 | `flywheel/safe/index.ts` | P1 | S |
| 6 | `commands/safeScore.ts` | P1 | M |
| 7 | `bin/planner.ts` (register command) | P2 | XS |
| 8 | `types/safety.ts` (v0 integration) | P2 | S |

**Legend**: XS = <30 min, S = 30-60 min, M = 1-2 hours

---

## 4. Dependencies

```
types.ts ─────────────┐
                      │
config.ts ────────────┼──→ scorer.ts ──→ aggregator.ts ──→ reporter.ts
                      │         │              │               │
checks.ts (helpers) ──┘         └──────────────┴───────────────┴──→ index.ts
                                                                        │
                                                                        ↓
                                                               commands/safeScore.ts
                                                                        │
                                                                        ↓
                                                                bin/planner.ts
```

---

## 5. Test Strategy

### Unit Tests (`tests/safe/`)

| Test File | Coverage |
|-----------|----------|
| `scorer.test.ts` | `computeCR`, `computeAH`, `computeAC`, `computeLabel` |
| `aggregator.test.ts` | `aggregateBatch`, `computeMeanScores`, `analyzeFailures` |
| `reporter.test.ts` | Output format validation |

### Integration Test

```typescript
// tests/safe/integration.test.ts
describe('safe:score CLI', () => {
  it('should score I25_batch_1 and produce valid report', async () => {
    // Run CLI command
    // Verify exit code
    // Verify output structure
    // Verify scores are within expected ranges
  });
});
```

---

## 6. Migration Path

1. **Phase 1 (v0.1)**: Implement core scoring without LLM calls
   - Use pre-computed `ValidationResult` from existing runner
   - Add SAFE v0 layer on top of existing validation

2. **Phase 2 (v0.2)**: Standalone `safe:score` command
   - Runs LLM engine internally
   - Full end-to-end scoring

3. **Phase 3 (v1.0)**: Integration with Mission Control
   - Real-time score emission
   - Dashboard visualization
