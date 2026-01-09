# Factory CLI Context Index

**Last Updated:** 2026-01-03
**Updated By:** Claude

---

## Session Protocol

**Start:** `Read .context/INDEX.md, then load files relevant to my task.`

**End:** `What should we add to .context/ based on today's work?`

---

## How to Use This Context System

1. **Start here** - Read this index first
2. **Load relevant sections** - Only read what you need for your task
3. **Update as you go** - Add learnings to appropriate files
4. **Flag your changes** - Mark updates with `[LLM-NAME | DATE]` tag

---

## Quick Navigation

### For New Tasks
| Task Type | Start Here |
|-----------|------------|
| Understanding architecture | `architecture/system-overview.md` |
| Coding style & conventions | `global/style-guide.md` |
| **Metric Onboarding (Certify)** | `reference/domains-registry.md` |
| Factory-specific work | `factories/[factory-name].md` |
| Common code patterns | `reference/api-patterns.md` |
| Domain/business logic | `reference/domain-models.md` |

### By Factory
| Factory | Context File | Purpose |
|---------|--------------|---------|
| **PlanningFactory** | `factories/planning-factory.md` | S0-S6 pipeline, plan generation |
| **EvalsFactory** | `factories/evals-factory.md` | SAFE evaluation, QA scorecard, prompt optimization |
| **SchemaFactory** | `factories/schema-factory.md` | DB schemas, ConfigDB seeding |
| **MissionControl** | `factories/mission-control.md` | 15-mission orchestration |

### Quick Commands
| Task | Command |
|------|---------|
| **Full Eval Roundtrip** | `npx ts-node bin/planner.ts eval:roundtrip --metric I32a` |
| **Check eval status** | `npx ts-node bin/planner.ts eval:status --metric I32a` |
| **Run QA Scorecard** | `npx ts-node bin/planner.ts safe:score -c I32a -b golden_set_v2 --verbose` |
| **Re-run subset** | `npx ts-node bin/planner.ts safe:score -c I32a -b "*" --cases test-001,test-002` |
| **Scaffold new metric** | `npx ts-node tools/scaffold.ts --domain Cardiology --metric C01` |
| **UI Export** | `npx ts-node bin/planner.ts ui:export -m I32a -c emily -o ./output` |

### By Topic
| Topic | File |
|-------|------|
| Four-factory architecture | `architecture/system-overview.md` |
| Factory pattern implementation | `architecture/factory-pattern.md` |
| Data flow between factories | `architecture/data-flow.md` |
| Coding conventions | `global/style-guide.md` |
| Planning before coding | `global/workflow.md` |
| LLM usage rules | `global/llm-instructions.md` |
| Reusable code templates | `reference/api-patterns.md` |
| Key dependencies | `reference/dependencies.md` |
| Business domain models | `reference/domain-models.md` |
| **Adding new specialties** | `reference/domains-registry.md` |

---

## Directory Structure

```
.context/
├── INDEX.md                      # This file - master navigation
├── global/
│   ├── style-guide.md           # Coding preferences & conventions
│   ├── workflow.md              # "Plan before doing" rule
│   └── llm-instructions.md      # How LLMs should use this system
├── architecture/
│   ├── system-overview.md       # High-level four-factory architecture
│   ├── factory-pattern.md       # Factory pattern implementation
│   └── data-flow.md             # How data moves through system
├── factories/
│   ├── planning-factory.md      # PlanningFactory specifics (S0-S6)
│   ├── evals-factory.md         # EvalsFactory specifics (SAFE)
│   ├── schema-factory.md        # SchemaFactory specifics
│   └── mission-control.md       # MissionControl 9 missions
└── reference/
    ├── api-patterns.md          # Reusable code patterns
    ├── dependencies.md          # Key library documentation
    └── domain-models.md         # Business logic reference
```

---

## Update Protocol

When you learn something new:

1. Determine which file it belongs in
2. Add it to that file with `[LLM-NAME | DATE]` tag
3. Update the Update Log at the bottom of that file
4. Update this INDEX.md if you created new sections
5. Run `npm run context:validate` to check for conflicts (if available)

---

## Human-Facing Documentation

The `.context/` system is for LLMs. Human-readable docs are in:

| Location | Purpose |
|----------|---------|
| `README.md` (root) | Project overview |
| `factory-cli/README.md` | CLI usage guide |
| `docs/API_REFERENCE.md` | REST API specification |
| `docs/PromptSpecs/*.md` | Individual prompt specifications |
| `docs/USNWR_*.md` | Demo scenarios and cases |
| `factory-cli/docs/SAFE_v0_*.md` | SAFE evaluation specification |

## Production Prompt Files

Editable prompt templates (Registry-as-Workspace):

```
domains_registry/
├── HAC/_shared/prompts/*.md          # HAC domain prompts
├── USNWR/Orthopedics/_shared/prompts/*.md
└── USNWR/Endocrinology_V2/_shared/prompts/*.md
```

Certified artifacts:
```
certified/Orthopedics/I32a/*/prompt.md
```

---

## Update Log

| Date | LLM | Change Summary |
|------|-----|----------------|
| 2026-01-09 | Gemini | **Unified Hydration & 17-Mission Suite**: Established `hydratePromptText` as the single source of truth for both testing and certification. Finalized 17 missions, including `ops:teardown`, `eval:leap`, and the new hierarchical tree logging. |
| 2026-01-08 | Gemini | **Metric-Driven Architecture**: Parameterized all Flywheel/Schema tools, added `eval:optimize` and `schema:seed` missions, and implemented metric-specific prompt overrides. |
| 2026-01-07 | Gemini | Refinement Migration: Implemented Lean Plan architecture, hydrated SQL seeding, and 
robust ID-based evaluation matching for I32a. |
| 2026-01-03 | Claude | Updated Quick Commands (eval:roundtrip, ui:export, scaffold), updated mission count to 15 |  | 2025-12-31 | Claude | Implemented Auto-Heal Protocol: `safe:score --auto-heal` triggers `auto-heal.ts`, consults Learning Agent, and auto-patches `signal_groups.json` or prompts. |
| 2025-12-31 | Claude | Implemented BIOS-level semantic overlay, fixed Split-Brain issue, added 'plan:certify' Command Center tool |
| 2025-12-30 | Claude | Added domains-registry.md for new specialty workflow, added derive-definitions command |
| 2025-12-29 | Claude | Added Quick Commands section, updated EvalsFactory purpose to include QA scorecard |
| 2025-12-28 | Claude | Consolidated docs, removed 25+ obsolete files, updated cross-references |
| 2025-12-28 | Claude | Initial creation of .context/ system |
