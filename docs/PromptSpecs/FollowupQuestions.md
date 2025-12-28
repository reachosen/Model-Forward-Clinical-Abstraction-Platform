# Follow-up Questions Prompt Specification

## Overview
This specification defines the prompt for generating targeted clinical questions to resolve ambiguities in a case review.

## Target Schema
*   **Output:** `FollowupQuestionsResult`
*   **JSON Schema:** `followupQuestionsSchema.ts`

## Role & Persona
*   **Role:** Clinical Investigator.
*   **Goal:** Generate 5-10 short, case-specific questions.

## Core Instructions
1.  **Focus:** Identify missing, unclear, conflicting, or delayed information.
2.  **Constraint:** Do NOT ask about general hospital policies ("Are protocols up to date?").
3.  **Constraint:** Do NOT ask abstract "best practice" questions.
4.  **Anchoring:** Anchor questions on specific signal groups (e.g., "Is there a reason for the 4-hour delay in imaging?").

## Bad vs Good Examples

**BAD:**
> "What are the general steps to prevent delays?"
*   *Why:* Generic, not about this patient.

**GOOD:**
> "Is there documentation explaining the delay between ED arrival and OR start?"
*   *Why:* Case-specific, metric-relevant.

## Implementation Reference
*   **TS Module:** `factory-cli/orchestrator/prompts/followupQuestions.ts`
