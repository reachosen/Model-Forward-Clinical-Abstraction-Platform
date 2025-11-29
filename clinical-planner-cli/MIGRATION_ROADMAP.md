# CPPO Migration Roadmap

**Goal**: Transition from monolithic planner to Clinical Progressive Plan Orchestrator (CPPO) without breaking existing workflows.

**Anti-Goal**: Avoid confusion from having two planning systems in production.

---

## Phase 1: Dual Mode (Development) - Weeks 1-4

### What Gets Built
- ✅ New folder structure: `lib/orchestrator/`, `prompts/`, `eval/`
- ✅ CPPO interfaces: MetaOrchestrator, TaskGraph, PromptPlan, StageContext
- ✅ Stage 0-7 implementations (scaffolding)
- ✅ Example flows: Orthopedics (I25), Endocrinology (C35)
- ✅ Eval mode + test datasets

### CLI Commands
```bash
# Legacy (stays working)
planner plan --input i25_input.json

# New CPPO (experimental)
planner cppo-plan --input i25_input.json

# Eval mode (new)
planner cppo-eval --task ortho.process_auditor.summary_20_80 \
                   --prompt-version v3 \
                   --dataset ortho_v1
```

### File Structure During This Phase
```
clinical-planner-cli/
├── cli/
│   ├── plan.ts              ← LEGACY (kept)
│   ├── cppo-plan.ts         ← NEW
│   └── cppo-eval.ts         ← NEW
├── planner/                 ← LEGACY (kept, untouched)
│   ├── plannerAgent.ts
│   ├── llmPlanGeneration.ts
│   └── ...
├── lib/                     ← NEW CPPO CODE
│   └── orchestrator/
│       ├── MetaOrchestrator.ts
│       ├── stages/
│       └── tasks/
└── prompts/                 ← NEW
    └── registry.ts
```

### Success Criteria
- [ ] CPPO passes all legacy planner tests
- [ ] run_manifest.json provides actionable debugging info
- [ ] Eval mode shows measurable prompt improvements
- [ ] Team can run both systems side-by-side

---

## Phase 2: Feature Parity + Performance (Weeks 5-6)

### Goals
- CPPO matches legacy in quality AND speed
- No regressions on existing test cases
- Team prefers CPPO for new work

### Validation
```bash
# Run both planners on same inputs, compare outputs
npm run test:parity

# Benchmark performance
npm run benchmark:cppo-vs-legacy
```

### Acceptance Criteria
- [ ] CPPO ≤ 10% slower than legacy (median latency)
- [ ] CPPO passes 100% of legacy integration tests
- [ ] CPPO produces semantically equivalent plans (validated by external reviewers)
- [ ] run_manifest.json proves useful in ≥3 real debugging scenarios

---

## Phase 3: Deprecation Warning (Week 7)

### What Changes
- Update CLI help text:
  ```
  Commands:
    plan          [DEPRECATED] Legacy planner (use cppo-plan)
    cppo-plan     Generate clinical abstraction plan (recommended)
    cppo-eval     A/B test prompts on evaluation datasets
  ```

- Add deprecation notice to `cli/plan.ts`:
  ```typescript
  console.warn('⚠️  WARNING: Legacy planner is deprecated.');
  console.warn('   Use `planner cppo-plan` instead.');
  console.warn('   Legacy planner will be removed in v3.0.0');
  ```

- Update README.md to recommend CPPO

### Communication
- Email team: "CPPO is now the default, legacy planner will be removed in 2 weeks"
- Document migration guide for any custom scripts

---

## Phase 4: REMOVAL (Week 8-9) ⚠️ BREAKING CHANGE

### Files to DELETE
```bash
# Remove legacy planner code
rm -rf planner/plannerAgent.ts
rm -rf planner/llmPlanGeneration.ts
rm -rf planner/researchAugmentedPlanner.ts
rm -rf cli/plan.ts

# Keep modules that CPPO reuses
# ✅ planner/domainRouter.ts      → Used by Stage 2
# ✅ planner/intentInference.ts   → Used by Stage 0
# ✅ planner/validatePlan.ts      → Used by Stage 6
# ✅ planner/llmClient.ts         → Used by Stage 5
```

### Rename Commands (Make CPPO Default)
```bash
# Before:
planner cppo-plan --input ...
planner cppo-eval --task ...

# After:
planner plan --input ...      ← Now uses CPPO!
planner eval --task ...       ← Eval mode promoted
```

### Update Entry Point (`bin/planner.ts`)
```typescript
// Remove:
import { plan as legacyPlan } from '../cli/plan';

// Rename:
import { cppoPlan } from '../cli/cppo-plan';
// to:
import { plan } from '../cli/plan'; // <- CPPO is now "plan"
```

### Breaking Change Checklist
- [ ] Update package.json version: `2.x.x` → `3.0.0`
- [ ] Update CHANGELOG.md with migration notes
- [ ] Archive legacy code in `archive/legacy-planner/` (for reference)
- [ ] Update all documentation/examples to use CPPO commands
- [ ] Remove deprecation warnings (CPPO is now the default)

---

## Phase 5: Cleanup (Week 10+)

### Simplify Folder Structure
```
clinical-planner-cli/
├── cli/
│   ├── plan.ts              ← CPPO (was cppo-plan.ts)
│   └── eval.ts              ← Eval mode (was cppo-eval.ts)
├── orchestrator/            ← Renamed from lib/orchestrator
│   ├── MetaOrchestrator.ts
│   ├── stages/
│   └── tasks/
├── prompts/
│   └── registry.ts
├── validation/              ← Kept from legacy (reused)
│   ├── validatePlan.ts
│   └── validateV91.ts
├── domain/                  ← Kept from legacy (reused)
│   ├── domainRouter.ts
│   └── intentInference.ts
└── models/                  ← Shared models
```

### Delete Archive (After 30 Days)
```bash
# Only after confirming no one needs legacy code
rm -rf archive/legacy-planner/
```

---

## Rollback Plan (If CPPO Fails)

**If critical issues found in Phase 2-3:**

1. Revert CLI commands to default to legacy:
   ```typescript
   // bin/planner.ts
   program
     .command('plan')
     .description('Generate plan (using legacy - CPPO disabled due to issue #XYZ)')
     .action(legacyPlan);
   ```

2. File GitHub issue with details
3. Fix CPPO bugs, re-test
4. Resume migration once stable

**Point of No Return**: Phase 4 (deletion)
- Before deleting legacy code, ensure CPPO has been stable for ≥2 weeks in production

---

## Decision Log

### Decision 1: Dual Mode Duration
**Question**: How long to run both systems?
**Answer**: 6-7 weeks (Phases 1-2)
**Rationale**: Enough time to catch edge cases, but not so long we maintain two systems forever

### Decision 2: Archive vs Delete Legacy Code
**Question**: Keep legacy code in archive/ or delete completely?
**Answer**: Archive for 30 days, then delete
**Rationale**: Safety net for unexpected issues, but force team to move forward

### Decision 3: Breaking Change Version
**Question**: 2.x → 3.0.0 or 2.x → 2.y?
**Answer**: 3.0.0 (major bump)
**Rationale**: Removing CLI commands is a breaking change per semver

---

## Removal Reminder

**TO AVOID CONFUSION:**
- ⚠️ Do NOT ship v3.0.0 with both `plan` and `cppo-plan` commands
- ⚠️ Do NOT leave dead code in `planner/` after Phase 4
- ⚠️ Do NOT keep deprecation warnings after legacy is removed

**Clean cut approach:**
- v2.x: Legacy is default, CPPO is experimental (`cppo-plan`)
- v3.0.0: CPPO is default (`plan`), legacy is DELETED

---

## Timeline Summary

| Phase | Duration | Status | Deliverable |
|-------|----------|--------|-------------|
| 1. Dual Mode | Weeks 1-4 | 🔜 Next | CPPO working alongside legacy |
| 2. Feature Parity | Weeks 5-6 | ⏳ Pending | CPPO matches legacy quality/speed |
| 3. Deprecation | Week 7 | ⏳ Pending | Warning added to legacy commands |
| 4. REMOVAL | Weeks 8-9 | ⏳ Pending | Legacy planner DELETED |
| 5. Cleanup | Week 10+ | ⏳ Pending | Simplified folder structure |

**Current Phase**: 1 (Dual Mode - Design)
**Next Milestone**: User Stories + Architecture Design → Folder Structure → Implementation

