# SchemaFactory

Backend schema generation and ConfigDB seeding from certified artifacts.

## Purpose

SchemaFactory ingests certified artifacts from the `certified/` handoff zone and generates:
- Backend database schemas
- Metadata Store configuration
- API contracts for downstream UI Factory

## Pipeline Position

```
PlanningFactory → EvalsFactory → certified/ → SchemaFactory → UI Factory
                                    ↑
                              (handoff zone)
```

## Planned Components

```
SchemaFactory/
├── generators/        # Schema generators
│   ├── configDB.ts    # ConfigDB seed generator
│   ├── apiContracts.ts
│   └── metadataStore.ts
├── validators/        # Schema validation
├── templates/         # Schema templates
└── cli.ts             # SchemaFactory CLI
```

## Status

**In Development** - Components to be added as needed.

## Related

- `certified/` - Handoff zone containing blessed artifacts
- `PlanningFactory/` - Upstream prompt/plan generation
- `EvalsFactory/` - Upstream evaluation & certification
