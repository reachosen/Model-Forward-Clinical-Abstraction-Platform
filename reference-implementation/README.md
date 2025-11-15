# CLABSI Clinical Abstraction - Reference Implementation

## Overview

This is a complete reference implementation of a **model-forward clinical abstraction application** for CLABSI (Central Line-Associated Bloodstream Infection) surveillance and reporting.

The platform demonstrates the full architecture from raw clinical data through AI-powered abstraction to clinician-facing UI.

## Architecture

```
┌─────────────────────┐
│   Clinical Sources  │  Epic Caboodle/Clarity, Devices, Labs
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   SILVER Layer      │  Raw-normalized clinical facts
│  • Patients         │  Simple schemas: encounters, labs, vitals,
│  • Encounters       │  procedures, meds, notes, devices
│  • Labs, Vitals...  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   GOLD Layer        │  Domain-specific derived tables
│  • CLABSI Episodes  │  15+ metrics, timelines, risk factors
│  • Line Days        │  Rule evaluations
│  • Culture Results  │
│  • Risk Factors     │
│  • Timeline         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   GOLD_AI Layer     │  LLM-ready structured payloads
│  • LLM Payloads     │  JSON with: signals, timelines, note bundles,
│    - Signals        │  rule flags, metrics, follow-up questions
│    - Timelines      │
│    - Rule Flags     │
│    - Metrics        │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     │           │
     ▼           ▼
┌─────────┐  ┌────────────┐
│ Vector  │  │ Signal &   │
│ Store   │  │ Abstraction│
│         │  │ Ledger     │
└────┬────┘  └─────┬──────┘
     │             │
     └──────┬──────┘
            │
            ▼
┌─────────────────────┐
│   Data Agent        │  Model-forward data layer
│  • Tool Layer       │  Orchestrates: SQL, rules, vector search,
│  • Planner          │  validation, contradiction detection
│  • LLM Runtime      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Abstraction Agent   │  Clinician-facing layer
│  • Summary Gen      │  Generates: abstractions, summaries
│  • Reasoning        │  Applies: QA rules, guardrails
│  • QA Engine        │  Detects: missing data, contradictions
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   React UI          │  Clinician interface
│  • Case Selector    │  Panels: overview, timeline, signals,
│  • Case View        │  summary, QA, feedback
│  • Timeline         │
│  • Signals          │
│  • QA Panel         │
│  • Feedback         │
└─────────────────────┘
```

## Data Flow

1. **Ingestion**: Clinical data from EHR → SILVER tables (raw facts)
2. **Refinement**: SILVER → GOLD (domain-specific derived metrics)
3. **AI Preparation**: GOLD → GOLD_AI (LLM-ready JSON payloads)
4. **Vectorization**: Payloads → Semantic chunks with embeddings
5. **Ledger**: All signals, decisions, QA → Audit trail
6. **Data Agent**: Fetches data, runs rules, searches vectors
7. **Abstraction Agent**: Generates summaries, runs QA
8. **UI**: Displays case to clinician, collects feedback

## Project Structure

```
reference-implementation/
├── sql/                        # Snowflake SQL schemas
│   ├── silver/                 # Raw clinical facts (7 tables)
│   │   ├── 00_patients.sql
│   │   ├── 01_encounters.sql
│   │   ├── 02_labs.sql
│   │   ├── 03_vitals.sql
│   │   ├── 04_procedures.sql
│   │   ├── 05_medications.sql
│   │   ├── 06_devices.sql
│   │   └── 07_clinical_notes.sql
│   ├── gold/                   # Domain-specific models (6 tables)
│   │   ├── 01_clabsi_episodes.sql
│   │   ├── 02_central_line_days.sql
│   │   ├── 03_blood_culture_results.sql
│   │   ├── 04_infection_risk_factors.sql
│   │   ├── 05_clinical_timeline.sql
│   │   └── 06_clabsi_metrics.sql
│   ├── gold_ai/                # LLM payloads
│   │   ├── 01_clabsi_llm_payloads.sql
│   │   └── 02_build_clabsi_payloads.sql
│   ├── ledger/                 # Audit & vector store
│   │   ├── 01_vector_store.sql
│   │   ├── 02_abstraction_ledger.sql
│   │   ├── 03_qa_results.sql
│   │   └── 04_clinician_feedback.sql
│   └── seed_data/              # Test data (6 patients)
│       ├── 01_test_patients.sql
│       ├── 02_test_encounters.sql
│       ├── 03_test_devices.sql
│       ├── 04_test_labs.sql
│       ├── 05_test_vitals.sql
│       └── 06_test_medications.sql
│
├── python/                     # Python agents & tools
│   ├── chunking.py             # Semantic chunking & vector store
│   ├── agents/
│   │   ├── data_agent.py       # Data Agent (tools + planner)
│   │   └── abstraction_agent.py # Abstraction Agent (summary + QA)
│   └── api/
│       └── simple_api.py       # Flask REST API
│
├── react/                      # React TypeScript UI
│   ├── package.json
│   ├── src/
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript type definitions
│   │   ├── api/
│   │   │   └── client.ts       # API client
│   │   ├── components/
│   │   │   ├── CaseOverview.tsx
│   │   │   ├── TimelinePanel.tsx
│   │   │   ├── SignalsPanel.tsx
│   │   │   ├── QAPanel.tsx
│   │   │   └── FeedbackPanel.tsx
│   │   ├── pages/
│   │   │   ├── CaseListPage.tsx
│   │   │   └── CaseViewPage.tsx
│   │   └── App.tsx
│   └── public/
│
└── README.md                   # This file
```

## Setup & Installation

### Prerequisites

- **Snowflake Account** (for database)
- **Python 3.9+** (for agents & API)
- **Node.js 18+** (for React UI)

### 1. Database Setup (Snowflake)

```sql
-- Create schemas
CREATE SCHEMA SILVER;
CREATE SCHEMA GOLD;
CREATE SCHEMA GOLD_AI;
CREATE SCHEMA LEDGER;

-- Create tables (run in order)
-- SILVER layer
@sql/silver/00_patients.sql
@sql/silver/01_encounters.sql
@sql/silver/02_labs.sql
@sql/silver/03_vitals.sql
@sql/silver/04_procedures.sql
@sql/silver/05_medications.sql
@sql/silver/06_devices.sql
@sql/silver/07_clinical_notes.sql

-- GOLD layer
@sql/gold/01_clabsi_episodes.sql
@sql/gold/02_central_line_days.sql
@sql/gold/03_blood_culture_results.sql
@sql/gold/04_infection_risk_factors.sql
@sql/gold/05_clinical_timeline.sql
@sql/gold/06_clabsi_metrics.sql

-- GOLD_AI layer
@sql/gold_ai/01_clabsi_llm_payloads.sql
@sql/gold_ai/02_build_clabsi_payloads.sql

-- LEDGER
@sql/ledger/01_vector_store.sql
@sql/ledger/02_abstraction_ledger.sql
@sql/ledger/03_qa_results.sql
@sql/ledger/04_clinician_feedback.sql

-- Load test data
@sql/seed_data/01_test_patients.sql
@sql/seed_data/02_test_encounters.sql
@sql/seed_data/03_test_devices.sql
@sql/seed_data/04_test_labs.sql
@sql/seed_data/05_test_vitals.sql
@sql/seed_data/06_test_medications.sql
```

### 2. Python Environment

```bash
cd python

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install flask flask-cors numpy dataclasses-json

# Test the agents
python agents/data_agent.py
python agents/abstraction_agent.py
python chunking.py
```

### 3. Start the API

```bash
cd python/api
python simple_api.py

# API will start on http://localhost:5000
# Test: curl http://localhost:5000/api/health
```

### 4. React UI

```bash
cd react

# Install dependencies
npm install

# Start development server
npm start

# UI will open at http://localhost:3000
```

## Running the Application

### Complete Workflow

1. **Start API** (Terminal 1):
   ```bash
   cd python/api
   python simple_api.py
   ```

2. **Start React UI** (Terminal 2):
   ```bash
   cd react
   npm start
   ```

3. **Open Browser**:
   - Navigate to http://localhost:3000
   - Select a test case (e.g., PAT001 - Clear Positive CLABSI)
   - Review the abstraction:
     - Case Overview (demographics, risk)
     - Timeline (key events)
     - Signals (clinical indicators)
     - Generated Summary
     - QA Results
   - Provide feedback (rating, comments, decision)

## Test Cases

The reference implementation includes 6 synthetic patients demonstrating different scenarios:

| Patient | MRN | Scenario | Expected Outcome |
|---------|-----|----------|------------------|
| PAT001 | MRN100001 | Clear Positive CLABSI | S. aureus bacteremia with central line |
| PAT002 | MRN100002 | Clear Negative | No infection, routine ICU stay |
| PAT003 | MRN100003 | Borderline Case | CoNS (possible contaminant) |
| PAT004 | MRN100004 | Missing Data | Incomplete documentation |
| PAT005 | MRN100005 | Contamination vs Infection | Skin flora, single culture |
| PAT006 | MRN100006 | Complex Multi-Organism | Polymicrobial (E. coli + K. pneumoniae) |

## Key Features

### 1. Data Agent (Model-Forward Data Layer)

**Tools:**
- `fetch_signals()` - Retrieve clinical signals from GOLD_AI
- `fetch_timeline()` - Get clinical timeline
- `evaluate_rules()` - Run CLABSI determination rules
- `vector_search()` - Search semantic chunks
- `detect_contradictions()` - Find logical inconsistencies
- `validate_fidelity()` - Check data quality

**Modes:**
- **TEST**: Uses test patients, writes to test ledger
- **PROD**: Uses production flag, writes to prod ledger

### 2. Abstraction Agent (Clinician-Facing)

**Summary Generation:**
- Key findings extraction
- Risk assessment (LOW, MODERATE, HIGH, CRITICAL)
- Timeline summarization by phase
- Unresolved questions identification
- Recommendations generation

**QA Engine:**
- Required fields validation
- Timeline consistency checks
- Signal-rule alignment
- Confidence thresholds
- Critical data completeness

**QA Statuses:**
- PASS: All checks passed
- WARN: Some issues but not critical
- FAIL: Critical issues found

### 3. React UI

**Panels:**
1. **Case Overview** - Demographics, risk level, CLABSI determination
2. **Timeline** - Chronological events with severity indicators
3. **Signals** - Critical/warning/info clinical signals
4. **Generated Summary** - AI-generated abstraction
5. **QA & Guardrails** - Validation results, issues, recommendations
6. **Feedback** - Clinician rating, comments, final decision

## Extending to Other Domains

This reference implementation can be adapted to other clinical abstraction domains (NAKI, Unplanned Extubation, etc.) by following these steps:

### 1. Update GOLD Layer

**Add domain-specific tables:**
```sql
-- Example for NAKI (Neurologic Injury)
CREATE TABLE GOLD.NAKI_EPISODES (...);
CREATE TABLE GOLD.NEURO_ASSESSMENTS (...);
CREATE TABLE GOLD.IMAGING_RESULTS (...);
```

**Define new metrics:**
- Domain-specific risk factors
- Relevant timelines
- Outcome measures

### 2. Update GOLD_AI Payloads

**Modify payload structure:**
```sql
-- Update signals to include domain-specific indicators
-- Example: GCS scores, pupil reactivity for NAKI
{
  "signals": [
    {
      "signal_name": "GCS_DECLINE",
      "value": "15 → 8",
      "severity": "CRITICAL",
      ...
    }
  ]
}
```

### 3. Update Data Agent Tools

**Add domain-specific tools:**
```python
# In data_agent.py
def fetch_neuro_assessments(self, patient_id, encounter_id):
    """Fetch neurological assessment data"""
    pass

def evaluate_naki_rules(self, patient_id, encounter_id):
    """Evaluate NAKI determination criteria"""
    pass
```

### 4. Update Abstraction Agent

**Modify summary generation:**
```python
# In abstraction_agent.py
class NAKIAbstractionSummary:
    """Domain-specific summary for NAKI"""
    baseline_gcs: int
    nadir_gcs: int
    imaging_findings: List[str]
    naki_category: str  # CONFIRMED, POSSIBLE, RULED_OUT
```

### 5. Update React UI

**Reuse existing components with new props:**
```typescript
// Most components are generic and can be reused
// Only need to update domain-specific terminology

<CaseOverview
  summary={nakiSummary}  // Different summary type
  domainLabel="NAKI"     // Display name
/>

<SignalsPanel
  signals={neuroSignals}  // Different signal types
  domainColors={nakiColors}  // Custom styling
/>
```

**The key architectural components (Timeline, QA Panel, Feedback) remain identical.**

### 6. Benefits of This Architecture

- **Reusable UI Components**: Timeline, QA, Feedback panels work for any domain
- **Reusable Agent Pattern**: Data Agent + Abstraction Agent + QA Engine is domain-agnostic
- **Consistent Data Flow**: SILVER → GOLD → GOLD_AI → Agents → UI
- **Scalable**: Add new domains without rewriting core infrastructure

## API Reference

### Endpoints

**GET /api/health**
```json
{ "status": "healthy", "service": "CLABSI Abstraction API" }
```

**GET /api/cases**
```json
{
  "cases": [
    {
      "patient_id": "PAT001",
      "encounter_id": "ENC001",
      "episode_id": "EP001",
      "mrn": "MRN100001",
      "name": "John Doe",
      "scenario": "Clear Positive CLABSI"
    }
  ],
  "total": 6
}
```

**GET /api/cases/:patient_id**
```json
{
  "summary": { ... },
  "qa_result": { ... },
  "signals": [ ... ],
  "timeline": [ ... ],
  "rule_evaluations": { ... },
  "status": "SUCCESS",
  "mode": "TEST"
}
```

**POST /api/feedback**
```json
{
  "patient_id": "PAT001",
  "encounter_id": "ENC001",
  "feedback_type": "APPROVAL",
  "rating": 5,
  "comments": "Excellent abstraction",
  "final_decision": "CONFIRMED_CLABSI"
}
```

## Production Considerations

### Security
- Add authentication/authorization
- Encrypt sensitive data
- Implement audit logging
- Use HTTPS

### Performance
- Add caching (Redis)
- Optimize SQL queries
- Use connection pooling
- Implement rate limiting

### LLM Integration
- Replace stub embeddings with real models (OpenAI, Sentence Transformers)
- Add actual LLM calls for narrative generation
- Implement prompt engineering for domain-specific summaries

### Monitoring
- Add application logging
- Implement health checks
- Track API metrics
- Monitor QA failures

### Compliance
- Ensure HIPAA compliance
- Implement data retention policies
- Add de-identification for test data
- Track consent and access controls

## Troubleshooting

### API Connection Issues
```bash
# Check if API is running
curl http://localhost:5000/api/health

# Check React environment
# Edit react/.env
REACT_APP_API_URL=http://localhost:5000/api
```

### Database Connection
```python
# Update connection in data_agent.py
# In production, connect to actual Snowflake
import snowflake.connector
conn = snowflake.connector.connect(
    user='YOUR_USER',
    password='YOUR_PASSWORD',
    account='YOUR_ACCOUNT'
)
```

### CORS Issues
```python
# In simple_api.py, CORS is enabled by default
# If issues persist, update allowed origins:
CORS(app, origins=['http://localhost:3000'])
```

## License

This is a reference implementation for educational and demonstration purposes.

## Support

For questions or issues, refer to the main repository documentation at:
https://github.com/Model-Forward-Clinical-Abstraction-Platform

---

**Built with:**
- Snowflake (data platform)
- Python (agents & API)
- React + TypeScript (UI)
- Flask (API framework)
