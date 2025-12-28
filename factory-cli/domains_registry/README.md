# domains_registry

**Semantic Authority** for clinical metric definitions, test cases, and prompt templates.

## Purpose

This folder is the single source of truth for metric-specific artifacts. All domain knowledge lives here, organized by framework and specialty.

## Directory Structure

```
domains_registry/
├── HAC/                          # Hospital-Acquired Conditions
│   ├── _shared/                  # Shared across all HAC metrics
│   │   ├── prompts/              # Common prompt templates
│   │   ├── archetypes/           # Archetype definitions
│   │   └── definitions/          # Shared definitions
│   └── metrics/
│       └── CLABSI/
│           ├── prompts/          # Metric-specific prompts
│           ├── definitions/      # Field registry, signal groups
│           ├── signals/          # Curated signal library
│           ├── config/           # Metric configuration
│           └── tests/
│               ├── testcases/    # Battle test cases
│               └── golden/       # Golden reference sets
│
└── USNWR/                        # US News & World Report
    ├── Orthopedics/
    │   ├── _shared/              # Shared across Ortho metrics
    │   └── metrics/
    │       ├── I25/
    │       │   ├── prompts/
    │       │   ├── definitions/
    │       │   ├── signals/
    │       │   ├── config/
    │       │   ├── tests/testcases/
    │       │   ├── tests/golden/
    │       │   └── strategy/
    │       ├── I26/
    │       ├── I27/
    │       └── ...
    ├── Cardiology/
    ├── Endocrinology/
    └── ...
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

## Adding a New Metric

1. Create folder structure:
   ```bash
   mkdir -p domains_registry/USNWR/{Specialty}/metrics/{METRIC}/{prompts,definitions,signals,config,tests/testcases,tests/golden,strategy}
   ```

2. Add to `config/concern-registry.json`

3. Create definition files (field_registry, signal_groups, etc.)

4. Add prompt templates or rely on `_shared/` fallbacks
