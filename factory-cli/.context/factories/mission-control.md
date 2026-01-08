# MissionControl Context

**Last Updated:** 2026-01-03
**Updated By:** Claude

---

## Purpose

MissionControl orchestrates the **17 core missions** across all factories. It provides a unified CLI for executing factory operations in the correct sequence.

---

## Directory Structure

```
MissionControl/
├── mission-catalog.ts    # The 17 mission definitions
├── browse-and-run.ts     # CLI for mission execution
├── process-case.ts       # Pipeline executor for demos
└── README.md             # Mission control documentation
```

---

## The 17 Missions

| # | Mission ID | Factory | Purpose |
|---|------------|---------|---------|
| 1 | `plan:scaffold` | Planning | One-click inception roundtrip |
| 2 | `plan:generate` | Planning | Generate a plan.json manifest for a metric |
| 3 | `eval:roundtrip` | Evals | Full automated cycle: Strategy -> Gen -> Audit |
| 4 | `eval:optimize` | Evals | **(NEW)** Run agentic loop to auto-fix prompts |
| 5 | `eval:task-check` | Evals | Verify EvalTaskIndex steps are present |
| 6 | `eval:status` | Evals | Show workflow state for a metric |
| 7 | `eval:qa-scorecard` | Evals | Generate high-fidelity clinical scorecard |
| 8 | `eval:score` | Evals | Run SAFE v0 scoring on test batches |
| 9 | `eval:strategize` | Evals | Derive BatchStrategy from signal definitions |
| 10| `eval:generate` | Evals | Generate test cases from BatchStrategy |
| 11| `eval:refine` | Evals | Run single-pass refinery scorecard |
| 12| `schema:synthesize` | Schema | Compile Zod validators |
| 13| `schema:certify` | Schema | Freeze logic into certified/ |
| 14| `schema:seed` | Schema | **(NEW)** Generate Snowflake SQL seed script |
| 15| `ops:demo` | Ops | Run a clinical case through the full pipeline |
| 16| `ops:launch` | Ops | Launch a multi-metric campaign |
| 17| `ui:export` | Ops | Export UI payload for a metric + case |


---

## Mission Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           Mission Flow                                      │
│                                                                             │
│  PLANNING PHASE                                                             │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │ plan:scaffold   │ ──▶ │ plan:generate   │                               │
│  │ Inception       │     │ Generate        │                               │
│  │ roundtrip       │     │ manifest        │                               │
│  └─────────────────┘     └────────┬────────┘                               │
│                                   │                                         │
│  EVALUATION PHASE                 ▼                                         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ eval:strategize │ ──▶ │ eval:generate   │ ──▶ │ eval:refine     │       │
│  │ Derive strategy │     │ Gen test cases  │     │ Battle-test     │       │
│  └────────┬────────┘     └─────────────────┘     └────────┬────────┘       │
│           │                                               │                 │
│           ▼                      OR                       ▼                 │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ eval:roundtrip  │     │ eval:status     │     │ eval:score      │       │
│  │ Full auto-cycle │     │ Check progress  │     │ SAFE scoring    │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                          │                  │
│           ┌──────────────────────────────────────────────┘                  │
│           ▼                                                                 │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │ eval:qa-scorecard│     │ eval:task-check │                               │
│  │ Dual-Truth QA   │     │ Verify steps    │                               │
│  └─────────────────┘     └─────────────────┘                               │
│                                                                             │
│  SCHEMA PHASE                                                               │
│  ┌─────────────────┐     ┌─────────────────┐                               │
│  │ schema:synthesize│ ──▶│ schema:certify  │                               │
│  │ Compile Zod     │     │ Freeze version  │                               │
│  └─────────────────┘     └────────┬────────┘                               │
│                                   │                                         │
│  OPERATIONS PHASE                 ▼                                         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │ ops:demo        │ ──▶ │ ops:launch      │     │ ui:export       │       │
│  │ Pipeline demo   │     │ Campaign launch │     │ UI payload      │       │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mission Definitions

### plan:scaffold
**Purpose**: Initialize a new domain workspace
**Inputs**: Domain name, metric type
**Outputs**: Workspace structure in `domains_registry/`
**Command**:
```bash
npm run missions -- plan:scaffold --domain orthopedics --type USNWR
```

### plan:generate
**Purpose**: Generate metric manifest and v0 prompts
**Inputs**: Concern ID, domain
**Outputs**: v0 configs, v0 prompts in `output/`
**Command**:
```bash
npm run missions -- plan:generate --concern I25 --domain orthopedics
```

### eval:roundtrip (NEW)
**Purpose**: Full automated cycle - the "Balanced 50" approach
**Inputs**: Metric ID
**Outputs**: Derived strategy, generated cases, golden set
**Command**:
```bash
npx ts-node tools/eval-roundtrip.ts I32a
```

### eval:task-check (NEW)
**Purpose**: Verify all EvalTaskIndex steps are present
**Inputs**: Metric ID
**Outputs**: Checklist status (plan, prompts, strategy, batches/golden, SAFE, cert)
**Command**:
```bash
npx ts-node tools/eval-task-check.ts I32a
```

### eval:status
**Purpose**: Show workflow state for a metric - what exists, where to resume
**Inputs**: Metric ID
**Outputs**: QA Scorecard status
**Command**:
```bash
npx ts-node bin/planner.ts eval:status --metric I32a
```

### eval:qa-scorecard (NEW)
**Purpose**: Generate high-fidelity clinical scorecard using Dual-Truth (CR/AH) logic
**Inputs**: Metric ID, Batch ID
**Outputs**: SAFE scorecard with CR, AH, AC, DR scores
**Command**:
```bash
npx ts-node bin/planner.ts safe:score --concern I32a --batch golden_set_v2 --verbose
```

### eval:score
**Purpose**: Run SAFE v0 scoring with live pattern detection
**Inputs**: Concern ID, Batch ID
**Outputs**: SAFE evaluation results
**Command**:
```bash
npx ts-node bin/planner.ts safe:score -c I32a -b batch_1
```

### eval:strategize
**Purpose**: Derive BatchStrategy from signal definitions (test coverage)
**Inputs**: Metric manifest
**Outputs**: Batch strategy configuration
**Command**:
```bash
npx ts-node tools/derive-strategy.ts --metric I32a --plan output/plan_i32a.json
```

### eval:generate
**Purpose**: Generate test cases from strategy
**Inputs**: Batch strategy
**Outputs**: Test cases in `domains/*/tests/`
**Command**:
```bash
npm run missions -- eval:generate --concern I25 --strategy edge_cases
```

### eval:refine
**Purpose**: Run prompt refinery loop
**Inputs**: v0 prompts, test cases
**Outputs**: Optimized prompts in `certified/`
**Command**:
```bash
npm run missions -- eval:refine --concern I25 --threshold 85
```

### schema:synthesize
**Purpose**: Compile validators from certified prompts
**Inputs**: Certified artifacts
**Outputs**: Zod schemas, TypeScript types
**Command**:
```bash
npm run missions -- schema:synthesize
```

### schema:certify
**Purpose**: Freeze a versioned release
**Inputs**: Synthesized schemas
**Outputs**: Versioned release in `certified/releases/`
**Command**:
```bash
npm run missions -- schema:certify --version 1.0.0
```

### ops:demo
**Purpose**: Run full pipeline demonstration
**Inputs**: Demo case data
**Outputs**: Complete case processing
**Command**:
```bash
npm run missions -- ops:demo --case-file demo_case.json
```

### ops:launch
**Purpose**: Launch a multi-metric campaign via the Conductor
**Inputs**: Campaign manifest
**Outputs**: Running campaign
**Command**:
```bash
npx ts-node tools/conductor/cli.ts launch --manifest campaigns/usnwr_ortho_2025.json
```

### ui:export (NEW)
**Purpose**: Export UI payload for a metric + case
**Inputs**: Metric ID, Case ID, Output directory
**Outputs**: UI-ready JSON payload
**Command**:
```bash
npx ts-node bin/planner.ts ui:export -m I32a -c emily -o ./output
```

---

## Mission Catalog Implementation

```typescript
interface Mission {
  id: string;
  name: string;
  factory: 'Planning' | 'Evals' | 'Schema' | 'Ops';
  command: string;
  dependencies: string[];
  inputs: string[];
  outputs: string[];
}

const missionCatalog: Mission[] = [
  {
    id: 'plan:scaffold',
    name: 'Initialize Domain Workspace',
    factory: 'Planning',
    command: 'bin/planner.ts scaffold',
    dependencies: [],
    inputs: ['domain', 'type'],
    outputs: ['domains_registry/{domain}/']
  },
  // ... other missions
];
```

---

## Pipeline Execution

### Sequential Execution

```typescript
async function runMissionPipeline(missions: string[]): Promise<void> {
  for (const missionId of missions) {
    const mission = findMission(missionId);

    // Check dependencies
    await validateDependencies(mission);

    // Execute mission
    console.log(`Executing: ${mission.name}`);
    await executeMission(mission);

    // Validate outputs
    await validateOutputs(mission);
  }
}
```

### Full Pipeline Example

```bash
# Run entire pipeline from scratch
npm run missions:process -- --concern I25 --domain orthopedics

# This executes:
# 1. plan:scaffold (if needed)
# 2. plan:generate
# 3. eval:strategize
# 4. eval:generate
# 5. eval:refine
# 6. schema:synthesize
# 7. schema:certify
```

---

## Common Workflows

### New Metric Onboarding

```bash
# 1. Scaffold domain
npm run missions -- plan:scaffold --domain cardiology --type USNWR

# 2. Generate initial plan
npm run missions -- plan:generate --concern C01 --domain cardiology

# 3. Run evaluation pipeline
npm run missions -- eval:strategize --concern C01
npm run missions -- eval:generate --concern C01
npm run missions -- eval:refine --concern C01

# 4. Prepare for production
npm run missions -- schema:synthesize
npm run missions -- schema:certify --version 1.0.0
```

### Production Campaign

```bash
# Run demo first
npm run missions -- ops:demo --concern I25 --case demo_ortho.json

# If successful, launch campaign
npm run missions -- ops:launch --campaign q1-ortho-review
```

---

## CLI Usage

```bash
# Browse available missions
npm run missions:browse

# Run specific mission
npm run missions -- <mission-id> [options]

# Run with verbose output
npm run missions -- <mission-id> --verbose

# Dry run (no actual execution)
npm run missions -- <mission-id> --dry-run
```

---

## Related Files

- `MISSION_CONTROL.md` - Detailed mission documentation
- `process-case.ts` - Case processing pipeline
- `browse-and-run.ts` - Interactive mission browser

---

## Update Log

| Date | LLM | Change Summary |
|------|-----|----------------|
| 2026-01-03 | Claude | Updated to 15 missions: added eval:roundtrip, eval:task-check, eval:qa-scorecard, eval:score, ui:export |
| 2025-12-28 | Claude | Initial MissionControl context |
