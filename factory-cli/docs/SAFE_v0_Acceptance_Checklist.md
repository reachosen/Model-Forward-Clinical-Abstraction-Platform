# SAFE v0 Acceptance Checklist

## CLI Command Verification

### 1. Command Availability

```bash
# Command should be recognized
npx ts-node bin/planner.ts safe:score --help
```

**Expected Output**:
```
Usage: planner safe:score [options]

Run SAFE v0 evaluation on test batches

Options:
  -c, --concern <id>      Concern ID (e.g., I25)
  -b, --batch <pattern>   Batch file pattern (e.g., "I25_batch_*" or "golden_set")
  -o, --output <path>     Output file path for report
  -f, --format <format>   Output format: json, console, markdown, all (default: "console")
  --strict-ah             Use strict AH scoring (any violation = fail)
  -v, --verbose           Show detailed per-case output
  -t, --test-dir <path>   Test data directory (default: "./data/flywheel/testcases")
  -h, --help              display help for command
```

---

## 2. I25 Batch Scoring

### 2.1 Basic Execution

```bash
npx ts-node bin/planner.ts safe:score --concern I25 --batch "I25_batch_1"
```

**Must See in Console Output**:

- [ ] Header with concern ID: `SAFE v0 Scorecard - I25`
- [ ] Summary stats: `Total Cases: 5`
- [ ] Label distribution: `Pass: X (Y%)    Review: X (Y%)    Fail: X (Y%)`
- [ ] Metric table with CR, AH, AC columns
- [ ] Composite score displayed
- [ ] Per-case breakdown table with all 5 test IDs:
  - `I25-BATCH1-001`
  - `I25-BATCH1-002`
  - `I25-BATCH1-003`
  - `I25-BATCH1-004`
  - `I25-BATCH1-005`

---

### 2.2 Score Ranges

For I25_batch_1, verify these score ranges (based on test case expectations):

| Test ID | Expected CR | Expected AH | Expected AC |
|---------|-------------|-------------|-------------|
| I25-BATCH1-001 | 0.5-1.0 | 1.0 | 0.5-1.0 |
| I25-BATCH1-002 | 0.33-1.0 | 1.0 | 0.5-1.0 |
| I25-BATCH1-003 | 0.33-1.0 | 1.0 | 0.5-1.0 |
| I25-BATCH1-004 | 0.5-1.0 | 1.0 | 0.5-1.0 |
| I25-BATCH1-005 | 0.5-1.0 | 1.0 | 0.5-1.0 |

**Rationale**:
- CR depends on how well LLM extracts expected signals
- AH should be 1.0 unless LLM uses "policy"/"guideline" in follow-ups
- AC depends on phrase coverage in summary

---

### 2.3 Label Assignment Verification

**Must See**:

- [ ] No test case has AH < 0.5 (would indicate major forbidden term issues)
- [ ] Labels follow threshold rules:
  - `Pass` only if CR >= 0.8 AND AH = 1.0 AND AC >= 0.8
  - `Review` if any metric in [0.5, threshold) or AH < 1.0
  - `Fail` if any metric < 0.5

---

### 2.4 Aggregate Statistics

**Must See**:

- [ ] `mean_scores.CR` is a number between 0.0 and 1.0
- [ ] `mean_scores.AH` is a number between 0.0 and 1.0
- [ ] `mean_scores.AC` is a number between 0.0 and 1.0
- [ ] `mean_scores.composite` is weighted average of above
- [ ] `pass_rates.CR` shows percentage of cases with CR >= 0.8
- [ ] `pass_rates.AH` shows percentage of cases with AH = 1.0
- [ ] `pass_rates.AC` shows percentage of cases with AC >= 0.8

---

### 2.5 By-Archetype Breakdown

**Must See** (for I25_batch_1):

```
by_archetype:
  Process_Auditor: { count: 2, mean_CR: X.XX, ... }
  Delay_Driver_Profiler: { count: 1, mean_CR: X.XX, ... }
  Documentation_Gap: { count: 1, mean_CR: X.XX, ... }
  Safety_Signal: { count: 1, mean_CR: X.XX, ... }
```

---

## 3. Output Formats

### 3.1 JSON Output

```bash
npx ts-node bin/planner.ts safe:score -c I25 -b I25_batch_1 -f json -o ./report.json
```

**Must Verify**:

- [ ] File created at `./report.json`
- [ ] Valid JSON (parseable)
- [ ] Contains `report_type: "SAFE_v0"`
- [ ] Contains `generated_at` ISO timestamp
- [ ] Contains `results` array with 5 entries
- [ ] Each result has `test_id`, `scores`, `details`, `label`

**Sample JSON Structure Check**:
```bash
# Quick validation
cat report.json | jq '.results | length'  # Should output: 5
cat report.json | jq '.summary.total_cases'  # Should output: 5
cat report.json | jq '.results[0].scores.CR'  # Should output: number
```

---

### 3.2 Markdown Output

```bash
npx ts-node bin/planner.ts safe:score -c I25 -b I25_batch_1 -f markdown -o ./report.md
```

**Must Verify**:

- [ ] File created at `./report.md`
- [ ] Contains `# SAFE v0 Report` header
- [ ] Contains summary table
- [ ] Contains per-case table
- [ ] Contains failure analysis section

---

### 3.3 Console Output

```bash
npx ts-node bin/planner.ts safe:score -c I25 -b I25_batch_1 -f console
```

**Must Verify**:

- [ ] Box-drawing characters render correctly
- [ ] Scores formatted to 2 decimal places
- [ ] Labels colored (if terminal supports):
  - PASS = green
  - REVIEW = yellow
  - FAIL = red

---

## 4. Verbose Mode

```bash
npx ts-node bin/planner.ts safe:score -c I25 -b I25_batch_1 -v
```

**Must See Additional Output**:

- [ ] Per-case detail blocks showing:
  - CR: found signals, missing signals
  - AH: violations (or "none")
  - AC: found phrases, missing phrases
- [ ] Engine output snippets (truncated summary)

---

## 5. Strict AH Mode

```bash
npx ts-node bin/planner.ts safe:score -c I25 -b I25_batch_1 --strict-ah
```

**Must Verify**:

- [ ] Any case with AH < 1.0 receives `Fail` label (not `Review`)
- [ ] Output indicates strict mode: `[STRICT AH MODE]`

---

## 6. Exit Codes

| Scenario | Expected Exit Code |
|----------|-------------------|
| All cases Pass | 0 |
| At least one Fail | 1 |
| No Fails, but at least one Review | 2 |
| Configuration error (bad batch pattern) | 3 |
| Runtime error (LLM failure) | 3 |

**Verification**:
```bash
npx ts-node bin/planner.ts safe:score -c I25 -b I25_batch_1
echo $?  # Check exit code
```

---

## 7. Error Handling

### 7.1 Missing Batch Files

```bash
npx ts-node bin/planner.ts safe:score -c I25 -b "nonexistent_batch"
```

**Must See**:
- [ ] Error message: `No test files found matching pattern`
- [ ] Exit code: 3

### 7.2 Invalid Concern ID

```bash
npx ts-node bin/planner.ts safe:score -c INVALID -b "*"
```

**Must See**:
- [ ] Graceful error or empty results
- [ ] No crash/stack trace

---

## 8. Performance Benchmarks

**For I25_batch_1 (5 cases)**:

- [ ] Total execution time < 60 seconds (with LLM calls)
- [ ] Total execution time < 5 seconds (scoring only, pre-computed outputs)
- [ ] Memory usage < 500MB

---

## 9. Golden Set Verification

```bash
npx ts-node bin/planner.ts safe:score -c I25 -b golden_set
```

**If golden_set.json exists**:
- [ ] All golden cases should achieve Pass label (by definition)
- [ ] Overall pass rate should be 100%
- [ ] Any failures indicate regression

---

## 10. CI Integration Check

```bash
# Simulate CI gate check
npx ts-node bin/planner.ts safe:score -c I25 -b I25_batch_1 -f json -o ./safe-report.json

# Check pass rate threshold
PASS_RATE=$(cat safe-report.json | jq '.summary.overall_pass_rate')
if (( $(echo "$PASS_RATE < 0.6" | bc -l) )); then
  echo "SAFE gate failed: pass rate $PASS_RATE < 0.6"
  exit 1
fi
```

**Must Verify**:
- [ ] Command runs without interactive prompts
- [ ] JSON output is deterministic structure
- [ ] Exit code reflects overall status

---

## Sign-Off Criteria

| Criterion | Status |
|-----------|--------|
| CLI help displays correctly | [ ] |
| I25_batch_1 scores 5 cases | [ ] |
| All three metrics (CR, AH, AC) computed | [ ] |
| Labels assigned per threshold rules | [ ] |
| JSON output valid and complete | [ ] |
| Console output readable | [ ] |
| Exit codes match specification | [ ] |
| Error handling graceful | [ ] |
| Performance acceptable | [ ] |

**Approver**: _______________
**Date**: _______________
