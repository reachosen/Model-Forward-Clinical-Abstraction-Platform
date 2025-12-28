
# Ortho Semantic Packet – Instructions for Claude

This folder defines an **Orthopedics semantic packet** for USNWR-style pediatric outcome metrics.
It is designed to be loaded by the planner so plans are clinically meaningful and metric-focused.

## Files

- `signals.json`  – grouped clinical signals for Orthopedics
- `metrics.json`  – per-metric blueprints for I25, I26, I27, I25.1, I32a, I32b
- `priority.json` – priority flags (all Ortho metrics are currently HIGH priority)

## How to Use in the Planning Pipeline

1. **Load the packet when domain = Orthopedics or concern_id starts with 'I':**
   - Parse `signals.json` and `metrics.json` at planner startup or on first Ortho request.

2. **When a planning request includes a specific Ortho metric (e.g., I25, I32a):**
   - Look up the entry in `metrics.json` by `question_id`.
   - Read:
     - `metric_name`, `metric_type`, `clinical_focus`, `rationale`
     - `risk_factors`
     - `review_questions`
     - `signal_groups`
   - Also load the corresponding signal lists from `signals.json` for the referenced `signal_groups`.

3. **Prompt Construction Guidance:**
   - Inject the following into the LLM prompt as structured context:
     - The selected metric blueprint (all fields for that question_id).
     - The relevant signal group lists.
     - The fact that `priority_for_clinical_review` is "high".
   - Explicitly instruct the LLM to:
     - Focus on THIS metric’s outcomes and the listed risk factors.
     - Use the provided signal groups when proposing signals, follow-up questions, or review steps.
     - Avoid generic “orthopedic surgery” language that is not linked to the metric or signal library.

4. **Multi-Metric Planning:**
   - If multiple Ortho metrics are in scope (e.g., I25 + I25.1 + I32a):
     - Build a combined context that includes each metric blueprint.
     - Encourage the LLM to:
       - Identify shared signals (e.g., SSI bundle issues, documentation gaps).
       - Prioritize work according to `priority.json` (here, all equal/high).

5. **Downstream Tasks (S3–S5):**
   - When generating:
     - `signal_enrichment`
     - `event_summary`
     - `followup_questions`
     - `clinical_review_plan`
   - Require the LLM to:
     - Reference specific signal groups and risk_factors by name where appropriate.
     - Map each proposed question or review step back to at least one metric (question_id).

6. **Validation Hooks:**
   - A plan for an Ortho concern_id should be considered **semantically weak** if:
     - It does not mention any of the configured `signal_groups` for that metric.
     - It fails to address the listed `risk_factors`.
     - It produces only generic statements without clear metric linkage.

In short, treat this packet as the **ground truth semantic scaffold** for Orthopedics.
Every Ortho plan should read like it was generated “inside” this packet’s context.
