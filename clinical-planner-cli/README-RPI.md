# HAC Planner CLI v2.0 - Research, Plan & Implement

## Overview

The HAC Planner CLI v2.0 introduces a new **Research-Plan-Implement (RPI)** workflow that generates clinical abstraction configurations grounded in authoritative sources with full provenance tracking.

### Two Workflow Modes

1. **Generate Mode (Fast)**: Quick LLM-based plan generation
2. **Research-Plan-Implement Mode (RPI)**: Full workflow with authoritative source research, quality assessment, and implementation scaffolding

## Installation

```bash
npm install
```

### Required Dependencies

- `commander`: CLI framework
- `openai`: LLM integration (optional)
- `ajv`: JSON schema validation

### Environment Variables

```bash
export OPENAI_API_KEY="your-api-key-here"
```

## Quick Start

### Research-Plan-Implement Workflow

```bash
# Full RPI workflow for CLABSI in PICU
npm run rpi:clabsi

# Custom RPI workflow
npm run planner rpi --concern CLABSI --domain picu --output-dir ./output/clabsi-picu
```

### Fast Generation Mode

```bash
# Quick generation without research
npm run generate:clabsi

# Custom generation
npm run planner generate --concern CAUTI --domain nicu --output ./plans/cauti.json
```

### Research Only

```bash
# Fetch research sources without plan generation
npm run planner research --concern CLABSI --domain picu --output ./research/clabsi-bundle.json
```

### Cache Management

```bash
# List cached research
npm run cache:list

# Refresh cache for specific concern
npm run planner cache refresh --concern CLABSI

# Clear all cache
npm run cache:clear --confirm
```

## RPI Workflow Details

### Phase 1: Research

The research phase fetches and caches authoritative sources:

**HAC Sources:**
- CDC NHSN HAC Definitions (CLABSI, CAUTI, VAP, SSI)
- CMS Hospital-Acquired Condition Reduction Program
- AHRQ Patient Safety Indicators
- SHM/SPS Prevention Bundles

**USNWR Sources:**
- U.S. News & World Report Methodology
- Domain-specific clinical guidelines

**Clinical Tools:**
- KDIGO AKI Staging (pediatric-validated)
- Schwartz eGFR Calculator
- pSOFA Score
- Growth Chart Percentiles

#### Cache Strategy

- Research results are cached indefinitely
- Cache uses SHA-256 checksums for integrity
- Manual refresh only (no auto-expiry)
- User-controlled cache management

```bash
# View cache status
npm run cache:list

# Force refresh
npm run planner rpi --concern CLABSI --force-refresh
```

### Phase 2: Plan Generation

Plan generation with research augmentation:

1. **Research-Augmented Prompts**: LLM receives full authoritative source content
2. **Provenance Tracking**: Every signal and criterion tagged with source attribution
3. **Clinical Tool Integration**: Computable calculators generate additional signals
4. **Spec Alignment**: 100% alignment with authoritative sources

#### Provenance Example

```json
{
  "signal_id": "clabsi_central_line_present",
  "provenance": {
    "source": "CDC NHSN CLABSI Definition v2025",
    "source_url": "https://www.cdc.gov/nhsn/pdfs/pscmanual/4psc_clabscurrent.pdf",
    "source_section": "Inclusion Criteria #1",
    "confidence": 0.98,
    "fetched_at": "2025-01-15T10:30:00Z"
  }
}
```

### Phase 3: Quality Assessment

Comprehensive quality scoring with 7 dimensions:

| Dimension | Threshold | Weight |
|-----------|-----------|--------|
| Research Coverage | ≥75% | 20% |
| Spec Compliance | ≥90% | 25% |
| Clinical Accuracy | ≥85% | 25% |
| Data Feasibility | ≥70% | 10% |
| Parsimony | ≥70% | 10% |
| Completeness | ≥85% | 10% |

#### Quality Gates

Plans must pass quality gates for deployment:

```typescript
{
  "quality": {
    "overall_score": 0.89,
    "quality_grade": "A",
    "deployment_ready": true,
    "quality_gates": {
      "research_coverage_pass": true,
      "spec_compliance_pass": true,
      "clinical_accuracy_pass": true,
      "deployment_ready": true
    },
    "flagged_areas": [],
    "recommendations": []
  }
}
```

Grades:
- **A (≥85%)**: Deployment ready
- **B (75-84%)**: Minor improvements needed
- **C (65-74%)**: Significant improvements needed
- **D (<65%)**: Major revision required

### Phase 4: Implementation (Coming Soon)

Future sprints will include:
- Code generation for Schema Factory
- Test suite generation
- Migration scripts
- Deployment automation

## Output Structure

### RPI Workflow Output

```
./output/clabsi-picu/
├── 01-research/
│   └── research-bundle.json      # Complete research data
└── 02-plan/
    └── planner-plan.json          # PlannerPlanV2 schema
```

### PlannerPlanV2 Schema

```typescript
{
  "plan_metadata": {
    "plan_id": "plan_clabsi_picu_20250115_a3f8d2c9",
    "plan_version": "1.0.0",
    "schema_version": "2.0.0",
    "concern": { "concern_id": "CLABSI", "concern_type": "HAC", ... },
    "workflow": { "mode": "research_plan_implement", ... },
    "status": { "deployment_status": "draft", ... }
  },
  "quality": {
    "overall_score": 0.89,
    "deployment_ready": true,
    "quality_grade": "A",
    "dimensions": { ... },
    "quality_gates": { ... }
  },
  "provenance": {
    "research_enabled": true,
    "research_bundle_id": "research_clabsi_picu_...",
    "sources": [ ... ],
    "clinical_tools": [ ... ]
  },
  "hac_config": {
    "signals": { ... },
    "criteria": { ... },
    "workflows": { ... }
  },
  "validation": { ... }
}
```

## CLI Commands Reference

### Main Command

```bash
npm run planner [command] [options]
```

### Commands

#### `rpi` (research-plan-implement)

Full RPI workflow.

```bash
npm run planner rpi --concern <id> [options]

Options:
  -c, --concern <id>       Concern ID (required): CLABSI, CAUTI, VAP, SSI, I06, etc.
  -d, --domain <domain>    Clinical domain: picu, nicu, general
  -o, --output-dir <path>  Output directory for artifacts
  --force-refresh          Force refresh cached research
  --api-key <key>          OpenAI API key
```

#### `generate`

Fast generation without research.

```bash
npm run planner generate --concern <id> [options]

Options:
  -c, --concern <id>       Concern ID (required)
  -d, --domain <domain>    Clinical domain
  -o, --output <path>      Output path for plan JSON
  --api-key <key>          OpenAI API key
  --model <model>          LLM model (default: gpt-4o-mini)
  --temperature <temp>     Temperature (default: 0.7)
```

#### `research`

Research only (no plan generation).

```bash
npm run planner research --concern <id> [options]

Options:
  -c, --concern <id>       Concern ID (required)
  -d, --domain <domain>    Clinical domain
  -o, --output <path>      Output path for research bundle
  --force-refresh          Force refresh cached data
```

#### `cache`

Cache management.

```bash
# List cache
npm run planner cache list

# Refresh specific concern
npm run planner cache refresh --concern CLABSI

# Clear all cache
npm run planner cache clear --confirm
```

## Examples

### Example 1: CLABSI in PICU with RPI

```bash
npm run planner rpi \
  --concern CLABSI \
  --domain picu \
  --output-dir ./output/clabsi-picu

# Output:
# ./output/clabsi-picu/
# ├── 01-research/research-bundle.json
# └── 02-plan/planner-plan.json
```

### Example 2: Research Only for CAUTI

```bash
npm run planner research \
  --concern CAUTI \
  --domain nicu \
  --output ./research/cauti-nicu-bundle.json
```

### Example 3: Fast Generation

```bash
npm run planner generate \
  --concern SSI \
  --domain surgical \
  --output ./plans/ssi-surgical.json
```

### Example 4: Cache Management Workflow

```bash
# Check current cache
npm run cache:list

# Refresh CLABSI research
npm run planner cache refresh --concern CLABSI

# Run RPI with fresh data
npm run rpi:clabsi
```

## Testing

### Integration Test

```bash
npm test
# or
npm run test:integration
```

The integration test validates:
1. Research phase (fetch/cache)
2. Plan generation with research
3. Quality assessment
4. Provenance tracking

### Manual Validation

```bash
# 1. Clear cache
npm run cache:clear --confirm

# 2. Run RPI workflow
npm run rpi:clabsi

# 3. Verify output
cat output/clabsi-picu/02-plan/planner-plan.json | grep -A 5 "quality"

# 4. Check cache
npm run cache:list
```

## Architecture

### Directory Structure

```
clinical-planner-cli/
├── bin/
│   └── planner.ts                    # Main CLI entry point
├── commands/
│   ├── cache.ts                      # Cache management commands
│   ├── research.ts                   # Research command
│   └── researchPlanImplement.ts      # RPI workflow command
├── models/
│   ├── PlannerPlan.ts                # Legacy plan schema
│   ├── PlannerPlanV2.ts              # New plan schema v2.0
│   ├── ResearchBundle.ts             # Research data structures
│   ├── QualityAttributes.ts          # Quality framework
│   ├── Provenance.ts                 # Provenance structures
│   └── PlanningInput.ts              # Input schema
├── research/
│   ├── researchOrchestrator.ts       # Research coordinator
│   ├── fetchers/
│   │   ├── baseFetcher.ts            # Abstract fetcher
│   │   ├── cdcNHSNFetcher.ts         # CDC NHSN HAC definitions
│   │   └── spsFetcher.ts             # SPS prevention bundles
│   ├── cache/
│   │   └── cacheManager.ts           # Persistent cache
│   └── tools/
│       ├── baseTool.ts               # Abstract clinical tool
│       └── kdigo.ts                  # KDIGO AKI staging
├── planner/
│   ├── plannerAgent.ts               # Main planning orchestrator
│   ├── researchAugmentedPlanner.ts   # Research-augmented generation
│   ├── qualityAssessment.ts          # Quality scoring
│   └── llmClient.ts                  # LLM integration
└── tests/
    └── integration/
        └── rpi-workflow.test.ts      # Integration test
```

### Key Design Patterns

1. **Orchestrator Pattern**: `ResearchOrchestrator` coordinates fetchers, cache, and tools
2. **Strategy Pattern**: Abstract `BaseFetcher` and `BaseClinicalTool` with concrete implementations
3. **Builder Pattern**: Research-augmented prompts built progressively
4. **Quality Gates**: Threshold-based validation before deployment

### Backward Compatibility

- Legacy `PlannerPlan` schema still supported
- Existing CLI commands (`npm run plan`) unchanged
- `planHAC()` function works with or without research parameter
- Optional provenance fields maintain compatibility

## Troubleshooting

### Issue: Low Research Coverage

```
⚠️ Research Coverage: 45%
```

**Solution:**
- Check network connectivity
- Verify source URLs are accessible
- Review fetcher logs for errors
- Some sources may be temporarily unavailable

### Issue: Quality Gates Failed

```
❌ Deployment Ready: NO
Flagged Areas:
- Spec compliance below 90% (current: 78%)
```

**Solution:**
- Review LLM prompt for clarity on provenance requirements
- Increase temperature slightly for more diverse signal generation
- Manually review and tag signals with provenance

### Issue: Cache Checksum Mismatch

```
❌ Cache validation failed: checksum mismatch
```

**Solution:**
```bash
# Clear and refresh cache
npm run cache:clear --confirm
npm run planner rpi --concern CLABSI --force-refresh
```

## Roadmap

### v2.1 (Q1 2025)
- [ ] Additional HAC fetchers (VAE, Falls, Pressure Ulcers)
- [ ] USNWR fetchers for all domains
- [ ] More clinical tools (Braden Scale, RASS, CAM-ICU)

### v2.2 (Q2 2025)
- [ ] Implementation phase: Code generation for Schema Factory
- [ ] Test suite generation
- [ ] Migration script generation

### v2.3 (Q3 2025)
- [ ] Web UI for RPI workflow
- [ ] Collaborative review and approval
- [ ] Version control integration

## Support

For issues or questions:
- Review logs in console output
- Check `test-output/` for diagnostic artifacts
- Verify OPENAI_API_KEY environment variable
- Ensure all dependencies installed: `npm install`

## Contributing

When adding new fetchers:
1. Extend `BaseFetcher`
2. Implement `fetch()` method
3. Register in `ResearchOrchestrator`
4. Add integration test

When adding clinical tools:
1. Extend `BaseClinicalTool`
2. Implement `calculate()` and `generateSignals()`
3. Register in `ResearchOrchestrator`
4. Include provenance in signals

## License

ISC
