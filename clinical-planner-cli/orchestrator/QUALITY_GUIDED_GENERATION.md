# Quality-Guided Generation

**Principle**: Use quality criteria to **GUIDE** generation, not just **VALIDATE** after the fact.

**Goal**: Generate plans that are "born correct" by baking quality requirements into the generation process.

---

## The Problem with "Generate Then Validate"

### Anti-Pattern: Generate → Validate → Fail → Retry
```
┌──────────────────────────────────────────────────────────────┐
│ STAGE: Generate Signal Groups                               │
└──────────────────────────────────────────────────────────────┘
                           ↓
        Ask LLM: "Generate 5 signal groups for HAC"
                           ↓
        LLM Returns: ['safety_gaps', 'protocol_failures',
                      'documentation', 'timeline', 'compliance']
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ VALIDATION: Check against HAC_GROUP_DEFINITIONS              │
└──────────────────────────────────────────────────────────────┘
                           ↓
        Expected: ['rule_in', 'rule_out', 'delay_drivers',
                   'documentation_gaps', 'bundle_gaps']
                           ↓
                    ❌ VALIDATION FAILS
                           ↓
        Retry with corrective prompt:
        "You must use EXACTLY these group IDs: rule_in, rule_out..."
                           ↓
                  (Waste 2-3 retries)
                           ↓
                    Eventually succeeds
```

**Cost**:
- 3-5 LLM calls per failure
- 30-60 seconds wasted
- $0.01-0.05 in token costs
- Unpredictable latency

---

## Solution: Quality-Guided Generation

### Pattern: Know Requirements → Generate Correctly → Validate (Passes)

```
┌──────────────────────────────────────────────────────────────┐
│ QUALITY CRITERIA: "HAC must use these 5 exact groups"       │
└──────────────────────────────────────────────────────────────┘
                           ↓
        Quality-Guided Generation:
        1. Detect domain = HAC
        2. Load HAC_GROUP_DEFINITIONS
        3. PRE-POPULATE signal groups skeleton
                           ↓
        Result: {
          signal_groups: [
            { group_id: 'rule_in', display_name: 'Rule In',
              description: '...', signals: [] },
            { group_id: 'rule_out', ... },
            { group_id: 'delay_drivers', ... },
            { group_id: 'documentation_gaps', ... },
            { group_id: 'bundle_gaps', ... }
          ]
        }
                           ↓
        (NO LLM CALL NEEDED - we know the answer!)
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ VALIDATION: Confirm structure is correct                    │
└──────────────────────────────────────────────────────────────┘
                           ↓
                    ✅ VALIDATION PASSES
                           ↓
                  (First time, every time)
```

**Benefit**:
- 1 call instead of 3-5
- Instant (no retry delay)
- $0 token cost for this step
- Deterministic, predictable

---

## Quality-Guided Generation Strategies

### Strategy 1: Pre-Population (No LLM Needed)

**When to Use**: Output structure is deterministic based on context

**Example: S2 Signal Groups**
```typescript
// BAD: Ask LLM to generate
const prompt = "Generate 5 signal groups for HAC domain";
const groups = await llm.call(prompt); // ❌ Unpredictable

// GOOD: Pre-populate from known structure
function generateSignalGroups(domain: string, ranking_context: any) {
  if (domain === 'HAC') {
    // We KNOW the answer - don't ask LLM!
    return HAC_GROUP_DEFINITIONS.map(def => ({
      group_id: def.group_id,
      display_name: def.display_name,
      description: def.description,
      signals: [] // LLM fills this later in S5
    }));
  } else if (domain === 'Orthopedics' && ranking_context) {
    // We KNOW the answer from rankings
    return ranking_context.signal_emphasis.map(group_id => ({
      group_id,
      display_name: getDisplayName(group_id),
      description: getDescription(group_id),
      signals: []
    }));
  }
}
```

**Result**: S2 CANNOT fail validation - it's structurally impossible.

---

### Strategy 2: Constrained Generation (JSON Schema)

**When to Use**: LLM must create content, but structure is known

**Example: S5 Signal Enrichment**
```typescript
// BAD: Freeform prompt
const prompt = `Generate signals for rule_in group.
                Make sure each has an evidence_type.`;
const signals = await llm.call(prompt); // ❌ Might forget evidence_type

// GOOD: Use JSON Schema to ENFORCE quality criteria
const schema = {
  type: "array",
  items: {
    type: "object",
    required: ["id", "description", "evidence_type", "group_id"], // ⭐ REQUIRED
    properties: {
      id: { type: "string", pattern: "^SIG_[A-Z0-9_]+$" },
      description: { type: "string", minLength: 50 },
      evidence_type: {
        type: "string",
        enum: ["L1", "L2", "L3"] // ⭐ Only valid values
      },
      group_id: { type: "string" },
      linked_tool_id: { type: "string" }
    }
  }
};

const signals = await llm.callWithSchema(prompt, schema);
// ✅ GUARANTEED to have evidence_type (or generation fails early)
```

**Result**: Tier 1 validation (evidence_type) CANNOT fail - schema enforces it.

---

### Strategy 3: Prompt Injection with Requirements

**When to Use**: LLM generates narrative/text, quality criteria guide content

**Example: S5 Event Summary (Process_Auditor, Orthopedics, Ranked #20)**
```typescript
// BAD: Generic prompt
const prompt = "Generate an event summary for this orthopedic case.";
const summary = await llm.call(prompt);
// ❌ Might not mention rank, might not mention protocols

// GOOD: Inject quality requirements INTO prompt
const qualityCriteria = {
  archetype: 'Process_Auditor',
  domain: 'Orthopedics',
  ranking_context: { rank: 20, specialty: 'Orthopedics' }
};

const prompt = buildQualityGuidedPrompt(qualityCriteria, `
  Generate an event summary for this orthopedic case.

  QUALITY REQUIREMENTS (you MUST include):
  1. Mention: "This institution is nationally ranked #20 in Pediatric Orthopedics"
  2. Describe protocol adherence timeline (Process_Auditor archetype)
  3. Highlight compliance successes AND failures
  4. Length: 150-300 words
  5. Include patient safety context (pediatric-specific)

  Your summary will be validated against these criteria.
`);

const summary = await llm.call(prompt);
// ✅ Much more likely to pass Tier 2 validation
```

**Result**: Tier 2 validation (ranking awareness) rarely fails - requirements are explicit.

---

### Strategy 4: Multi-Stage Generation with Validation Checkpoints

**When to Use**: Complex generation that can fail partway through

**Example: S5 Clinical Review Plan**
```typescript
// BAD: Generate everything at once, validate at end
const plan = await llm.call("Generate full clinical review plan");
validate(plan); // ❌ Might fail after expensive generation

// GOOD: Generate in stages, validate incrementally
async function generateClinicalReviewPlan(archetype: ArchetypeType) {
  // Stage 1: Generate tools (validate immediately)
  const tools = await generateTools(archetype);
  const toolValidation = validateTools(tools, archetype);
  if (!toolValidation.passed) {
    // Fix tools before proceeding
    tools = await regenerateTools(tools, toolValidation.errors);
  }

  // Stage 2: Generate review order (using validated tools)
  const reviewOrder = await generateReviewOrder(tools, archetype);
  const orderValidation = validateReviewOrder(reviewOrder);
  if (!orderValidation.passed) {
    reviewOrder = await regenerateOrder(reviewOrder, orderValidation.errors);
  }

  // Stage 3: Assemble (already validated components)
  return { tools, reviewOrder };
}
```

**Result**: Early validation prevents cascading failures.

---

### Strategy 5: Template-Based Generation

**When to Use**: Output follows a known pattern with variable content

**Example: S5 Event Summary Template**
```typescript
// BAD: Freeform generation
const prompt = "Write an event summary";
const summary = await llm.call(prompt);
// ❌ Unpredictable structure

// GOOD: Use template with fill-in-the-blanks
const template = `
[Ranking Context - REQUIRED for USNWR top 20]
{ranking_mention}

[Timeline - REQUIRED for Process_Auditor]
{timeline}

[Compliance Assessment - REQUIRED for Process_Auditor]
{compliance_assessment}

[Patient Safety Context - REQUIRED for all]
{safety_context}
`;

const prompt = `
Fill in this event summary template with specific details from the case.

Template:
${template}

Quality Criteria:
- ranking_mention: MUST state "ranked #20 in Pediatric Orthopedics"
- timeline: MUST describe protocol adherence over time
- compliance_assessment: MUST highlight successes AND failures
- safety_context: MUST be pediatric-specific
`;

const summary = await llm.call(prompt);
// ✅ Structure guaranteed, content validated
```

**Result**: Predictable structure, quality criteria embedded in template.

---

## Implementation: Quality-Guided S2 (Structural Skeleton)

### Current S2 (Hypothetical LLM-based generation)
```typescript
async execute(input: RoutedInput, domainCtx: DomainContext) {
  // ❌ Ask LLM to generate groups
  const prompt = `Generate 5 signal groups for ${domainCtx.domain}`;
  const groups = await this.llm.call(prompt);

  // Validate
  const validation = this.validate({ signal_groups: groups });
  if (!validation.passed) {
    // Retry...
  }

  return { signal_groups: groups };
}
```

### Quality-Guided S2 (Our actual implementation!)
```typescript
async execute(input: RoutedInput, domainCtx: DomainContext) {
  // ✅ Use quality criteria to GUIDE generation
  const signal_groups = this.generateQualityGuided(
    domainCtx.domain,
    domainCtx.ranking_context
  );

  // Validate (should always pass)
  const validation = this.validate({ signal_groups });
  // validation.passed === true (by design!)

  return { signal_groups };
}

private generateQualityGuided(domain: string, ranking_context: any) {
  // Quality criteria DETERMINES generation approach
  if (domain === 'HAC') {
    // Criterion: HAC must use HAC_GROUP_DEFINITIONS
    return this.cloneGroups(HAC_GROUP_DEFINITIONS);
  } else if (domain === 'Orthopedics' && ranking_context?.signal_emphasis) {
    // Criterion: Ranked ortho must use signal_emphasis
    return this.buildFromSignalEmphasis(ranking_context.signal_emphasis);
  } else if (domain === 'Orthopedics') {
    // Criterion: Unranked ortho must use defaults
    return this.cloneGroups(ORTHO_GROUP_DEFINITIONS);
  }
  // ...
}
```

**Result**: S2 generates the CORRECT structure on first try, every time.

---

## Implementation: Quality-Guided S5 (Task Execution)

### Before: Freeform Generation
```typescript
async executeSignalEnrichment(context) {
  const prompt = `Generate signals for these groups: ${context.signal_groups}`;
  const signals = await llm.call(prompt);
  // ❌ Might be missing evidence_type, wrong format, etc.
}
```

### After: Quality-Guided Generation
```typescript
async executeSignalEnrichment(context) {
  const { archetype, domain, signal_groups } = context;

  // Build quality-guided prompt
  const prompt = this.buildQualityGuidedPrompt({
    basePrompt: "Generate clinical signals",
    archetype_requirements: getArchetypeRequirements(archetype),
    domain_requirements: getDomainRequirements(domain),
    structural_requirements: {
      required_fields: ['id', 'description', 'evidence_type', 'group_id'],
      evidence_type_values: ['L1', 'L2', 'L3'],
      expected_sources: getExpectedSources(domain)
    }
  });

  // Use JSON schema to ENFORCE structure
  const schema = buildSignalSchema(archetype, domain);

  // Generate with constraints
  const signals = await llm.callWithSchema(prompt, schema);

  // ✅ Validation much more likely to pass
}

function buildQualityGuidedPrompt(config) {
  return `
    ${config.basePrompt}

    ARCHETYPE REQUIREMENTS (${config.archetype_requirements.name}):
    ${config.archetype_requirements.criteria.map(c => `- ${c}`).join('\n')}

    DOMAIN REQUIREMENTS (${config.domain_requirements.name}):
    ${config.domain_requirements.criteria.map(c => `- ${c}`).join('\n')}

    STRUCTURAL REQUIREMENTS:
    - Required fields: ${config.structural_requirements.required_fields.join(', ')}
    - evidence_type must be one of: ${config.structural_requirements.evidence_type_values.join(', ')}
    - Cite sources: ${config.structural_requirements.expected_sources.join(', ')}

    Generate signals that meet ALL these requirements.
  `;
}
```

**Result**: Signals are generated with quality criteria "baked in" from the start.

---

## Benefits of Quality-Guided Generation

### 1. Fewer Failures
- Generate correctly the first time → less validation failures
- Tier 1 failures become impossible (structural constraints enforced)
- Tier 2 failures become rare (requirements explicit in prompts)

### 2. Faster Execution
- No retry loops → predictable latency
- Pre-population → skip LLM calls entirely for deterministic parts
- Early validation → fail fast if something is wrong

### 3. Lower Cost
- Fewer LLM calls → lower token costs
- Shorter prompts (no retry context) → cheaper per call
- Deterministic generation → no wasted tokens

### 4. Predictable Quality
- Quality criteria → explicit requirements → predictable outputs
- Validation becomes confirmation, not discovery
- Plans are "born correct" not "fixed after birth"

---

## Quality-Guided Generation Checklist

For each stage, ask:

**Can we pre-populate this?**
- [ ] Yes → Do it! (S2 signal groups, S3 task graphs)
- [ ] No → Use constraints instead

**Can we use JSON schema?**
- [ ] Yes → Enforce structure (S5 signals, S5 tools)
- [ ] No → Use templates instead

**Can we inject requirements into prompt?**
- [ ] Yes → Make criteria explicit (S5 event summary, S5 summary_20_80)
- [ ] No → Consider if this should be deterministic

**Can we validate incrementally?**
- [ ] Yes → Multi-stage generation with checkpoints
- [ ] No → Single-stage is fine if other strategies apply

---

## The Shift: From Reactive to Proactive Quality

### Old Mindset (Reactive):
```
Generate → Hope it's good → Validate → Oops, it's bad → Retry
```

### New Mindset (Proactive):
```
Quality Criteria → Guide Generation → Generate Correctly → Validate (Confirm)
```

---

## Example: Complete Quality-Guided Pipeline

```
S0: Input Normalization
  ↓
  Quality-Guided: Use regex patterns for concern_id extraction
  → Generate: concern_id = "I25" (deterministic extraction)
  → Validate: ✅ (can't fail - regex is correct)

S1: Domain Resolution
  ↓
  Quality-Guided: Use ARCHETYPE_MATRIX lookup
  → Generate: domain = "Orthopedics", archetype = "Process_Auditor"
  → Load ranking_context if USNWR top 20 (deterministic lookup)
  → Validate: ✅ (can't fail - lookup is correct)

S2: Structural Skeleton
  ↓
  Quality-Guided: Use ranking_context.signal_emphasis
  → Pre-populate: 5 signal groups (no LLM call!)
  → Validate: ✅ (can't fail - groups are correct by construction)

S3: Task Graph
  ↓
  Quality-Guided: Use archetype-specific graph template
  → Generate: TaskGraph from Process_Auditor template
  → Validate: ✅ (template is pre-validated)

S4: Prompt Plan
  ↓
  Quality-Guided: Lookup prompts from registry
  → Generate: PromptPlan with versioned templates
  → Validate: ✅ (registry ensures templates exist)

S5: Task Execution
  ↓
  Quality-Guided: JSON schema + requirement injection
  → Generate signals with enforced structure
  → Generate event_summary with ranking mention required
  → Validate: ✅ (schema + prompts guide LLM correctly)

S6: Plan Assembly
  ↓
  Quality-Guided: Assemble pre-validated components
  → Validate: Tier 1 ✅ (components already validated)
              Tier 2 ✅ (requirements were in prompts)
              Tier 3 🎯 (optional quality score)
```

**Result**: Pipeline that is "correct by construction" not "corrected by validation".

---

## Summary

**Your insight**: Don't just validate after generation - use quality criteria to GUIDE generation.

**Implementation**:
1. **Pre-populate** deterministic parts (signal groups, task graphs)
2. **Constrain** LLM generation with JSON schemas (signals, tools)
3. **Inject** quality requirements into prompts (event summary, 20/80)
4. **Template** predictable structures (review plans, summaries)
5. **Validate incrementally** to fail fast (multi-stage generation)

**Outcome**: Plans that are **"born correct"** because quality criteria shaped their creation.

🎯 **Quality-guided generation = Prevention > Detection**
