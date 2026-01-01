# domains_registry

**Single Source of Truth** for domain knowledge, metric definitions, prompts, and test cases.

## Purpose

This folder is the canonical source for all domain-specific artifacts. Both PlanningFactory and EvalsFactory read from here.

## Directory Structure

```
domains_registry/
├── _archive/                     # Archived golden content for validation
│   └── USNWR/Orthopedics/2025-12-30/
│
├── HAC/                          # Hospital-Acquired Conditions
│   ├── _shared/
│   │   └── prompts/              # Common prompt templates
│   └── metrics/CLABSI/
│
└── USNWR/                        # US News & World Report
    └── Orthopedics/
        ├── _shared/              # Domain-level (OrthoPacket)
        │   ├── metrics.json      # Per-metric config + archetypes (from Gemini)
        │   ├── signals.json      # Domain-wide signal library (from Gemini)
        │   ├── priority.json     # Review priorities (from Gemini)
        │   └── prompts/          # Shared prompt templates
        │
        └── metrics/
            └── I25/
                ├── prompts/      # Metric-specific prompts (optional)
                ├── definitions/  # Derived from _shared/
                │   ├── signal_groups.json
                │   └── review_rules.json
                └── tests/testcases/
```

## Path Resolution

Use `Paths.*` helpers from `utils/pathConfig.ts`:

```typescript
import { Paths, resolveMetricPath } from '../utils/pathConfig';

// Resolve I25 to its domain path
const metricPath = resolveMetricPath('I25');
// => { framework: 'USNWR', specialty: 'Orthopedics', metric: 'I25' }

// Get paths
Paths.metricTestcases(metricPath);  // → domains_registry/USNWR/Orthopedics/metrics/I25/tests/testcases
Paths.metricPrompts(metricPath);    // → domains_registry/USNWR/Orthopedics/metrics/I25/prompts
```

## Template Fallback Chain

When loading prompt templates, the system searches in order:
1. **Metric-specific**: `metrics/I25/prompts/{template}.md`
2. **Specialty shared**: `Orthopedics/_shared/prompts/{template}.md`
3. **Framework shared**: `USNWR/_shared/prompts/{template}.md`

## Key Files

| File | Purpose |
|------|---------|
| `field_registry.json` | Valid signal field definitions |
| `signal_groups.json` | Signal groupings for validation |
| `metric_thresholds.json` | Pass/fail thresholds |
| `exclusion_criteria.json` | Metric exclusion rules |
| `review_rules.json` | Review trigger conditions |

## Adding a New Specialty

1. Run Gemini deep research prompt (see `.context/reference/domains-registry.md`)

2. Place output in `_shared/`:
   ```bash
   mkdir -p domains_registry/USNWR/{Specialty}/_shared
   # Add: metrics.json, signals.json, priority.json
   ```

3. Derive definitions:
   ```bash
   npm run plan:derive -- --domain {Specialty}
   ```

4. Add prompts to `_shared/prompts/` or per-metric `prompts/`

## Adding a New Metric

1. Add metric to `_shared/metrics.json` and `_shared/signals.json`

2. Derive definitions:
   ```bash
   npm run plan:derive -- --metric {MetricId}
   ```

3. Add metric-specific prompts if needed (optional - falls back to `_shared/`)

## Commands

```bash
# Derive definitions from _shared/
npm run plan:derive -- --domain Orthopedics
npm run plan:derive -- --metric I32a --force

# Compare against archive
npm run plan:derive -- --domain Orthopedics --compare-archive
```

## More Documentation

See `.context/reference/domains-registry.md` for detailed workflow.
