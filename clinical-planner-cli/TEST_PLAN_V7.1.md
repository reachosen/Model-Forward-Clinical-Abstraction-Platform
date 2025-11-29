# V7.1 Test Plan & Validation Strategy

## 🎯 Objectives

1. Verify V7.1 prompt achieves **≥90% adherence score** (vs. V7's 24%)
2. Confirm external validation catches all compliance violations
3. Compare model performance: gpt-5-mini vs. gpt-4o-mini vs. claude-3.5-sonnet
4. Establish baseline quality metrics for production deployment

---

## 📊 Test Matrix

### Test Scenarios

| Test ID | Concern | Domain | Archetype | Model | Expected Score | Priority |
|---------|---------|--------|-----------|-------|----------------|----------|
| T1.1 | CLABSI | HAC | HAC_CLABSI | gpt-5-mini | ≥90% | P0 |
| T1.2 | CLABSI | HAC | HAC_CLABSI | gpt-4o-mini | 50-70% | P1 |
| T1.3 | CLABSI | HAC | HAC_CLABSI | claude-3.5-sonnet | ≥90% | P1 |
| T2.1 | SSI | HAC | HAC_SSI | gpt-5-mini | ≥90% | P0 |
| T2.2 | CAUTI | HAC | HAC_CAUTI | gpt-5-mini | ≥90% | P1 |
| T3.1 | Cardiac Mortality | USNWR | USNWR_CARDIAC | gpt-5-mini | ≥90% | P0 |
| T3.2 | Ortho SSI | USNWR | USNWR_ORTHO | gpt-5-mini | ≥90% | P1 |
| T4.1 | Edge: Minimal Input | HAC | HAC_GENERIC | gpt-5-mini | ≥75% | P2 |
| T4.2 | Edge: Complex Multi-Domain | HAC | HAC_COMPLEX | gpt-5-mini | ≥85% | P2 |

---

## 🔬 Test Execution Procedure

### Phase 1: Setup (5 min)

```bash
cd clinical-planner-cli

# Verify V7.1 files are present
ls -la planner/plannerPrompt_v7.1.md
ls -la planner/externalValidator.ts

# Install dependencies
npm install

# Set API keys
export OPENAI_API_KEY="your-key-here"
export ANTHROPIC_API_KEY="your-key-here"  # For Claude tests
```

### Phase 2: Baseline Test - HAC CLABSI with gpt-5-mini (10 min)

**Input:**
```bash
npm run plan -- \
  --concern CLABSI \
  --intent surveillance \
  --population "PICU patients with central lines" \
  --model gpt-5-mini \
  --output ./test-output/v7.1-clabsi-gpt5mini
```

**Expected Output Files:**
- `test-output/v7.1-clabsi-gpt5mini/planner_plan.json`
- `test-output/v7.1-clabsi-gpt5mini/clinical_config.json` (NOT hac_config.json)
- `test-output/v7.1-clabsi-gpt5mini/validation_report.txt`

**Validation Steps:**

1. **Run External Validator:**
```typescript
import { validatePlanV71, printValidationResults } from './planner/externalValidator';
import * as fs from 'fs';

const plan = JSON.parse(fs.readFileSync('./test-output/v7.1-clabsi-gpt5mini/planner_plan.json', 'utf-8'));
const result = validatePlanV71(plan);
printValidationResults(result);
```

2. **Manual Checklist:**
```markdown
✅ Check 1: Root object is `clinical_config` (NOT `hac_config`)
✅ Check 2: All 13 sections present (config_metadata, domain, surveillance, signals, timeline, criteria, questions, summary_config, definition, config2080, fieldMappings, clinical_tools, prompts)
✅ Check 3: Signal groups use HAC group_ids: rule_in, rule_out, delay_drivers, documentation_gaps, bundle_gaps (exactly 5)
✅ Check 4: All signals have provenance objects
✅ Check 5: All criteria have provenance objects
✅ Check 6: No placeholder text (TBD, Auto-generated, Placeholder, "true" trigger_expr)
✅ Check 7: All signals have complete schema (id, name, description, review_group, trigger_expr, severity, provenance, thresholds)
✅ Check 8: Questions has 'metric_questions' array (NOT 'followup_questions')
✅ Check 9: planner_version = "7.1.0"
✅ Check 10: Rationale has ≥3 concerns and ≥3 recommendations
```

3. **Record Metrics:**
```json
{
  "test_id": "T1.1",
  "model": "gpt-4o",
  "adherence_score": 0,
  "is_valid": false,
  "errors_count": 0,
  "warnings_count": 0,
  "execution_time_ms": 0,
  "token_usage": {
    "input": 0,
    "output": 0,
    "cost_usd": 0
  }
}
```

### Phase 3: Comparison Test - Same Input with gpt-4o-mini (10 min)

**Purpose:** Confirm gpt-5-mini is superior to gpt-4o-mini

```bash
npm run plan -- \
  --concern CLABSI \
  --intent surveillance \
  --population "PICU patients with central lines" \
  --model gpt-4o-mini \
  --output ./test-output/v7.1-clabsi-mini
```

**Expected Outcome:**
- Adherence score: 50-70% (vs. 24% on V7)
- Common failures: Placeholder text, missing sections, wrong group_ids

### Phase 4: Extended Test Suite (30 min)

Run tests T2.1, T2.2, T3.1, T3.2 following the same procedure.

### Phase 5: Edge Case Testing (20 min)

**T4.1: Minimal Input**
```json
{
  "concern": "Unknown HAC",
  "intent": "surveillance",
  "target_population": "General pediatrics"
}
```

**Expected:** Should still generate valid config with appropriate warnings

**T4.2: Complex Multi-Domain**
```json
{
  "concern": "CLABSI with Sepsis",
  "intent": "surveillance",
  "target_population": "PICU oncology patients",
  "specific_requirements": [
    "Track neutropenia status",
    "Include TPN-related risk factors",
    "Cross-reference with chemotherapy schedule"
  ]
}
```

**Expected:** ≥80% adherence, demonstrates advanced reasoning

---

## 📈 Success Criteria

### Minimum Viable (Must Pass)

| Metric | Threshold | Rationale |
|--------|-----------|-----------|
| **Adherence Score (gpt-5-mini)** | ≥90% | Clinical safety requires high compliance |
| **Root naming correct** | 100% | Critical for system integration |
| **Signal grouping correct** | 100% | Core architectural requirement |
| **No missing sections** | 100% | Schema completeness mandatory |
| **Provenance complete** | ≥95% | Regulatory traceability |

### Target (Ideal)

| Metric | Threshold |
|--------|-----------|
| **Adherence Score (gpt-5-mini)** | ≥95% |
| **Adherence Score (claude-3.5-sonnet)** | ≥95% |
| **No placeholders** | 100% |
| **Validation honesty** | 100% |

### Regression Detection

| Metric | V7 Baseline | V7.1 Target | Change |
|--------|-------------|-------------|--------|
| Adherence Score | 24% | ≥85% | +61% |
| Root naming | 0% | 100% | +100% |
| Signal grouping | 0% | 100% | +100% |
| Missing sections | 38% | 0% | -38% |

---

## 🐛 Failure Analysis Protocol

If a test **fails** (adherence < 85% for gpt-4o):

### Step 1: Categorize Failures

```typescript
const failures = {
  schema_violations: [],      // Missing sections, wrong structure
  naming_violations: [],       // hac_config vs clinical_config
  grouping_violations: [],     // Wrong group_ids
  placeholder_violations: [],  // TBD, Auto-generated
  provenance_violations: [],   // Missing source citations
  validation_lying: []         // is_valid: true despite errors
};
```

### Step 2: Root Cause Analysis

For each failure category:

1. **Schema violations** → Check if V7.1 Section 6 is clear enough
2. **Naming violations** → Add stronger context reset (Section 5)
3. **Grouping violations** → Emphasize exact group_id values (Section 3.2)
4. **Placeholder violations** → Enhance negative constraints (Section 2)
5. **Provenance violations** → Add provenance to example output
6. **Validation lying** → Make checklist more explicit (Section 8)

### Step 3: Prompt Iteration

Create `plannerPrompt_v7.1.1.md` with targeted fixes.

---

## 🔄 Continuous Testing (Post-Deployment)

### Daily Smoke Test

```bash
# Run baseline test with production model
npm run test:v71-smoke

# Expected: ≥85% adherence in <60 seconds
```

### Weekly Regression Suite

```bash
# Run all 9 test scenarios
npm run test:v71-full

# Generate comparison report
npm run test:v71-compare --baseline ./baseline-results.json
```

### Alerting Thresholds

```yaml
alerts:
  - name: "Adherence Score Drop"
    condition: "adherence_score < 80%"
    severity: P0
    action: "Rollback to previous prompt version"

  - name: "Validation Dishonesty"
    condition: "is_valid: true AND errors.length > 0"
    severity: P0
    action: "Flag for manual review"

  - name: "High Token Cost"
    condition: "cost_per_plan > $0.50"
    severity: P1
    action: "Review prompt efficiency"
```

---

## 📝 Test Execution Checklist

### Pre-Test

- [ ] V7.1 prompt file created (`plannerPrompt_v7.1.md`)
- [ ] External validator created (`externalValidator.ts`)
- [ ] Code updated to use V7.1 (`llmPlanGeneration.ts`)
- [ ] Model updated to `gpt-4o` (not mini)
- [ ] API keys configured
- [ ] Test output directory created (`./test-output/`)

### During Test

- [ ] Record start time
- [ ] Capture full console output
- [ ] Save all generated JSON files
- [ ] Run external validator on each output
- [ ] Note any unexpected behavior
- [ ] Track token usage and costs

### Post-Test

- [ ] Calculate adherence scores
- [ ] Compare against baseline (V7: 24%)
- [ ] Document all failures
- [ ] Generate summary report
- [ ] Update regression baseline if all tests pass

---

## 📊 Sample Test Report Template

```markdown
# V7.1 Test Report - 2025-11-25

## Summary
- **Total Tests:** 9
- **Passed:** 7 (77.8%)
- **Failed:** 2 (22.2%)
- **Average Adherence Score:** 87.3%

## Model Comparison

| Model | Avg Adherence | Pass Rate | Avg Cost |
|-------|---------------|-----------|----------|
| gpt-5-mini | 92% | 100% | $0.05 |
| gpt-4o-mini | 62% | 44% | $0.02 |
| claude-3.5-sonnet | 94% | 100% | $0.18 |

## Key Findings
✅ **Success:** V7.1 achieves 92% adherence (vs. V7: 24%) - **+68% improvement**
✅ **Success:** Root naming 100% correct (`clinical_config`)
✅ **Success:** Signal grouping 100% correct (5 HAC groups)
✅ **Success:** gpt-5-mini provides excellent quality at low cost
⚠️  **Note:** claude-3.5-sonnet slightly outperforms gpt-5-mini by 2%

## Recommendations
1. **Production Model:** Use `gpt-5-mini` (optimal cost/quality balance)
2. **High-Stakes Cases:** Use `claude-3.5-sonnet` for ≥95% adherence
3. **Prompt Fix:** Add provenance example in Section 6.4
4. **Next Steps:** Create V7.1.1 with provenance clarification
```

---

## 🚀 Quick Start Commands

```bash
# Run single test
npm run test:v71 -- --test T1.1

# Run full suite
npm run test:v71 -- --suite full

# Run with specific model
npm run test:v71 -- --test T1.1 --model claude-3.5-sonnet

# Compare models
npm run test:v71 -- --compare gpt-4o,gpt-4o-mini,claude-3.5-sonnet

# Validate existing output
npm run validate:v71 -- --file ./test-output/v7.1-clabsi-gpt4o/planner_plan.json
```

---

## 📞 Support & Escalation

**If adherence < 70% on gpt-4o:**
1. Re-run test to rule out API issues
2. Check prompt file loaded correctly
3. Review external validator for false positives
4. Escalate to prompt engineering team

**If validation is dishonest:**
1. Immediately switch to external validator only
2. File bug report with example output
3. Add to regression test suite

---

**Test Plan Version:** 1.0
**Last Updated:** 2025-11-25
**Owner:** Clinical Informatics Architecture Team
