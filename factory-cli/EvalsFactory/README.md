# EvalsFactory

The evaluation and prompt optimization system for clinical metrics. Part of the PromptBattleTestFlywheel pipeline.

## Directory Structure

```
EvalsFactory/
├── adapters/          # Input adapters for test data
├── dataset/           # Test case generation
│   ├── core.ts        # Generator core logic
│   ├── generate.ts    # CLI for generating test cases
│   └── BatchStrategy.ts
├── graders/           # Evaluation graders (Signal, Summary, Safety, Schema)
├── generation/        # Test case generation utilities
├── optimizer/         # Prompt optimization loop
│   ├── loop.ts        # Main optimization loop
│   └── golden_upgrade.ts
├── refinery/          # Prompt refinery system
│   ├── adapters/      # Stage adapters
│   ├── config/        # Refinery configuration
│   ├── evaluators/    # SAFE evaluators
│   ├── loaders/       # Dataset loaders
│   ├── observation/   # Observation hooks and metrics
│   └── runners/       # Refinery runners
├── reporting/         # Report generation
├── strategies/        # Evaluation strategies
├── testcases/         # Legacy test case location
└── validation/        # Validation engine
    ├── engine.ts      # Main eval engine
    ├── runner.ts      # Batch runner
    ├── checks.ts      # Validation checks
    ├── safeScorer.ts  # SAFE v0 scoring
    └── safeReporter.ts
```

## Quick Start

### Run SAFE Evaluation

```bash
# Score I25 batch (uses domain path automatically)
npx ts-node bin/planner.ts safe:score --concern I25 --batch "batch_1"

# With explicit test directory
npx ts-node bin/planner.ts safe:score -c I25 -b batch_1 -t ./domains/USNWR/Orthopedics/metrics/I25/tests/testcases
```

### Generate Test Cases

```bash
# List available strategies
npx ts-node EvalsFactory/dataset/generate.ts list

# Generate tests for a metric
npx ts-node EvalsFactory/dataset/generate.ts run I25
```

### Run Optimization Loop (Flywheel)

```bash
# Official Mission Control command
npm run missions -- run eval:optimize --metric I25

# Or direct execution
npx ts-node EvalsFactory/optimizer/loop.ts --metric I25
```

## Data Locations (Domain-Based)

Test cases are stored in the domain hierarchy:
```
domains/{FRAMEWORK}/{SPECIALTY}/metrics/{METRIC}/tests/testcases/
```

Example for I25:
```
domains/USNWR/Orthopedics/metrics/I25/tests/testcases/batch_1.json
```

## Legacy Support

The `Paths.legacy.*` helpers provide backward compatibility during migration.
