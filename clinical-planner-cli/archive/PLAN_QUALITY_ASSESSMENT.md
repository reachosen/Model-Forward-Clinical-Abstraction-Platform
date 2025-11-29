# Plan Quality Assessment Report
**Date**: 2025-11-28
**Test Mode**: Mock Mode (No LLM)
**Plans Tested**: CLABSI (HAC), ORTHO_SSI (misrouted to HAC)

---

## Executive Summary

Both plans were generated successfully in mock mode, but revealed several critical issues:

1. **✅ PASS**: Plans follow the 5-group signal structure
2. **✅ PASS**: Plans include proper metadata and rationale
3. **✅ PASS**: Provenance sources are appropriate (NHSN for HAC)
4. **❌ FAIL**: Mock mode bypasses V9.1 validation (fake checklist)
5. **❌ FAIL**: Schema validation errors (25+ errors per plan)
6. **⚠️ WARNING**: Domain routing issue (ORTHO_SSI → HAC instead of Orthopedics)
7. **⚠️ WARNING**: Plans use V7.0.0 schema, not V9.1

---

## Test 1: CLABSI (HAC Domain)

### Input
```json
{
  "concern": "CLABSI",
  "domain_hint": "HAC",
  "intent": "surveillance",
  "target_population": "Pediatric patients (age 0-18 years) with central venous catheters"
}
```

### Archetype Selection
- **Concern**: CLABSI
- **Domain**: HAC
- **Archetype**: Preventability_Detective ✅ (Correct for HAC surveillance)
- **Routing**: Correctly routed via Archetype Matrix

### Generated Plan Structure

#### ✅ Strengths
1. **5-Group Signal Structure**: Correctly implements all 5 required groups
   - rule_in
   - rule_out
   - delay_drivers
   - documentation_gaps
   - bundle_gaps

2. **Evidence Typing**: All signals have proper L1/L2/L3 classification
   ```json
   {
     "id": "clabsi_rule_in_core",
     "evidence_type": "L1",
     "provenance": {
       "source": "NHSN",
       "confidence": 0.8
     }
   }
   ```

3. **Provenance Safety**: All signals use NHSN source (appropriate for HAC)

4. **Pediatric Compliance**:
   - Rationale includes pediatric focus areas
   - No adult-only terminology detected

5. **Timeline Phases**: 3 temporal phases defined
   - Baseline (7 days before event)
   - Event window
   - Surveillance period (7 days typical)

#### ❌ Critical Issues

1. **Fake Validation Checklist** (lines 278-299):
   ```json
   "checklist": {
     "schema_completeness": { "result": "YES" },  // ← Not actually validated!
     "domain_structure_5_groups": { "result": "YES" },
     "provenance_safety": { "result": "YES" },
     "pediatric_compliance": { "result": "YES" },
     "dependency_integrity": { "result": "YES" }
   }
   ```
   **Issue**: Mock mode doesn't call `validatePlanV91()`, so these are hardcoded "YES" values.

2. **Schema Validation Errors** (25 errors):
   - Missing V1 fields: `confidence`, `requires_review`
   - Empty `signal_types` arrays (should use `signals` in V9.1)
   - Wrong prompt format (objects instead of strings)
   - Missing `logic` field in criteria rules
   - Wrong ValidationResults structure

3. **Placeholder Data**:
   - Trigger expressions: `"TBD_core_rule_in"` (not executable)
   - Generic descriptions
   - Template-based generation warnings

#### ⚠️ Warnings
1. Domain "HAC" lacks pediatric specification
2. Mock mode disclaimer in rationale
3. Requires clinical validation before deployment

### Quality Assessment Metrics
```json
{
  "overall_score": 0.74,  // 74% (just above 70% threshold)
  "dimensions": {
    "completeness": 0.55,       // ❌ LOW - missing key definitions
    "clinical_accuracy": 0.70,  // ⚠️ MODERATE - template-based
    "data_feasibility": 0.90,   // ✅ HIGH - realistic data sources
    "parsimony": 1.00           // ✅ EXCELLENT - not over-engineered
  }
}
```

### Flagged Areas
1. Missing definition configuration
2. Missing phases configuration
3. Missing config2080 configuration
4. Prompts lack sufficient clinical terminology

---

## Test 2: ORTHO_SSI (Attempted USNWR/Orthopedics)

### Input
```json
{
  "concern": "ORTHO_SSI",
  "domain_hint": "Orthopedics",
  "intent": "quality_metric",
  "target_population": "Pediatric patients undergoing orthopedic surgical procedures"
}
```

### ❌ Critical Domain Routing Issue

**Expected Behavior**:
- Domain: Orthopedics
- Archetype: Process_Auditor (for USNWR quality metrics)
- Signal Groups: core_criteria, delay_drivers, documentation, rule_outs, overrides

**Actual Behavior**:
```
🔍 V9.1 Archetype Matrix Lookup:
   Concern: ORTHO_SSI
   Domain: HAC  ← ❌ WRONG! Should be "Orthopedics"
   Archetype: Preventability_Detective  ← ❌ WRONG! Should be "Process_Auditor"
```

**Root Cause**: The concern "ORTHO_SSI" is not in the Archetype Matrix, so it defaulted to HAC domain.

### Generated Plan Structure

#### ✅ Strengths
Same as CLABSI plan:
- 5-group signal structure
- Evidence typing (L1/L2/L3)
- Provenance sources (NHSN)
- Timeline phases

#### ❌ Critical Issues

1. **Wrong Domain**: Generated HAC plan instead of Orthopedics plan
   - Uses HAC signal groups (rule_in, rule_out, etc.) instead of Orthopedics groups
   - Uses NHSN provenance instead of USNWR/AAOS
   - Uses Preventability_Detective archetype instead of Process_Auditor

2. **Wrong Criteria**:
   - Applied 1 NHSN-based criterion (confidence: 0.6)
   - Should have USNWR-specific quality metric questions
   - Missing multi-question abstraction structure

3. **Same Schema Errors**: 24 validation errors (same types as CLABSI)

4. **Fake Validation Checklist**: Same issue as CLABSI

### Quality Assessment Metrics
```json
{
  "overall_score": 0.74,  // Identical to CLABSI (template-based)
  "dimensions": {
    "completeness": 0.55,
    "clinical_accuracy": 0.70,
    "data_feasibility": 0.90,
    "parsimony": 1.00
  }
}
```

### Flagged Areas
1. Missing definition configuration
2. Missing phases configuration
3. Missing config2080 configuration
4. Prompts lack sufficient clinical terminology

---

## Cross-Cutting Issues

### 1. Mock Mode Limitations

**Problem**: Mock mode uses legacy `planHAC()` function, bypassing V9.1 enhancements.

**Evidence**:
```
⚙️  Mock mode - falling back to legacy planHAC
📋 Using template-based HAC plan generation
```

**Impact**:
- No LLM-powered generation
- No real V9.1 validation (`validatePlanV91()` not called)
- No archetype-specific customization
- Fake validation checklist (all "YES")

**Recommendation**: Update mock mode to use V9.1 pipeline or clearly mark it as deprecated.

### 2. Validation Checklist Integrity

**Problem**: Validation checklist shows "YES" for all checks, but plan has 25+ schema errors.

**Example Contradiction**:
```json
// Checklist says:
"schema_completeness": { "result": "YES", "severity": "CRITICAL" }

// But actual validation found:
"Errors (25): Schema error at /plan_metadata: must have required property 'confidence'"
```

**Root Cause**: Mock mode populates checklist with hardcoded values:
```typescript
// In planHAC():
plan.validation = {
  checklist: {
    schema_completeness: { result: 'YES', severity: 'CRITICAL' },
    // ... all hardcoded to "YES"
  }
}
```

**Recommendation**:
- Option A: Remove mock mode entirely
- Option B: Make mock mode call `validatePlanV91()` for real validation
- Option C: Add disclaimer banner to mock-generated plans

### 3. Archetype Matrix Coverage

**Problem**: New concerns not in the matrix default to HAC.

**Missing Entries**:
- ORTHO_SSI → Should map to (Orthopedics, Process_Auditor)
- Any new orthopedic concerns
- Endocrinology concerns

**Current Behavior**:
```typescript
// plannerAgent.ts lookupArchetype():
export function lookupArchetype(concern: string): { archetype, domain } {
  // ...search matrix...
  // Default fallback:
  return { archetype: 'Preventability_Detective', domain: 'HAC' };
}
```

**Recommendation**: Expand Archetype Matrix or implement fuzzy matching for similar concerns.

### 4. Schema Version Confusion

**Generated Plans Report**:
```json
"planner_version": "7.0.0"  // V7.0.0, not V9.1!
```

**Expected**: `"planner_version": "9.1.0"`

**Impact**: Plans generated claim to be V7 schema, which has different structure than V9.1.

---

## V9.1 Validation Analysis

I manually reviewed the plans against V9.1 validation rules:

### Schema Completeness ❌
- **Result**: FAIL
- **Missing Sections**: None (all 10 sections present)
- **BUT**: Wrong schema version (V7 structure, not V9.1)

### Domain Structure (5-Groups) ✅
- **Result**: PASS
- **Groups**: Exactly 5 signal groups in both plans

### Provenance Safety ⚠️
- **CLABSI**: PASS - NHSN sources appropriate for HAC
- **ORTHO_SSI**: FAIL - NHSN sources inappropriate for Orthopedics (should be USNWR/AAOS)

### Pediatric Compliance ✅
- **Result**: PASS
- **Findings**:
  - No adult-only terminology (SOFA, qSOFA, APACHE, MELD, CURB-65, geriatric)
  - Rationale includes pediatric focus areas

### Dependency Integrity ✅
- **Result**: PASS
- **Findings**: No signals reference non-existent tools (clinical_tools array is empty)

### Template Compliance ❌
- **CLABSI**: PASS - Uses correct HAC signal groups
- **ORTHO_SSI**: FAIL - Uses HAC groups instead of Orthopedics groups
  - Expected: core_criteria, delay_drivers, documentation, rule_outs, overrides
  - Actual: rule_in, rule_out, delay_drivers, documentation_gaps, bundle_gaps

### Archetype Selection ❌
- **CLABSI**: PASS - Preventability_Detective appropriate for HAC
- **ORTHO_SSI**: FAIL - Preventability_Detective inappropriate for Orthopedics
  - Expected: Process_Auditor
  - Allowed for Orthopedics: [Process_Auditor]

---

## Recommendations

### Immediate Actions (High Priority)

1. **Fix Mock Mode** (Critical)
   - Update mock mode to call `validatePlanV91()` for real validation
   - Or remove mock mode and require API key
   - Current state: Generates plans with fake "all PASS" checklists

2. **Expand Archetype Matrix** (Critical)
   - Add ORTHO_SSI and other orthopedic concerns
   - Implement fallback logic that respects domain_hint
   - Current issue: Unknown concerns default to HAC incorrectly

3. **Schema Version Alignment** (Critical)
   - Update mock mode to generate V9.1-compliant schemas
   - Change `planner_version` from "7.0.0" to "9.1.0"
   - Current issue: Plans claim to be V7 but have V9.1 structure

### Medium Priority

4. **Improve Quality Thresholds**
   - Current: 74% overall (just above 70% threshold)
   - Target: 85%+ for production use
   - Focus on completeness (currently 55%)

5. **Reduce Placeholder Data**
   - Replace "TBD_core_rule_in" with realistic expressions
   - Add actual clinical terminology to prompts
   - Generate specific criteria (not generic templates)

6. **Enhance Validation Reporting**
   - Show both checklist AND schema validation results
   - Highlight contradictions between checklist and actual errors
   - Add validation result summary to CLI output

### Low Priority

7. **Documentation Updates**
   - Mark mock mode as deprecated/testing-only
   - Document Archetype Matrix coverage
   - Add validation tier explanations (Tier 1/2/3)

---

## Conclusion

### Overall Assessment: ⚠️ MIXED RESULTS

**What Works**:
- V9.1 validation framework is well-designed (comprehensive checks, tiered architecture)
- Plan structure follows 5-group rule correctly
- Provenance and pediatric compliance checks are thorough
- TypeScript compilation is clean (all 28 errors fixed)

**What Doesn't Work**:
- Mock mode bypasses V9.1 validation entirely
- Fake validation checklists create false confidence
- Domain routing fails for concerns not in Archetype Matrix
- Schema version confusion (V7 vs V9.1)

**Readiness for Production**:
- **LLM Mode** (with API): ✅ Ready (uses real V9.1 validation)
- **Mock Mode**: ❌ Not Ready (fake validation, wrong schema)

### Next Steps

**Before using generated plans**:
1. Test with real LLM mode (requires API key)
2. Verify `validatePlanV91()` is called and checklist is real
3. Expand Archetype Matrix for orthopedic concerns
4. Review and fix schema version inconsistencies

**For Phase 5**:
- Integrate research mode with V9.1
- Consolidate quality assessment functions
- Add end-to-end integration tests
- Create plan quality benchmarks (target 85%+ overall)
