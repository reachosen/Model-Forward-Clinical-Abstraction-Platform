# Archive

This directory contains archived golden content for validation purposes.

## Purpose

When `plan:derive-definitions` generates new definitions, it compares against archived content to verify correctness.

## Structure

```
_archive/
└── USNWR/
    └── {Specialty}/
        └── {YYYY-MM-DD}/           # Date of archive
            ├── _shared/
            │   └── prompts/*.md    # Golden prompts
            ├── _orthopacket/       # Original domain packet
            │   ├── metrics.json
            │   ├── signals.json
            │   └── priority.json
            └── metrics/
                └── {MetricId}/
                    └── definitions/
                        ├── signal_groups.json
                        └── review_rules.json
```

## Usage

1. **Before major changes**: Archive current golden content with date stamp
2. **After derive-definitions**: Compare generated output against archive
3. **Validation**: If derived content matches archive, derivation logic is correct

## Archives

| Date | Specialty | Contents |
|------|-----------|----------|
| 2025-12-30 | Orthopedics | prompts, I25 definitions, I32a definitions, OrthoPacket |
