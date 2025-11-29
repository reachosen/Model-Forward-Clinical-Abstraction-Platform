# Partial Plan Revision

## Overview

The **Partial Revision** feature allows SMEs to revise specific sections of a generated plan with a single remark, without regenerating the entire plan. This provides a faster, more surgical approach to plan refinement compared to full regeneration.

## Key Benefits

1. **Faster Iteration**: Only updates the section that needs changes
2. **Preserves Good Parts**: Keeps untouched sections intact
3. **Surgical Changes**: Makes minimum modifications to address feedback
4. **Clear Scope**: Reviewer specifies exactly what to revise
5. **Validation Included**: Revised plan is automatically validated and re-assessed for quality

## Revision Types

| Type | What Gets Revised | What Stays Intact |
|------|------------------|-------------------|
| `signals` | Signal groups and signal types | Phases, rules, questions |
| `questions` | USNWR abstraction questions | Phases, signals, rules |
| `rules` | HAC surveillance criteria | Phases, signals, questions |
| `phases` | Timeline phases (names, descriptions) | Signals, questions, rules |
| `prompt` | Prompt/guidance for future runs | Current plan (note added) |
| `full` | Everything (with remark as guidance) | Nothing (full regeneration) |

## Workflow

```
┌─────────────────┐
│  SME Reviews    │
│  Generated Plan │
└────────┬────────┘
         │
         ├─ Choose what to revise: signals/questions/rules/phases/prompt/full
         ├─ Enter remark: "Too many signals, keep only core 8"
         │
         ↓
┌─────────────────┐
│  Revision Agent │
│  (LLM or Mock)  │
└────────┬────────┘
         │
         ├─ Keeps untouched parts frozen
         ├─ Updates only specified section
         ├─ Merges back into full plan
         │
         ↓
┌─────────────────┐
│  Validation &   │
│  QA Re-run      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Revised Plan   │
│  Ready for Use  │
└─────────────────┘
```

## API Usage

### From Next.js Frontend

```typescript
import { requestPlanRevision } from '@/lib/planRevisionClient';

// User clicked "Revise Signals"
const revisedPlan = await requestPlanRevision(
  'signals',                    // revision_type
  'Too many signals, keep only core 8 for baseline period',  // remark
  originalInput,                // PlanningInput
  originalPlan                  // PlannerPlan
);

// Update UI with revised plan
setPlan(revisedPlan);
```

### Using React Hook

```typescript
import { usePlanRevision } from '@/lib/planRevisionClient';

function PlanReviewComponent() {
  const { revise, isRevising, error } = usePlanRevision();
  const [plan, setPlan] = useState<PlannerPlan>(originalPlan);

  const handleReviseSignals = async () => {
    try {
      const revised = await revise(
        'signals',
        remarkText,
        originalInput,
        plan
      );
      setPlan(revised);
    } catch (err) {
      console.error('Revision failed:', err);
    }
  };

  return (
    <div>
      {isRevising && <Spinner />}
      {error && <ErrorMessage error={error} />}
      <button onClick={handleReviseSignals}>
        Revise Signals Only
      </button>
    </div>
  );
}
```

### Direct API Call

```bash
POST /api/hac/planner/revise
Content-Type: application/json

{
  "revision_type": "signals",
  "remark": "Too many signals, keep only core 8",
  "input": { /* PlanningInput */ },
  "output": { /* PlannerPlan */ }
}

Response: { /* Revised PlannerPlan */ }
```

## CLI Usage

For local testing without the Next.js API:

```bash
# Revise signals
npm run revise -- output/plan.json --type signals --remark "Too many signals"

# Revise questions
npm run revise -- output/plan.json --type questions --remark "Add 30-day readmission question"

# Revise rules
npm run revise -- output/plan.json --type rules --remark "Add neonatal TPN criterion"

# Revise phases
npm run revise -- output/plan.json --type phases --remark "Simplify phase names"

# Full regeneration
npm run revise -- output/plan.json --type full --remark "Focus on high-risk neonatal population"

# Specify output file
npm run revise -- plan.json --type signals --remark "Reduce signals" --output revised-plan.json

# Use mock mode (default)
npm run revise -- plan.json --type signals --remark "Reduce signals" --mock
```

## Example Remarks

### Good Remarks

✅ **Signals**: "Too many signals, keep only core 8 for baseline period. Focus on device, micro, and vital signs."

✅ **Questions**: "Add question about 30-day unplanned readmission for I25 orthopedic metric. USNWR requires this."

✅ **Rules**: "Add neonatal TPN criterion for CLABSI. NHSN guidelines require tracking TPN for infants <90 days."

✅ **Phases**: "Simplify phase names to use clinical terminology instead of generic labels. Match our workflow."

✅ **Full**: "Focus more on high-risk neonatal population (0-90 days). Include gestational age and birth weight."

### Bad Remarks

❌ "This is wrong" - Too vague, no actionable guidance

❌ "Fix it" - Doesn't specify what to fix

❌ "Make it better" - Not specific enough

❌ "Signals" - Not a sentence, no explanation

## Revision Metadata

Each revised plan includes revision metadata:

```typescript
{
  plan_metadata: {
    plan_id: "plan-clabsi-nicu-001-rev-signals-1234567890",
    // ... other metadata
    revision: {
      revision_type: "signals",
      remark: "Too many signals, keep only core 8",
      revised_at: "2025-01-22T10:30:00Z",
      previous_plan_id: "plan-clabsi-nicu-001",
      revised_by: "Dr. Sarah Martinez"  // optional
    }
  }
}
```

This allows tracking revision history and understanding what changed.

## Validation & Quality

After revision, the plan is automatically:

1. **Re-validated**: Runs full validation pipeline
   - Schema validation
   - Business rules validation
   - Signal/question completeness checks

2. **Re-assessed for Quality**: Runs QA scoring
   - Structure score (phases)
   - Coverage score (signals/questions)
   - Parsimony score (signal/question count)
   - Config readiness score (validation status)
   - Fit-for-use score (overall)
   - Overall grade (A/B/C/D)

3. **Flagged if Needed**:
   - `requires_review: true` if validation fails or quality is low
   - Validation errors/warnings populated
   - Quality concerns added to rationale

## Edge Cases

### Revision Fails Validation

If the revised plan fails validation:
- Plan is still returned
- `validation.is_valid: false`
- `validation.errors` contains specific issues
- `requires_review: true`
- SME can review errors and revise again

### Remark is Ambiguous

If the remark is vague or unclear:
- Mock mode: Makes best-effort changes based on keywords
- LLM mode: Sets `confidence` lower (0.5-0.7)
- `requires_review: true`
- Recommendations added to rationale for SME review

### Section is Already Optimal

If no changes are needed:
- Returns plan with minimal changes
- Plan ID updated to track revision attempt
- Note added to rationale explaining no changes needed

## Implementation Details

### Revision Agent

**Location**: `planner/revisionAgent.ts`

**Main Function**:
```typescript
async function reviseSection(
  revision: PlanRevisionRequest,
  useMock: boolean = false
): Promise<PlannerPlan>
```

**Handlers**:
- `reviseSignals()`: Updates signal groups only
- `reviseQuestions()`: Updates USNWR questions only
- `reviseRules()`: Updates HAC criteria only
- `revisePhases()`: Updates timeline phases only
- `revisePrompt()`: Notes prompt changes for future runs
- `runFullPlannerWithRemark()`: Full regeneration

### Mock Mode vs LLM Mode

**Mock Mode** (currently active):
- Pattern-based heuristics
- Keyword detection in remark
- Examples:
  - "too many" → reduce signal/question count by 40%
  - "add" → note what to add in recommendations
  - "simplify" → note simplification needed

**LLM Mode** (future):
- Uses REVISION_AGENT_SYSTEM_PROMPT
- Focused LLM call for specific section only
- Structured JSON output
- Higher quality, context-aware changes

## Testing

### Unit Tests (Future)

```typescript
describe('reviseSection', () => {
  it('should revise signals only', async () => {
    const revision = {
      revision_type: 'signals',
      remark: 'Too many signals',
      original_input: mockInput,
      original_output: mockPlan,
    };

    const revised = await reviseSection(revision, true);

    expect(revised.hac_config.signals.signal_groups).toHaveLength(
      lessThan(mockPlan.hac_config.signals.signal_groups.length)
    );
    expect(revised.hac_config.timeline.phases).toEqual(
      mockPlan.hac_config.timeline.phases
    );
  });
});
```

### Manual Testing

```bash
# 1. Generate a plan
npm run plan -- examples/intent_clabsi_pediatric_icu.json --mock -o test-plan.json

# 2. Revise signals
npm run revise -- test-plan.json --type signals --remark "Too many signals, keep only core 8" --mock -o test-revised.json

# 3. Compare
diff test-plan.json test-revised.json

# 4. Verify only signals changed
jq '.output.hac_config.signals' test-plan.json
jq '.output.hac_config.signals' test-revised.json
```

## UI Integration

### Revision Type Selector

```tsx
const revisionTypes = [
  { value: 'signals', label: 'Signals Only', icon: '📊' },
  { value: 'questions', label: 'Questions Only', icon: '❓' },
  { value: 'rules', label: 'Rules Only', icon: '📋' },
  { value: 'phases', label: 'Phases Only', icon: '📅' },
  { value: 'prompt', label: 'Prompt Guidance', icon: '💡' },
  { value: 'full', label: 'Full Regeneration', icon: '🔄' },
];

<Select
  value={selectedRevisionType}
  onChange={(e) => setSelectedRevisionType(e.target.value)}
>
  {revisionTypes.map(type => (
    <option key={type.value} value={type.value}>
      {type.icon} {type.label}
    </option>
  ))}
</Select>
```

### Revision Dialog

```tsx
<Dialog open={showRevisionDialog}>
  <DialogTitle>Revise Plan</DialogTitle>
  <DialogContent>
    <FormControl>
      <FormLabel>What to revise?</FormLabel>
      <Select value={revisionType} onChange={handleTypeChange}>
        {revisionTypes.map(...)}
      </Select>
    </FormControl>

    <FormControl>
      <FormLabel>Explain what to change:</FormLabel>
      <TextField
        multiline
        rows={4}
        placeholder="E.g., Too many signals, keep only core 8 for baseline period"
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        helperText="Be specific about what to change and why"
      />
    </FormControl>

    <Button
      onClick={handleRevise}
      disabled={!remark || remark.length < 10}
    >
      Revise Plan
    </Button>
  </DialogContent>
</Dialog>
```

## Future Enhancements

### Short-term
- [ ] LLM integration for higher-quality revisions
- [ ] Revision history tracking (show all previous revisions)
- [ ] Diff viewer (show what changed between versions)
- [ ] Revision suggestions (AI suggests what might need revision)

### Long-term
- [ ] Multi-section revision (revise signals + questions together)
- [ ] Iterative revision (revise, review, revise again loop)
- [ ] Revision templates (common revision patterns)
- [ ] A/B testing (generate 2-3 revision variants, let SME choose)

## Related Documentation

- [LEARNING_LOOP.md](./LEARNING_LOOP.md) - Continuous improvement from rejected plans
- [INTENT_MODE_IMPLEMENTATION_GUIDE.md](./INTENT_MODE_IMPLEMENTATION_GUIDE.md) - Full planner architecture
- [Quality Assessment](./planner/qa.ts) - QA scoring system

---

**Last Updated**: January 2025
**Status**: Implemented with mock mode, LLM integration pending
