# Learning Loop - Continuous Improvement System

## Overview

The **Learning Loop** is a human-triggered continuous improvement system for the HAC Planner CLI. It allows SMEs (Subject Matter Experts) to flag rejected or inadequate planner configurations, and later trigger an improvement run that uses an LLM to propose patches to libraries, rules, and questions.

## Key Principles

1. **Human-Triggered**: No automatic learning - SMEs explicitly decide when to enqueue rejections and when to process them
2. **Small Patches**: Proposes focused, incremental improvements rather than full rewrites
3. **Manual Review**: All proposed patches require human approval before application
4. **Transparent**: Every patch includes explanation and confidence score
5. **Pediatric-Focused**: All improvements maintain pediatric-specific considerations

## Workflow

```
┌─────────────────┐
│  SME Reviews    │
│  Generated      │
│  Config         │
└────────┬────────┘
         │
         ├─ Approved → Use config as-is
         │
         └─ Rejected → Enqueue for learning
                       ↓
                ┌──────────────────┐
                │ Learning Queue   │
                │ (pending items)  │
                └────────┬─────────┘
                         │
                         │ Human triggers: npm run learn
                         ↓
                ┌──────────────────┐
                │ Learning Agent   │
                │ (LLM analyzes)   │
                └────────┬─────────┘
                         │
                         ↓
                ┌──────────────────┐
                │ Proposed Patches │
                │ (learning_drafts)│
                └────────┬─────────┘
                         │
                         │ SME reviews patches
                         ↓
                ┌──────────────────┐
                │ Apply Patches    │
                │ (manual update)  │
                └────────┬─────────┘
                         │
                         ↓
                ┌──────────────────┐
                │ Updated Libraries│
                │ Rules, Questions │
                └──────────────────┘
```

## Components

### 1. Learning Queue

**Location**: `learning_queue/queue.json`

**Purpose**: Stores rejected configs with reviewer feedback

**Structure**:
```typescript
interface LearningQueueItem {
  id: string;
  created_at: string;

  input: PlanningInput;           // What was requested
  output: PlannerPlan;            // What was generated

  domain_type: "HAC" | "USNWR";
  archetype: string;
  domain: string;
  review_target: string;

  reviewer_comment: string;       // Why it was rejected
  reviewer_name?: string;

  status: "pending" | "draft_proposed" | "patched" | "discarded";
}
```

### 2. Learning Agent

**Location**: `planner/learningAgent.ts`

**Purpose**: Analyzes rejected configs and proposes improvements

**How it works**:
1. Reads rejected config and reviewer comment
2. Uses LLM (or mock mode) to understand the issue
3. Proposes small, focused patch to ONE of:
   - Signal libraries (add/remove/reprioritize signals)
   - HAC rule sets (add/modify criteria)
   - USNWR questions (add/modify/remove questions)
   - Planner prompts (suggest improvements)

**Output**: Structured `LearningPatch` with proposed changes and explanation

### 3. Learning Drafts

**Location**: `learning_drafts/*.json`

**Purpose**: Stores proposed patches for human review

**Example Patch**:
```json
{
  "target": "signal_library",
  "archetype": "HAC_CLABSI",
  "domain": "nicu",
  "review_target": "CLABSI",
  "proposed_changes": {
    "signals_to_add": [
      {
        "id": "tpn_active",
        "name": "Total Parenteral Nutrition (TPN) Active",
        "category": "clinical",
        "priority": "core",
        "rationale": "Neonates on TPN via central line have elevated fungal CLABSI risk per NHSN guidelines"
      }
    ]
  },
  "explanation_summary": "Add TPN status signal to identify high-risk neonatal CLABSI cases",
  "confidence": 0.9,
  "source_queue_item_id": "learning-1234567890-abc123",
  "generated_at": "2025-01-22T15:30:00Z"
}
```

## Usage

### Step 1: Enqueue Rejected Config (from UI/API)

When an SME reviews a generated config and marks it as "needs improvement":

```typescript
import { enqueueRejectedConfig } from './planner/learningQueueHelpers';

// From your Next.js API or UI
enqueueRejectedConfig({
  input: planningInput,
  output: generatedPlan,
  reviewer_comment: "Missing TPN status for neonatal CLABSI risk assessment",
  reviewer_name: "Dr. Jane Smith"
});
```

**Validation**: Comments must be at least 10 characters and provide specific feedback.

### Step 2: Check Learning Queue Status

```bash
npm run learn:status
```

**Output**:
```
📊 Learning Queue Summary

Total Items: 5

By Status:
  Pending:        3
  Draft Proposed: 2
  Patched:        0
  Discarded:      0

By Archetype:
  HAC_CLABSI: 2
  HAC_CAUTI: 1
  USNWR_ORTHO_METRIC: 2
```

### Step 3: Trigger Learning Run

When you're ready to process pending items:

```bash
# Production mode (uses LLM - not yet implemented)
npm run learn

# Mock mode (uses heuristics - available now)
npm run learn:mock

# Dry run (no changes saved)
npm run learn -- --dry-run
```

**What happens**:
1. Loads all `pending` items from learning queue
2. For each item:
   - Calls learning agent to analyze rejection
   - Generates a `LearningPatch` with proposed improvements
   - Saves patch to `learning_drafts/<queue_item_id>.json`
   - Updates item status: `pending` → `draft_proposed`

**Output**:
```
🧠 Clinical Abstraction Planner - Learning Loop

Found 3 pending item(s) in learning queue

[1/3]
🔍 Processing: learning-1234567890-abc123
   Archetype: HAC_CLABSI
   Domain: nicu
   Review Target: CLABSI
   Comment: Missing TPN status for neonatal CLABSI risk assessment
   ✅ Patch proposed
      Target: signal_library
      Confidence: 90%
      Summary: Add TPN status signal to identify high-risk neonatal CLABSI cases
      Saved to: learning_drafts/learning-1234567890-abc123.json
      Status updated: pending → draft_proposed

[2/3]
...

✅ Learning loop complete

Next steps:
  1. Review proposed patches in: learning_drafts
  2. Apply relevant patches to:
     - signal_library/*.json
     - hac_rules/index.ts
     - USNWR question templates
     - planner prompts
  3. Test updated configs with example inputs
  4. Mark applied items as "patched" or "discarded"
```

### Step 4: Review Proposed Patches

Open the generated patches in `learning_drafts/`:

```bash
cat learning_drafts/learning-1234567890-abc123.json
```

**Review checklist**:
- [ ] Does the patch address the reviewer's concern?
- [ ] Are proposed changes clinically accurate?
- [ ] Are changes specific to pediatric population?
- [ ] Is the confidence score reasonable?
- [ ] Would this improve future plans?

### Step 5: Apply Patches (Manual)

Based on the `target` field, apply changes to the appropriate files:

#### For `signal_library` patches:

1. Open `signal_library/HAC_CLABSI__nicu.json`
2. Add/remove/modify signals as proposed
3. Update version number (e.g., `1.0.0` → `1.1.0`)
4. Add curator notes about the change

#### For `rules` patches:

1. Open `hac_rules/index.ts`
2. Add/modify criteria in the appropriate rule set
3. Test with example inputs

#### For `questions` patches:

1. Open `planner/plannerAgent.ts` (USNWR question generation)
2. Add/modify questions in the relevant metric section
3. Test with example inputs

#### For `prompt` patches:

1. Open `planner/plannerAgent.ts` or prompt templates
2. Update system prompts or generation logic
3. Test with multiple examples

### Step 6: Test Updated Configs

```bash
# Test with example that triggered the rejection
npx ts-node cli/plan.ts examples/clabsi_nicu_input.json --mock

# Verify improvement
# - Check that missing signals are now present
# - Verify quality scores improved
# - Confirm SME feedback addressed
```

### Step 7: Mark Items as Patched

Once you've applied and tested patches, update the queue items:

```typescript
import { updateLearningItem, findLearningItem } from './planner/learningQueueStorage';

const item = findLearningItem('learning-1234567890-abc123');
if (item) {
  item.status = 'patched';
  updateLearningItem(item);
}
```

Or mark as `discarded` if the patch wasn't useful:

```typescript
item.status = 'discarded';
updateLearningItem(item);
```

## Best Practices

### When to Enqueue

✅ **DO enqueue when**:
- Generated config is missing critical signals/questions
- Criteria are incorrect or incomplete
- Pediatric-specific considerations are missing
- Quality scores are low (Grade C or D)
- SME identifies clinical inaccuracies

❌ **DON'T enqueue when**:
- Minor formatting preferences
- Edge cases that won't recur
- Personal style differences
- Valid alternative approaches

### Writing Good Reviewer Comments

**Bad**: "This is wrong"

**Good**: "Missing TPN status for neonatal CLABSI risk assessment. NHSN guidelines require tracking TPN for infants <90 days due to elevated fungal infection risk."

**Structure**:
1. What's wrong or missing
2. Why it matters clinically
3. Reference to guidelines if applicable

### Batch Processing

Process learning queue items in batches:
- Weekly: For ongoing improvements
- Monthly: For comprehensive reviews
- After major updates: When NHSN/USNWR criteria change

### Confidence Thresholds

- **≥0.8**: High confidence - likely safe to apply
- **0.5-0.7**: Medium confidence - review carefully
- **<0.5**: Low confidence - use as inspiration only

## Directory Structure

```
clinical-planner-cli/
├── learning_queue/
│   └── queue.json              # Rejected configs awaiting processing
├── learning_drafts/
│   ├── learning-123-abc.json   # Proposed patch 1
│   └── learning-456-def.json   # Proposed patch 2
├── models/
│   └── LearningQueue.ts        # Interfaces
├── planner/
│   ├── learningAgent.ts        # Patch proposal logic
│   ├── learningQueueStorage.ts # Storage helpers
│   └── learningQueueHelpers.ts # Enqueue helpers
└── cli/
    └── learn.ts                # Learning CLI
```

## Future Enhancements

### Short-term
- [ ] LLM integration (OpenAI/Anthropic API)
- [ ] Automated patch application with git diffs
- [ ] Learning analytics dashboard
- [ ] Batch approval/rejection UI

### Long-term
- [ ] Pattern detection across multiple rejections
- [ ] Suggested test cases for patches
- [ ] A/B testing for competing patches
- [ ] Integration with version control workflow

## Troubleshooting

### Queue not loading

Check that `learning_queue/queue.json` exists and is valid JSON:

```bash
cat learning_queue/queue.json | jq .
```

### Patches not being saved

Ensure `learning_drafts/` directory has write permissions:

```bash
mkdir -p learning_drafts
chmod 755 learning_drafts
```

### Low confidence patches

If patches consistently have low confidence (<0.5):
- Review reviewer comments - are they specific enough?
- Check that input/output data is complete
- Consider using more detailed feedback

### LLM mode not available

LLM integration is planned but not yet implemented. Use mock mode:

```bash
npm run learn:mock
```

## API Integration

For Next.js UI or API routes:

```typescript
// app/api/planner/learning/enqueue/route.ts
import { enqueueRejectedConfig } from '@/clinical-planner-cli/planner/learningQueueHelpers';

export async function POST(request: Request) {
  const { input, output, reviewer_comment, reviewer_name } = await request.json();

  try {
    const item = enqueueRejectedConfig({
      input,
      output,
      reviewer_comment,
      reviewer_name
    });

    return Response.json({ success: true, item });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 400 });
  }
}
```

## References

- [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md) - Overall implementation progress
- [INTENT_MODE_IMPLEMENTATION_GUIDE.md](./INTENT_MODE_IMPLEMENTATION_GUIDE.md) - Planner architecture
- [HAC Rules Module](./hac_rules/index.ts) - NHSN criteria implementation
- [Quality Assessment](./planner/qa.ts) - Quality scoring system

---

**Last Updated**: January 2025
**Status**: Learning queue storage and CLI implemented, LLM integration pending
