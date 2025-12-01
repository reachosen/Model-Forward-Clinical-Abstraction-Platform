# Clinical Progressive Plan Orchestrator (CPPO) - User Stories
**Target Architecture**: V10 (Multi-Lane Semantic Engine)
**Foundation**: V9.1 (Proven Single-Lane Engine)
**Date**: 2025-11-30

---

## The Strategy: "Clone & Merge"
The current system is a robust "Single-Lane" engine (Input → Archetype → TaskGraph → Output).
V10 parallelizes this engine into multiple lanes and merges them via a Synthesis task.

---

## Epic 8: The Semantic Data Layer (Fuel)
**Goal:** Generalize the "Ortho Packet" success to all domains.

### Story 8.1: Generalized Packet Loader (S0)
**As** Sam (SI)
**I want** S0 to check for a "Data Packet" for *any* domain and nest it cleanly
**So that** downstream stages have Ground Truth data without polluting the root input.

**Acceptance Criteria**:
- [ ] Refactor `OrthoPacketLoader` into a generic `SemanticPacketLoader`.
- [ ] **Context Structure:** Store packet data under `semantic_context.packet`.
  ```typescript
  semantic_context: {
    packet?: PacketContext,   // From Data Packet
    ranking?: RankingContext, // From USNWR
    clinical?: ClinicalContext // From Patient Data
  }
  ```
- [ ] Verify `RankingContext` (existing) and `PacketContext` coexist without conflict.

### Story 8.2: Dynamic Archetype Triggers & Ordering (S1)
**As** Alicia (CI)
**I want** specific risks to trigger archetypes in a deterministic order
**So that** the synthesis output always follows a logical narrative (Process → Exclusion → Preventability).

**Acceptance Criteria**:
- [ ] Update `S1_DomainResolution` to map Packet `risk_factors` to `Archetypes`.
- [ ] **Ordering Mandate:** Enforce strict output order:
  1. `Process_Auditor`
  2. `Exclusion_Hunter`
  3. `Preventability_Detective`
  4. `Data_Scavenger`
- [ ] **Output:** S1 returns `archetypes: string[]` (Array) and optional `primary_archetype` (String).

---

## Epic 10: The Multi-Lane Engine (Chassis)
**Goal:** Run the existing Task Execution logic in parallel lanes.

### Story 10.1: Multi-Lane TaskGraph Construction (S3)
**As** Sam (SI)
**I want** S3 to generate a graph with parallel, namespaced branches
**So that** tasks don't collide and execution is traceable.

**Acceptance Criteria**:
- [ ] Update Planner Types: Add `archetypes: string[]` field.
- [ ] S3 Loop: Iterate through `archetypes` array from S1.
- [ ] **Namespacing:** Generate IDs like `process_auditor:event_summary`.
- [ ] Create a "Synthesis" node that depends on the final nodes of all lanes.

### Story 10.2: Synthesis Task & Merging (S4/S5)
**As** Dr. Chen (CR)
**I want** a final "Synthesis" task that merges lane outputs deterministically
**So that** I get one coherent determination, not disjointed fragments.

**Acceptance Criteria**:
- [ ] Create `MultiArchetypeSynthesis` task type.
- [ ] **Prompt Input Order:** Feed lane outputs in strict order (Auditor → Exclusion → Preventability).
- [ ] **JSON Merge Strategy:**
  - `signal_groups`: Union by ID (merge signals if group exists).
  - `clinical_tools`: Deduplicate by ID.
  - `rationale`: Concatenate with lane headers.
- [ ] S5 Execution: Ensure this task runs last.

---

## Epic 11: Semantic Validation (Guardrails)
**Goal:** Ensure the output respects the Semantic Packet.

### Story 11.1: Packet-Driven Signal Validation (S6)
**As** Alicia (CI)
**I want** S6 to validate that the final plan contains the *exact* signal groups requested by the Data Packet
**So that** the LLM doesn't hallucinate generic groups.

**Acceptance Criteria**:
- [ ] Use `ContextAwareValidation.ts`.
- [ ] Rule: If `PacketContext` lists "MBI_Exclusion_Group", final plan MUST contain it.
- [ ] Error Level: Tier 2 Warning.

### Story 11.2: Differentiator-Driven Summary Check (S6)
**As** Dr. Chen (CR)
**I want** to verify that if "Time to OR" was a key driver, it is mentioned in the final summary
**So that** I know the plan addresses the hospital's specific problem.

**Acceptance Criteria**:
- [ ] Validator checks `event_summary` text.
- [ ] Search for keywords from `PacketContext`'s `clinical_focus`.
- [ ] Warning if key differentiators are missing.

---

## Refined Implementation Roadmap (8-Step Sequence)

1.  **Universal Packet Loader (Story 8.1)**: Refactor `OrthoPacketLoader` and complete S0 refactor.
2.  **Archetype Array Output (Story 8.2)**: Modify S1 to output multiple archetypes in strict order.
3.  **Update Planner Types**: Add `archetypes: string[]` and `semantic_context` structure.
4.  **Rewrite S3 Graph Builder (Story 10.1)**: Loop through archetypes, namespace tasks.
5.  **Introduce Synthesis Task (Story 10.2)**: Add task type, prompt templates, and merge logic.
6.  **Add S6 Semantic Validation (Epic 11)**: Integrate PacketContext checks.
7.  **Upgrade Prompts**: Inject `semantic_context` (Packet, Ranking, Clinical) across all prompts.
8.  **Final E2E Test**: Verify on Ortho (I32b) and Endo (C35) scenarios.
