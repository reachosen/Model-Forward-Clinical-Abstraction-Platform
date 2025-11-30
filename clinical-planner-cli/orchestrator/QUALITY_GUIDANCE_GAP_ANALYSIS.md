# Quality Guidance Gap Analysis: All Task Prompts

**Date**: 2025-11-29
**Issue**: Prompts lack case-specific context, resulting in generic outputs

---

## Executive Summary

**Critical Finding**: All 5 task prompts suffer from the **same fundamental problem**:

- ✅ **Structural quality**: Perfect (100% valid JSON)
- ❌ **Semantic quality**: Poor (generic, not case-specific)
- ❌ **Clinical quality**: Low (no grounding in actual case data)

**Root Cause**: `loadPromptTemplate()` does NOT receive `clinical_context` (admission_summary, timeline, diagnoses, procedures) that exists in the test input. LLMs are asked to "analyze cases" without being given any case to analyze.

---

## Available vs Used Context

### What's Available (in test input):
```typescript
{
  concern: 'Patient with I25 diagnosis requiring quality review',
  concern_id: 'I25',
  domain_hint: 'Orthopedics',
  intent: 'quality_reporting',
  target_population: 'pediatric',
  specific_requirements: ['bundle compliance', 'protocol adherence'],
  clinical_context: {
    admission_summary: 'Pediatric patient admitted for orthopedic surgery...',
    timeline: [
      { timestamp: '2024-01-15T08:00:00Z', event: 'Admission' },
      { timestamp: '2024-01-15T10:00:00Z', event: 'Pre-op bundle checklist' },
      { timestamp: '2024-01-15T14:00:00Z', event: 'Surgery completed' }
    ]
  }
}
```

### What's Passed to Prompts:
```typescript
loadPromptTemplate(template_id, {
  domain,              // ✅ "Orthopedics"
  archetype,           // ✅ "Process_Auditor"
  task_type,           // ✅ "signal_enrichment"
  skeleton,            // ✅ Signal groups (empty)
  ranking_context,     // ✅ Rank #20, benchmarks
  task_outputs,        // ✅ Previous task outputs
  // ❌ NO clinical_context!
  // ❌ NO admission_summary!
  // ❌ NO timeline events!
  // ❌ NO concern text!
  // ❌ NO specific_requirements!
});
```

**Problem**: The rich clinical context available in the input is **never passed to the LLM prompts**.

---

## Task-by-Task Analysis

### 1. signal_enrichment ❌

**Current Prompt Receives**:
- Domain, archetype, signal group names (empty)
- Ranking context (#20, benchmarks)

**Missing Critical Context**:
- ❌ Admission summary
- ❌ Clinical timeline events
- ❌ Diagnoses (I25)
- ❌ Procedures performed
- ❌ Test results
- ❌ Specific requirements (bundle compliance, protocol adherence)

**What LLM Generates**:
```json
{
  "id": "SIG_001",
  "description": "Delay in surgical scheduling due to incomplete pre-operative assessments.",
  "evidence_type": "L1",
  "group_id": "delay_drivers"
}
```

**Problem**: Generic, hypothetical signal not tied to actual case events

**What LLM SHOULD Generate** (if given context):
```json
{
  "id": "SIG_001",
  "description": "Time from admission (08:00Z) to pre-op bundle checklist (10:00Z) was 2 hours. For I25 diagnosis at #20 ranked institution, pre-op assessment should complete within 1 hour per protocol.",
  "evidence_type": "L1",
  "group_id": "delay_drivers",
  "data_reference": "timeline[0] → timeline[1]"
}
```

---

### 2. event_summary ❌

**Current Prompt Receives**:
- Domain, archetype
- Ranking context (#20)
- Requirements: "150-300 words", "mention rank"

**Missing Critical Context**:
- ❌ Admission summary (what actually happened)
- ❌ Clinical timeline (sequence of events)
- ❌ Diagnoses
- ❌ Procedures
- ❌ Previous task outputs (signals generated)

**What LLM Generates**:
```
"In a recent orthopedic case at our institution, ranked #20 in Orthopedics,
a comprehensive review of protocol adherence was conducted following a surgical
intervention for a knee arthroplasty. The timeline began with preoperative
assessments, where compliance was noted at 95%..."
```

**Problem**: Fabricated narrative! The test case was about "I25 diagnosis" but LLM invented "knee arthroplasty" because it had no actual case data.

**What LLM SHOULD Generate** (if given context):
```
"Pediatric patient admitted for orthopedic surgery (I25 diagnosis) at our
institution, ranked #20 in Orthopedics. Timeline: Admission at 08:00Z, pre-op
bundle checklist completed at 10:00Z (2-hour delay vs 1-hour protocol), surgery
completed at 14:00Z. Key findings: [reference signals from signal_enrichment]..."
```

---

### 3. summary_20_80 ❌

**Current Prompt Receives**:
- Domain, archetype
- Ranking context (#20)
- Requirements: patient-friendly vs provider-detailed

**Missing Critical Context**:
- ❌ What actually happened to the patient
- ❌ Clinical findings
- ❌ Outcomes
- ❌ Quality issues identified (signals)

**What LLM Generates**:
```json
{
  "patient_summary": "You recently underwent an orthopedic procedure, and we're
  pleased to let you know that everything went well...",
  "provider_summary": "The patient underwent a successful orthopedic procedure..."
}
```

**Problem**: Generic template that could apply to ANY case. No case specifics.

---

### 4. followup_questions ❌

**Current Prompt Receives**:
- Domain, archetype
- Focus: "Protocol compliance investigation"

**Missing Critical Context**:
- ❌ What issues were found (signals)
- ❌ What protocols were violated
- ❌ Timeline gaps
- ❌ Event summary findings

**What LLM Generates**:
```json
{
  "questions": [
    "Can you provide detailed documentation of the protocols that were supposed to be followed?",
    "Were there any deviations from the established protocols?",
    "How was compliance monitored?"
  ]
}
```

**Problem**: Generic questions, not specific to the 2-hour pre-op delay identified in signals.

**What LLM SHOULD Generate** (if given signals):
```json
{
  "questions": [
    "Why was there a 2-hour delay between admission and pre-op bundle checklist (protocol requires ≤1 hour)?",
    "What documentation exists for the pre-op assessment timeline?",
    "Were there staffing or resource constraints that caused the delay?"
  ]
}
```

---

### 5. clinical_review_plan ❌

**Current Prompt Receives**:
- Domain, archetype
- Requirements: "checklists, compliance audits"

**Missing Critical Context**:
- ❌ What quality issues were found
- ❌ Which signal groups had findings
- ❌ What data elements need review
- ❌ Previous task outputs (signals, summary)

**What LLM Generates**:
```json
{
  "clinical_tools": [
    {
      "tool_id": "TOOL_001",
      "description": "Orthopedic Surgery Checklist",
      "priority": 1
    }
  ]
}
```

**Problem**: Generic tools, not tailored to the specific findings (delay drivers, bundle compliance gaps).

**What LLM SHOULD Generate** (if given signals):
```json
{
  "clinical_tools": [
    {
      "tool_id": "TOOL_001",
      "description": "Pre-operative Timeline Audit - Review admission to pre-op bundle timing against 1-hour protocol",
      "priority": 1,
      "target_signals": ["SIG_001"]
    },
    {
      "tool_id": "TOOL_002",
      "description": "Bundle Compliance Checklist - Verify all pre-op bundle elements completed",
      "priority": 2,
      "target_signals": ["SIG_005", "SIG_006"]
    }
  ]
}
```

---

## Impact Across Quality Tiers

### Tier 1 (Structural) ✅ PASSING
- All tasks generate valid JSON
- All required fields present
- Schema compliance: 100%

### Tier 2 (Semantic) ❌ FAILING
- Signals not case-specific (generic)
- Event summary fabricates details
- Questions not targeted to findings
- Tools not aligned with issues found
- **This is why we have Tier 2 warnings**

### Tier 3 (Clinical) ❌ NOT ASSESSED YET
- Can't assess clinical accuracy without case grounding
- Evidence levels (L1/L2/L3) assigned arbitrarily
- No verification against actual data
- No actionability (can't point reviewer to specific data)

---

## The Missing Data Flow

### Current Flow:
```
PlanningInput (has clinical_context)
  ↓
S0: Normalization (passes through)
  ↓
S1: Domain Resolution (doesn't use it)
  ↓
S2: Skeleton (doesn't use it)
  ↓
S3: Task Graph (doesn't use it)
  ↓
S4: Prompt Plan (doesn't use it)
  ↓
S5: Task Execution
  ↓
  loadPromptTemplate() ← ❌ clinical_context NEVER passed!
  ↓
LLM generates generic outputs
```

### Fixed Flow Should Be:
```
PlanningInput (has clinical_context)
  ↓
S0: Normalization → RoutedInput (preserves clinical_context)
  ↓
S5: Task Execution
  ↓
  loadPromptTemplate(context: {
    domain,
    archetype,
    skeleton,
    ranking_context,
    clinical_context: routedInput.clinical_context, ← ✅ ADD THIS
    concern: routedInput.concern,                    ← ✅ ADD THIS
    specific_requirements: routedInput.specific_requirements, ← ✅ ADD THIS
    task_outputs
  })
  ↓
LLM generates case-specific outputs grounded in data
```

---

## Root Cause: Architecture Gap

The issue is in the **S5 execute method signature**:

```typescript
// Current:
async execute(
  promptPlan: PromptPlan,
  taskGraph: TaskGraph,
  skeleton: StructuralSkeleton,
  domainContext: DomainContext
): Promise<TaskExecutionResults>

// Missing: routedInput!
```

**S5 never receives the `routedInput`** which contains `clinical_context`. It only gets:
- promptPlan (templates)
- taskGraph (task structure)
- skeleton (empty signal groups)
- domainContext (domain, archetype, ranking_context)

But `routedInput` (with admission_summary, timeline, concern text) is **lost** after S0!

---

## The Fix: Three Levels

### Level 1: Pass RoutedInput to S5 ✅ **REQUIRED**
```typescript
async execute(
  promptPlan: PromptPlan,
  taskGraph: TaskGraph,
  skeleton: StructuralSkeleton,
  domainContext: DomainContext,
  routedInput: RoutedInput  // ← ADD THIS
): Promise<TaskExecutionResults>
```

Then pass to prompts:
```typescript
const prompt = loadPromptTemplate(config.template_id, {
  domain,
  archetype,
  skeleton,
  ranking_context,
  task_outputs,
  clinical_context: routedInput.planning_input.clinical_context, // ← ADD
  concern: routedInput.planning_input.concern,                   // ← ADD
  specific_requirements: routedInput.planning_input.specific_requirements, // ← ADD
});
```

### Level 2: Enhance Prompts with Context ✅ **REQUIRED**

**signal_enrichment**:
```typescript
**Case Data:**
- Admission: ${clinical_context?.admission_summary}
- Concern: ${concern}
- Requirements: ${specific_requirements.join(', ')}

**Timeline:**
${clinical_context?.timeline?.map(e => `- ${e.timestamp}: ${e.event}`).join('\n')}

**Your Task:**
Generate 2 signals per group by analyzing the timeline for:
- Delays vs benchmarks
- Protocol violations
- Documentation gaps
- Each signal must reference specific timeline events or data
```

**event_summary**:
```typescript
**Case to Summarize:**
${clinical_context?.admission_summary}

**Events:**
${clinical_context?.timeline?.map(e => `${e.timestamp}: ${e.event}`).join('\n')}

**Signals Found:**
${task_outputs.get('signal_enrichment')?.output?.signals?.map(s => `- ${s.description}`).join('\n')}

Synthesize into 150-300 word narrative...
```

### Level 3: Add Quality Criteria ✅ **RECOMMENDED**

**Evidence Level Definitions**:
```
L1: Directly observable in timeline/data (timestamps, orders, documented events)
L2: Calculated from data (time intervals, rates, compliance percentages)
L3: Interpreted/inferred (risk assessments, clinical judgment)
```

**Actionability Requirements**:
```
Each signal must:
- Reference specific timeline event(s) or data element(s)
- Be verifiable by a reviewer looking at the data
- Include what to look for (e.g., "Check timeline[1] timestamp")
```

**Few-Shot Examples**:
```json
{
  "id": "SIG_001",
  "description": "Time from admission (08:00Z) to pre-op checklist (10:00Z) was 2 hours. Protocol requires ≤1 hour. Benchmark for #20 institution: 95% compliance with 1-hour window.",
  "evidence_type": "L2",
  "group_id": "delay_drivers",
  "data_reference": "timeline[0]→timeline[1]"
}
```

---

## Comparison: Before vs After Fix

### Before (Current):
| Task | Context Used | Output Quality | Actionable? |
|------|--------------|----------------|-------------|
| signal_enrichment | Domain, groups only | Generic hypotheticals | No |
| event_summary | Domain, rank only | Fabricated narrative | No |
| summary_20_80 | Domain only | Template text | No |
| followup_questions | Archetype only | Generic questions | No |
| clinical_review_plan | Domain only | Generic tools | No |

### After (With Fix):
| Task | Context Used | Output Quality | Actionable? |
|------|--------------|----------------|-------------|
| signal_enrichment | Full case + timeline + benchmarks | Case-specific findings | Yes |
| event_summary | Case + timeline + signals | Accurate narrative | Yes |
| summary_20_80 | Case + outcomes + signals | Personalized summaries | Yes |
| followup_questions | Signals + timeline gaps | Targeted questions | Yes |
| clinical_review_plan | Signals + findings | Tailored tools | Yes |

---

## Expected Quality Improvement

### Current State:
- Tier 1 (Structural): 100% ✅
- Tier 2 (Semantic): ~50% ⚠️
- Tier 3 (Clinical): 0% (can't assess without data grounding) ❌

### After Fix:
- Tier 1 (Structural): 100% ✅
- Tier 2 (Semantic): ~90% ✅ (LLM follows case data)
- Tier 3 (Clinical): ~80% ✅ (verifiable against data)

---

## Conclusion

**Yes, this is a systemic problem across ALL 5 task prompts**, not just signal_enrichment.

The architecture has a **critical data flow gap**: `clinical_context` exists in the input but is **never passed to the LLM prompts**. This causes all tasks to generate generic, hypothetical outputs instead of case-specific, data-grounded findings.

**Priority**: HIGH - This is the primary blocker to clinical quality

**Complexity**: MEDIUM - Requires:
1. Update S5 execute signature to receive routedInput
2. Pass clinical_context to loadPromptTemplate
3. Update all 5 prompt templates to use the context
4. Add quality criteria (evidence levels, actionability, examples)

**Impact**: TRANSFORMATIVE - Will shift from generic templates to clinically meaningful, actionable outputs

---

🎯 **Recommendation**: Fix this systemic gap before production use
