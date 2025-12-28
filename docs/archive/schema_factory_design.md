Schema Factory Design (for Data Engineer)

1. Purpose
- Central, config-driven generator of domain/metric/signal/view schemas for pediatric clinical apps and LLM pipelines.
- Single source of truth that UI, services, and LLM agents consume via stable JSON contracts.
- Enables zero-code onboarding of new domains/metrics/signals and versioned evolution of schemas.

2. Responsibilities Mapped to END STATE AF
- A. Config-driven: Build loaders that materialize schemas solely from JSON configs (Domain/Metric/Signal/View/ScenarioTemplate). No code edits needed for new configs.
- B. App-schema contract: Expose GET-able schema objects containing sections, fields, metadata, signal groupings; ensure output is directly renderable by UI.
- C. Gold/Gold_AI contract: Produce a JSON contract for gold_ai_ortho_case derived from the same configs, no divergent format.
- D. Easy new domains: Adding DomainConfig + MetricConfig + SignalConfig (+ optional ViewConfig) must be sufficient; validation ensures references resolve.
- E. Versioned: Implement a registry with semantic versions per domain; keep immutable snapshots and an active pointer per domain.
- F. LLM friendly: Use the same materialized schema objects for LLM planners/CPPO; no prompt-only variants.

3. JSON Config Types (Design Specs)
Assumptions: semantic versioning MAJOR.MINOR.PATCH; IDs are snake_case; domain_id is unique; metric_id unique per domain; signal_id unique within a domain (enforce that rule).

3.1 DomainConfig
- Required: domain_id, name, version, status (active/deprecated), default_metric_ids (ordered), default_view_id, description.
- Optional: tags (e.g., pediatrics, ortho), owner, notes, llm_guidance (domain-specific).
- Mapping: Drives registry versions, default view/metric binding, domain-level guidance for UI/LLM.
- Example:
{
  "domain_id": "orthopedics_usnwr",
  "name": "Orthopedics USNWR",
  "version": "0.2.0",
  "status": "active",
  "default_metric_ids": ["I25", "I26"],
  "default_view_id": "ortho_case_review_v1",
  "description": "USNWR ortho review domain",
  "tags": ["pediatrics", "ortho"],
  "llm_guidance": "Emphasize fracture timelines"
}

3.2 MetricConfig
- Required: domain_id, metric_id, name, version, status, signal_group_ids (ordered groups), sections (timeline/key_signals/questions/notes/summary with field refs).
- Optional: description, display_order, app_overrides (UI hints), llm_guidance.
- Mapping: Defines which signals belong, and how sections map to fields for UI.
- Example:
{
  "domain_id": "orthopedics_usnwr",
  "metric_id": "I25",
  "name": "Surgical Site Infection",
  "version": "0.2.0",
  "status": "active",
  "signal_group_ids": ["ssi_risk", "ssi_outcomes"],
  "sections": {
    "timeline": ["event_admit", "event_surgery", "event_discharge"],
    "key_signals": ["signal_fever", "signal_wbc"],
    "questions": ["q_antibiotics", "q_wound_care"],
    "notes": ["note_freeform"],
    "summary": ["signal_ssi_risk_score", "signal_recommendation"]
  },
  "app_overrides": { "show_confidence": true }
}

3.3 SignalConfig
- Required: signal_id, domain_id, name, version, status, type (numeric/string/boolean/date/time/datetime/code/list/narrative), source (gold/gold_ai/llm/derived), presentation (label, format, visibility rules).
- Optional: group_id, description, validation (min/max/regex/codelist), derived_from (dependencies), llm_hint, unit, enum_values (for list/code).
- Mapping: Drives field metadata; LLM hinting; UI formatting and visibility.
- Example:
{
  "signal_id": "signal_wbc",
  "domain_id": "orthopedics_usnwr",
  "name": "White Blood Cell Count",
  "version": "0.2.0",
  "status": "active",
  "type": "numeric",
  "unit": "10^9/L",
  "source": "gold_ai",
  "presentation": { "label": "WBC", "format": "0.0", "visibility": "default" },
  "validation": { "min": 0, "max": 100 },
  "llm_hint": "Higher values suggest infection risk"
}

3.4 ViewConfig
- Required: view_id, domain_id, version, status, layout (ordering/placement of sections or panels), metrics (list with overrides).
- Optional: description, theme, component_overrides, llm_guidance.
- Mapping: UI layout; binds domain to metric ordering; can override sections per metric.
- Example:
{
  "view_id": "ortho_case_review_v1",
  "domain_id": "orthopedics_usnwr",
  "version": "0.2.0",
  "status": "active",
  "layout": { "panels": ["timeline", "key_signals", "questions", "notes", "summary"] },
  "metrics": [
    { "metric_id": "I25", "section_overrides": { "summary": ["signal_recommendation"] } }
  ],
  "theme": "light"
}

3.5 ScenarioTemplateConfig
- Purpose: Pre-baked scenarios for LLM planner/CPPO and UI demos.
- Required: scenario_id, domain_id, version, status, description, metric_ids, preselected_signals (by section), sample_notes.
- Optional: llm_prompt, seed_data_refs.
- Mapping: Ensures LLM/UI use the same schema objects for demo or guided flows.
- Example:
{
  "scenario_id": "ortho_postop_fever",
  "domain_id": "orthopedics_usnwr",
  "version": "0.1.0",
  "status": "active",
  "description": "Post-op fever review",
  "metric_ids": ["I25"],
  "preselected_signals": { "key_signals": ["signal_fever", "signal_wbc"] },
  "sample_notes": ["Patient febrile on POD2"]
}

4. Folder Structure to Create
- configs/domains/orthopedics_usnwr/domain.json
- configs/metrics/orthopedics_usnwr/I25.json
- configs/signals/orthopedics_usnwr/*.json
- configs/views/orthopedics_usnwr/ortho_case_review_v1.json
- configs/scenarios/orthopedics_usnwr/*.json
- registry/domains/orthopedics_usnwr/versions/{version}/materialized.json
- contracts/gold_ai/gold_ai_ortho_case.json
- docs/schema_factory_design.md (this design)

5. Schema Registry Design
- Loading: Recursive load of JSON files by type; enforce JSON schema validation per config type.
- Reference validation: Ensure metric signal_group_ids and section field IDs exist; signals reference valid groups; view metric IDs exist; domain default view/metrics exist.
- Materialization: Build runtime schema objects combining DomainConfig + MetricConfig + SignalConfig + ViewConfig into a resolved artifact with sections expanded to full field metadata.
- Versioning: Each materialized domain schema is stored under registry/domains/{domain_id}/versions/{semver}/materialized.json; an active.json pointer per domain references the current version. Immutability of versioned artifacts.
- Change detection: On config change, bump semver and regenerate materialized schema; optionally include a changelog entry.

6. App/LLM Contract Surface (Conceptual API)
- getDomainSchema(domain_id): Returns active version materialized schema, e.g.:
{
  "domain_id": "orthopedics_usnwr",
  "version": "0.2.0",
  "view_id": "ortho_case_review_v1",
  "metrics": [
    {
      "metric_id": "I25",
      "sections": {
        "timeline": [{ "id": "event_admit", "label": "...", "type": "datetime", "format": "iso" }],
        "key_signals": [{ "id": "signal_wbc", "label": "WBC", "type": "numeric", "format": "0.0" }],
        "questions": [...],
        "notes": [...],
        "summary": [...]
      }
    }
  ],
  "layout": { "panels": ["timeline", "key_signals", "questions", "notes", "summary"] }
}
- getMetricSchema(domain_id, metric_id): Subset for one metric; includes sections expanded with full field metadata.
- getViewSchema(view_id): Layout + metric ordering + any overrides; references resolved to actual field metadata.
- Outputs are identical objects for UI and LLM (LLM consumes the same structure).

7. GOLD / GOLD_AI Contract
- Defined as a JSON schema under contracts/gold_ai/gold_ai_ortho_case.json.
- Derived by selecting all signals where source in ["gold", "gold_ai"] for the domain, respecting sections from MetricConfig.
- Field-level expectations: type, format, required/optional, units, enum constraints, and provenance (source).
- Example:
{
  "contract_id": "gold_ai_ortho_case",
  "domain_id": "orthopedics_usnwr",
  "version": "0.2.0",
  "fields": [
    { "id": "signal_wbc", "type": "numeric", "unit": "10^9/L", "required": false, "source": "gold_ai" },
    { "id": "signal_fever", "type": "numeric", "unit": "C", "required": false, "source": "gold_ai" },
    { "id": "signal_ssi_risk_score", "type": "numeric", "required": true, "source": "derived" }
  ],
  "sections": {
    "key_signals": ["signal_fever", "signal_wbc"],
    "summary": ["signal_ssi_risk_score"]
  }
}

8. How to Add a New Domain Recipe (e.g., pivie_light)
- Add configs/domains/pivie_light/domain.json with defaults (view, metrics, version).
- Add MetricConfig files under configs/metrics/pivie_light/*.json.
- Add SignalConfig files under configs/signals/pivie_light/*.json (ensure all referenced signals exist).
- Optionally add configs/views/pivie_light/{view}.json and configs/scenarios/pivie_light/*.json.
- Run schema materializer: validate references, produce registry/domains/pivie_light/versions/{version}/materialized.json, set active.json.
- (Optional) Update contracts/gold_ai/gold_ai_pivie_case.json generated from gold/gold_ai signals.

9. Implementation Roadmap (v1, 6 steps)
1) Define JSON schemas: author validation specs for Domain/Metric/Signal/View/ScenarioTemplate and contract schema for gold_ai.
2) Build loader + validator: ingest configs, validate references, and fail fast on missing/invalid IDs.
3) Materializer: compose runtime schema objects (sections expanded with field metadata) and persist to registry with semantic versions and active pointer.
4) Contract generator: derive gold/gold_ai contract per domain from materialized signals; store under contracts/gold_ai/*.json.
5) API surface: implement functions/endpoints for getDomainSchema, getMetricSchema, getViewSchema, serving registry artifacts.
6) Ops flow: document add-domain workflow, version bump rules, and changelog process; add smoke tests that load and validate all configs.

Assumptions
- Semantic versioning enforced; versions are immutable snapshots.
- Signal IDs are unique within a domain; enforce that rule.
- UI consumers can render based on provided type, format, and visibility; no extra UI logic required beyond config.