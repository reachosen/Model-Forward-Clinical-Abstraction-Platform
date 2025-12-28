# Summary 20/80 Prompt Specification

## Overview
This specification defines the prompt for generating a "20/80 Summary" for busy clinicians, focusing on high-impact facts.

## Target Schema
*   **Output:** `Summary2080Result` (though no schema currently, but implied as `{ patient_summary: string, provider_summary: string }`).
*   **JSON Schema:** Not yet formally defined, but implied by prompt.

## Role & Persona
*   **Role:** Patient and Provider Summary Generator.
*   **Goal:** Condense complex case data into 20% of facts driving 80% of insight for a given metric.

## Core Instructions
1.  **Dual Audience:** Generate `patient_summary` (factual, timeline) and `provider_summary` (quality, safety, metric risk).
2.  **Constraint:** Use ONLY `patient_payload`. No guessing, no clinical advice, no guidelines.
3.  **Constraint:** No commentary on quality of care or workflows.
4.  **Metric Focus:** All content must be directly relevant to the specific metric.

## Bad vs Good Examples

**BAD:**
> "Patients with fractures typically require rapid surgical intervention, and delays may increase complications..."
*   *Why:* Generic teaching, not case-specific.

**GOOD:**
> "ED arrival, imaging confirmation, and OR timing define the metric. Key drivers: delay_drivers, documentation_gaps, outcome_risks."
*   *Why:* Structural, metric-focused, no fabricated facts.

## Implementation Reference
*   **TS Module:** `factory-cli/orchestrator/prompts/summary2080.ts`
