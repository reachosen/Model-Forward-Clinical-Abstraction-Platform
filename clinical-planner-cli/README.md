# Clinical Abstraction Planner CLI

**Hospital-Acquired Condition & Quality Metric Configuration Planner**

A command-line tool that generates comprehensive configurations for both HAC (Hospital-Acquired Condition) surveillance and USNWR (US News & World Report) quality metric abstraction from structured planning inputs using AI-powered planning agents.

---

## 📋 Overview

The Clinical Abstraction Planner CLI is designed for clinical informatics teams to rapidly generate and validate configurations tailored to specific clinical contexts, particularly for US Children's Hospitals. It supports both infection surveillance (HAC) and quality metric abstraction (USNWR) use cases in a **unified planner engine**.

### Key Features

- **Cross-Domain Support**: Single planner engine for both HAC and USNWR archetypes
- **AI-Powered Planning**: Generates configurations using OpenAI GPT models (or mock planner for development)
- **Multi-Question Abstraction**: USNWR metrics support multiple questions per metric config
- **Schema Validation**: Validates inputs and outputs against JSON schemas
- **Business Rules**: Enforces clinical and technical best practices
- **Pediatric-Focused**: Tailored for children's hospital contexts with age-stratified considerations
- **Comprehensive Output**: Produces ready-to-deploy configurations with full metadata

### Supported Archetypes

#### HAC (Hospital-Acquired Conditions)
- **CLABSI**: Central Line-Associated Bloodstream Infections
- **VAP**: Ventilator-Associated Pneumonia
- **CAUTI**: Catheter-Associated Urinary Tract Infections
- **SSI**: Surgical Site Infections
- *Custom*: Extensible to other HAC types

#### USNWR (Quality Metrics)
- **I25**: Orthopedic surgical complications
- **I26**: Cardiac surgery outcomes
- **I32a**: Readmission metrics
- *Custom*: Extensible to other USNWR metrics

### Conceptual Model

The planner uses the following conceptual model:

| Concept | HAC Example | USNWR Example | Role |
|---------|-------------|---------------|------|
| **archetype** | HAC, device_associated_infection | USNWR_METRIC, USNWR_ORTHO_METRIC | Chooses plan/template logic |
| **domain** | pediatric_icu | orthopedics, readmissions | Clinical specialty/setting |
| **concern_id** | CLABSI, VAP | I25, I26, I32a | Top-level "thing" we configure |
| **question_id** | clabsi_main (implicit) | I25_Q1, I25_Q2, I25_Q3 | Question-level abstractions |

**Key Difference**: HAC focuses on signal-based surveillance with follow-up questions, while USNWR focuses on multi-question abstraction where one config contains multiple questions (e.g., I25_Q1, I25_Q2, I25_Q3) that must all be answered for that metric.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- TypeScript 4.5+
- (Optional) OpenAI API key for real LLM planning

### Installation

```bash
# Navigate to the clinical-planner-cli directory
cd clinical-planner-cli

# Install dependencies
npm install
```

### Basic Usage

```bash
# Generate HAC plan using mock planner (no API key required)
npx ts-node cli/plan.ts examples/clabsi_planning_input.json

# Generate USNWR plan using mock planner
npx ts-node cli/plan.ts examples/usnwr_i25_planning_input.json

# Generate plan using OpenAI API
npx ts-node cli/plan.ts examples/clabsi_planning_input.json \
  --api-key sk-your-openai-key

# Specify output directory
npx ts-node cli/plan.ts examples/clabsi_planning_input.json -o ./output

# Validate input only (no generation)
npx ts-node cli/plan.ts examples/clabsi_planning_input.json --validate-only
```

---

## 📦 Project Structure

```
clinical-planner-cli/
├── models/
│   ├── PlanningInput.ts       # Input structure for planning requests (HAC + USNWR)
│   └── PlannerPlan.ts         # Output structure with config + USNWR questions
├── schemas/
│   ├── planning-input.schema.json    # Supports both HAC and USNWR archetypes
│   ├── hac-config.schema.json        # Includes USNWRQuestionConfig definition
│   └── planner-plan.schema.json
├── planner/
│   ├── plannerPrompt.md       # LLM system and user prompts
│   ├── plannerAgent.ts        # Cross-domain planning logic (HAC + USNWR)
│   └── validatePlan.ts        # Validation utilities with USNWR question validation
├── cli/
│   └── plan.ts                # CLI entry point (archetype-agnostic)
├── examples/
│   ├── clabsi_planning_input.json    # HAC example (CLABSI)
│   ├── vap_planning_input.json       # HAC example (VAP)
│   └── usnwr_i25_planning_input.json # USNWR example (I25 orthopedic metric)
├── README.md
├── package.json
└── tsconfig.json
```

---

## 📝 Usage

### Command Line Options

```
npx ts-node cli/plan.ts <input-file> [options]

Arguments:
  <input-file>            Path to planning input JSON file

Options:
  --output, -o <path>     Output directory (default: current directory)
  --api-key <key>         OpenAI API key (uses mock if not provided)
  --model <name>          OpenAI model name (default: gpt-4o-mini)
  --mock                  Force use of mock planner
  --validate-only         Only validate input without generating plan
  --help, -h              Show help message
```

### Environment Variables

```bash
# Alternative to --api-key flag
export OPENAI_API_KEY=sk-your-openai-key
```

### Input Format

Create a JSON file following the `PlanningInput` schema. See `examples/` for complete examples.

**Minimal Example:**

```json
{
  "planning_id": "planning-clabsi-001",
  "concern_id": "CLABSI",
  "archetype": "device_associated_infection",
  "domain": {
    "name": "Hospital-Acquired Conditions",
    "facility": {
      "type": "Children's Hospital",
      "location": "United States"
    }
  },
  "data_profile": {
    "sources": [
      {
        "source_id": "ehr",
        "type": "EHR",
        "available_data": ["demographics", "vitals", "labs"]
      }
    ]
  },
  "clinical_context": {
    "objective": "Detect CLABSI in pediatric patients",
    "regulatory_frameworks": ["NHSN"]
  }
}
```

### Output Files

The CLI generates three files:

1. **planner_plan.json**: Complete plan with metadata, rationale, and validation results
2. **hac_config.json**: Extracted HAC configuration ready for deployment
3. **validation_report.txt**: Human-readable validation report

---

## 🏗️ Architecture

### Planning Flow

```
┌─────────────────────┐
│  Planning Input     │
│  (JSON file)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Input Validation   │
│  (Schema + Rules)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Planner Agent      │
│  (Mock or OpenAI)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Plan Validation    │
│  (Schema + Rules)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Output Files       │
│  (JSON + Report)    │
└─────────────────────┘
```

### Mock vs. Live Planning

**Mock Planner** (Default when no API key):
- Generates reasonable configurations based on templates
- No external API calls required
- Ideal for development and testing
- Configurations still require clinical review

**OpenAI Planner**:
- Uses GPT-4 to generate context-aware configurations
- Tailored to specific facility and clinical context
- Requires OpenAI API key
- More sophisticated reasoning and adaptation

---

## 🔍 Validation

### Schema Validation

- Validates against JSON Schema (draft-07)
- Ensures all required fields are present
- Type checking for all values

### Business Rules Validation

- **Confidence thresholds**: Ensures 0-1 range
- **Signal groups**: At least one required
- **Timeline phases**: At least one required
- **Clinical rules**: At least one required
- **Prompts**: System and task prompts required
- **Version format**: Semantic versioning (e.g., 1.0.0)
- **Detection windows**: Reasonable day ranges
- **Max findings**: Prevents overwhelming clinicians

---

## 🧪 Examples

### Generate CLABSI Configuration

```bash
npx ts-node cli/plan.ts examples/clabsi_planning_input.json -o ./clabsi_config
```

**Output:**
```
✅ Plan generated
   Plan ID: plan-clabsi-1705320000000
   Confidence: 75.0%
   Requires Review: Yes

📁 Output Files:
   ./clabsi_config/planner_plan.json
   ./clabsi_config/hac_config.json
   ./clabsi_config/validation_report.txt
```

### Generate VAP Configuration

```bash
npx ts-node cli/plan.ts examples/vap_planning_input.json -o ./vap_config
```

### Validate Input Only

```bash
npx ts-node cli/plan.ts examples/clabsi_planning_input.json --validate-only
```

**Output:**
```
📋 Input Validation Result:
   ✅ Valid
   Schema Valid: ✅
   Business Rules Valid: ✅

✅ Validation complete (--validate-only mode)
```

---

## 🎯 Use Cases

### 1. Rapid Prototyping

Quickly generate HAC configurations for new surveillance programs:

```bash
# Create input JSON for new HAC type
vim cauti_planning_input.json

# Generate configuration
npx ts-node cli/plan.ts cauti_planning_input.json -o ./cauti_config

# Review and refine
code cauti_config/hac_config.json
```

### 2. Facility-Specific Customization

Generate configurations tailored to your facility:

- Specify your EHR data structure
- Define available data sources
- Set facility-specific thresholds
- Include local clinical workflows

### 3. Configuration Management

Version control your HAC configurations:

```bash
# Generate configuration
npx ts-node cli/plan.ts clabsi_input_v2.json -o ./configs/clabsi_v2

# Commit to version control
git add configs/clabsi_v2/
git commit -m "CLABSI config v2 - updated thresholds"
```

### 4. Testing & Development

Use mock planner for development without API costs:

```bash
# No API key needed
npx ts-node cli/plan.ts examples/clabsi_planning_input.json --mock
```

---

## 🔧 Configuration Details

### Signal Groups

Configurations include organized signal groups:

- **Device Signals**: Device insertion, maintenance, complications
- **Laboratory Signals**: Cultures, inflammatory markers, CBCs
- **Clinical Signals**: Vital signs, symptoms, physical exam
- **Microbiology Signals**: Pathogen identification, susceptibility

### Timeline Phases

Temporal phases for case analysis:

- **Pre-Device Baseline**: Clinical status before intervention
- **Device Placement**: Insertion and initial period
- **Device Dwell Period**: While device is in place
- **Infection Window**: When infection signs appear
- **Post-Event Monitoring**: Follow-up period

### Clinical Criteria

NHSN-aligned clinical rules:

- Inclusion criteria
- Exclusion criteria
- Supporting evidence requirements
- Required data elements

### LLM Prompts

Task-specific prompts for:

- **Enrichment**: Signal extraction and timeline construction
- **Abstraction**: Clinical narrative and determination
- **QA**: Quality assurance and validation

---

## 🧑‍⚕️ Pediatric Considerations

The planner is optimized for children's hospitals:

- **Age-Stratified Norms**: Different thresholds for neonates, infants, children, adolescents
- **Weight-Based Calculations**: Medication and fluid dosing
- **Family-Centered Care**: Parental observations as data points
- **Growth & Development**: Developmental milestones
- **Congenital Conditions**: Underlying condition considerations
- **NICU/PICU Context**: Intensive care-specific monitoring

---

## 🐛 Troubleshooting

### "Schema file not found"

Ensure you're running from the `clinical-planner-cli/` directory or use absolute paths.

### "Input validation failed"

Check your input JSON against `schemas/planning-input.schema.json`. Common issues:
- Missing required fields
- Invalid enum values
- Incorrect data types

### "OpenAI API call failed"

- Verify your API key is correct
- Check you have sufficient API credits
- Use `--mock` flag to bypass API

### TypeScript Compilation Errors

```bash
# Ensure dependencies are installed
npm install

# Check TypeScript version
npx tsc --version  # Should be 4.5+
```

---

## 📚 Additional Resources

### Related Documentation

- [CA Factory Implementation Plan](../docs/CA_FACTORY_IMPLEMENTATION_PLAN.md)
- [CA Factory Treatment Plan](../docs/CA_FACTORY_TREATMENT_PLAN.md)
- [Architecture Documentation](../docs/ARCHITECTURE_TO_CODE.md)

### JSON Schema References

- [Planning Input Schema](./schemas/planning-input.schema.json)
- [HAC Config Schema](./schemas/hac-config.schema.json)
- [Planner Plan Schema](./schemas/planner-plan.schema.json)

---

## 🤝 Contributing

### Adding New HAC Archetypes

To add a new HAC type (e.g., CAUTI):

1. Update `archetype` enum in `schemas/planning-input.schema.json` to include your new HAC type
2. Add archetype-specific logic in `plannerAgent.ts`:
   - Update `generateHACSignalGroups()` if needed
   - Update `generateHACTimelinePhases()` if needed
3. Create example input in `examples/` (e.g., `cauti_planning_input.json`)
4. Test with: `npx ts-node cli/plan.ts examples/cauti_planning_input.json --mock`
5. Validate the generated configuration meets clinical requirements

### Adding New USNWR Metrics

To add a new USNWR metric (e.g., I26):

1. Update `archetype` enum in `schemas/planning-input.schema.json` to include the appropriate USNWR archetype
2. Add metric-specific logic in `plannerAgent.ts`:
   - Add case in `generateUSNWRQuestions()` function for your metric
   - Define 2-5 abstraction questions for the metric
   - Specify evidence_rules, scoring_rules, and phase_ids for each question
   - Update `generateUSNWRSignalGroups()` if domain-specific signals are needed
3. Create example input in `examples/` (e.g., `usnwr_i26_planning_input.json`):
   ```json
   {
     "planning_id": "planning-usnwr-i26-001",
     "concern_id": "I26",
     "archetype": "USNWR_CARDIAC_METRIC",
     "domain": "cardiac_surgery",
     ...
   }
   ```
4. Test with: `npx ts-node cli/plan.ts examples/usnwr_i26_planning_input.json --mock`
5. Validate the generated questions[] array in the config
6. Review with clinical subject matter experts

**Key Pattern**: Each USNWR metric gets one config with multiple questions (e.g., I26_Q1, I26_Q2, I26_Q3), not separate configs per question.

### Enhancing Validation Rules

1. Add rule logic in `validatePlan.ts`:
   - `validateBusinessRules()` for plan-level validation
   - `validateHACConfigBusinessRules()` for config-level validation
   - `validateUSNWRQuestions()` for USNWR question validation
2. Document the rule in code comments
3. Add test cases

---

## 📄 License

[Your License Here]

---

## 👥 Authors

- Clinical Informatics Team
- Model-Forward Clinical Abstraction Platform

---

## 📞 Support

For issues or questions:
- Open an issue in the repository
- Contact: [your-email@hospital.org]

---

**Version:** 1.0.0
**Last Updated:** January 2025
