# PlanningFactory

The S0-S6 orchestration pipeline for clinical abstraction. Leverages deep research on metrics and signals for a domain area to produce:

- **Structured Abstraction Plans** - Domain-aware clinical review workflows
- **Prompts for EvalsFactory** - Battle-tested task prompts for evaluation
- **Schema for SchemaFactory** - ConfigDB seeds and API contracts
- **UI Artifacts for UI Factory** - Dynamic form configurations

## Pipeline Stages

```
S0 → S1 → S2 → S3 → S4 → S5 → S6
│    │    │    │    │    │    │
│    │    │    │    │    │    └── Plan Assembly
│    │    │    │    │    └── Task Execution (LLM calls)
│    │    │    │    └── Prompt Plan Generation
│    │    │    └── Task Graph Identification
│    │    └── Structural Skeleton
│    └── Domain Resolution
└── Input Normalization
```

## Directory Structure

```
PlanningFactory/
├── planner/              # Plan generation entrypoint
│   ├── planGen.ts        # Main generatePlan() function
│   ├── validateV91.ts    # 3-tier validation
│   ├── domainRouter.ts   # HAC/USNWR routing
│   ├── qualityAssessment.ts
│   └── ...
├── stages/               # S0-S6 pipeline stages
│   ├── S0_InputNormalization.ts
│   ├── S1_DomainResolution.ts
│   ├── S2_StructuralSkeleton.ts
│   ├── S3_TaskGraphIdentification.ts
│   ├── S4_PromptPlanGeneration.ts
│   ├── S5_TaskExecution.ts
│   └── S6_PlanAssembly.ts
├── prompts/              # Task prompt builders
│   ├── signalEnrichment.ts
│   ├── eventSummary.ts
│   ├── followupQuestions.ts
│   └── multiArchetypeSynthesis.ts
├── validators/           # Context-aware validation
│   └── ContextAwareValidation.ts
├── config/               # Runtime configuration
│   ├── prompts.json      # Prompt templates
│   └── taskConfig.ts     # Task definitions
├── schemas/              # Output schemas (Zod)
├── utils/                # Helpers (promptBuilder, scenarioCache)
└── types.ts              # Core type definitions
```

## Quick Start

```bash
# Generate a plan for a concern
npx ts-node bin/planner.ts generate --concern I25

# With specific domain
npx ts-node bin/planner.ts generate --concern I25 --domain orthopedics
```

## Key Concepts

### Archetypes
Analytical lenses that shape how plans are structured:
- `Process_Auditor` - Protocol compliance focus
- `Preventability_Detective` - Root cause analysis
- `Exclusion_Hunter` - Inclusion/exclusion criteria

### Task Types
Individual extraction tasks within a plan:
- `signal_enrichment` - Extract clinical signals
- `event_summary` - Summarize clinical events
- `followup_questions` - Generate clarifying questions
- `multi_archetype_synthesis` - Combine archetype perspectives

### Quality Gates
3-tier validation ensuring output quality:
1. **Tier 1 (Critical)**: Structural correctness
2. **Tier 2 (High)**: Semantic correctness
3. **Tier 3 (Medium)**: Clinical quality

## Pipeline Position

```
┌─────────────────────────────────────────┐
│            PlanningFactory              │
│  (Deep research → Structured artifacts) │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            EvalsFactory                 │
│    (Battle test → Certification)        │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            certified/                   │
│          (Handoff zone)                 │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│           SchemaFactory                 │
│  (DB schemas, ConfigDB, API contracts)  │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│            UI Factory                   │
│   (Dynamic clinical review UI)          │
└─────────────────────────────────────────┘
```

## Related

- `EvalsFactory/` - Downstream evaluation and certification
- `domains_registry/` - Metric definitions, signals, and test cases
- `models/` - Data models (PlannerPlan, PlanningInput)
- `certified/` - Blessed artifacts ready for downstream consumption
