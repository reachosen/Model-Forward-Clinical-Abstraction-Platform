# Flywheel Prompt Refinery

This directory contains the autonomous prompt engineering system for the I25 Clinical Metric.

## Quick Start (Windows)

### 1. Resume Optimization Loop
Run this command to pick up where you left off. It will load the latest prompt version and optimize against the current Golden Set.
```bash
npx ts-node flywheel/optimizer/loop.ts
```

### 2. Level Up (Find Harder Cases)
When your score consistently hits >90%, run this to mine the full test batch for new failures and replace the Golden Set.
```bash
npx ts-node flywheel/optimizer/golden_upgrade.ts
```

## Directory Structure

- **`optimizer/`**: The core logic (`loop.ts`, `golden_upgrade.ts`).
- **`dataset/`**: Test case generation (`core.ts`, `plan.ts`, `generate.ts`).
- **`validation/`**: Validation engine (`runner.ts`, `checks.ts`).

## Data & Logs

- **Prompt History:** `../data/flywheel/prompts/prompt_history_lean.json` (All versions & scores)
- **Reports:** `../data/flywheel/reports/refinery/` (Detailed JSON reports per run)
- **Golden Set:** `../data/flywheel/testcases/golden_set.json` (The current active test set)