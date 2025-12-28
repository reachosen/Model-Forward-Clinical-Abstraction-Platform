# SchemaFactory User Stories: Contract Synthesis & Enrichment

**Component Name:** `ContractSynthesizer`
**Parent System:** SchemaFactory
**Goal:** Transform "Planning Artifacts" (Markdown Templates + Registry Configs) into "Runtime Contracts" (Hydrated Prompts + Validators) to bridge the gap between Planning and Execution.

---

## 1. Core User Stories

### Story 1: Dynamic Prompt Hydration
**As a** Backend Engineer,
**I want** to programmatically load Markdown prompt templates from the `domains_registry` and inject domain-specific variables (e.g., `{{metricName}}`, `{{signalGroupIds}}`),
**So that** I can generate complete, executable prompts for the runtime engine without maintaining duplicate string constants in code.

*   **Acceptance Criteria:**
    *   System can read `.md` files from `domains_registry/.../_shared/prompts/`.
    *   System correctly replaces all `{{handlebars}}` placeholders using a provided Context Dictionary.
    *   Missing variables trigger a strict error (no silent failures).

### Story 2: Schema Extraction & Model Generation
**As a** System Architect,
**I want** to automatically parse the `REQUIRED JSON SCHEMA` code block embedded within the prompt Markdown,
**So that** I can generate Pydantic (Python) and Zod (TypeScript) validators that enforce strict adherence to the prompt's output contract.

*   **Acceptance Criteria:**
    *   Parser locates the JSON block following the "REQUIRED JSON SCHEMA" header.
    *   Output is converted into a valid JSON Schema definition.
    *   A validator is generated that fails if the LLM output violates this schema.

### Story 3: Signal Registry Integrity Check
**As a** Clinical Informaticist,
**I want** the system to validate that every `signal_id` or `group_id` referenced in a prompt exists in the Domain's `signals/*.json` registry,
**So that** the LLM is never instructed to look for undefined or hallucinated clinical signals.

*   **Acceptance Criteria:**
    *   Scan hydrated prompts for enumerated signal lists.
    *   Compare against the `signals/` directory in the Registry.
    *   Build fails if a prompt references a 'ghost' signal.

### Story 4: Artifact Certification (The Handoff)
**As a** Release Manager,
**I want** to package the Hydrated Prompt + The Generated Schema + A Version Hash into a "Certified Artifact" JSON,
**So that** both the Backend and the EvalFactory are guaranteed to be using the exact same logic version.

---

## 2. Testing Strategy

To ensure validity, the `ContractSynthesizer` requires the following test suite:

### A. Unit Tests (The Compiler)
1.  **`test_hydration_accuracy`**:
    *   Input: Template `Hello {{name}}`, Context `{"name": "World"}`.
    *   Assert: Output is `"Hello World"`.
2.  **`test_variable_missing`**:
    *   Input: Template `Hello {{name}}`, Context `{}`.
    *   Assert: **Error/Exception** (Not undefined).
3.  **`test_schema_extraction`**:
    *   Input: `exclusion_check.md` (Read from disk).
    *   Assert: Extracted JSON is a valid JSON Schema (parsable by `jsonschema` lib).

### B. Integration Tests (The Registry)
1.  **`test_registry_integrity`**:
    *   Walk through all `domains_registry` folders.
    *   Assert all templates can be hydrated with their companion `metrics/*.json` configs.
    *   **Fail** if a prompt requires a variable that the metric config doesn't provide.

---

## 3. Relationship with EvalFactory

The **SchemaFactory** and **EvalFactory** have a Producer/Consumer relationship:

| SchemaFactory (The Legislator) | EvalFactory (The Inspector) |
| :--- | :--- |
| **Defines the Contract:** "The output MUST look like this Pydantic model." | **Verifies the Contract:** "Did this specific Run adhere to the Pydantic model?" |
| **Generates the Prompt:** "Here is the exact prompt string to use." | **Executes the Prompt:** Sends the string to OpenAI and captures the result. |
| **Certifies the Version:** "This is Logic Hash #ABC123." | **Reports on Version:** "Logic Hash #ABC123 achieved 95% accuracy." |

**Workflow:**
1.  **SchemaFactory** compiles `exclusion_check.md` → `ExclusionSchema.py`.
2.  **EvalFactory** imports `ExclusionSchema` to validate its test runs.
3.  If EvalFactory finds the schema too loose (LLM succeeds but data is bad), the fix happens in **SchemaFactory** (updating the `.md` source).
