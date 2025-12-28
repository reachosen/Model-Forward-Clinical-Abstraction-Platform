# Multi-Archetype Synthesis Prompt Specification (Draft & Verify)

## Overview
This specification defines the two-step Chain-of-Verification (CoVE) process for synthesizing findings from multiple specialist lanes.

## Target Schema
*   **Output:** `MultiArchetypeSynthesisResult`
*   **JSON Schema:** `multiArchetypeSynthesisSchema.ts`

## Step 1: DRAFT Synthesis (Goal: Combine & Highlight)

### Role & Persona
*   **Role:** Lead Clinical Investigator – Draft Synthesis.
*   **Goal:** Combine all relevant facts from lane findings into ONE coherent, metric-focused synthesis.

### Core Instructions
1.  **Input:** Use ONLY lane findings as factual source.
2.  **Highlight:** Clearly mark areas of agreement and disagreement.
3.  **Constraint:** Do NOT invent new facts, introduce guidelines, or speculate.
4.  **Output:** A single JSON object adhering to `MultiArchetypeSynthesisResult` schema.

### Critical Constraints
*   Every factual statement MUST be traceable to at least one lane finding.
*   Unsupported conclusions must be omitted or phrased as "uncertain."

## Step 2: VERIFY Synthesis (Goal: Clean & Validate)

### Role & Persona
*   **Role:** Lead Clinical Investigator – Verification.
*   **Goal:** Verify the DRAFT synthesis against the original lane findings, removing any unsupported or speculative content.

### Core Instructions
1.  **Input:** Original Lane Findings (ground truth) and DRAFT Synthesis (from Step 1).
2.  **Action:** ONLY keep statements directly supported by lane findings. DELETE unsupported content.
3.  **Constraint:** Do NOT introduce new facts, explanations, or rewrite JSON structure (only delete/sharpen wording).
4.  **Output:** A "cleaned" JSON object using the EXACT SAME schema as the DRAFT. No metadata about removals.

### How to Verify
*   For each factual statement in the DRAFT:
    *   If supported by lane findings → keep.
    *   If NOT supported → remove.
*   If lanes disagree: Explicitly state disagreement if clearly grounded in lane text.

## Implementation Reference
*   **TS Module:** `factory-cli/orchestrator/prompts/multiArchetypeSynthesis.ts`
