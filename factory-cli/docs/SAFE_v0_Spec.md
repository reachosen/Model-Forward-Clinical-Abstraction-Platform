# SAFE v0 Specification

## Overview

SAFE v0 is a lightweight evaluation framework for the factory-cli pipeline, focusing on three deterministic metrics that leverage existing `expectations` fields in test cases:

| Metric | Full Name | Source Field | Target |
|--------|-----------|--------------|--------|
| **CR** | Correct Recall | `must_find_signals` | extracted signals |
| **AH** | Avoids Harm | `forbidden_terms` | followup_questions |
| **AC** | All Content | `must_contain_phrases` | summary |

---

## 1. Score Computation

### 1.1 CR (Correct Recall)

**Purpose**: Measures whether the LLM correctly extracts key clinical signals.

**Source**: `expectations.signal_generation.must_find_signals[]`

**Target**: `output.signals[]` + `output.summary` (combined text corpus)

**Formula**:
```
CR = found_count / total_must_find_signals

where:
  found_count = number of must_find_signals found in target (case-insensitive substring match)
  total_must_find_signals = length of must_find_signals array
```

**Edge Cases**:
- Empty `must_find_signals[]` → CR = 1.0 (vacuously satisfied)
- Empty output → CR = 0.0

**Score Range**: [0.0, 1.0]

---

### 1.2 AH (Avoids Harm)

**Purpose**: Ensures LLM avoids using prohibited terminology that could bias clinical review.

**Source**: `expectations.followup_questions.forbidden_terms[]`

**Target**: `output.followup_questions[]` (joined text)

**Formula**:
```
AH = 1.0 - (violations_found / total_forbidden_terms)

where:
  violations_found = number of forbidden_terms present in target (case-insensitive)
  total_forbidden_terms = length of forbidden_terms array
```

**Rationale**: AH is penalized proportionally. If 2 of 4 forbidden terms appear, AH = 0.5.

**Alternative (Strict Mode)**:
```
AH_strict = violations_found === 0 ? 1.0 : 0.0
```

**Default**: Use proportional formula. Strict mode available via config flag.

**Edge Cases**:
- Empty `forbidden_terms[]` → AH = 1.0
- No followup_questions → AH = 1.0 (can't violate if no output)

**Score Range**: [0.0, 1.0]

---

### 1.3 AC (All Content)

**Purpose**: Ensures summary includes all critical clinical information.

**Source**: `expectations.event_summary.must_contain_phrases[]`

**Target**: `output.summary`

**Formula**:
```
AC = found_count / total_must_contain_phrases

where:
  found_count = number of must_contain_phrases found in summary (case-insensitive)
  total_must_contain_phrases = length of must_contain_phrases array
```

**Edge Cases**:
- Empty `must_contain_phrases[]` → AC = 1.0
- Empty summary → AC = 0.0

**Score Range**: [0.0, 1.0]

---

## 2. Composite Score

### 2.1 SAFE v0 Score

**Formula**:
```
SAFE_v0 = (w_CR * CR + w_AH * AH + w_AC * AC) / (w_CR + w_AH + w_AC)

Default weights:
  w_CR = 1.0  (equal weight)
  w_AH = 1.0
  w_AC = 1.0
```

**Configurable**: Weights can be adjusted per metric_id or archetype.

---

## 3. Pass/Review/Fail Thresholds

### 3.1 Per-Metric Thresholds

| Metric | Pass | Review | Fail |
|--------|------|--------|------|
| **CR** | >= 0.8 | [0.5, 0.8) | < 0.5 |
| **AH** | = 1.0 | [0.5, 1.0) | < 0.5 |
| **AC** | >= 0.8 | [0.5, 0.8) | < 0.5 |

### 3.2 Overall Label Rules

```typescript
function computeOverallLabel(cr: number, ah: number, ac: number): 'Pass' | 'Review' | 'Fail' {
  // FAIL if any metric fails
  if (cr < 0.5 || ah < 0.5 || ac < 0.5) return 'Fail';

  // FAIL if AH has any violation (strict for harm avoidance)
  if (ah < 1.0) return 'Review';  // Any forbidden term triggers review

  // REVIEW if any metric is borderline
  if (cr < 0.8 || ac < 0.8) return 'Review';

  // PASS only if all metrics pass
  return 'Pass';
}
```

### 3.3 Threshold Configuration

```typescript
interface SAFEv0Thresholds {
  CR: { pass: number; review: number };  // >= pass = Pass, >= review = Review, else Fail
  AH: { pass: number; review: number };
  AC: { pass: number; review: number };
}

const DEFAULT_THRESHOLDS: SAFEv0Thresholds = {
  CR: { pass: 0.8, review: 0.5 },
  AH: { pass: 1.0, review: 0.5 },  // Strict: must be 1.0 for Pass
  AC: { pass: 0.8, review: 0.5 }
};
```

---

## 4. Dataset Aggregation

### 4.1 Per-TestCase Scorecard

```typescript
interface SAFEv0Result {
  test_id: string;
  archetype: string;
  scores: {
    CR: number;
    AH: number;
    AC: number;
    composite: number;
  };
  details: {
    CR: { found: string[]; missing: string[] };
    AH: { violations: string[] };
    AC: { found: string[]; missing: string[] };
  };
  label: 'Pass' | 'Review' | 'Fail';
}
```

### 4.2 Batch Aggregation

```typescript
interface SAFEv0BatchReport {
  batch_id: string;
  concern_id: string;
  total_cases: number;

  // Aggregate scores (mean across cases)
  mean_scores: {
    CR: number;
    AH: number;
    AC: number;
    composite: number;
  };

  // Pass rate by metric
  pass_rates: {
    CR: number;  // % of cases where CR >= 0.8
    AH: number;  // % of cases where AH = 1.0
    AC: number;  // % of cases where AC >= 0.8
    overall: number;  // % of cases with 'Pass' label
  };

  // Distribution
  label_distribution: {
    Pass: number;
    Review: number;
    Fail: number;
  };

  // By archetype breakdown
  by_archetype: Record<string, {
    count: number;
    mean_CR: number;
    mean_AH: number;
    mean_AC: number;
    pass_rate: number;
  }>;

  // Failure analysis
  worst_performers: SAFEv0Result[];  // Bottom 5 by composite score
  common_CR_misses: Array<{ signal: string; miss_count: number }>;
  common_AH_violations: Array<{ term: string; count: number }>;
  common_AC_misses: Array<{ phrase: string; miss_count: number }>;
}
```

### 4.3 Aggregation Functions

```typescript
// Mean with empty-array safety
function safeMean(values: number[]): number {
  return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

// Pass rate calculation
function passRate(scores: number[], threshold: number): number {
  const passing = scores.filter(s => s >= threshold).length;
  return scores.length > 0 ? passing / scores.length : 0;
}
```

---

## 5. Output Formats

### 5.1 JSON Report

```json
{
  "report_type": "SAFE_v0",
  "generated_at": "2025-01-15T10:30:00Z",
  "batch_id": "I25_batch_1",
  "concern_id": "I25",
  "summary": {
    "total_cases": 5,
    "pass": 3,
    "review": 1,
    "fail": 1,
    "overall_pass_rate": 0.60
  },
  "mean_scores": {
    "CR": 0.85,
    "AH": 0.90,
    "AC": 0.78,
    "composite": 0.84
  },
  "by_archetype": { ... },
  "results": [ ... ],
  "failure_analysis": { ... }
}
```

### 5.2 Console Table (CLI Output)

```
╔═══════════════════════════════════════════════════════════════════════╗
║                      SAFE v0 Scorecard - I25                          ║
╠═══════════════════════════════════════════════════════════════════════╣
║ Total Cases: 5    Pass: 3 (60%)    Review: 1 (20%)    Fail: 1 (20%)   ║
╠═══════════════════════════════════════════════════════════════════════╣
║ Metric │ Mean Score │ Pass Rate │ Status                              ║
╠────────┼────────────┼───────────┼─────────────────────────────────────╣
║   CR   │    0.85    │   80%     │ OK                                  ║
║   AH   │    0.90    │   80%     │ WARN (2 violations across batch)    ║
║   AC   │    0.78    │   60%     │ WARN (review threshold)             ║
╠═══════════════════════════════════════════════════════════════════════╣
║ Composite: 0.84                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝

Per-Case Breakdown:
┌─────────────────┬───────────────────────┬──────┬──────┬──────┬─────────┐
│ Test ID         │ Archetype             │  CR  │  AH  │  AC  │ Label   │
├─────────────────┼───────────────────────┼──────┼──────┼──────┼─────────┤
│ I25-BATCH1-001  │ Process_Auditor       │ 1.00 │ 1.00 │ 1.00 │ PASS    │
│ I25-BATCH1-002  │ Delay_Driver_Profiler │ 0.67 │ 1.00 │ 0.50 │ REVIEW  │
│ I25-BATCH1-003  │ Process_Auditor       │ 1.00 │ 0.50 │ 1.00 │ REVIEW  │
│ I25-BATCH1-004  │ Documentation_Gap     │ 1.00 │ 1.00 │ 1.00 │ PASS    │
│ I25-BATCH1-005  │ Safety_Signal         │ 1.00 │ 1.00 │ 0.50 │ REVIEW  │
└─────────────────┴───────────────────────┴──────┴──────┴──────┴─────────┘

Top Issues:
  CR Misses: "taken to OR over 24 hours" (2 cases)
  AH Violations: "policy" (1 case)
  AC Misses: "NPO status violation" (2 cases)
```

### 5.3 Markdown Report

Generated at `reports/SAFE_v0_{concern_id}_{timestamp}.md`

---

## 6. Configuration

### 6.1 Environment Variables

```bash
SAFE_V0_CR_PASS=0.8
SAFE_V0_CR_REVIEW=0.5
SAFE_V0_AH_PASS=1.0
SAFE_V0_AH_REVIEW=0.5
SAFE_V0_AC_PASS=0.8
SAFE_V0_AC_REVIEW=0.5
SAFE_V0_AH_STRICT=true    # Binary AH scoring
SAFE_V0_REPORT_DIR=./reports
```

### 6.2 Config File (Optional)

```json
// safe.config.json
{
  "thresholds": {
    "CR": { "pass": 0.8, "review": 0.5 },
    "AH": { "pass": 1.0, "review": 0.5 },
    "AC": { "pass": 0.8, "review": 0.5 }
  },
  "weights": {
    "CR": 1.0,
    "AH": 1.5,  // Weight AH higher for clinical safety
    "AC": 1.0
  },
  "strictAH": true,
  "reportFormats": ["json", "console", "markdown"]
}
```

---

## 7. CLI Interface

### 7.1 Command Signature

```bash
npx ts-node bin/planner.ts safe:score \
  --concern <concern_id> \
  --batch <batch_pattern> \
  [--output <report_path>] \
  [--format json|console|markdown|all] \
  [--strict-ah] \
  [--verbose]
```

### 7.2 Examples

```bash
# Score all I25 batches, console output
npx ts-node bin/planner.ts safe:score --concern I25 --batch "I25_batch_*"

# Score golden set with JSON output
npx ts-node bin/planner.ts safe:score --concern I25 --batch golden_set --output ./reports/golden.json --format json

# Strict AH mode with verbose details
npx ts-node bin/planner.ts safe:score --concern I25 --batch I25_batch_1 --strict-ah --verbose
```

### 7.3 Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All cases Pass |
| 1 | At least one Fail |
| 2 | No Fails, but at least one Review |
| 3 | Configuration/runtime error |

---

## 8. Integration Points

### 8.1 Observation Hook

```typescript
// Record SAFE scores to observation system
recordSAFEv0Result({
  test_id: string,
  scores: { CR: number, AH: number, AC: number },
  label: 'Pass' | 'Review' | 'Fail',
  timestamp: string
});
```

### 8.2 Mission Control Integration

```typescript
// Emit to Mission Control dashboard
missionControl.emit('safe:v0:result', {
  concern_id: string,
  batch_id: string,
  summary: SAFEv0BatchReport['summary'],
  timestamp: string
});
```

### 8.3 CI/CD Gate

```yaml
# Example GitHub Actions step
- name: Run SAFE v0 Evaluation
  run: npx ts-node bin/planner.ts safe:score --concern I25 --batch "*" --format json --output ./safe-report.json

- name: Check SAFE Gate
  run: |
    PASS_RATE=$(jq '.summary.overall_pass_rate' safe-report.json)
    if (( $(echo "$PASS_RATE < 0.8" | bc -l) )); then
      echo "SAFE v0 pass rate below 80% threshold"
      exit 1
    fi
```

---

## 9. Future Extensions (Not in v0)

- **Semantic matching** for CR/AC (embedding similarity instead of substring)
- **LLM-as-judge** for nuanced AH evaluation
- **Per-archetype thresholds** customization
- **Confidence intervals** on aggregated scores
- **Regression detection** (compare to baseline run)
