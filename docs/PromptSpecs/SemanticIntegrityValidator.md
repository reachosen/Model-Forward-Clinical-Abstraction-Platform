# Semantic Integrity Validator Specification

## Overview
This prompt specification defines the rules for the Semantic Integrity Validator, a critical quality gate in the Clinical Progressive Plan Orchestrator (CPPO). It ensures that generated plans are structurally sound, semantically consistent, and clinically safe before being presented to a user.

## Core Responsibility
Evaluate a complete or partial `PlannerPlan` against 5 key criteria.

## The 5-Criteria Spec

1.  **Schema Completeness (Tier 1 - Structural)**
    *   **Requirement:** The JSON must contain all mandatory fields defined in the V9.1 schema (e.g., `plan_metadata`, `clinical_config`, `signals`, `criteria`).
    *   **Failure:** Immediate HALT.

2.  **Domain Alignment (Tier 2 - Semantic)**
    *   **Requirement:** The plan's content must match the declared domain.
        *   *HAC:* Must contain `rule_in`, `rule_out`, `delay_drivers` groups.
        *   *USNWR:* Must contain ranking-specific context if ranked.
    *   **Failure:** WARN.

3.  **Signal Parsimony (Tier 2 - Semantic)**
    *   **Requirement:** Exactly 5 signal groups (V9.1 "5-Group Rule").
    *   **Requirement:** Signals must be actionable and distinct.
    *   **Failure:** WARN if < 3 or > 6 groups (legacy) or != 5 (strict).

4.  **Provenance & Safety (Tier 3 - Clinical)**
    *   **Requirement:** Every signal must have a defined `evidence_type` (L1/L2/L3).
    *   **Requirement:** No hallucinated citations.
    *   **Failure:** HALT if evidence types missing.

5.  **Pediatric Context (Tier 3 - Clinical)**
    *   **Requirement:** Language and thresholds must be appropriate for a pediatric setting (e.g., weight-based dosing, age-specific norms).
    *   **Failure:** WARN.

## Implementation Reference
*   **Validator Code:** `factory-cli/orchestrator/validators/ValidationFramework.ts`
*   **Architecture:** See `QUALITY_CRITERIA.md`
