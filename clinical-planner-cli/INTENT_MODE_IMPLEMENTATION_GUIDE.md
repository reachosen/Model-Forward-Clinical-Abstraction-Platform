# Intent-First Mode Implementation Guide

## Status: Foundation Complete, Integration In Progress

This guide documents the intent-first mode architecture and provides a roadmap for completing the full implementation.

---

## ✅ What's Been Completed

### 1. Model Extensions
- **PlanningInput.ts**: Added `review_request?: string` field
- Made `concern_id`, `archetype`, `domain` optional (conditional on mode)
- Documented two modes: STRUCTURED and INTENT-FIRST

### 2. Schema Updates
- **planning-input.schema.json**:
  - Conditional validation using `anyOf`
  - Either `review_request` OR (`concern_id` + `archetype`) required
  - Added new archetypes: `HAC_CLABSI`, `HAC_CAUTI`, `HAC_VAP`, `HAC_SSI`, `USNWR_CARDIO_METRIC`, `USNWR_NEURO_METRIC`
  - Made `data_profile` and `clinical_context` fully optional

### 3. Intent Inference Module
- **planner/intentInference.ts**: Complete module with:
  - `inferPlanningMetadata()`: Pattern-matching implementation (ready for LLM)
  - System prompt template for production LLM integration
  - Confidence scoring and quality validation
  - Supports HAC (CLABSI, CAUTI, VAP, SSI) and USNWR (I25, I21, I60)

### 4. HAC Rules Module (PART 1 - 100% Complete)
- **hac_rules/index.ts**: Pediatric-adapted NHSN surveillance criteria
  - 4 complete rule sets: CLABSI (8 criteria), CAUTI (9 criteria), VAP/VAE (10 criteria), SSI (7 criteria)
  - 34 total criteria including 8 pediatric-specific criteria
  - Age-stratified thresholds (neonates, infants, children, adolescents)
  - Required signals mapping for each criterion
  - Clinical logic expressions and rationale
  - Integrated into planner - **all TBD placeholders removed**

### 5. Discovery → Curation → Library Pattern (PART 2 - 100% Complete)
- **planner/discoveryAgent.ts**: Signal discovery module
  - `discoverSignals()`: Generates candidate signals and phases for new archetype/domain combinations
  - Pediatric-aware discovery: automatically adds age-specific signals for pediatric domains
  - SignalDiscoveryOutput interface with phases, candidate_signals, metadata
- **CLI Integration**: `--discover-signals` mode available
- **Directory Structure**: `signal_library/` for curated libraries, `signal_curation/` for workflow
- **File Naming**: `<archetype>__<domain>.json` convention
- **Example Library**: `signal_library/HAC_CLABSI__pediatric_icu.json` with 4 phases, 17 curated signals

### 6. USNWR Question Traceability (PART 3 - 95% Complete)
- **models/PlannerPlan.ts**: Extended USNWRQuestionConfig interface
  - `spec_reference?: string` - Links to official USNWR metric documentation
  - `sme_status?: 'draft' | 'approved' | 'rejected'` - SME review tracking
  - `notes_for_sme?: string` - Guidance for reviewers during curation
- **Planner Integration**: All generated USNWR questions default to `sme_status: 'draft'`
- **Pending**: `--export-usnwr-questions` CLI mode for SME review workflow

### 7. Quality Assessment & Guardrails (PART 4 - 100% Complete)
- **planner/qa.ts**: Comprehensive heuristic quality assessment module
  - `assessPlanQuality()`: Evaluates plans across 5 dimensions (structure, coverage, parsimony, config readiness, fit-for-use)
  - Scoring scale: 1-5 per dimension, overall grade A/B/C/D
  - `meetsQualityThresholds()`: Identifies plans requiring review
- **Guardrails in plannerAgent.ts**:
  - HAC: Missing signal groups → error, >30 signals → parsimony warning, TBD criteria → warning
  - USNWR: Missing questions → error, >25 questions → parsimony warning, all draft → warning
  - Automatic confidence adjustment based on guardrails triggered
  - `requires_review` flag set when confidence <0.7 or quality issues detected
- **Extended PlannerPlan**: Added optional `quality` field with scores and reasoning
- **Console Output**: Quality grade displayed after plan generation

---

## 📋 HAC Rules Module

### Overview

The **HAC Rules Module** provides pediatric-adapted NHSN surveillance criteria for Hospital-Acquired Conditions. This replaces all previous "TBD" placeholders with real, structured clinical rules that include age-specific criteria, required signals, and clinical logic.

### Module Location

**File**: `hac_rules/index.ts`

### Implemented Rule Sets

The module provides 4 complete rule sets with **34 total criteria**:

1. **CLABSI** (Central Line-Associated Bloodstream Infection) - 8 criteria
   - Recognized pathogens, common commensals, multiple blood cultures
   - **Pediatric-Specific**: Neonatal TPN risk (CLABSI_PEDIATRIC_1), immunocompromised status (CLABSI_PEDIATRIC_2)

2. **CAUTI** (Catheter-Associated Urinary Tract Infection) - 9 criteria
   - Catheter presence, culture thresholds, symptom assessment
   - **Pediatric-Specific**: Age-stratified culture thresholds (≥1 year vs <1 year), verbal vs nonverbal symptom assessment

3. **VAP/VAE** (Ventilator-Associated Pneumonia/Events) - 10 criteria
   - Ventilation baseline, VAC/IVAC/PVAP cascade, oxygenation deterioration
   - **Pediatric-Specific**: Oxygenation Index (OI/OSI), neonatal lung immaturity considerations

4. **SSI** (Surgical Site Infection) - 7 criteria
   - Superficial, deep, and organ-space SSI classifications
   - **Pediatric-Specific**: Pediatric surgical procedures, healing timelines

### Criterion Structure

Each criterion follows this structure:

```typescript
interface HacRuleCriterion {
  id: string;                   // e.g., "CLABSI_INC_1", "CLABSI_PEDIATRIC_1"
  name: string;                 // Human-readable name
  description: string;          // Clinical description
  type: 'inclusion' | 'exclusion';
  age_range?: {                 // Optional age stratification
    min_days?: number;
    max_days?: number;
    label?: string;             // "neonate", "infant", "child", "adolescent"
  };
  required_signals?: string[];  // Signals needed to evaluate this criterion
  logic?: string;               // Clinical logic expression
  rationale?: string;           // Why this criterion exists
}
```

### Example: Pediatric-Specific Criterion

**CLABSI_PEDIATRIC_1: Neonatal TPN Consideration**

```typescript
{
  id: 'CLABSI_PEDIATRIC_1',
  name: 'Neonatal TPN Consideration',
  description: 'For NICU patients on total parenteral nutrition (TPN) via central line, increased vigilance for fungal CLABSI (especially Candida species)',
  type: 'inclusion',
  age_range: {
    min_days: 0,
    max_days: 90,
    label: 'neonate'
  },
  required_signals: [
    'patient_age_days',
    'tpn_status',
    'blood_culture_organism'
  ],
  logic: 'age_days <= 90 AND tpn_active = true AND fungal_organism = true',
  rationale: 'Neonates on TPN have elevated CLABSI risk, particularly for Candida. Early recognition critical for outcomes.'
}
```

### Key Pediatric Adaptations

**Age-Specific Criteria**:
- Neonates (0-90 days): TPN risk, gestational age considerations
- Infants (<1 year): Different culture thresholds for CAUTI (>10³ vs >10⁵ CFU/mL)
- Children: Verbal vs nonverbal symptom assessment for CAUTI
- All ages: Age-adjusted vital sign ranges, lab normal ranges

**Pediatric-Specific Signals Required**:
- `patient_age_days` / `patient_age_months`: Age stratification
- `patient_weight_kg`: Weight-based medication dosing
- `gestational_age`: Neonatal cases
- `tpn_status`: TPN increases fungal infection risk
- `immunocompromised_status`: Oncology/transplant patients
- `verbal_nonverbal`: Symptom assessment capability
- `oxygenation_index`: Pediatric VAP/VAE measure (OI, OSI)

### Usage in Planner

The planner automatically loads the appropriate rule set based on `concern_id`:

```typescript
import { getHacRuleSet } from '../hac_rules';

function generateHACCriteria(concernId: string): ClinicalRule[] {
  // Map concern_id to rule set
  const ruleSetMap: Record<string, 'CLABSI' | 'CAUTI' | 'VAP_VAE' | 'SSI'> = {
    'CLABSI': 'CLABSI',
    'central_line_infection': 'CLABSI',
    'CAUTI': 'CAUTI',
    'catheter_uti': 'CAUTI',
    'VAP': 'VAP_VAE',
    'VAE': 'VAP_VAE',
    'ventilator_pneumonia': 'VAP_VAE',
    'SSI': 'SSI',
    'surgical_infection': 'SSI'
  };

  const ruleSetId = ruleSetMap[concernId];
  if (!ruleSetId) {
    console.warn(`No HAC rule set found for concern: ${concernId}`);
    return [];
  }

  const ruleSet = getHacRuleSet(ruleSetId);

  // Convert HacRuleCriterion to ClinicalRule format
  return ruleSet.criteria.map(criterion => ({
    rule_id: criterion.id,
    name: criterion.name,
    description: criterion.description,
    framework: ruleSet.framework,
    logic: criterion.logic || 'See criterion description',
    required_data: criterion.required_signals || []
  }));
}
```

### Regulatory Frameworks

All rule sets are based on:
- **NHSN** (National Healthcare Safety Network) surveillance definitions
- **SPS** (Solutions for Patient Safety) collaborative practices for pediatric hospitals
- **CDC** guidelines for device-associated infections (2024-2025 criteria)

### Testing HAC Rules

To verify HAC rules are working:

```bash
# Generate a CLABSI plan for pediatric ICU
npx ts-node cli/plan.ts examples/intent_clabsi_pediatric_icu.json --mock -o /tmp/clabsi_test.json

# Check that criteria section has real rules (not TBD)
cat /tmp/clabsi_test.json | jq '.hac_config.criteria.rules[] | {id: .rule_id, name: .name}'

# Expected output: 8 CLABSI criteria including CLABSI_PEDIATRIC_1, CLABSI_PEDIATRIC_2
```

### Extending the Module

To add a new HAC rule set:

1. **Define the rule set** in `hac_rules/index.ts`:
   ```typescript
   const PRESSURE_INJURY_RULES: HacRuleSet = {
     id: 'PRESSURE_INJURY',
     version: '1.0',
     framework: 'NHSN',
     pediatric_notes: 'Includes neonatal skin maturity considerations',
     criteria: [
       {
         id: 'PI_INC_1',
         name: 'Hospital-Acquired Stage 2+ Pressure Injury',
         description: 'Pressure injury not present on admission, developed during hospital stay',
         type: 'inclusion',
         required_signals: ['admission_skin_assessment', 'daily_skin_assessment', 'pressure_injury_stage'],
         logic: 'admission_assessment = clear AND current_stage >= 2',
         rationale: 'Stage 2+ pressure injuries are reportable HACs'
       }
       // ... more criteria
     ]
   };
   ```

2. **Export getter function**:
   ```typescript
   export function getHacRuleSet(id: HacRuleSetId): HacRuleSet {
     const ruleSets: Record<HacRuleSetId, HacRuleSet> = {
       CLABSI: CLABSI_RULES,
       CAUTI: CAUTI_RULES,
       VAP_VAE: VAP_VAE_RULES,
       SSI: SSI_RULES,
       PRESSURE_INJURY: PRESSURE_INJURY_RULES  // ADD HERE
     };
     // ...
   }
   ```

3. **Update planner mapping** in `plannerAgent.ts`:
   ```typescript
   const ruleSetMap: Record<string, HacRuleSetId> = {
     // ... existing mappings
     'pressure_injury': 'PRESSURE_INJURY',
     'hospital_acquired_pressure_injury': 'PRESSURE_INJURY'
   };
   ```

### Quality Benefits

**Before HAC Rules Module**:
```json
{
  "criteria": {
    "rules": [
      {
        "rule_id": "clabsi_detection",
        "name": "CLABSI Detection",
        "logic": "TBD - requires NHSN criteria implementation"
      }
    ]
  }
}
```

**After HAC Rules Module**:
```json
{
  "criteria": {
    "rules": [
      {
        "rule_id": "CLABSI_INC_1",
        "name": "Recognized Pathogen from Single Blood Culture",
        "description": "Patient has a recognized pathogen identified from one or more blood cultures AND organism is not related to infection at another site",
        "framework": "NHSN",
        "logic": "recognized_pathogen = true AND single_blood_culture = true AND not_secondary_bsi = true",
        "required_data": ["blood_culture_organism", "blood_culture_collection_date", "other_site_cultures"]
      },
      {
        "rule_id": "CLABSI_PEDIATRIC_1",
        "name": "Neonatal TPN Consideration",
        "description": "For NICU patients on TPN via central line, increased vigilance for fungal CLABSI",
        "framework": "NHSN",
        "logic": "age_days <= 90 AND tpn_active = true AND fungal_organism = true",
        "required_data": ["patient_age_days", "tpn_status", "blood_culture_organism"]
      }
      // ... 6 more criteria
    ]
  }
}
```

### Current Status

- ✅ 4 complete HAC rule sets implemented (CLABSI, CAUTI, VAP/VAE, SSI)
- ✅ 34 total criteria with 8 pediatric-specific criteria
- ✅ Integrated into planner - no more TBD placeholders
- ✅ Age-stratified criteria for neonates, infants, children
- ✅ Required signals mapped for each criterion
- ✅ Clinical logic and rationale documented
- ✅ NHSN/SPS framework alignment

---

## 🔄 Discovery → Curation → Library Workflow

### Overview

The **Discovery → Curation → Library** pattern enables domain experts (SMEs) to build reusable, validated signal libraries for new archetype/domain combinations. This workflow is critical for pediatric-focused institutions where signal sets must be age-appropriate and clinically validated.

### Workflow Stages

```
┌─────────────┐      ┌───────────┐      ┌─────────────┐      ┌──────────────┐
│  Discovery  │  →   │ Curation  │  →   │   Library   │  →   │ Planner Uses │
│   (Auto)    │      │  (SME)    │      │  (Approved) │      │   (Runtime)  │
└─────────────┘      └───────────┘      └─────────────┘      └──────────────┘
```

#### Stage 1: Discovery (Automated)

**Purpose**: Generate initial candidate signals and phases for a new archetype/domain combination.

**Command**:
```bash
npx ts-node cli/plan.ts <input> --discover-signals
```

**Input Example** (`examples/discover_vap_nicu.json`):
```json
{
  "planning_id": "discover-vap-nicu-001",
  "review_request": "Create a VAP surveillance workflow for NICU patients"
}
```

**What Happens**:
1. Intent inference extracts `archetype` (HAC_VAP) and `domain` (nicu)
2. Discovery agent generates:
   - **Phases**: Timeline phases appropriate for VAP surveillance (baseline, intubation, ventilation, weaning, extubation)
   - **Candidate Signals**: Domain-specific signals with priority classification (core/supporting/optional)
   - **Pediatric-Specific Signals**: Automatically added for pediatric domains (age_days, weight_kg, gestational_age, TPN status, etc.)
3. Output is a structured JSON with metadata about discovery method and confidence

**Discovery Output Structure**:
```typescript
interface SignalDiscoveryOutput {
  archetype: string;              // e.g., "HAC_CLABSI"
  domain: string;                 // e.g., "pediatric_icu"
  phases: Phase[];                // Timeline phases with timing and duration
  candidate_signals: Signal[];   // Signals with priority, rationale, source hints
  metadata: {
    discovery_method: 'mock' | 'llm';
    confidence: number;
    generated_at: string;
    notes?: string;
  };
}
```

**Example Discovery Output** (abbreviated):
```json
{
  "archetype": "HAC_CLABSI",
  "domain": "pediatric_icu",
  "phases": [
    {
      "id": "baseline",
      "name": "Baseline Period",
      "description": "Clinical status before central line insertion",
      "timing": "pre_event",
      "typical_duration_days": 1
    },
    // ... more phases
  ],
  "candidate_signals": [
    {
      "id": "line_insertion_date",
      "name": "Central Line Insertion Date/Time",
      "category": "device",
      "phase_id": "line_insertion",
      "priority": "core",
      "rationale": "Essential for device-day calculation and infection window",
      "example_source_hint": "procedure notes, device tracking table"
    },
    {
      "id": "patient_age_days",
      "name": "Patient Age in Days",
      "category": "clinical",
      "phase_id": "baseline",
      "priority": "core",
      "rationale": "Pediatric-specific: age determines NHSN criteria thresholds"
    },
    {
      "id": "tpn_active",
      "name": "TPN Active (Yes/No)",
      "category": "clinical",
      "phase_id": "maintenance",
      "priority": "core",
      "rationale": "Pediatric-specific: neonates on TPN have elevated fungal CLABSI risk"
    }
    // ... more signals
  ],
  "metadata": {
    "discovery_method": "mock",
    "confidence": 0.8,
    "generated_at": "2025-01-22T10:30:00Z",
    "notes": "Pediatric domain detected, added age-specific signals"
  }
}
```

**Pediatric-Aware Discovery**:

The discovery agent automatically detects pediatric domains (based on keywords: `pediatric`, `nicu`, `picu`, `neonatal`) and adds pediatric-specific signals:

- **age_days / age_months**: Age in days/months for age-stratified criteria
- **weight_kg**: Weight for weight-based medication dosing
- **gestational_age**: For neonatal cases
- **tpn_status**: TPN increases fungal CLABSI risk in neonates
- **immunocompromised**: Oncology/transplant status
- **verbal_nonverbal**: For symptom assessment in preverbal children
- **oxygenation_index**: Pediatric-specific VAP/VAE measure

#### Stage 2: Curation (SME Review)

**Purpose**: Domain experts review, refine, and validate the discovered signals.

**Workflow**:

1. **Save Discovery Output**:
   ```bash
   # Discovery output is saved to signal_curation/ directory
   cp discovery_output.json signal_curation/HAC_CLABSI__pediatric_icu.json
   ```

2. **SME Review Tasks**:
   - ✅ **Validate Phases**: Are phases clinically meaningful? Adjust names/descriptions
   - ✅ **Remove Irrelevant Signals**: Delete signals not available in your EHR or not needed
   - ✅ **Adjust Priorities**: Mark truly essential signals as `core`, nice-to-have as `supporting`
   - ✅ **Add Missing Signals**: Include domain-specific signals the discovery agent missed
   - ✅ **Add EHR Source Hints**: Update `example_source_hint` to match your institution's data model
   - ✅ **Add Metadata**: Document curator name, date, version, and any institutional notes

3. **Curation Checklist**:
   - [ ] All `core` signals are available in our EHR
   - [ ] Phase timing aligns with our clinical workflows
   - [ ] Pediatric-specific signals are age-appropriate for our patient population
   - [ ] Signal categories are correct (device, vital, lab, micro, clinical, note)
   - [ ] No duplicate or redundant signals
   - [ ] Follow-up questions are actionable by abstractors

4. **Example Curation Changes**:
   ```diff
   // BEFORE (Discovery Output)
   {
     "id": "care_bundle_compliance",
     "name": "Central Line Bundle Compliance (daily)",
     "category": "clinical",
     "priority": "supporting"
   }

   // AFTER (SME Curated)
   {
     "id": "care_bundle_compliance",
     "name": "Central Line Bundle Compliance (daily)",
     "category": "clinical",
     "priority": "core",  // CHANGED: Our institution requires this for all device days
     "example_source_hint": "nursing flowsheets, 'Daily Goals' table in Epic"  // ADDED
   }
   ```

#### Stage 3: Library Storage (Approved Version)

**Purpose**: Store SME-approved libraries in a versioned, reusable format.

**File Naming Convention**:
```
signal_library/<archetype>__<domain>.json
```

**Examples**:
- `signal_library/HAC_CLABSI__pediatric_icu.json`
- `signal_library/HAC_CAUTI__nicu.json`
- `signal_library/HAC_VAP__pediatric_icu.json`
- `signal_library/USNWR_CARDIO_METRIC__cardiology.json`

**Required Library Metadata**:
```json
{
  "archetype": "HAC_CLABSI",
  "domain": "pediatric_icu",
  "version": "1.0.0",
  "curated_by": "Dr. Jane Smith, Pediatric Infectious Disease",
  "curated_date": "2025-01-22",
  "notes": "Curated for pediatric ICU population including neonates. Age-specific normal ranges applied for vitals and labs. TPN and immunocompromised status flagged as high-priority due to elevated risk.",
  "phases": [ /* ... */ ],
  "signals": [ /* ... */ ]
}
```

**Version Control**:
- Use semantic versioning: `major.minor.patch`
- Major version bump: Breaking changes (e.g., phase restructure)
- Minor version bump: New signals added
- Patch version bump: Metadata/description updates

#### Stage 4: Planner Integration (Runtime)

**Purpose**: Planner automatically loads curated libraries when available.

**Planned Behavior** (to be implemented):

```typescript
// In plannerAgent.ts
async function loadSignalLibrary(archetype: string, domain: string): Promise<CuratedLibrary | null> {
  const libraryPath = `signal_library/${archetype}__${domain}.json`;

  if (fs.existsSync(libraryPath)) {
    const library = JSON.parse(fs.readFileSync(libraryPath, 'utf-8'));
    console.log(`✅ Loaded curated signal library: ${archetype}__${domain} (v${library.version})`);
    return library;
  }

  console.warn(`⚠️  No curated library found for ${archetype}__${domain} - using default discovery mode`);
  return null;
}

// Usage in generateHACPlan:
const library = await loadSignalLibrary(archetype, domain);

if (library) {
  // Use curated phases and signals
  hacConfig.timeline.phases = library.phases;
  hacConfig.signals.signal_groups = convertSignalsToGroups(library.signals);
  planConfidence += 0.1; // Boost confidence for curated libraries
} else {
  // Fallback to discovery mode or generic templates
  const discovery = await discoverSignals(input, false);
  // Mark plan as requiring review
  planMetadata.requires_review = true;
  planMetadata.confidence -= 0.1;
}
```

**Guardrail**:
- If no curated library exists, planner will:
  - Set `requires_review: true`
  - Add warning: "No curated signal library found for this archetype/domain combination - plan generated using discovery mode"
  - Reduce plan confidence by 0.1

### Quick Start: Adding a New HAC

**Scenario**: You want to add **CAUTI surveillance for NICU patients**.

**Step 1: Create Intent Input**

`examples/discover_cauti_nicu.json`:
```json
{
  "planning_id": "discover-cauti-nicu-001",
  "review_request": "Create a CAUTI surveillance workflow for NICU patients using NHSN criteria"
}
```

**Step 2: Run Discovery**

```bash
npx ts-node cli/plan.ts examples/discover_cauti_nicu.json --discover-signals > signal_curation/HAC_CAUTI__nicu.json
```

**Step 3: SME Curation**

Open `signal_curation/HAC_CAUTI__nicu.json` and:
1. Review all signals - remove any not available in your EHR
2. Adjust priorities based on your institution's CAUTI surveillance protocol
3. Add neonatal-specific signals if missing (e.g., `umbilical_catheter_present` for neonates)
4. Update `example_source_hint` to match your EHR table/column names
5. Add curator metadata

**Step 4: Promote to Library**

Once SME review is complete:
```bash
mv signal_curation/HAC_CAUTI__nicu.json signal_library/HAC_CAUTI__nicu.json
```

**Step 5: Test with Planner**

```bash
# Once planner integration complete
npx ts-node cli/plan.ts examples/cauti_nicu_planning_input.json --mock

# Should see: ✅ Loaded curated signal library: HAC_CAUTI__nicu (v1.0.0)
```

### Best Practices

**For Discovery**:
- Use descriptive `review_request` text that includes domain keywords (pediatric, NICU, ICU)
- Review discovery output before curation - sometimes generic domains are inferred

**For Curation**:
- Involve clinical SMEs who perform the actual abstraction work
- Test with 2-3 real cases before finalizing
- Document institutional variations in `notes` field
- Keep signal count focused (aim for 10-20 core signals, not 50+)

**For Library Management**:
- Version libraries when making changes
- Keep old versions in `signal_library/archive/` for reference
- Document breaking changes in version notes
- Review libraries annually or when regulatory criteria change (e.g., NHSN updates)

### File Structure

```
clinical-planner-cli/
├── signal_library/           # SME-approved curated libraries
│   ├── HAC_CLABSI__pediatric_icu.json
│   ├── HAC_CAUTI__nicu.json
│   └── archive/              # Version history
├── signal_curation/          # Work-in-progress curation
│   └── HAC_VAP__picu.json
├── examples/
│   ├── discover_cauti_nicu.json
│   └── intent_clabsi_pediatric_icu.json
└── planner/
    └── discoveryAgent.ts     # Discovery logic
```

### Current Status

- ✅ Discovery agent implemented (`planner/discoveryAgent.ts`)
- ✅ `--discover-signals` CLI mode available
- ✅ Pediatric-aware signal generation working
- ✅ Example curated library created (`HAC_CLABSI__pediatric_icu.json`)
- ⏳ Planner integration pending (library loading at runtime)
- ⏳ SME curation UI (currently manual JSON editing)

---

## 🎯 Quality Assessment & Guardrails

### Overview

The **Quality Assessment & Guardrails** system ensures that generated plans meet minimum quality standards before deployment. This prevents weak or incomplete plans from being mistaken for production-ready configurations.

### Module Location

**File**: `planner/qa.ts`

### Quality Assessment Model

Plans are evaluated across **5 dimensions** on a 1-5 scale:

```typescript
interface PlanQuality {
  structure_score: number;      // 1-5: Phase quality and logical flow
  coverage_score: number;        // 1-5: Signal/question completeness
  parsimony_score: number;       // 1-5: Adherence to 20/80 principle
  config_score: number;          // 1-5: Validation errors/warnings
  fit_for_use_score: number;     // 1-5: Overall usability
  overall_grade: 'A' | 'B' | 'C' | 'D';
  reasoning?: {
    structure?: string;
    coverage?: string;
    parsimony?: string;
    config?: string;
    fit_for_use?: string;
  };
}
```

### Scoring Dimensions

#### 1. Structure Score (1-5)

**What it measures**: Phase quality and logical flow

**Scoring logic**:
- Start at 3 (baseline)
- **Deduct 1** if fewer than 3 phases (too simple)
- **Deduct 1** if phase names are generic (e.g., "Phase 1", "Phase 2")
- **Add 1** if phases have meaningful descriptions and logical timing
- **Add 1** if 4-6 phases (sweet spot for clinical workflows)

**Example**:
```typescript
// Poor structure (score: 2/5)
phases: [
  { phase_id: "phase1", display_name: "Phase 1" },
  { phase_id: "phase2", display_name: "Phase 2" }
]

// Good structure (score: 5/5)
phases: [
  {
    phase_id: "baseline",
    display_name: "Baseline Period",
    description: "Clinical status before central line insertion",
    timing: "pre_event"
  },
  {
    phase_id: "line_insertion",
    display_name: "Central Line Insertion",
    description: "Line placement procedure",
    timing: "peri_event"
  },
  // ... 2-4 more meaningful phases
]
```

#### 2. Coverage Score (1-5)

**What it measures**: Presence of required clinical signals or questions

**For HAC configs**:
- **Deduct 2** if missing device signals (e.g., line insertion date, device days)
- **Deduct 2** if missing microbiology signals (e.g., culture results, organisms)
- **Deduct 1** if missing clinical signals (e.g., vitals, symptoms)
- **Add 1** if includes pediatric-specific signals when domain is pediatric

**For USNWR configs**:
- **Deduct 2** if fewer than 3 questions
- **Deduct 1** if questions lack evidence rules
- **Deduct 1** if questions lack scoring criteria
- **Add 1** if 3-7 questions (optimal range)

**Example**:
```typescript
// Poor coverage for HAC CLABSI (score: 1/5)
signal_groups: [
  {
    group_id: "general",
    signal_types: ["patient_id", "admission_date"]
    // Missing: device signals, micro signals, clinical signals
  }
]

// Good coverage for HAC CLABSI (score: 5/5)
signal_groups: [
  {
    group_id: "device_signals",
    signal_types: ["line_insertion_date", "line_type", "device_days", "line_removal_date"]
  },
  {
    group_id: "microbiology",
    signal_types: ["blood_culture_date", "blood_culture_organism", "culture_source"]
  },
  {
    group_id: "clinical",
    signal_types: ["patient_age_days", "weight_kg", "temperature", "wbc_count"]
  },
  {
    group_id: "pediatric_specific",
    signal_types: ["tpn_status", "immunocompromised_status"]
  }
]
```

#### 3. Parsimony Score (1-5)

**What it measures**: Adherence to the 20/80 principle (high-yield signals/questions only)

**For HAC configs**:
- **Ideal**: 10-20 signal types → score +1
- **Too many**: >30 signal types → score -2
- **Too few**: <5 signal types → score -1

**For USNWR configs**:
- **Ideal**: 3-7 questions → score +1
- **Too many**: >25 questions → score -2
- **Too few**: <2 questions → score -1

**Rationale**: More is not better. Abstractors can only review so much data effectively. Focus on high-yield evidence.

**Example**:
```typescript
// Poor parsimony (score: 1/5) - 45 signal types
signal_groups: [
  { signal_types: [...30 different lab values...] },
  { signal_types: [...15 different vital signs...] }
]

// Good parsimony (score: 5/5) - 15 core signal types
signal_groups: [
  { signal_types: ["line_insertion_date", "blood_culture_date", "organism", ...12 more core signals] }
]
```

#### 4. Config Readiness Score (1-5)

**What it measures**: Technical validation status

**Scoring logic**:
- Start at 5 (perfect)
- **Deduct 2** for each validation error
- **Deduct 1** for every 2 validation warnings
- **Deduct 1** if schema validation failed
- **Deduct 1** if business rules validation failed

**Example**:
```typescript
// Poor config (score: 1/5)
validation: {
  is_valid: false,
  errors: ["Missing required field: concern_id", "Invalid archetype"],
  warnings: ["Phase timing not specified", "Signal group missing description"],
  schema_valid: false,
  business_rules_valid: false
}

// Good config (score: 5/5)
validation: {
  is_valid: true,
  errors: [],
  warnings: [],
  schema_valid: true,
  business_rules_valid: true
}
```

#### 5. Fit-for-Use Score (1-5)

**What it measures**: Overall usability and production-readiness

**Scoring logic** (weighted combination):
- **40%** Config Readiness (must be technically valid)
- **30%** Coverage (must have required clinical signals/questions)
- **20%** Structure (must have logical flow)
- **10%** Parsimony (should be focused, not overwhelming)

**Grading scale**:
- **4.5-5.0**: Grade A (production-ready)
- **3.5-4.4**: Grade B (minor tweaks needed)
- **2.5-3.4**: Grade C (moderate rework needed)
- **<2.5**: Grade D (major rework needed)

### Guardrails System

**Guardrails** are automatic checks that run during plan generation to flag quality issues.

#### HAC Guardrails

```typescript
// In generateHACPlan():

// Guardrail 1: Missing signal groups
if (signalGroups.length === 0) {
  guardrailErrors.push('HAC config missing signal groups - cannot perform surveillance without signals');
}

// Guardrail 2: Parsimony check
const totalSignalTypes = signalGroups.reduce((sum, g) => sum + (g.signal_types?.length || 0), 0);
if (totalSignalTypes > 30) {
  guardrailWarnings.push(`Signal count (${totalSignalTypes}) exceeds parsimony threshold of 30`);
}

// Guardrail 3: TBD placeholders
const hasTBD = criteria.some(c => c.logic?.includes('TBD'));
if (hasTBD) {
  guardrailWarnings.push('Some HAC criteria still have TBD logic - requires completion before deployment');
}

// Guardrail 4: Missing curated library
if (!curatedLibraryExists) {
  guardrailWarnings.push('No curated signal library found - plan generated using discovery mode');
  planConfidence -= 0.1;
}
```

#### USNWR Guardrails

```typescript
// In generateUSNWRPlan():

// Guardrail 1: Missing questions
if (usnwrQuestions.length === 0) {
  guardrailErrors.push('USNWR config missing questions - cannot perform abstraction without questions');
}

// Guardrail 2: Parsimony check
if (usnwrQuestions.length > 25) {
  guardrailWarnings.push(`Question count (${usnwrQuestions.length}) exceeds parsimony threshold of 25`);
}

// Guardrail 3: All draft status
const allDraft = usnwrQuestions.every(q => q.sme_status === 'draft');
if (allDraft && usnwrQuestions.length > 0) {
  guardrailWarnings.push('All questions are in draft status - SME review required before deployment');
}

// Guardrail 4: Missing evidence or scoring rules
const missingRules = usnwrQuestions.filter(q => !q.evidence_rules || !q.scoring_rules);
if (missingRules.length > 0) {
  guardrailWarnings.push(`${missingRules.length} questions missing evidence or scoring rules`);
}
```

#### Confidence Adjustment

Guardrails automatically adjust plan confidence:

```typescript
let planConfidence = 0.75; // Start at 75%

// Reduce for warnings
if (guardrailWarnings.length > 0) {
  planConfidence -= 0.05 * guardrailWarnings.length;
}

// Reduce more for errors
if (guardrailErrors.length > 0) {
  planConfidence -= 0.15 * guardrailErrors.length;
}

// Floor at 50%
planConfidence = Math.max(0.5, Math.min(1.0, planConfidence));

// Set requires_review flag
const requiresReview = planConfidence < 0.7 || guardrailWarnings.length > 0 || guardrailErrors.length > 0;
```

### Quality Thresholds

Plans that fail quality thresholds are flagged for review:

```typescript
export function meetsQualityThresholds(quality: PlanQuality): {
  passes: boolean;
  concerns: string[];
} {
  const concerns: string[] = [];

  // Any score <= 2 is critically low
  if (quality.structure_score <= 2) {
    concerns.push(`Structure score critically low (${quality.structure_score}/5)`);
  }
  if (quality.coverage_score <= 2) {
    concerns.push(`Coverage score critically low (${quality.coverage_score}/5)`);
  }
  if (quality.parsimony_score <= 2) {
    concerns.push(`Parsimony score critically low (${quality.parsimony_score}/5)`);
  }
  if (quality.config_score <= 2) {
    concerns.push(`Config score critically low (${quality.config_score}/5)`);
  }
  if (quality.fit_for_use_score <= 2) {
    concerns.push(`Fit-for-use score critically low (${quality.fit_for_use_score}/5)`);
  }

  // Grade below B is a concern
  if (quality.overall_grade === 'C' || quality.overall_grade === 'D') {
    concerns.push(`Overall grade ${quality.overall_grade} below acceptable threshold (B minimum)`);
  }

  return {
    passes: concerns.length === 0,
    concerns
  };
}
```

### Integration with Planner

Quality assessment runs automatically after plan generation:

```typescript
// In planHAC() / planUSNWR():

// Generate plan
const plan = createPlannerPlan(...);

// Assess quality
const quality = assessPlanQuality(plan, input);
plan.quality = quality;

// Check thresholds
const qualityCheck = meetsQualityThresholds(quality);
if (!qualityCheck.passes) {
  // Add quality concerns to validation warnings
  plan.validation.warnings.push(...qualityCheck.concerns.map(c => `Quality: ${c}`));

  // Force review for low-quality plans
  plan.plan_metadata.requires_review = true;
}

// Add grade to concerns for C/D grades
if (quality.overall_grade === 'C' || quality.overall_grade === 'D') {
  if (!plan.rationale.concerns) {
    plan.rationale.concerns = [];
  }
  plan.rationale.concerns.push(
    `Plan quality grade ${quality.overall_grade} - extensive review required before deployment`
  );
}

// Console output
console.log(`✅ HAC plan generated successfully`);
console.log(`   Quality Grade: ${quality.overall_grade} (${quality.fit_for_use_score}/5 fit-for-use)`);
```

### Example Output

**Good Quality Plan (Grade B)**:
```
✅ HAC plan generated successfully
   Quality Grade: B (4/5 fit-for-use)
   Plan ID: plan-clabsi-1763780666219
   Confidence: 75.0%
   Requires Review: No
   Validation: PASS

Quality Scores:
  Structure: 4/5 - Good phase organization
  Coverage: 5/5 - All required signal groups present
  Parsimony: 4/5 - Focused signal set (17 signals)
  Config: 5/5 - No validation errors
  Fit-for-Use: 4/5 - Minor tweaks may be needed
```

**Poor Quality Plan (Grade D)**:
```
⚠️  HAC plan generated with concerns
   Quality Grade: D (2/5 fit-for-use)
   Plan ID: plan-cauti-1763780777777
   Confidence: 55.0%
   Requires Review: YES
   Validation: WARNINGS (3)

Quality Scores:
  Structure: 2/5 - Generic phase names, no descriptions
  Coverage: 1/5 - Missing device and micro signal groups
  Parsimony: 1/5 - Too few signals (3 total)
  Config: 3/5 - 3 validation warnings
  Fit-for-Use: 2/5 - Major rework needed

Guardrail Warnings:
  - Signal count (3) below minimum threshold
  - Missing microbiology signal group
  - No curated library found for this archetype/domain

Concerns:
  - Quality: Overall grade D below acceptable threshold (B minimum)
  - Quality: Coverage score critically low (1/5)
  - Plan quality grade D - extensive review required before deployment
```

### Conservative Scoring Philosophy

**Better to flag for review than to miss quality issues.**

The scoring system is intentionally conservative:
- Default scores start at 3/5 (neutral), not 5/5
- Deductions are larger than additions
- Multiple warnings compound (don't stack linearly)
- Grade B is the minimum acceptable threshold
- Any score ≤2 triggers review

This ensures that weak plans are caught before they reach production.

### Testing Quality Assessment

To test the QA system:

```bash
# Test with a good plan
npx ts-node cli/plan.ts examples/intent_clabsi_pediatric_icu.json --mock -o /tmp/good_plan.json

# Inspect quality scores
cat /tmp/good_plan.json | jq '.quality'

# Expected: Grade B, fit_for_use_score >= 4

# Test with a minimal plan (should trigger warnings)
echo '{
  "planning_id": "minimal-test",
  "concern_id": "CAUTI",
  "archetype": "HAC_CAUTI",
  "domain": "adult_icu"
}' > /tmp/minimal_input.json

npx ts-node cli/plan.ts /tmp/minimal_input.json --mock -o /tmp/poor_plan.json

# Inspect quality scores and guardrail warnings
cat /tmp/poor_plan.json | jq '{quality, validation, requires_review: .plan_metadata.requires_review}'

# Expected: Lower grade, requires_review: true, validation warnings
```

### Current Status

- ✅ Quality assessment module implemented (`planner/qa.ts`)
- ✅ 5-dimensional scoring system with heuristics
- ✅ Guardrails integrated into HAC and USNWR plan generation
- ✅ Automatic confidence adjustment based on guardrails
- ✅ `requires_review` flag set for low-quality or low-confidence plans
- ✅ Quality grade displayed in console output
- ✅ Quality concerns added to plan validation warnings
- ✅ Conservative scoring philosophy (better to flag than to miss issues)

---

## 🚧 Remaining Implementation Work

### PRIORITY 1: Planner Agent Updates

**File**: `planner/plannerAgent.ts`

**Required Changes**:

1. **Add Graceful Fallback Logic** (top of `planHAC` function):
```typescript
import { inferPlanningMetadata, isInferenceUsable } from './intentInference';

export async function planHAC(
  input: PlanningInput,
  config: PlannerConfig = {}
): Promise<PlannerPlan> {
  // GRACEFUL FALLBACK: If review_request present but fields missing, infer them
  if (input.review_request && (!input.concern_id || !input.archetype || !input.domain)) {
    console.log(`🔮 Intent-first mode detected, inferring metadata...`);

    const inferred = await inferPlanningMetadata(input.review_request);

    if (!isInferenceUsable(inferred)) {
      throw new Error(`Unable to infer planning metadata from review_request with sufficient confidence (${(inferred.confidence * 100).toFixed(0)}%). Please provide explicit concern_id, archetype, and domain.`);
    }

    // Merge inferred values (don't overwrite explicit user values)
    if (!input.concern_id && inferred.review_target) {
      input.concern_id = inferred.review_target;
    }
    if (!input.archetype && inferred.review_template_type) {
      input.archetype = inferred.review_template_type;
    }
    if (!input.domain && inferred.clinical_domain) {
      input.domain = inferred.clinical_domain;
    }

    console.log(`   ✅ Inferred: concern_id=${input.concern_id}, archetype=${input.archetype}, domain=${input.domain}`);
  }

  // Validate we have required fields after inference
  if (!input.concern_id || !input.archetype) {
    throw new Error('Missing required fields: concern_id and archetype must be provided or inferred from review_request');
  }

  // Continue with existing dispatch logic...
  console.log(`\n🧠 Clinical Abstraction Planner`);
  // ... rest of function
}
```

2. **Update Archetype Detection** (in `isUSNWRArchetype` function):
```typescript
function isUSNWRArchetype(archetype: string): boolean {
  return archetype.startsWith('USNWR') || archetype.startsWith('USNWR_');
}

function isHACArchetype(archetype: string): boolean {
  return archetype.startsWith('HAC_') ||
         archetype === 'device_associated_infection' ||
         archetype === 'surgical_site_infection';
}
```

3. **Normalize Legacy Archetypes**:
```typescript
// Add this helper at top of module
function normalizeArchetype(archetype: string, concernId?: string): string {
  // Map legacy archetypes to new specific ones
  if (archetype === 'device_associated_infection') {
    // Try to infer specific HAC from concern_id
    if (concernId === 'CLABSI') return 'HAC_CLABSI';
    if (concernId === 'CAUTI') return 'HAC_CAUTI';
    if (concernId === 'VAP') return 'HAC_VAP';
    return 'HAC'; // fallback
  }
  if (archetype === 'surgical_site_infection') {
    return 'HAC_SSI';
  }
  return archetype; // already normalized
}
```

4. **Extend USNWR Question Generation** (in `generateUSNWRQuestions`):
```typescript
// Add cases for I21 (cardiac) and I60 (neuro)
if (metricId === 'I21') {
  questions.push({
    question_id: 'I21_Q1',
    question_text: 'Did the patient experience a cardiac complication during or within 30 days of the procedure?',
    metric_id: 'I21',
    phase_ids: ['intra_op', 'post_op_acute', 'follow_up'],
    evidence_rules: {
      signal_groups: ['outcomes', 'cardiac_specific'],
      note_types: ['operative_report', 'progress_note', 'cardiology_consult', 'discharge_summary'],
      timeframe: { lookback_days: 0, lookahead_days: 30 }
    },
    followup_questions: [
      'What was the specific cardiac complication?',
      'Was it related to the procedure?',
      'What was the timing relative to the procedure?'
    ],
    scoring_rules: {
      yes_criteria: ['Documented cardiac event', 'MI', 'Cardiac arrest', 'Arrhythmia requiring intervention'],
      no_criteria: ['No cardiac complications documented', 'Normal post-op course'],
      unable_criteria: ['Insufficient documentation', 'Lost to follow-up']
    },
    category: 'outcome',
    required: true,
    display_order: 1
  });
  // Add Q2, Q3...
}

if (metricId === 'I60') {
  questions.push({
    question_id: 'I60_Q1',
    question_text: 'Did the patient experience a neurological complication during or after the procedure?',
    metric_id: 'I60',
    phase_ids: ['intra_op', 'post_op_acute', 'follow_up'],
    evidence_rules: {
      signal_groups: ['outcomes', 'neurological_specific'],
      note_types: ['operative_report', 'progress_note', 'neurology_consult', 'discharge_summary'],
      timeframe: { lookback_days: 0, lookahead_days: 30 }
    },
    followup_questions: [
      'What was the specific neurological event?',
      'Was there imaging confirmation?',
      'What was the timing and severity?'
    ],
    scoring_rules: {
      yes_criteria: ['Documented stroke', 'Intracranial hemorrhage', 'Seizure', 'Focal neurological deficit'],
      no_criteria: ['No neurological complications', 'Normal neurological exam'],
      unable_criteria: ['Insufficient documentation']
    },
    category: 'outcome',
    required: true,
    display_order: 1
  });
  // Add Q2, Q3...
}
```

### PRIORITY 2: CLI Integration

**File**: `cli/plan.ts`

**Required Changes**:

1. **Add `--infer-intent` mode**:
```typescript
// In parseArgs():
case '--infer-intent':
  config.inferIntent = true;
  break;

// In main():
if (config.inferIntent) {
  // Load input with just review_request
  const input: any = JSON.parse(inputContent);

  if (!input.review_request) {
    throw new Error('--infer-intent mode requires review_request field in input JSON');
  }

  const inferred = await inferPlanningMetadata(input.review_request);

  console.log(`\n📋 Inferred Metadata:\n`);
  console.log(JSON.stringify({
    clinical_domain: inferred.clinical_domain,
    review_template_type: inferred.review_template_type,
    review_target: inferred.review_target,
    confidence: inferred.confidence,
    reasoning: inferred.reasoning
  }, null, 2));

  process.exit(0);
}
```

2. **Add `--prompt-preview` mode**:
```typescript
// First, extract prompt building logic in plannerAgent.ts:
export function buildPlanningPrompt(input: PlanningInput): string {
  const domainName = typeof input.domain === 'string' ? input.domain : input.domain?.name || 'general';
  const isUSNWR = isUSNWRArchetype(input.archetype || '');

  let prompt = `You are an expert clinical abstraction planner.\n\n`;
  prompt += `Task: Generate a comprehensive ${isUSNWR ? 'USNWR quality metric' : 'HAC surveillance'} configuration.\n\n`;
  prompt += `Inputs:\n`;
  prompt += `- Concern: ${input.concern_id}\n`;
  prompt += `- Domain: ${domainName}\n`;
  prompt += `- Archetype: ${input.archetype}\n\n`;

  // Add domain-specific guidance
  if (isUSNWR) {
    prompt += `Generate 3-5 abstraction questions for ${input.concern_id} that:\n`;
    prompt += `- Are specific to ${domainName} clinical context\n`;
    prompt += `- Have clear yes/no/unable scoring criteria\n`;
    prompt += `- Include evidence rules (which signals/notes to review)\n`;
  } else {
    prompt += `Generate signal groups and timeline phases for ${input.concern_id} that:\n`;
    prompt += `- Are appropriate for ${domainName} setting\n`;
    prompt += `- Cover pre-event, event, and post-event periods\n`;
    prompt += `- Include device, lab, and clinical signals\n`;
  }

  return prompt;
}

// Then in CLI:
case '--prompt-preview':
  config.promptPreview = true;
  break;

// In main():
if (config.promptPreview) {
  const input: PlanningInput = JSON.parse(inputContent);

  // Apply inference if needed
  // ... (same fallback logic as in planHAC)

  const prompt = buildPlanningPrompt(input);

  console.log(`\n📝 Generated Planning Prompt:\n`);
  console.log('='.repeat(80));
  console.log(prompt);
  console.log('='.repeat(80));

  process.exit(0);
}
```

### PRIORITY 3: Domain-Specific Signal Groups

**File**: `planner/plannerAgent.ts`

**Add Cardiac-Specific Signals**:
```typescript
function generateUSNWRSignalGroups(domain: string): any[] {
  const baseGroups = [
    // ... existing groups
  ];

  if (domain.includes('cardiac') || domain.includes('cardio')) {
    baseGroups.push({
      group_id: 'cardiac_specific',
      display_name: 'Cardiac Signals',
      description: 'Cardiac-specific measures and events',
      signal_types: [
        'cardiac_enzymes',
        'ecg_findings',
        'echocardiogram',
        'hemodynamics',
        'cardiac_events',
        'arrhythmias',
        'myocardial_infarction',
        'cardiac_arrest'
      ]
    });
  }

  if (domain.includes('neuro')) {
    baseGroups.push({
      group_id: 'neurological_specific',
      display_name: 'Neurological Signals',
      description: 'Neurological assessment and events',
      signal_types: [
        'neurological_exam',
        'glasgow_coma_scale',
        'stroke_events',
        'seizures',
        'imaging_findings',
        'focal_deficits',
        'mental_status_changes'
      ]
    });
  }

  return baseGroups;
}
```

---

## 📝 Example Generation & Critique Framework

### Example Template

Create examples in `examples/` directory with this naming pattern:
- HAC: `hac_{concern_id}_{domain}_planning_input.json`
- USNWR: `usnwr_{metric_id}_{domain}_planning_input.json`

**Example: Intent-First Input**
```json
{
  "planning_id": "intent-clabsi-pediatric-001",
  "review_request": "Create a pediatric ICU workflow for CLABSI surveillance using NHSN criteria"
}
```

**Example: Structured Input**
```json
{
  "planning_id": "structured-i21-cardio-001",
  "concern_id": "I21",
  "archetype": "USNWR_CARDIO_METRIC",
  "domain": "cardiology"
}
```

### Quality Rubric (Rate Each 1-5)

For each generated plan, assess:

1. **Plan Structure & Phasing** (1-5)
   - 5: Clear, clinically meaningful phases with logical flow
   - 3: Generic phases but usable
   - 1: No clear phasing or confusing structure

2. **Clinical Relevance** (1-5)
   - 5: Uses correct terminology, includes must-have signals/questions
   - 3: Mostly relevant but missing some key elements
   - 1: Generic, misses core clinical requirements

3. **20/80 Parsimony** (1-5)
   - 5: Focused on high-yield signals/questions, prioritized well
   - 3: Reasonable but could be more focused
   - 1: Too many low-value items, overwhelming

4. **Config Readiness** (1-5)
   - 5: Internally consistent, clear prompts, minimal validation errors
   - 3: Some issues but salvageable
   - 1: Many broken references, vague prompts

5. **Overall Fit-for-Use** (1-5)
   - 5: SME could use as-is or with minimal tweaks
   - 3: Needs moderate rework
   - 1: Would be rejected, major rework needed

### Critique Template

```markdown
## {CONCERN_ID} - {Domain} Critique

**Overall Verdict**: GOOD / MIXED / POOR (score: X/25)

### Scores
- Plan Structure: X/5
- Clinical Relevance: X/5
- Parsimony: X/5
- Config Readiness: X/5
- Fit-for-Use: X/5

### Strengths
- [Bullet point]
- [Bullet point]

### Gaps
- [Bullet point]
- [Bullet point]

### Recommended Improvements
1. [Specific, actionable change]
2. [Specific, actionable change]
3. [Specific, actionable change]
```

---

## 🎯 Improvement Backlog (Prioritized)

### HIGH PRIORITY

1. **Domain-Specific Prompt Templates**
   - **File**: Create `planner/prompts/` directory
   - **Action**: Separate prompt templates for each archetype
   - **Why**: Generic prompts produce generic configs; domain-specific templates will improve quality dramatically

2. **USNWR Question Banks**
   - **File**: `planner/questionBanks/`
   - **Action**: Curate 3-5 validated questions per common USNWR metric (I25, I21, I60, etc.)
   - **Why**: Current questions are placeholders; real clinical questions require SME input

3. **HAC Signal Refinement**
   - **File**: `plannerAgent.ts` in `generateHACSignalGroups()`
   - **Action**: Expand signal types for each HAC with pediatric vs adult variations
   - **Why**: Missing key evidence types that reviewers need (e.g., for CLABSI: TPN orders, immunosuppression status)

### MEDIUM PRIORITY

4. **Timeline Phase Templates**
   - **File**: `planner/phaseTemplates.ts`
   - **Action**: Domain-specific phase definitions with typical durations
   - **Why**: Generic phases don't guide reviewers effectively

5. **Exclusion Criteria Modeling**
   - **File**: `models/PlannerPlan.ts`
   - **Action**: Add `exclusion_criteria` array to HACConfig
   - **Why**: Critical for HAC surveillance but currently not modeled

6. **Validation Rule Enhancement**
   - **File**: `planner/validatePlan.ts`
   - **Action**: Add domain-aware validation (e.g., CLABSI must have device signals)
   - **Why**: Catch domain mismatches early

### LOW PRIORITY

7. **LLM Integration for Intent Inference**
   - **File**: `planner/intentInference.ts`
   - **Action**: Replace pattern matching with OpenAI/Anthropic API calls
   - **Why**: Better inference accuracy, but pattern matching works for common cases

---

## 🚀 Quick Start for Developers

### Test Intent-First Mode
```bash
# Create intent input
echo '{
  "planning_id": "test-intent-001",
  "review_request": "I need a CLABSI surveillance workflow for pediatric ICU"
}' > intent_test.json

# Run planner (after implementing graceful fallback)
npx ts-node cli/plan.ts intent_test.json --mock
```

### Test Inference Directly
```bash
# Create inference input
echo '{
  "review_request": "Create a workflow to review I25 orthopedic USNWR cases"
}' > infer_test.json

# Run inference mode (after implementing CLI integration)
npx ts-node cli/plan.ts infer_test.json --infer-intent
```

### Generate Prompt Preview
```bash
# After implementing --prompt-preview
npx ts-node cli/plan.ts examples/clabsi_planning_input.json --prompt-preview
```

---

## 📊 Success Metrics

When implementation is complete, verify:

- ✅ Intent-first inputs generate valid configs
- ✅ All 11 archetypes (HAC_*, USNWR_*) route correctly
- ✅ Inference confidence >70% for common phrases
- ✅ Generated configs pass validation
- ✅ Quality scores average >3.5/5 across examples
- ✅ SMEs can use configs with <30min of tweaking

---

## 🔗 Related Files

- `models/PlanningInput.ts` - Input model with review_request
- `planner/intentInference.ts` - Inference engine
- `schemas/planning-input.schema.json` - Conditional validation
- `planner/plannerAgent.ts` - Main planning logic (needs updates)
- `cli/plan.ts` - CLI interface (needs new modes)

---

**Last Updated**: January 2025
**Status**: Schema & Models Complete, Planner Integration In Progress
