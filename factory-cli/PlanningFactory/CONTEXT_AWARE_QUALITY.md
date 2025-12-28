# Context-Aware Quality Criteria

**Key Principle**: Quality standards adapt based on **Domain**, **Archetype**, and **Task**

---

## The Quality Matrix: 3 Dimensions

```
                    ┌────────────────────────────────────────┐
                    │         QUALITY CRITERIA               │
                    │    (What standards apply?)             │
                    └────────────────┬───────────────────────┘
                                     │
                 ┌───────────────────┼───────────────────┐
                 │                   │                   │
          ┌──────▼──────┐     ┌──────▼──────┐    ┌──────▼──────┐
          │   DOMAIN    │     │  ARCHETYPE  │    │    TASK     │
          │             │     │             │    │             │
          │ • HAC       │     │ • Process   │    │ • signal_   │
          │ • Ortho     │     │   Auditor   │    │   enrichment│
          │ • Endo      │     │ • Prevent.  │    │ • event_    │
          │ • Cardio    │     │   Detective │    │   summary   │
          │ • ...       │     │ • ...       │    │ • summary_  │
          │             │     │             │    │   20_80     │
          └─────────────┘     └─────────────┘    └─────────────┘
```

---

## Example 1: S2 (Structural Skeleton) - Domain-Aware

### Context: HAC Domain

```typescript
Domain: "HAC"
Archetype: "Preventability_Detective"
Ranking Context: null (HAC is safety, not rankings)

Quality Criteria Applied:
✓ CRITICAL: Exactly 5 signal groups
✓ Signal groups are: rule_in, rule_out, delay_drivers, documentation_gaps, bundle_gaps
✓ Groups focus on infection prevention and preventability
✓ No ranking context present (HAC is safety, not rankings)

Validation Logic:
- Check group_ids exactly match HAC_GROUP_DEFINITIONS
- Reject if ranking_context exists (warn)
- Require CDC NHSN compliance language in descriptions
```

### Context: Orthopedics Domain (USNWR Top 20)

```typescript
Domain: "Orthopedics"
Archetype: "Process_Auditor"
Ranking Context: { rank: 20, signal_emphasis: [...] }

Quality Criteria Applied:
✓ CRITICAL: Exactly 5 signal groups
✓ Signal groups informed by USNWR rankings (top 20)
✓ Groups include: bundle_compliance, handoff_failures, delay_drivers
✓ Groups align with quality_differentiators from Boston Children's/CHOP benchmarks

Validation Logic:
- Check group_ids match signal_emphasis from ranking_context
- Require quality-focused groups (bundle_compliance, handoff_failures)
- Validate alignment with top performer benchmarks
- Warn if groups don't match ranking intelligence
```

### Context: Orthopedics Domain (Unranked or Rank > 20)

```typescript
Domain: "Orthopedics"
Archetype: "Process_Auditor"
Ranking Context: null (rank > 20 or no data)

Quality Criteria Applied:
✓ CRITICAL: Exactly 5 signal groups
✓ Signal groups use ORTHO_GROUP_DEFINITIONS defaults
✓ Groups include: rule_in, rule_out, delay_drivers, bundle_compliance, handoff_failures

Validation Logic:
- Check group_ids match ORTHO_GROUP_DEFINITIONS
- Use domain-specific defaults (not ranking-informed)
- Warn if ranking_context is expected but missing
```

---

## Example 2: S5 (Task Execution) - Archetype & Task-Aware

### Context: Process_Auditor + signal_enrichment

```typescript
Archetype: "Process_Auditor"
Task: "signal_enrichment"
Domain: "Orthopedics"

Quality Criteria Applied:
✓ All signals have evidence_type (L1/L2/L3) [UNIVERSAL]
✓ Signals emphasize bundle compliance gaps [ARCHETYPE-SPECIFIC]
✓ Signals reference protocol deviations [ARCHETYPE-SPECIFIC]
✓ Each signal has clear compliance threshold [ARCHETYPE-SPECIFIC]
✓ Signals cite AAOS, NHSN sources [DOMAIN-SPECIFIC]

Validation Logic:
- Reject if any signal missing evidence_type (Tier 1)
- Warn if <70% of signals mention "protocol" or "compliance"
- Warn if signals don't cite expected sources (AAOS, NHSN)
- Check signal descriptions emphasize compliance gaps
```

### Context: Preventability_Detective + signal_enrichment

```typescript
Archetype: "Preventability_Detective"
Task: "signal_enrichment"
Domain: "HAC"

Quality Criteria Applied:
✓ All signals have evidence_type (L1/L2/L3) [UNIVERSAL]
✓ Signals clearly marked as rule_in or rule_out [ARCHETYPE-SPECIFIC]
✓ Each signal indicates preventability evidence strength [ARCHETYPE-SPECIFIC]
✓ Signals reference CDC NHSN definitions [DOMAIN-SPECIFIC]

Validation Logic:
- Reject if any signal missing evidence_type (Tier 1)
- Warn if rule_in signals don't mention "preventable" or "avoidable"
- Warn if signals don't cite CDC NHSN
- Check signals indicate preventability relevance clearly
```

### Context: Process_Auditor + event_summary

```typescript
Archetype: "Process_Auditor"
Task: "event_summary"
Domain: "Orthopedics"
Ranking Context: { rank: 20 }

Quality Criteria Applied:
✓ Summary ≥ 100 characters [UNIVERSAL]
✓ Summary describes protocol adherence timeline [ARCHETYPE-SPECIFIC]
✓ Mentions ranking "ranked #20 in Pediatric Orthopedics" [RANKING-SPECIFIC]
✓ Highlights compliance successes and failures [ARCHETYPE-SPECIFIC]

Validation Logic:
- Reject if summary < 100 chars (Tier 1)
- Warn if summary doesn't mention rank (Tier 2)
- Warn if summary doesn't mention "protocol" or "compliance"
- Check summary follows compliance narrative arc
```

### Context: Preventability_Detective + event_summary

```typescript
Archetype: "Preventability_Detective"
Task: "event_summary"
Domain: "HAC"

Quality Criteria Applied:
✓ Summary ≥ 100 characters [UNIVERSAL]
✓ Summary follows HAC investigation narrative arc [ARCHETYPE-SPECIFIC]
✓ Clearly states preventability determination [ARCHETYPE-SPECIFIC]
✓ Identifies root cause if preventable [ARCHETYPE-SPECIFIC]

Validation Logic:
- Reject if summary < 100 chars (Tier 1)
- Warn if summary doesn't mention "preventable" or "avoidable"
- Warn if summary doesn't identify root cause
- Check summary follows rule_in → rule_out → determination flow
```

---

## Quality Criteria Decision Tree

```
┌─────────────────────────────────────────────────────────────┐
│ STAGE S2: Structural Skeleton Validation                   │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    Domain = ?
                    ┌──────┴──────┐
                    │             │
              ┌─────▼────┐   ┌────▼─────┐
              │   HAC    │   │  USNWR   │
              └─────┬────┘   └────┬─────┘
                    │             │
                    ▼             ▼
         Apply HAC rules    Ranking Context?
         • 5 groups              ┌──────┴──────┐
         • rule_in/out           │             │
         • CDC focus        ┌────▼────┐   ┌────▼────┐
         • No rankings      │  YES    │   │   NO    │
                            │ (top 20)│   │(rank>20)│
                            └────┬────┘   └────┬────┘
                                 │             │
                                 ▼             ▼
                       Use signal_emphasis   Use domain
                       from rankings         defaults


┌─────────────────────────────────────────────────────────────┐
│ STAGE S5: Task Execution Validation                        │
└─────────────────────────────────────────────────────────────┘
                           │
                    ┌──────┴──────┐
                    │             │
              ┌─────▼────────┐ ┌──▼──────────┐
              │  Archetype   │ │    Task     │
              │              │ │             │
              │ Process_     │ │ signal_     │
              │ Auditor      │ │ enrichment  │
              └─────┬────────┘ └──┬──────────┘
                    │             │
                    └──────┬──────┘
                           ▼
                Apply archetype + task
                specific validation
                • Process_Auditor +
                  signal_enrichment →
                  Check compliance focus
```

---

## Implementation: How Validation Adapts

### Before (Generic Validation):
```typescript
function validateS2(skeleton) {
  // Same rules for ALL domains
  if (skeleton.signal_groups.length !== 5) {
    return { error: 'Must have 5 groups' };
  }
}
```

### After (Context-Aware Validation):
```typescript
function validateS2(skeleton, domainContext) {
  const { domain, ranking_context } = domainContext;

  // Universal rule
  if (skeleton.signal_groups.length !== 5) {
    return { error: 'Must have 5 groups' };
  }

  // Domain-specific rules
  if (domain === 'HAC') {
    return validateHACStructure(skeleton);
  } else if (domain === 'Orthopedics') {
    if (ranking_context) {
      return validateOrthoWithRankings(skeleton, ranking_context);
    } else {
      return validateOrthoDefaults(skeleton);
    }
  }
  // ... etc
}
```

---

## Quality Criteria Selection Matrix

| Stage | Context Dimension | What Changes | Example |
|-------|------------------|--------------|---------|
| **S0** | concern_id format | Valid patterns | `I25` vs `CLABSI` |
| **S1** | Domain | Ranking required? | USNWR: yes, HAC: no |
| **S2** | Domain + Rankings | Signal groups | HAC: fixed groups, USNWR: dynamic |
| **S3** | Archetype | Task graph shape | Process_Auditor: different from Detective |
| **S4** | Domain + Archetype + Task | Prompt template | ortho/process_auditor/signal_enrichment/v3 |
| **S5** | Archetype + Task + Domain | Validation rules | Process_Auditor event_summary checks compliance |
| **S6** | All contexts | Global checks | Tier 2 checks vary by domain/archetype |

---

## Benefits of Context-Aware Quality

### 1. **Precision**
- HAC plans don't get judged by USNWR standards (and vice versa)
- Process_Auditor doesn't require preventability language
- Preventability_Detective doesn't require ranking mentions

### 2. **Relevance**
- Quality criteria match clinical reality
- Validation failures are actionable
- Warnings point to real quality gaps

### 3. **Adaptability**
- New domains → add domain-specific rules
- New archetypes → add archetype-specific rules
- New tasks → add task-specific rules

### 4. **Clarity**
- Developers know: "What quality standards apply HERE?"
- Clinicians see: "This plan meets Orthopedics quality standards"
- Evaluators can: "Compare ortho plans to ortho standards"

---

## Summary: Quality Criteria Are 3-Dimensional

```
Generic Quality (Old):
  "Plan must have 5 signal groups"
  → Applies to ALL plans equally

Context-Aware Quality (New):
  IF domain = HAC:
    "Plan must have 5 signal groups: rule_in, rule_out, delay_drivers, documentation_gaps, bundle_gaps"

  IF domain = Orthopedics AND ranking_context.rank <= 20:
    "Plan must have 5 signal groups informed by signal_emphasis: [bundle_compliance, handoff_failures, ...]"
    "Plan must mention rank in event_summary"

  IF domain = Orthopedics AND ranking_context = null:
    "Plan must have 5 signal groups from ORTHO_GROUP_DEFINITIONS"
```

**Result**: Quality criteria that **adapt to the clinical context**, not one-size-fits-all rules.
