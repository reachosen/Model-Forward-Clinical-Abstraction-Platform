# Certified Artifacts

This folder contains artifacts that have passed the PromptBattleTestFlywheel
and are ready for handoff to Schema Factory.

## Structure

```
certified/
└── {FRAMEWORK}/
    └── {SPECIALTY}/
        └── metrics/
            └── {METRIC}/
                ├── prompts/           # Certified prompt templates
                ├── definitions/       # Certified semantic definitions
                ├── config/            # Certified execution config
                └── certification.json # Audit metadata
```

## Certification Metadata

Each certified metric includes a `certification.json`:

```json
{
  "metric_id": "I25",
  "framework": "USNWR",
  "specialty": "Orthopedics",
  "certified_at": "2024-12-22T10:30:00Z",
  "prompt_version": "v2.1",
  "eval_run_id": "2024-12-22/I25_batch_full",
  "scores": {
    "CR": 0.94,
    "AH": 1.0,
    "AC": 0.88
  },
  "test_case_count": 25,
  "certified_by": "quality-team"
}
```

## Handoff Process

1. Run `flywheel:battle` mission until pass rate >= 90%
2. Review eval report
3. Copy blessed artifacts to `certified/{framework}/{specialty}/metrics/{metric}/`
4. Create `certification.json`
5. Notify Schema Factory team
