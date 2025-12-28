# Signal Enrichment Prompt Specification

## Overview
This specification defines the prompt for extracting structured clinical signals from unstructured patient notes. It focuses on "enriching" the raw data into a queryable signal layer.

## Target Schema
*   **Output:** `SignalEnrichmentResult`
*   **JSON Schema:** `signalEnrichmentSchema.ts`

## Role & Persona
*   **Role:** Clinical Quality Expert or domain-specific specialist (e.g., "Pediatric Clinical Signal Extractor").
*   **Tone:** Objective, extraction-focused, no commentary.

## Core Instructions
1.  **Extraction Only:** Use ONLY the provided `patient_payload`. Do not invent data.
2.  **Structured Output:** Return a JSON object containing `signal_groups`.
3.  **Provenance:** Every signal must have:
    *   `evidence_type`: "verbatim_text" or "structured_field"
    *   `provenance`: The exact text snippet or source field.

## Signal Groups (The "5-Group" Standard)
The prompt must populate specific groups based on the domain configuration:
*   `rule_in`: Evidence supporting the condition.
*   `rule_out`: Evidence refuting the condition.
*   `delay_drivers`: Timestamps or notes explaining care delays.
*   `outcome_risks`: Signs of potential complications (e.g., "pink pulseless hand").
*   `documentation_gaps`: Explicitly missing info needed for metrics.

## Example Rules (Orthopedics I25)
*   **Delay Drivers:** Extract ED arrival, imaging time, OR start time.
*   **Neurovascular:** "Pucker sign", "AIN palsy", "pulseless".

## Implementation Reference
*   **TS Module:** `factory-cli/orchestrator/prompts/signalEnrichment.ts`
