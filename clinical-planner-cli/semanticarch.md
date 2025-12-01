# MODEL-FORWARD CLINICAL REVIEW PLATFORM  
## **Unified Architecture (HAC + USNWR + Multi-Archetype + Quality-Driven)**  
**Version: V10 Architecture — LLM-Ready**

---

# 0. PURPOSE OF THIS DOCUMENT
This document provides the **complete, end-to-end architecture** for the Model-Forward Clinical Review Platform, integrating:

- **HAC domains** (CLABSI, CAUTI, VAE, UE, SSI…)
- **USNWR domains** (Ortho, Endo, Pulm, Cardiology…)
- **Multi-Archetype reasoning**
- **Quality-driven planning**
- **Full semantic-context propagation S0 → S6**
- **Planner → TaskGraph → PromptPlan pipeline**
- **LLM prompt generation for downstream patient-level review tasks**

This replaces and supersedes all prior V9.1 architecture documents.

This version is **LLM-safe, deterministic, and strictly structured** to support Claude/Gemini/GPT planning & code generation.

---

# 1. CORE PHILOSOPHY

## 1.1 A metric is not solved by one archetype  
Each metric (HAC or USNWR) may require **multiple reasoning strategies**, e.g.:

- Exclusion validation  
- Preventability analysis  
- Delay analysis  
- Documentation gaps  
- Evidence attribution  

Thus:

### **A metric may have many archetypes, but each task belongs to exactly one archetype.**

This keeps the architecture scalable and avoids combinatorial explosion.

---

## 1.2 Quality drives the entire pipeline  
The pipeline is no longer structure-first.  
It is now **quality-first**, following 3 tiers:

### Tier 1 — **Structural Quality**  
Valid JSON, presence of required fields.

### Tier 2 — **Semantic Quality**  
Grounding in:
- Differentiators  
- Benchmarks  
- HAC bundles  
- Exclusions  
- Domain specifics  

### Tier 3 — **Clinical Quality**  
Grounding to:
- Case-specific evidence  
- Correct numerator/denominator attribution  
- Preventability criteria  
- Patient-level context (downstream)  

The planner (S0–S6) is responsible for ensuring Tier 1 & Tier 2 and preparing strong instructions for Tier 3 execution.

---

# 2. SEMANTIC CONTEXT MODEL (GLOBAL)

Semantic context persists through **every stage S0–S6**.

```json
{
  "concern": "I32b",
  "domain": "Orthopedics",
  "metric_type": "USNWR",
  "ranking_context": {...},
  "hac_context": {...},
  "differentiators": [...],
  "benchmarks": [...],
  "archetypes": [...],
  "signal_groups": [...],
  "questions": [...],
  "task_links": [...]
}
```

### 2.1 USNWR context  
- Current rank  
- Top performer benchmarks  
- High priority questions  
- Quality differentiators  
- Specialty summary  

### 2.2 HAC context  
- Bundle components  
- Exclusion criteria  
- Numerator rules  
- Denominator rules  
- Preventability definitions  

### 2.3 Archetype context  
- Which archetypes apply  
- Why each archetype is selected  
- Mapping from differentiators → archetype  

### 2.4 Signal context  
- All signal groups  
- All signals  
- All thresholds  
- Archetype tags  

### 2.5 Differentiator context  
Must include:
- Time-based drivers  
- Preventability drivers  
- Exclusion logic  
- Documentation gaps  
- Volume thresholds  
- Safety events  

This is the engine of quality-driven planning.

---

# 3. MULTI-ARCHETYPE MODEL

## 3.1 Metrics may have multiple archetypes
Examples:

### Ortho I32b
- Exclusion_Hunter  
- Preventability_Detective  

### CLABSI
- Process_Auditor  
- Preventability_Detective  
- Exclusion_Hunter  

### Pulmonary CF metrics
- Process_Auditor  
- Documentation_Inspector  

---

## 3.2 Each task belongs to exactly one archetype
```json
{
  "task_id": "I32b_exclusion_enrichment",
  "archetype": "Exclusion_Hunter",
  "uses_signal_groups": ["rule_in", "rule_out"]
}
```

---

## 3.3 Differentiator → Archetype mapping  
A global mapping table determines assignments:

Example:

| Differentiator | Archetype |
|----------------|-----------|
| Time to OR | Process_Auditor |
| Readmission vs staged | Exclusion_Hunter |
| Preventability | Preventability_Detective |
| Documentation gaps | Documentation_Inspector |
| Infection bundle failures | Preventability_Detective |

---

# 4. UPDATED S0–S6 PIPELINE (QUALITY-DRIVEN)

---

## **S0 — Normalize Input**
**Goal:** Load concern, domain, JSON ranking/HAC context.

### Inputs:
- Concern ID  
- Domain  
- USNWR/HAC JSON  

### Outputs:
- `PlanningInput`  
- Initial semantic context  

### Fail smells:
- Domain not mapped  
- No ranking or HAC context found  

---

## **S1 — Archetype Selection**
**Goal:** Identify all archetypes needed for the metric.

### Now selects 1–3 archetypes:
```json
"archetypes": [
  "Exclusion_Hunter",
  "Preventability_Detective"
]
```

### Fail smells:
- Only one archetype selected when metric requires several  
- Archetype assigned with no differentiator justification  

---

## **S2 — Signal Group Skeleton**
**Goal:** Build a tagged signal group skeleton.

Example:
```json
{
  "id": "bundle_compliance",
  "archetypes": ["Preventability_Detective"],
  "description": "Checks bundle elements related to preventability."
}
```

### Fail smells:
- No signal groups linked to differentiators  
- Unused signal groups  

---

## **S3 — TaskGraph Build**
**Goal:** One lane per archetype.

Example:

### Lane 1 (Exclusion_Hunter)
- exclusion_enrichment  
- exclusion_summary  

### Lane 2 (Preventability_Detective)
- bundle_enrichment  
- preventability_summary  
- gap_analysis  

### Fail smells:
- Mixed-archetype task  
- Archetype without tasks  
- Missing tasks for differentiator coverage  

---

## **S4 — PromptPlan**
**Goal:** Build prompt configs for each task.

Prompt config includes:
- archetype  
- metric_id  
- signal groups  
- differentiators  
- benchmarks  
- HAC rules  
- Ranking context  

### Fail smells:
- Missing differentiator references  
- Prompt not grounded in signal groups  
- Generic, unconditioned prompt  

---

## **S5 — Generate Task Prompts**
**Goal:** Produce LLM-ready prompts per task.

Each prompt knows:
- the archetype  
- what signal groups to analyze  
- what differentiators to target  
- what benchmarks to compare against  
- what HAC exclusions apply  

### Fail smells:
- Missing references to benchmarks  
- Missing references to HAC bundle/exclusion rules  
- Missing metric_id  

---

## **S6 — Assemble Final Plan**
**Goal:** Build final `PlannerPlan`.

Includes:
- archetypes[]  
- task list  
- prompt configs  
- validated semantic context  

### Fail smells:
- Unassigned differentiators  
- Archetype with no tasks  
- Missing signal groups  
- Missing benchmark or bundle mapping  

---

# 5. UPDATED VALIDATION FRAMEWORK

### Tier 1 – Structural  
- JSON correct  
- Fields present  
- S0–S6 sections intact  

### Tier 2 – Semantic  
- Differentiator coverage  
- Archetype justification present  
- Signal group alignment  
- Ranking and HAC grounding  
- Benchmark references  

### Tier 3 – Clinical (LLM execution focus)  
- Evidence-linked  
- Accurate bundle logic  
- Correct attribution  

Planner ensures Tier 1 & 2.  
Downstream LLM tasks ensure Tier 3.

---

# 6. ARCHETYPE DEFINITIONS (UPDATED)

### Exclusion_Hunter  
Purpose: Validate numerator/denominator  
Used for: Readmissions, staged procedures, HAC exclusions

### Preventability_Detective  
Purpose: Bundle analysis, cause-and-effect reasoning  
Used for: SSI, readmits, CF care, HAC preventability

### Process_Auditor  
Purpose: Time, delays, protocol adherence  
Used for: I25/I26, device-days, UE risk, VAE

### Documentation_Inspector  
Purpose: Find missing documentation  
Used for: UE, bundles, SIRS criteria

### Delay_Driver_Profiler  
Purpose: Identify bottlenecks  
Used for: Time-to-intervention metrics

---

# 7. COMPLETE PIPELINE OUTPUT (EXAMPLE)

For I32b:

```json
{
  "metric_id": "I32b",
  "archetypes": ["Exclusion_Hunter", "Preventability_Detective"],
  "tasks": [
    { "task_id": "I32b_exclusion_enrichment", "archetype": "Exclusion_Hunter" },
    { "task_id": "I32b_exclusion_summary", "archetype": "Exclusion_Hunter" },
    { "task_id": "I32b_bundle_enrichment", "archetype": "Preventability_Detective" },
    { "task_id": "I32b_gap_summary", "archetype": "Preventability_Detective" }
  ],
  "semantic_context": {
    "ranking_context": {...},
    "hac_context": {...},
    "differentiators": [...],
    "benchmarks": [...],
    "signal_groups": [...]
  }
}
```

---

# 8. SCALABILITY PRINCIPLES

### 8.1 Archetypes scale linearly  
Adding a new metric = adding new differentiators.

### 8.2 Tasks scale linearly  
A metric with 3 archetypes generates:
- 3 lanes  
- ~2–4 tasks per lane  
- All grounded in semantic context  

### 8.3 No cross-archetype task contamination  
Each task is clean and focused.

---

# 9. WHAT CHANGED FROM V9.1 → V10

| Area | V9.1 | V10 |
|------|------|------|
| Archetypes | Single | Multi-archetype |
| Prompt grounding | Narrative | Structured semantic context |
| S5 execution | No routedInput | Fully context-aware |
| HAC support | Partial | First-class equal to USNWR |
| Validation | Keyword-based | Differentiator-based |
| Signal groups | Static | Archetype-tagged |
| Tasks | Monolithic | Per-archetype lanes |
| Quality | Structure-focused | Quality-driven |


