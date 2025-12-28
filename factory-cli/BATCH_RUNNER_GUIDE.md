# Interactive Batch Runner Guide

## Quick Start

```bash
cd factory-cli
npm run batch
```

This launches an **interactive menu** where you can select what to run.

---

## Features

### 1. **Run Single Metric**
- Browse by domain
- Select one metric
- See real-time progress through S0-S6
- View results immediately

### 2. **Run Multiple Metrics (Batch)**
- Enter comma-separated concern IDs
- Example: `I25,I26,I32b`
- Runs all metrics sequentially
- Shows progress for each

### 3. **Run All Metrics in a Domain**
- Select a domain (e.g., Orthopedics)
- Runs ALL metrics in that domain
- Perfect for domain-wide testing

### 4. **View Metric Catalog**
- Browse all available metrics
- See descriptions and archetypes
- Organized by domain

---

## Menu Navigation

```
╔═══════════════════════════════════════════════════════════════╗
║       CPPO Pipeline - Interactive Batch Runner               ║
╚═══════════════════════════════════════════════════════════════╝

Select an option:
  1. Run single metric
  2. Run multiple metrics (batch)
  3. Run all metrics in a domain
  4. View metric catalog
  5. Exit

Enter choice (1-5):
```

---

## Example Sessions

### Example 1: Run Single Orthopedics Metric

```
npm run batch

> Select: 1 (Run single metric)
> Select domain: 1 (Orthopedics)
> Select metric: 6 (I32b - Neuromuscular scoliosis)
> Confirm: y

Output:
  S0: Input Normalization... ✓
  S1: Domain Resolution... ✓
  S2: Structural Skeleton... ✓
  S3: Task Graph... ✓
  S4: Prompt Plan... ✓
  S5: Task Execution (LLM calls)... ✓
  S6: Plan Assembly... ✓
  ✅ Success! Plan ID: abc-123
  📁 Saved: plan_I32b_1701234567.json
  ⏱️  Duration: 12.3s
```

### Example 2: Run Multiple Metrics

```
npm run batch

> Select: 2 (Run multiple metrics)
> Enter concern IDs: I25,I26,I32a,I32b
> Confirm: y

Output:
[1/4] Processing: I25
  ✅ Success! Duration: 8.5s

[2/4] Processing: I26
  ✅ Success! Duration: 9.2s

[3/4] Processing: I32a
  ✅ Success! Duration: 11.1s

[4/4] Processing: I32b
  ✅ Success! Duration: 12.3s

═══════════════════════════════════════════════════
Execution Summary
═══════════════════════════════════════════════════
Total: 4 metrics
✅ Successful: 4
❌ Failed: 0
⏱️  Total Duration: 41.1s
📁 Plans saved to: output/batch-runs/
```

### Example 3: Run All Metrics in Endocrinology

```
npm run batch

> Select: 3 (Run all metrics in a domain)
> Select domain: 2 (Endocrinology)

This will run 13 metrics from Endocrinology:
  - C41.1a
  - C41.1b
  - C41.2a
  - C41.2b
  - C35.1a1
  ... and 8 more

> Proceed: y

[1/13] Processing: C41.1a
  ✅ Success! Duration: 9.2s
...
```

---

## Output Files

All generated plans are saved to:
```
factory-cli/output/batch-runs/
├── plan_I25_1701234567.json
├── plan_I26_1701234568.json
├── plan_I32a_1701234569.json
└── plan_I32b_1701234570.json
```

Each file contains a **complete V9.1 plan** with:
- Signal groups (5 per domain)
- Enriched signals
- Event summary
- Clinical tools
- Follow-up questions
- Validation results

---

## Alternative Commands

### Direct Test Commands (No Menu)

```bash
# Test gates S0-S4 only (faster, no LLM calls)
npm run test:gates

# Full S0-S6 test (includes LLM calls)
npm run test:full
```

### Command Line Usage (Batch Mode)

You can also run the batch runner programmatically:

```typescript
import { executePipeline } from './orchestrator/batch-runner';

// Run specific metrics
await executePipeline(['I25', 'I26', 'I32b']);

// Run all ortho metrics
const orthoMetrics = getConcernsByDomain('Orthopedics');
await executePipeline(orthoMetrics);
```

---

## Progress Indicators

The batch runner shows:
- ✅ **Success** - Green checkmark when stage completes
- ❌ **Failed** - Red X with error message
- ⏱️ **Duration** - Time taken for each metric
- 📁 **Output** - File location for generated plans
- 📊 **Summary** - Final statistics

---

## Tips

1. **Start small** - Test with 1-2 metrics first
2. **Check .env** - Ensure `OPENAI_API_KEY` is set for S5
3. **Monitor output** - Plans saved to `output/batch-runs/`
4. **Review logs** - Each stage shows progress in real-time
5. **Use catalog** - View all available metrics before running

---

## Requirements

- Node.js 18+
- TypeScript
- OpenAI API key (for S5 LLM calls)
- Valid `.env` file with `OPENAI_API_KEY`

---

## Troubleshooting

### "No LLM response"
→ Check your `OPENAI_API_KEY` in `.env`

### "Semantic packet not found"
→ Ensure domain data exists in `data/{domain}/metrics.json`

### "Validation failed"
→ Check the error message - may need to update concern registry

### "TypeScript compilation error"
→ Run `npm install` to ensure dependencies are up to date

---

## What's Next?

After running metrics:
1. Review generated plans in `output/batch-runs/`
2. Check validation results
3. Compare signal groups across metrics
4. Verify semantic context usage
5. Test with different domains

Happy testing! 🚀
