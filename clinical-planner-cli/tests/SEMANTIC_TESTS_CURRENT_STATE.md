# Semantic/Gate Test Inventory (Current State)

| Test file | Stages touched | Metrics/Domain | What it actually asserts |
| --- | --- | --- | --- |
| orchestrator/test-gates-i32b.ts | S0→S6 (gate-by-gate) | I32b (Orthopedics, multi-archetype) | Runs pipeline stages with ValidationFramework gates; halts on HALT. No golden semantic assertions beyond gate pass/fail. |
| orchestrator/test-s0-s2.ts | S0→S2 | Generic PlanningInput | Smoke for normalization/domain/skeleton; no semantic asserts. |
| orchestrator/test-s0-s2-with-gates.ts | S0→S2 | Generic PlanningInput | Same as above with gate policies; asserts no HALT. No content-level semantics. |
| orchestrator/test-s0-s3.ts | S0→S3 | Generic | Adds Task Graph; checks gate pass only. |
| orchestrator/test-s0-s4.ts | S0→S4 | Generic | Adds Prompt Plan; checks gate pass only. |
| orchestrator/test-s0-s6-complete.ts | S0→S6 | Generic | Full pipeline with gates; logs counts/summary; no golden semantic oracle. |
| tests/integration/s6-sufficiency.test.ts | S6 (mocked QA) | Mock Orthopedics plan | Mocked LLM QA; asserts “5 signals is a cap, not minimum” and groups not empty; synthetic negative case. |
| tests/integration/rpi-workflow.test.ts | Full RPI workflow | Generic | Integration success path; no detailed semantic checks. | 
