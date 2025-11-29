# Phase 2 Complete: Archetype Unification

**Status**: ✅ COMPLETE
**Date**: 2025-11-27
**Story**: V9.1 Story 2 - Refactor Planner Agent to Unified "Archetype" Flow

---

## Summary

Phase 2 has successfully unified the planner architecture around the V9.1 Archetype Matrix pattern. All HAC/USNWR branching logic has been centralized through a single `generatePlan()` entry point that uses deterministic concern-to-archetype mapping.

---

## ✅ Completed Tasks

### 1. Archetype Matrix Implementation
**File**: `clinical-planner-cli/planner/plannerAgent.ts`

Created the Archetype Matrix lookup table with 8 concern mappings:
- CLABSI → Preventability_Detective (HAC)
- Hip Fracture/I25 → Process_Auditor (Orthopedics)
- Mortality metrics → Exclusion_Hunter (Quality)
- CAUTI → Preventability_Detective (HAC)
- Sepsis → Process_Auditor (Quality)
- Diabetes/HbA1c → Data_Scavenger (Endocrinology)
- SSI → Preventability_Detective (HAC)
- VAE → Preventability_Detective (HAC)

```typescript
const ARCHETYPE_MATRIX: ArchetypeMapping[] = [
  {
    concern: 'CLABSI',
    domain: 'HAC',
    archetype: 'Preventability_Detective',
    description: 'Central Line Associated Bloodstream Infection surveillance'
  },
  // ... 8 total mappings
];
```

### 2. Lookup Function
**File**: `clinical-planner-cli/planner/plannerAgent.ts:127-153`

Implemented `lookupArchetype()` function:
- Pattern matching support (string exact match + regex)
- Domain hint override capability
- Fallback to Preventability_Detective for unknown concerns
- Console logging for transparency

```typescript
function lookupArchetype(concern: string, domainHint?: DomainType):
  { archetype: ArchetypeType; domain: DomainType }
```

### 3. Unified Entry Point
**File**: `clinical-planner-cli/planner/plannerAgent.ts:238-267`

Created `generatePlan()` as the new V9.1 entry point:
- Replaces direct `planHAC()` calls
- Uses Archetype Matrix for routing
- Validates required V9.1 fields
- Logs archetype lookup results
- Currently delegates to `planHAC()` (Phase 3 will replace with direct LLM calls)

```typescript
export async function generatePlan(
  input: PlanningInput,
  config: PlannerConfig = {},
  research?: ResearchBundle
): Promise<PlannerPlan | PlannerPlanV2>
```

### 4. Signal Group Standardization
**File**: `clinical-planner-cli/planner/domainRouter.ts`

Fixed signal group ID inconsistencies:
- Added `ORTHO_GROUP_DEFINITIONS` (lines 71-107)
  - Fixed: 'core' → 'core_criteria'
  - Fixed: 'ruleouts' → 'rule_outs'
- Added `ENDO_GROUP_DEFINITIONS` (lines 113-150)
  - New groups: lab_evidence, external_evidence, care_gaps
- Fixed duplicate `display_name` in lab_evidence group (line 128)

### 5. Entry Point Updates

Updated all three CLI entry points to use `generatePlan()`:

**a) bin/planner.ts:23,85**
- Changed import from `planHAC` to `generatePlan`
- Added V9.1 required fields to PlanningInput
- Updated call: `await generatePlan(input, config)`

**b) cli/plan.ts:20,88**
- Changed import from `planHAC` to `generatePlan`
- Updated call with comment: `// V9.1: Use unified generatePlan entry point`

**c) commands/researchPlanImplement.ts:10,93**
- Changed import from `planHAC` to `generatePlan`
- Added V9.1 fields to PlanningInput construction
- Updated call with research bundle support

---

## 🔄 Backward Compatibility

The following functions remain in place for backward compatibility during Phase 3:
- `planHAC()` - Now called internally by `generatePlan()`
- `inferArchetype()` helper functions in entry points
- Legacy field support in PlanningInput (concern_id, archetype, domain)

These will be gradually deprecated in Phase 3.

---

## 📋 Testing Notes

All entry points now use the unified `generatePlan()` function:
1. **Fast Generation**: `npx ts-node bin/planner.ts generate --concern CLABSI`
2. **RPI Workflow**: `npx ts-node bin/planner.ts rpi --concern "Hip Fracture"`
3. **Direct CLI**: `npx ts-node cli/plan.ts <input-file>`

Expected behavior:
- Console logs should show "V9.1 Archetype Matrix Lookup" with concern/domain/archetype
- Plans should generate successfully using existing prompts
- Research bundles should pass through correctly in RPI mode

---

## 📊 Impact Analysis

**Files Modified**: 5
- `clinical-planner-cli/planner/plannerAgent.ts`
- `clinical-planner-cli/planner/domainRouter.ts`
- `clinical-planner-cli/bin/planner.ts`
- `clinical-planner-cli/cli/plan.ts`
- `clinical-planner-cli/commands/researchPlanImplement.ts`

**Lines Added**: ~150
**Lines Modified**: ~30

**Breaking Changes**: None (backward compatible)

---

## ⏭️ Next Steps (Phase 3)

Phase 3 will implement V9.1 prompt loading and generation:

1. **Remove normalizeHacConfig()** - Generate V9.1 JSON directly from LLM
2. **Update LLM calls** - Use plannerPrompt_v9.1.md
3. **Implement strict parsing** - Zod schemas for V9.1 validation
4. **Deprecate planHAC()** - Move logic directly into generatePlan()
5. **Tool integration** - Link signals to clinical tools

---

## 📝 Notes

- All TypeScript compilation should work (no new errors introduced)
- The Archetype Matrix is hardcoded but can be externalized to JSON if needed
- Domain hint override allows testing different domain assignments
- Signal group templates now correctly match V9.1 specification
- Entry points properly populate both legacy and V9.1 fields during transition

---

**Phase 2 Deliverables**: ✅ All Complete
**Ready for Testing**: ✅ Yes
**Ready for Phase 3**: ✅ Yes
