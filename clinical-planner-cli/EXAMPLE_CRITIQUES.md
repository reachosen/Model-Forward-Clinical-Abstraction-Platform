# Generated Plan Critiques

**Date**: January 2025
**Purpose**: Quality assessment of 6 generated configurations using standardized rubric

---

## Quality Rubric (Each Attribute Rated 1-5)

1. **Plan Structure & Phasing**: Clear, clinically meaningful phases with logical flow
2. **Clinical Relevance & Coverage**: Correct terminology, includes must-have signals/questions
3. **20/80 Parsimony**: Focused on high-yield signals/questions, prioritized well
4. **Config Readiness**: Internally consistent, clear prompts, minimal validation errors
5. **Overall Fit-for-Use**: SME could use as-is or with minimal tweaks

**Scoring Scale**:
- 5: Excellent, ready for use
- 4: Good, minor tweaks needed
- 3: Acceptable, moderate rework needed
- 2: Poor, major gaps
- 1: Unacceptable, would be rejected

---

## HAC Examples

### 1. CLABSI - Pediatric ICU

**Overall Verdict**: MIXED (score: 13/25 = 52%)

#### Scores
- Plan Structure: 3/5
- Clinical Relevance: 3/5
- Parsimony: 3/5
- Config Readiness: 2/5
- Fit-for-Use: 2/5

#### Strengths
- Correctly inferred HAC_CLABSI archetype from intent
- Included essential signal groups (device, laboratory, clinical)
- Defined baseline → event → surveillance timeline phases
- System prompt appropriate for surveillance task

#### Gaps
- **Generic signal types**: "device_insertion", "blood_culture" too broad
- **Missing pediatric-specific signals**: No weight-based dosing, age-stratified vital sign thresholds
- **Incomplete microbiology signals**: No organism identification, susceptibility testing
- **TBD clinical rules**: Placeholder logic instead of NHSN criteria
- **Domain mismatch**: Inferred "adult_icu" despite "pediatric" in request (pattern matching issue)

#### Recommended Improvements
1. **Add pediatric-specific signal types**:
   - `pediatric_vital_signs` with age-stratified norms (neonate/infant/child)
   - `weight_based_medication` for antibiotic dosing validation
   - `tpn_orders` (total parenteral nutrition - high CLABSI risk)
   - `immunosuppression_status` (oncology patients)

2. **Expand microbiology signal group**:
   ```json
   {
     "group_id": "microbiology_signals",
     "signal_types": [
       "blood_culture_collection",
       "organism_identification",
       "susceptibility_testing",
       "contamination_likelihood",
       "time_to_positivity"
     ]
   }
   ```

3. **Replace TBD logic with actual NHSN criteria**:
   - Patient on central line >2 days
   - Recognized pathogen from blood culture
   - OR common commensal + matching symptoms + physician diagnosis
   - Exclusion: different source identified

---

### 2. CAUTI - Adult ICU

**Overall Verdict**: MIXED (score: 13/25 = 52%)

#### Scores
- Plan Structure: 3/5
- Clinical Relevance: 3/5
- Parsimony: 3/5
- Config Readiness: 2/5
- Fit-for-Use: 2/5

#### Strengths
- Correctly inferred HAC_CAUTI archetype
- Appropriate domain (adult_icu)
- Standard HAC timeline structure
- Includes device and laboratory signal groups

#### Gaps
- **Missing catheter-specific signals**: No catheter insertion date, catheter days, catheter type (Foley vs suprapubic)
- **Incomplete urine culture signals**: No colony count thresholds, no catheter-specimen timing
- **No urinalysis signals**: Missing WBC, bacteria, nitrites (pre-culture screening)
- **Placeholder clinical rules**: Same TBD issue as CLABSI
- **No catheter care bundle signals**: Missing prevention measures

#### Recommended Improvements
1. **Add catheter-specific signal group**:
   ```json
   {
     "group_id": "catheter_signals",
     "signal_types": [
       "catheter_insertion_date",
       "catheter_type",
       "catheter_days",
       "catheter_removal_date",
       "indication_documented",
       "daily_necessity_assessment"
     ]
   }
   ```

2. **Expand laboratory signals for CAUTI-specific criteria**:
   - `urinalysis_wbc` (>=10 WBC/hpf threshold)
   - `urine_culture_colony_count` (>=10^5 CFU/mL threshold)
   - `catheter_to_specimen_timing` (specimen within 48h of catheter)
   - `organism_type` (distinguish polymicrobial vs single organism)

3. **Add NHSN CAUTI criteria logic**:
   - Catheter in place >2 days
   - Urine culture >=10^5 CFU/mL of <=2 organisms
   - Patient has at least one symptom (fever, suprapubic tenderness, CVA tenderness, dysuria, frequency)
   - OR physician diagnosis of UTI + treatment

---

### 3. VAP - Respiratory Care

**Overall Verdict**: MIXED (score: 14/25 = 56%)

#### Scores
- Plan Structure: 3/5
- Clinical Relevance: 3/5
- Parsimony: 4/5
- Config Readiness: 2/5
- Fit-for-Use: 2/5

#### Strengths
- Structured input with comprehensive data profile
- Includes radiology data source (critical for VAP)
- Mentions VAC/IVAC/VAP progression in notes
- Higher parsimony score due to focused metadata notes

#### Gaps
- **No ventilator settings signals**: Missing PEEP, FiO2, tidal volume (needed for VAC criteria)
- **Missing ventilator-associated event (VAE) cascade**: No VAC → IVAC → VAP progression
- **Incomplete respiratory signals**: No PaO2/FiO2 ratio, no oxygenation deterioration tracking
- **No imaging interpretation**: Chest x-ray findings not structured (infiltrate, consolidation)
- **Same TBD clinical rules issue**

#### Recommended Improvements
1. **Add ventilator settings signal group** (critical for VAC detection):
   ```json
   {
     "group_id": "ventilator_settings",
     "signal_types": [
       "peep_level",
       "fio2_percent",
       "mode",
       "daily_minimum_peep",
       "daily_minimum_fio2",
       "worsening_oxygenation"
     ]
   }
   ```

2. **Implement VAE cascade structure**:
   - Phase 1: VAC (worsening oxygenation after 2+ days stability)
   - Phase 2: IVAC (abnormal temp/WBC + new antimicrobial)
   - Phase 3: Possible VAP (purulent secretions + culture) or Probable VAP (positive culture)

3. **Add imaging interpretation signal group**:
   - `new_infiltrate_present`
   - `consolidation_type` (focal vs diffuse)
   - `radiologist_interpretation`
   - `serial_imaging_comparison`

---

## USNWR Examples

### 4. I25 - Orthopedics

**Overall Verdict**: GOOD (score: 18/25 = 72%)

#### Scores
- Plan Structure: 4/5
- Clinical Relevance: 4/5
- Parsimony: 4/5
- Config Readiness: 3/5
- Fit-for-Use: 3/5

#### Strengths
- Generated 3 well-structured abstraction questions (SSI, prosthesis complications, antibiotic timing)
- Included outcome AND process measures (antibiotic prophylaxis)
- Evidence rules specify relevant note types and timeframes
- Scoring rules have clear yes/no/unable criteria
- Domain-specific signal group (orthopedic_specific) included

#### Gaps
- **Missing key I25 questions**: No pain assessment, no functional outcome (mobility/ADLs)
- **Antibiotic timing could be more specific**: Should reference SCIP measures (within 1 hour before incision, redosing if surgery >4 hours)
- **No VTE prophylaxis question**: Important for ortho surgical quality
- **Generic follow-up questions**: Could be more specific to ortho context
- **Validation warning**: No required follow-up questions defined

#### Recommended Improvements
1. **Add pain and function question (I25_Q4)**:
   ```json
   {
     "question_id": "I25_Q4",
     "question_text": "Was there adequate pain control and functional recovery at discharge?",
     "evidence_rules": {
       "signal_groups": ["outcomes", "orthopedic_specific"],
       "note_types": ["physical_therapy_note", "discharge_summary"],
       "timeframe": {"lookback_days": 0, "lookahead_days": 3}
     },
     "scoring_rules": {
       "yes_criteria": ["Pain controlled with oral meds", "Ambulating with assistive device", "PT goals met"],
       "no_criteria": ["Uncontrolled pain", "Unable to ambulate", "Readmitted for pain"],
       "unable_criteria": ["PT note missing", "Pain assessment incomplete"]
     }
   }
   ```

2. **Enhance antibiotic question (I25_Q3)** with SCIP alignment:
   - Add "redosing if surgery >4 hours" to yes_criteria
   - Add "appropriate antibiotic selection per SCIP" to yes_criteria
   - Reference specific SCIP-Inf-1 and SCIP-Inf-2 measures

3. **Add VTE prophylaxis question** (high priority for ortho surgery):
   - Mechanical or pharmacologic prophylaxis documented
   - Within 24 hours of surgery
   - Contraindications documented if not given

---

### 5. I21 - Cardiology

**Overall Verdict**: GOOD (score: 19/25 = 76%)

#### Scores
- Plan Structure: 4/5
- Clinical Relevance: 4/5
- Parsimony: 4/5
- Config Readiness: 4/5
- Fit-for-Use: 3/5

#### Strengths
- **Excellent cardiac-specific questions**: Complications, biomarkers, ECG/imaging
- **Comprehensive cardiac signal group**: Enzymes, ECG, echo, hemodynamics, arrhythmias, MI, arrest
- **Appropriate evidence rules**: Targets cardiology consults, lab reports, imaging
- **Good clinical logic**: Biomarker elevation + imaging confirmation pattern
- **Intent inference worked perfectly**: Detected I21, USNWR_CARDIO_METRIC, cardiology domain

#### Gaps
- **Missing intervention questions**: No cardiac catheterization, PCI, CABG outcomes
- **No medication assessment**: Missing antiplatelet, anticoagulation, statin compliance
- **Could add hemodynamic instability question**: Pressors, IABP, mechanical support
- **Follow-up questions could be more specific**: "What intervention was performed?" vs generic "what complication"

#### Recommended Improvements
1. **Add cardiac intervention question (I21_Q4)**:
   ```json
   {
     "question_id": "I21_Q4",
     "question_text": "Was urgent cardiac intervention required (cath, PCI, CABG)?",
     "evidence_rules": {
       "signal_groups": ["procedures", "cardiac_specific"],
       "note_types": ["cath_report", "operative_report", "cardiology_consult"],
       "timeframe": {"lookback_days": 0, "lookahead_days": 7}
     },
     "scoring_rules": {
       "yes_criteria": ["Emergent cath performed", "PCI within 90 minutes", "CABG performed"],
       "no_criteria": ["No intervention needed", "Managed medically"],
       "unable_criteria": ["Intervention timing unclear"]
     }
   }
   ```

2. **Refine biomarker question (I21_Q2)** with specific thresholds:
   - Add "troponin >99th percentile URL" to yes_criteria
   - Add "MI-specific troponin rise/fall pattern" to scoring
   - Distinguish Type 1 vs Type 2 MI criteria

3. **Add medication adherence to process measures**:
   - Aspirin on arrival (if no contraindication)
   - Statin prescribed at discharge
   - Dual antiplatelet for ACS

---

### 6. I60 - Neurology

**Overall Verdict**: GOOD (score: 18/25 = 72%)

#### Scores
- Plan Structure: 4/5
- Clinical Relevance: 4/5
- Parsimony: 4/5
- Config Readiness: 3/5
- Fit-for-Use: 3/5

#### Strengths
- **Strong neurological signal group**: Neuro exam, GCS, stroke events, seizures, imaging, deficits
- **Appropriate 3-question structure**: Event → imaging confirmation → functional decline
- **Good use of severity indicators**: GCS decline >=2 points is specific threshold
- **Intent inference successful**: Detected I60, USNWR_NEURO_METRIC, neurology domain
- **Includes transient vs persistent distinction**: Important for stroke assessment

#### Gaps
- **Missing stroke subtype classification**: Hemorrhagic vs ischemic distinction critical for I60
- **No time-to-intervention metrics**: Tissue plasminogen activator (tPA) timing for ischemic stroke
- **Missing NIH Stroke Scale (NIHSS)**: Gold standard neuro assessment tool
- **Could add rehab/discharge disposition question**: Measure functional outcomes
- **No posterior vs anterior circulation distinction**: Impacts prognosis

#### Recommended Improvements
1. **Add stroke subtype question (I60_Q4)**:
   ```json
   {
     "question_id": "I60_Q4",
     "question_text": "What type of stroke occurred (ischemic, hemorrhagic, TIA)?",
     "evidence_rules": {
       "signal_groups": ["neurological_specific", "procedures"],
       "note_types": ["ct_report", "mri_report", "neurology_consult", "stroke_team_note"],
       "timeframe": {"lookback_days": 0, "lookahead_days": 1}
     },
     "scoring_rules": {
       "yes_criteria": ["Ischemic stroke with imaging", "Hemorrhagic stroke confirmed", "TIA with symptom resolution"],
       "no_criteria": ["No stroke confirmed", "Stroke mimic"],
       "unable_criteria": ["Imaging not performed", "Conflicting interpretations"]
     },
     "category": "classification",
     "required": true
   }
   ```

2. **Enhance GCS question (I60_Q3)** with NIHSS:
   - Add "NIHSS score documented" to evidence rules
   - Add "NIHSS >=4" as severe deficit criterion
   - Add "NIHSS improvement >4 points" for recovery tracking

3. **Add intervention timing question** (critical for ischemic stroke):
   - tPA administered within 4.5 hours of symptom onset
   - Door-to-needle time <60 minutes
   - Mechanical thrombectomy if large vessel occlusion
   - Time metrics are key I60 quality measures

---

## Cross-Example Patterns

### Common Strengths Across All Examples
1. **Archetype detection working well**: All 6 examples correctly routed to HAC vs USNWR logic
2. **Intent inference 100% successful**: All 4 intent-first examples inferred correct concern_id and archetype
3. **Validation passing**: All configs passed schema and business rule validation
4. **Domain-specific signal groups**: Ortho, cardiac, neuro groups appropriately included for USNWR

### Common Weaknesses Across All Examples
1. **Placeholder clinical rules (HAC)**: All HAC configs have "TBD" logic instead of actual NHSN criteria
2. **Generic signal types**: Need more specific, actionable signal definitions (e.g., "device_insertion" → "central_line_insertion_date", "central_line_type")
3. **Missing required fields warning**: USNWR configs lack required follow-up questions
4. **No confidence thresholds in questions**: USNWR questions don't specify minimum evidence requirements
5. **Limited prompt specificity**: Task prompts are generic, don't leverage domain expertise effectively

---

## Prioritized Improvement Backlog

### HIGH PRIORITY (Blocks Production Use)

1. **Replace TBD HAC Clinical Rules with Actual NHSN Criteria**
   - **File**: `planner/plannerAgent.ts` in `generateHACPlan()`
   - **Action**: Create NHSN criteria templates for CLABSI, CAUTI, VAP, SSI
   - **Why**: Current "TBD" logic makes configs unusable for actual surveillance
   - **Estimated Effort**: Medium (requires clinical SME input)

2. **Add Domain-Specific Signal Type Libraries**
   - **File**: Create `planner/signalLibraries/`
   - **Action**: Define comprehensive signal catalogs for HAC domains (device, micro, respiratory, urinary)
   - **Why**: Generic signals like "device_insertion" aren't actionable without specific data elements
   - **Example**: `CLABSI_device_signals = ['central_line_insertion_date', 'line_type', 'insertion_site', 'dwell_days']`
   - **Estimated Effort**: High (requires data dictionary mapping)

3. **Implement VAE Cascade for VAP**
   - **File**: `planner/plannerAgent.ts` in `generateHACSignalGroups()`
   - **Action**: Add ventilator settings signal group, create VAC/IVAC/VAP phase progression
   - **Why**: Current VAP config misses critical VAE surveillance requirements
   - **Estimated Effort**: Medium

### MEDIUM PRIORITY (Improves Quality)

4. **Enhance USNWR Question Banks**
   - **File**: `planner/questionBanks/` (new directory)
   - **Action**: Curate 5-7 validated questions per common USNWR metric (I25, I21, I60, I32a)
   - **Why**: Current questions are reasonable but not validated against USNWR specs
   - **Estimated Effort**: High (requires USNWR documentation review + SME validation)

5. **Add Age-Stratified Vital Sign Thresholds for Pediatric**
   - **File**: `planner/pediatricNorms.ts` (new module)
   - **Action**: Define normal ranges for vitals, labs by age group (neonate/infant/child/adolescent)
   - **Why**: Pediatric-specific configs (CLABSI pediatric ICU) using adult norms
   - **Estimated Effort**: Medium (clinical reference data available)

6. **Improve Intent Inference for Pediatric vs Adult**
   - **File**: `planner/intentInference.ts`
   - **Action**: Prioritize "pediatric" keyword detection before generic "icu"
   - **Why**: CLABSI example incorrectly inferred "adult_icu" from "pediatric ICU" request
   - **Estimated Effort**: Low (pattern matching adjustment)

### LOW PRIORITY (Nice-to-Have)

7. **Add Exclusion Criteria Modeling**
   - **File**: `models/PlannerPlan.ts` in HACConfig
   - **Action**: Add `exclusion_criteria: string[]` field
   - **Why**: HACs have important exclusions (e.g., CLABSI excludes non-central lines)
   - **Estimated Effort**: Low (schema change + validation)

8. **Create Prompt Engineering Library**
   - **File**: `planner/prompts/` (new directory)
   - **Action**: Domain-specific prompt templates for each archetype
   - **Why**: Current prompts are generic, don't guide LLM effectively
   - **Estimated Effort**: Medium

---

## Summary Metrics

| Category | Average Score | Grade |
|----------|--------------|-------|
| HAC (CLABSI, CAUTI, VAP) | 13.3/25 = 53% | C |
| USNWR (I25, I21, I60) | 18.3/25 = 73% | B |
| **Overall** | **15.8/25 = 63%** | **C+** |

### Key Takeaway
USNWR configs score significantly higher than HAC configs primarily because:
1. USNWR questions are more concrete (answer this specific question) vs HAC surveillance (define criteria logic)
2. USNWR has domain-specific signal groups implemented (cardiac, neuro, ortho)
3. HAC configs blocked by "TBD" clinical rules placeholder issue

**Recommendation**: Prioritize HIGH PRIORITY backlog items to move HAC configs from C grade to B grade, making them production-ready.

---

**Document Version**: 1.0
**Last Updated**: January 2025
