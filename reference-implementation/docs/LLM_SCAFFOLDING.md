# LLM Scaffolding Guide - Build New Domains Step-by-Step

This guide is designed for LLMs (and humans!) to quickly scaffold new clinical abstraction domains by following a clear checklist and using templates.

## Overview

To add a new domain (e.g., NAKI, Unplanned Extubation), you follow this pattern:

```
1. Define domain in templates/domain_config.json
2. Generate SQL from templates
3. Generate Python agents from templates
4. Update React UI labels
5. Test with sample data
```

**Estimated time:** 2-4 hours for a complete new domain

## Step-by-Step Checklist

### □ Step 1: Domain Configuration (5 minutes)

Create `templates/domains/YOUR_DOMAIN/config.json`:

```json
{
  "domain_name": "NAKI",
  "domain_full_name": "Neurologically Acquired Kidney Injury",
  "description": "Detection and abstraction of neurologic injuries during hospitalization",

  "key_signals": [
    {
      "name": "GCS_DECLINE",
      "description": "Glasgow Coma Scale decline >2 points",
      "severity": "CRITICAL",
      "source_table": "VITALS"
    },
    {
      "name": "PUPIL_ASYMMETRY",
      "description": "New pupil size asymmetry",
      "severity": "WARNING",
      "source_table": "ASSESSMENTS"
    },
    {
      "name": "IMAGING_ABNORMALITY",
      "description": "New finding on CT/MRI",
      "severity": "CRITICAL",
      "source_table": "IMAGING"
    }
  ],

  "timeline_phases": [
    "BASELINE",
    "INJURY_EVENT",
    "IMMEDIATE_POST",
    "TREATMENT",
    "RECOVERY"
  ],

  "determination_rules": [
    {
      "rule_name": "baseline_neuro_documented",
      "description": "Baseline neurologic exam documented",
      "required": true
    },
    {
      "rule_name": "gcs_decline_gt_2",
      "description": "GCS decline greater than 2 points",
      "required": true
    },
    {
      "rule_name": "no_sedation_confound",
      "description": "Change not attributable to sedation",
      "required": true
    },
    {
      "rule_name": "meets_naki_criteria",
      "description": "Meets organizational NAKI criteria",
      "required": true
    }
  ],

  "key_metrics": [
    "baseline_gcs",
    "nadir_gcs",
    "time_to_recognition_hours",
    "imaging_performed",
    "neurology_consulted",
    "intervention_performed"
  ]
}
```

**File location:** `templates/domains/NAKI/config.json`

---

### □ Step 2: Generate SQL Schemas (30 minutes)

Use the template generator:

```bash
python templates/generate_domain.py --domain NAKI --output sql/
```

**Or manually create based on CLABSI pattern:**

#### 2a. GOLD.NAKI_EPISODES (Copy from `templates/sql/gold_episodes_template.sql`)

```sql
-- TODO: Replace DOMAIN_NAME with your domain
-- TODO: Add domain-specific fields

CREATE OR REPLACE TABLE GOLD.NAKI_EPISODES (
    episode_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50) NOT NULL,

    -- Episode definition
    episode_start_date DATE,
    episode_end_date DATE,
    episode_status VARCHAR(50),  -- POTENTIAL, CONFIRMED, RULED_OUT

    -- TODO: Add domain-specific core fields
    baseline_gcs INTEGER,
    nadir_gcs INTEGER,
    gcs_decline INTEGER,
    injury_mechanism VARCHAR(200),

    -- TODO: Add determination criteria flags
    has_baseline_exam BOOLEAN,
    gcs_decline_gt_2 BOOLEAN,
    imaging_performed BOOLEAN,
    meets_criteria BOOLEAN,

    -- Risk assessment
    risk_score FLOAT,
    risk_category VARCHAR(20),

    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

#### 2b. GOLD.NAKI_ASSESSMENTS (Domain-specific detail table)

```sql
CREATE OR REPLACE TABLE GOLD.NAKI_ASSESSMENTS (
    assessment_id VARCHAR(50) PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    encounter_id VARCHAR(50),
    episode_id VARCHAR(50),

    assessment_datetime TIMESTAMP_NTZ,

    -- Neurologic exam
    gcs_total INTEGER,
    gcs_eye INTEGER,
    gcs_verbal INTEGER,
    gcs_motor INTEGER,

    -- Pupils
    pupil_right_size FLOAT,
    pupil_left_size FLOAT,
    pupil_right_reactive BOOLEAN,
    pupil_left_reactive BOOLEAN,

    -- Other findings
    focal_deficits VARIANT,  -- JSON array
    level_of_consciousness VARCHAR(50),

    calculated_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
);
```

#### 2c. Update GOLD_AI Payload Structure

```sql
-- Add to GOLD_AI.NAKI_LLM_PAYLOADS
-- Payload structure includes:
{
  "signals": [...],  -- GCS declines, imaging findings, etc.
  "timelines": [...],  -- Baseline, injury, treatment phases
  "rule_flags": {
    "baseline_neuro_documented": true,
    "gcs_decline_gt_2": true,
    "no_sedation_confound": true,
    "meets_naki_criteria": true
  },
  "metrics": {
    "baseline_gcs": 15,
    "nadir_gcs": 8,
    "time_to_recognition_hours": 2.5
  }
}
```

---

### □ Step 3: Generate Python Data Agent Tools (45 minutes)

Copy `templates/python/data_agent_template.py` → `python/agents/naki_data_agent.py`

**Replace TODO markers:**

```python
# TODO: Update class name
class NAKIDataAgentTools:
    """Tools for NAKI domain"""

    def fetch_signals(self, patient_id: str, encounter_id: str):
        """
        TODO: Fetch NAKI-specific signals
        - GCS declines
        - Pupil changes
        - Imaging findings
        - Interventions
        """
        signals = [
            {
                "signal_id": "SIG001",
                "signal_name": "GCS_DECLINE",
                "signal_type": "VITAL",
                "value": "15 → 8",
                "severity": "CRITICAL",
                "rationale": "Glasgow Coma Scale declined by 7 points",
                "timestamp": "2024-01-15T14:00:00",
                "confidence": 0.95
            },
            # TODO: Add more domain-specific signals
        ]
        return ToolResult("fetch_signals", True, signals)

    def evaluate_rules(self, patient_id: str, encounter_id: str):
        """
        TODO: Evaluate NAKI determination rules
        Based on your config.json determination_rules
        """
        rule_results = {
            "baseline_neuro_documented": {
                "result": True,
                "evidence": "Baseline GCS 15 documented on admission",
                "confidence": 1.0
            },
            "gcs_decline_gt_2": {
                "result": True,
                "evidence": "GCS declined from 15 to 8 (7 point decline)",
                "confidence": 0.95
            },
            # TODO: Add other rules from config
        }
        return ToolResult("evaluate_rules", True, rule_results)
```

---

### □ Step 4: Generate Python Abstraction Agent (30 minutes)

Copy `templates/python/abstraction_agent_template.py` → `python/agents/naki_abstraction_agent.py`

**Update summary generation:**

```python
@dataclass
class NAKIAbstractionSummary:
    """TODO: Customize for NAKI domain"""

    # Standard fields (keep these)
    patient_id: str
    encounter_id: str
    episode_id: str
    mrn: str
    age: int
    gender: str

    # TODO: Add domain-specific fields
    baseline_gcs: int
    nadir_gcs: int
    gcs_decline: int
    injury_mechanism: str
    imaging_findings: List[str] = field(default_factory=list)

    # TODO: Customize determination
    likely_naki: bool = False
    meets_criteria: bool = False

    # Standard fields (keep these)
    key_findings: List[str] = field(default_factory=list)
    risk_level: str = "UNKNOWN"
    recommended_actions: List[str] = field(default_factory=list)
```

**Update QA rules:**

```python
def _check_naki_specific_data(self, data_output):
    """TODO: Add NAKI-specific QA checks"""

    # Check for baseline assessment
    if not self._has_baseline_gcs(data_output):
        return {
            "rule_name": "baseline_assessment",
            "status": "FAIL",
            "message": "Missing baseline neurologic assessment"
        }

    # Check for GCS documentation
    if not self._has_gcs_trend(data_output):
        return {
            "rule_name": "gcs_trend",
            "status": "WARN",
            "message": "Incomplete GCS trend documentation"
        }

    # TODO: Add more domain-specific checks

    return {
        "rule_name": "naki_specific_data",
        "status": "PASS",
        "message": "All NAKI-specific data present"
    }
```

---

### □ Step 5: Update API Endpoints (15 minutes)

Edit `python/api/simple_api.py`:

```python
# TODO: Import your new agent
from agents.naki_abstraction_agent import NAKIAbstractionAgent

# TODO: Add test cases
NAKI_TEST_CASES = [
    {
        "patient_id": "NAKI001",
        "encounter_id": "ENC001",
        "episode_id": "EP001",
        "mrn": "MRN200001",
        "name": "Alice Johnson",
        "scenario": "Clear NAKI - Post-surgical GCS decline"
    },
    # TODO: Add more test cases
]

# TODO: Add domain selection
@app.route('/api/domains', methods=['GET'])
def list_domains():
    return jsonify({
        "domains": ["CLABSI", "NAKI"],  # TODO: Add your domain
        "default": "CLABSI"
    })

# TODO: Add domain-specific endpoint
@app.route('/api/naki/cases/<patient_id>', methods=['GET'])
def get_naki_case(patient_id):
    agent = NAKIAbstractionAgent(mode=ExecutionMode.TEST)
    case_view = agent.generate_case_view(patient_id, ...)
    return jsonify(asdict(case_view))
```

---

### □ Step 6: Update React UI (30 minutes)

**Minimal changes needed!** Most components are reusable.

#### 6a. Add domain to types:

```typescript
// src/types/index.ts
export type DomainType = 'CLABSI' | 'NAKI' | 'UE';  // TODO: Add yours

export interface NAKIAbstractionSummary extends AbstractionSummary {
  // TODO: Add domain-specific fields
  baseline_gcs: number;
  nadir_gcs: number;
  gcs_decline: number;
  injury_mechanism: string;
}
```

#### 6b. Update API client:

```typescript
// src/api/client.ts
export const api = {
  // TODO: Add domain-specific method
  async getNAKICase(patientId: string): Promise<CaseView> {
    const response = await apiClient.get(`/naki/cases/${patientId}`);
    return response.data;
  },
};
```

#### 6c. Customize labels (optional):

```typescript
// src/components/CaseOverview.tsx
const domainConfig = {
  CLABSI: {
    title: "CLABSI Risk Assessment",
    determinationLabel: "Likely CLABSI:",
  },
  NAKI: {
    title: "NAKI Risk Assessment",
    determinationLabel: "Likely NAKI:",
  },
  // TODO: Add your domain
};
```

**That's it!** All other React components work without changes.

---

### □ Step 7: Add Test Data (30 minutes)

Create synthetic test cases in SQL:

```sql
-- sql/seed_data/naki_test_patients.sql

-- Patient 1: Clear positive NAKI
INSERT INTO SILVER.PATIENTS VALUES (
    'NAKI001', 'MRN200001', 'Alice', 'Johnson',
    '1975-06-15', 'FEMALE', 'White', 'Not Hispanic'
);

-- TODO: Add encounter, assessments, imaging, etc.
```

---

### □ Step 8: Test Everything (30 minutes)

```bash
# 1. Start API
./start-api.sh

# 2. Test API endpoints
curl http://localhost:5000/api/domains
curl http://localhost:5000/api/naki/cases/NAKI001

# 3. Start UI
./start-ui.sh

# 4. Manual testing:
# - Select NAKI domain
# - Review test case NAKI001
# - Check all panels display correctly
# - Submit feedback
# - Verify feedback recorded
```

---

## Complete Checklist

Print this and check off as you go:

```
Domain Setup:
□ Created config.json
□ Defined key signals
□ Defined timeline phases
□ Defined determination rules
□ Defined key metrics

SQL Layer:
□ Created GOLD.{DOMAIN}_EPISODES table
□ Created domain-specific detail tables (2-3 tables)
□ Created GOLD_AI.{DOMAIN}_LLM_PAYLOADS table
□ Created build procedure for payloads
□ Added to LEDGER tables (reuse existing)
□ Created test data (5-10 patients)

Python Layer:
□ Created {domain}_data_agent.py
□ Implemented fetch_signals()
□ Implemented evaluate_rules()
□ Implemented domain-specific tools
□ Created {domain}_abstraction_agent.py
□ Defined domain-specific summary dataclass
□ Implemented summary generation
□ Implemented QA rules (5+ rules)
□ Updated simple_api.py with new endpoints
□ Added test cases to API

React Layer:
□ Updated type definitions
□ Updated API client
□ Updated domain configuration
□ Tested all existing components work
□ Added domain selector (optional)
□ Customized labels/styling (optional)

Testing:
□ API health check passes
□ Can fetch cases list
□ Can fetch case details
□ Can submit feedback
□ UI loads without errors
□ All panels display data
□ QA validation runs
□ Feedback submission works

Documentation:
□ Updated README with new domain
□ Added domain-specific notes
□ Documented any custom rules
□ Added example screenshots
```

---

## Templates Available

All templates are in the `templates/` directory:

- `templates/sql/gold_episodes_template.sql`
- `templates/sql/gold_detail_template.sql`
- `templates/sql/gold_ai_payload_template.sql`
- `templates/python/data_agent_template.py`
- `templates/python/abstraction_agent_template.py`
- `templates/python/test_cases_template.py`
- `templates/react/domain_config_template.ts`

---

## Example: Complete NAKI Implementation

See `examples/NAKI_COMPLETE/` for a fully worked example with all files.

---

## Pro Tips for LLMs

1. **Start with config.json** - Define everything there first
2. **Copy-paste, don't rewrite** - Use CLABSI as template
3. **Search and replace** - `CLABSI` → `NAKI` throughout
4. **Test incrementally** - Don't build everything at once
5. **Reuse UI components** - 90% of React code is reusable
6. **Focus on domain logic** - That's what's unique

---

## Time Estimates

| Task | Time | Complexity |
|------|------|------------|
| Config definition | 15 min | Easy |
| SQL schemas | 45 min | Medium |
| Python Data Agent | 45 min | Medium |
| Python Abstraction Agent | 45 min | Medium |
| API updates | 15 min | Easy |
| React updates | 30 min | Easy |
| Test data | 30 min | Easy |
| Testing | 30 min | Easy |
| **Total** | **~4 hours** | Medium |

**With templates and this guide, an LLM can scaffold a new domain in 2-4 hours.**

---

## Next Steps

After completing a domain:

1. Test with real clinical data
2. Refine signals and rules
3. Add LLM integration for narrative generation
4. Deploy to staging environment
5. Gather clinician feedback
6. Iterate and improve

---

**Happy building! 🚀**
