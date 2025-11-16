# Developer Guide - Adding New Domains

**Complete Guide to Adding New Clinical Domains in ~30 Minutes**

This guide walks through adding a new healthcare-acquired condition domain to CA Factory. We'll use **Surgical Site Infection (SSI)** as our example.

---

## What You'll Learn

By following this guide, you'll:
- ✅ Add a new domain (SSI) to the system
- ✅ Create sample case data in JSON format
- ✅ Configure the frontend to display the new domain
- ✅ See your new domain appear in the UI
- ✅ Understand the complete data flow

**Time Required:** ~30 minutes

**Difficulty:** Beginner-friendly

---

## Overview: The "30-Minute New Domain" Pattern

CA Factory is designed to support new clinical domains **without code changes**. You only need to:

1. **Add domain config** → Update `domains.config.json`
2. **Create sample data** → Add JSON case file
3. **Restart services** → See it in the UI

Optional (for full functionality):
4. **Create backend config** → Add NHSN rules and knowledge base
5. **Test end-to-end** → Run E2E test

---

## Prerequisites

Before starting, ensure you have:
- ✅ CA Factory running locally (see `QUICKSTART.md`)
- ✅ Backend running on `http://localhost:8000`
- ✅ Frontend running on `http://localhost:3000`
- ✅ Text editor (VS Code, etc.)

---

## Step 1: Add SSI Domain to Frontend Config

**File:** `reference-implementation/config/domains.config.json`

**What we're doing:** Adding SSI to the list of available domains.

### 1.1 Open the domains config file

```bash
cd reference-implementation/config
code domains.config.json  # or vim, nano, etc.
```

### 1.2 Find the `domains` array

You'll see existing domains like CLABSI and CAUTI:

```json
{
  "domains": [
    {
      "id": "clabsi",
      "name": "CLABSI",
      ...
    },
    {
      "id": "cauti",
      "name": "CAUTI",
      ...
    }
  ]
}
```

### 1.3 Add SSI domain

Insert this new domain object into the `domains` array:

```json
{
  "id": "ssi",
  "name": "SSI",
  "fullName": "Surgical Site Infection",
  "category": "Healthcare-Acquired Conditions",
  "enabled": true,
  "description": "Detection and evaluation of surgical site infections using NHSN criteria",
  "nhsnCategory": "SSI",
  "deviceType": null,
  "config": {
    "ruleCount": 4,
    "requiredRules": 4,
    "supportedProcedures": ["COLO", "HYST", "CBGB", "CHOL"],
    "primaryCulture": "wound_culture",
    "minPostOpDays": 0,
    "maxPostOpDays": 30
  },
  "ui": {
    "primaryColor": "#7c3aed",
    "icon": "bandage",
    "displayOrder": 3
  },
  "endpoints": {
    "rules": "/v1/case/{patientId}/rules?domain=SSI",
    "ask": "/v1/case/{patientId}/ask",
    "evidence": "/v1/case/{patientId}/evidence"
  },
  "sampleCases": [
    {
      "id": "PAT-201",
      "name": "SSI Positive - Post-COLO",
      "file": "data/ssi/case-001.json",
      "determination": "SSI_CONFIRMED",
      "confidence": 0.90
    }
  ],
  "metadata": {
    "createdAt": "2024-11-16T10:00:00Z",
    "lastUpdated": "2024-11-16T10:00:00Z",
    "version": "1.0.0"
  }
}
```

**Key Fields to Customize:**
- `id`: Unique domain identifier (lowercase, no spaces)
- `name`: Short display name
- `fullName`: Complete name
- `supportedProcedures`: NHSN procedure codes (COLO = Colon surgery)
- `primaryCulture`: Main culture type for this domain
- `ui.primaryColor`: Hex color for UI theming
- `ui.icon`: Icon name (from your icon library)
- `sampleCases`: Reference to sample data files

### 1.4 Save the file

```bash
# Verify JSON is valid
cat domains.config.json | jq . > /dev/null && echo "✓ Valid JSON"
```

**⏱️ Time elapsed: ~5 minutes**

---

## Step 2: Create Sample SSI Case Data

**File:** `reference-implementation/data/ssi/case-001.json`

**What we're doing:** Creating a realistic SSI case that matches the GOLD_AI Demo Schema.

### 2.1 Create the directory

```bash
mkdir -p reference-implementation/data/ssi
```

### 2.2 Create the case file

```bash
cd reference-implementation/data/ssi
code case-001.json  # or your preferred editor
```

### 2.3 Add the SSI case data

Copy this complete SSI case (based on NHSN criteria):

```json
{
  "caseId": "CASE-SSI-001",
  "patientId": "PAT-201",
  "encounterId": "ENC-201",
  "infectionType": "SSI",
  "facility": {
    "id": "HOSP-001",
    "name": "Memorial Hospital",
    "unit": "Surgical Ward 3A"
  },
  "patient": {
    "mrn": "MRN-345678",
    "age": 65,
    "gender": "F"
  },
  "timeline": {
    "admissionDate": "2024-03-01",
    "dischargeDate": "2024-03-06",
    "eventDate": "2024-03-11",
    "daysSinceAdmission": 10
  },
  "devices": {
    "surgicalProcedure": {
      "procedureType": "COLO",
      "procedureDate": "2024-03-01",
      "procedureTime": "08:00:00",
      "surgeon": "Dr. Anderson",
      "woundClass": "clean-contaminated",
      "duration": 240,
      "daysPostOp": 10,
      "incisionType": "laparoscopic_converted",
      "closureMethod": "primary"
    }
  },
  "labs": [
    {
      "id": "LAB-201",
      "type": "wound_culture",
      "collectionDate": "2024-03-11",
      "collectionTime": "14:00:00",
      "resultDate": "2024-03-12",
      "organism": "Staphylococcus aureus",
      "organismType": "recognized_pathogen",
      "growth": "Positive",
      "sampleType": "Wound drainage"
    }
  ],
  "clinicalSignals": [
    {
      "id": "SIG-201",
      "type": "vital_sign",
      "name": "temperature",
      "timestamp": "2024-03-11T06:00:00Z",
      "value": 38.5,
      "unit": "°C",
      "abnormal": true
    },
    {
      "id": "SIG-202",
      "type": "symptom",
      "name": "incisional_pain",
      "timestamp": "2024-03-10T10:00:00Z",
      "value": "Severe (8/10)",
      "abnormal": true
    },
    {
      "id": "SIG-203",
      "type": "symptom",
      "name": "incisional_erythema",
      "timestamp": "2024-03-11T08:00:00Z",
      "value": "Present, 4cm diameter",
      "abnormal": true
    },
    {
      "id": "SIG-204",
      "type": "symptom",
      "name": "purulent_drainage",
      "timestamp": "2024-03-11T08:00:00Z",
      "value": "Present",
      "abnormal": true
    },
    {
      "id": "SIG-205",
      "type": "lab_value",
      "name": "wbc",
      "timestamp": "2024-03-11T09:00:00Z",
      "value": 15.5,
      "unit": "10^3/μL",
      "abnormal": true
    }
  ],
  "events": [
    {
      "id": "EVT-201",
      "type": "procedure",
      "name": "Laparoscopic Colectomy (converted to open)",
      "timestamp": "2024-03-01T08:00:00Z",
      "performedBy": "Dr. Anderson",
      "location": "OR 3",
      "details": {
        "indication": "Colon cancer",
        "procedureCode": "COLO",
        "woundClass": "clean-contaminated",
        "duration": 240,
        "complications": "Converted to open due to adhesions"
      }
    },
    {
      "id": "EVT-202",
      "type": "symptom_onset",
      "name": "Incisional Pain Onset",
      "timestamp": "2024-03-10T10:00:00Z",
      "performedBy": "Patient report",
      "location": "Home"
    },
    {
      "id": "EVT-203",
      "type": "symptom_onset",
      "name": "Wound Drainage Noted",
      "timestamp": "2024-03-11T08:00:00Z",
      "performedBy": "Patient",
      "location": "Home"
    },
    {
      "id": "EVT-204",
      "type": "readmission",
      "name": "Emergency Department Visit",
      "timestamp": "2024-03-11T12:00:00Z",
      "performedBy": "ED Team",
      "location": "Emergency Department"
    }
  ],
  "notes": [
    {
      "id": "NOTE-201",
      "type": "procedure_note",
      "timestamp": "2024-03-01T12:00:00Z",
      "author": "Dr. Anderson",
      "content": "Laparoscopic colectomy performed for sigmoid colon cancer. Procedure converted to open approach due to dense adhesions from prior surgery. Total operative time 4 hours. Clean-contaminated wound. Fascia closed with running PDS, skin closed with staples. Patient tolerated procedure well."
    },
    {
      "id": "NOTE-202",
      "type": "discharge_summary",
      "timestamp": "2024-03-06T14:00:00Z",
      "author": "Dr. Lee",
      "content": "65F POD5 from colectomy. Incision clean, dry, intact. Pain well controlled. Tolerating regular diet. Bowel function returning. Discharged home with wound care instructions. Follow-up in 2 weeks for staple removal."
    },
    {
      "id": "NOTE-203",
      "type": "emergency_note",
      "timestamp": "2024-03-11T12:30:00Z",
      "author": "Dr. Martinez, ED",
      "content": "65F POD10 from colectomy presents with incisional pain, redness, and purulent drainage from wound. Fever to 38.5°C at home. On exam: 4cm area of erythema surrounding incision, purulent drainage from inferior aspect, wound dehiscence with 2cm opening. WBC 15.5. Clinical diagnosis: surgical site infection. Wound culture obtained. Started on IV vancomycin and piperacillin-tazobactam. Admitted for IV antibiotics and wound care."
    },
    {
      "id": "NOTE-204",
      "type": "microbiology_result",
      "timestamp": "2024-03-12T16:00:00Z",
      "author": "Microbiology Lab",
      "content": "Wound culture from surgical site positive for Staphylococcus aureus (MSSA). Susceptible to oxacillin, cefazolin, vancomycin. Adjust antibiotics per sensitivities."
    }
  ],
  "nhsnEvaluation": {
    "dateOfEvent": "2024-03-11",
    "infectionWindow": {
      "start": "2024-03-01",
      "end": "2024-03-31"
    },
    "deviceDaysAtEvent": null,
    "criteriaMet": {
      "withinTimeframe": true,
      "purulentDrainage": true,
      "positiveCulture": true,
      "surgeonDiagnosis": true,
      "clinicalSigns": true
    },
    "determination": "SSI_CONFIRMED",
    "confidence": 0.90,
    "rationale": "Patient meets NHSN criteria for superficial incisional SSI: occurred within 30 days of COLO procedure, involves skin/subcutaneous tissue, presents with purulent drainage, positive wound culture (S. aureus), and clinical signs of infection (pain, erythema, fever). Surgeon diagnosed SSI and initiated treatment."
  },
  "riskFactors": [
    {
      "factor": "Clean-contaminated wound",
      "present": true
    },
    {
      "factor": "Prolonged operative time (>3 hours)",
      "present": true
    },
    {
      "factor": "Conversion to open procedure",
      "present": true
    },
    {
      "factor": "Age >60",
      "present": true
    }
  ],
  "metadata": {
    "createdAt": "2024-11-16T10:00:00Z",
    "updatedAt": "2024-11-16T10:00:00Z",
    "version": "1.0.0",
    "source": "mock_data"
  }
}
```

### 2.4 Validate the JSON

```bash
# Check if JSON is valid
cat case-001.json | jq . > /dev/null && echo "✓ Valid JSON"

# Pretty-print to verify structure
cat case-001.json | jq '.patient, .nhsnEvaluation.determination'
```

**What Makes This SSI-Specific:**
- ✅ `devices.surgicalProcedure` instead of `centralLine` or `urinaryCatheter`
- ✅ `labs` contains `wound_culture` instead of blood/urine cultures
- ✅ `clinicalSignals` includes wound-specific symptoms (purulent drainage, erythema)
- ✅ `nhsnEvaluation.criteriaMet` uses SSI-specific criteria
- ✅ Timeline shows post-operative infection (POD 10)

**⏱️ Time elapsed: ~15 minutes**

---

## Step 3: Test in the UI

### 3.1 Restart the frontend

```bash
# In your frontend terminal
# Press Ctrl+C to stop
npm start
```

The frontend will reload and detect the new domain.

### 3.2 Open the browser

Navigate to: `http://localhost:3000`

### 3.3 Verify SSI appears

You should see:
1. **Domain selector** now includes SSI (purple badge)
2. **Case list** shows "PAT-201: SSI Positive"
3. **SSI case** is clickable

### 3.4 Click on SSI case

You should see:
- ✅ Patient details (65F, post-COLO)
- ✅ Timeline showing surgery → symptoms → readmission
- ✅ Clinical signals (fever, wound drainage)
- ✅ NHSN determination: SSI_CONFIRMED (90% confidence)

**⏱️ Time elapsed: ~20 minutes**

---

## Step 4: Add Backend Configuration (Optional)

For full functionality (rule evaluation, Q&A), add backend config.

### 4.1 Create SSI backend project

```bash
cd backend
python cli/ca_factory_cli.py init ssi \
  --name "Surgical Site Infection Detection" \
  --domain "Healthcare-Acquired Conditions" \
  --description "NHSN SSI criteria evaluation"
```

This creates:
```
backend/configs/projects/ssi/
├── manifest.json
├── agent_config.json
├── rules.json          # ← Add NHSN SSI rules here
├── knowledge_base.json # ← Add SSI domain knowledge
├── prompts.json
├── tasks.json
├── tools.json
├── schemas.json
└── golden_corpus.json
```

### 4.2 Define SSI rules

**File:** `backend/configs/projects/ssi/rules.json`

Add NHSN SSI criteria:

```json
{
  "rule_library": {
    "domain": "SSI",
    "version": "1.0.0",
    "rules": [
      {
        "rule_id": "SSI-001",
        "rule_name": "Infection within 30 days of procedure",
        "category": "temporal",
        "priority": "required",
        "description": "SSI must occur within 30 days of operative procedure",
        "evaluation_logic": {
          "type": "temporal_calculation",
          "formula": "days_post_op = event_date - procedure_date",
          "condition": "days_post_op <= 30"
        }
      },
      {
        "rule_id": "SSI-002",
        "rule_name": "Involves skin or subcutaneous tissue",
        "category": "anatomical",
        "priority": "required",
        "description": "Superficial incisional SSI involves only skin and subcutaneous tissue"
      },
      {
        "rule_id": "SSI-003",
        "rule_name": "Purulent drainage from incision",
        "category": "clinical",
        "priority": "required",
        "description": "Patient has purulent drainage from superficial incision"
      },
      {
        "rule_id": "SSI-004",
        "rule_name": "Positive culture from wound",
        "category": "laboratory",
        "priority": "optional",
        "description": "Organisms isolated from aseptically obtained culture of fluid or tissue from superficial incision"
      }
    ]
  }
}
```

### 4.3 Update knowledge base

**File:** `backend/configs/projects/ssi/knowledge_base.json`

```json
{
  "knowledge_base": {
    "domain": "SSI",
    "chunks": [
      {
        "chunk_id": "nhsn_ssi_criteria",
        "title": "NHSN SSI Definition",
        "content": "Surgical Site Infection (SSI) is classified as superficial incisional, deep incisional, or organ/space. Superficial incisional SSI occurs within 30 days after procedure, involves only skin and subcutaneous tissue, and has at least one of: purulent drainage, positive culture, signs of infection, or surgeon diagnosis.",
        "tags": ["SSI", "NHSN", "definition"],
        "auto_prime": true
      }
    ]
  }
}
```

### 4.4 Test with backend

```bash
# Switch to SSI project
export CA_FACTORY_PROJECT=ssi

# Restart backend
python api/main.py
```

### 4.5 Test rule evaluation

```bash
curl "http://localhost:8000/v1/case/PAT-201/rules?domain=SSI" | jq .
```

You should see SSI rules evaluated!

**⏱️ Time elapsed: ~30 minutes**

---

## What Just Happened?

You successfully:

1. ✅ **Added SSI domain config** - Frontend now knows about SSI
2. ✅ **Created sample SSI case** - Real patient data following GOLD_AI schema
3. ✅ **Saw it in the UI** - Domain selector, case list, case view all work
4. ✅ **Added backend rules** (optional) - Full NHSN criteria evaluation

**Without changing any source code!**

---

## The Domain-Agnostic Architecture

This works because:

### Frontend (React)
- `domains.config.json` tells UI what domains exist
- UI components read domain config dynamically
- Case rendering adapts to each domain's schema
- No hard-coded domain logic

### Backend (Python)
- Project configs in `backend/configs/projects/{domain}/`
- ConfigLoader loads any project dynamically
- Agents execute based on loaded config
- No domain-specific code in core

### Data Schema
- GOLD_AI Demo Schema v1.0.0 supports all domains
- Domain differences handled via `devices`, `labs`, `nhsnEvaluation`
- Single JSON structure, domain-specific fields

---

## Common Customizations

### Different Colors/Icons

In `domains.config.json`:
```json
"ui": {
  "primaryColor": "#10b981",  // Green
  "icon": "scissors",         // Different icon
  "displayOrder": 5
}
```

### Multiple Sample Cases

In `domains.config.json`:
```json
"sampleCases": [
  {
    "id": "PAT-201",
    "name": "SSI Positive - COLO",
    "file": "data/ssi/case-001.json",
    "determination": "SSI_CONFIRMED"
  },
  {
    "id": "PAT-202",
    "name": "SSI Negative - Clean Wound",
    "file": "data/ssi/case-002.json",
    "determination": "NOT_SSI"
  }
]
```

Then create `data/ssi/case-002.json`.

### Different NHSN Criteria

Each domain has unique criteria in `criteriaMet`:

**CLABSI:**
```json
"criteriaMet": {
  "centralLinePresent": true,
  "lineInPlace2Days": true,
  "positiveBloodCulture": true
}
```

**SSI:**
```json
"criteriaMet": {
  "withinTimeframe": true,
  "purulentDrainage": true,
  "positiveCulture": true
}
```

**VAP (future):**
```json
"criteriaMet": {
  "ventilatorPresent": true,
  "ventialtor2Days": true,
  "radiographicEvidence": true
}
```

---

## Adding More Domains

Follow the same pattern for:

### VAP (Ventilator-Associated Pneumonia)
- Domain ID: `vap`
- Device: `ventilator`
- Primary culture: `respiratory_culture`
- Timeline: ventilator days

### MDRO (Multidrug-Resistant Organisms)
- Domain ID: `mdro`
- Device: none
- Primary culture: `any_culture`
- Focus: organism resistance patterns

### CDI (Clostridioides difficile Infection)
- Domain ID: `cdi`
- Device: none
- Primary culture: `stool_test`
- Timeline: prior antibiotic use

---

## Exporting from Snowflake (Future)

When production mode is ready, export SSI cases from Snowflake:

```python
# Python exporter
from ca_factory.exporters.snowflake import SnowflakeExporter

exporter = SnowflakeExporter()

# Export SSI case
case_data = exporter.export_case(
    patient_id="PAT-201",
    domain="SSI",
    output_format="json"
)

# Saves to: data/ssi/PAT-201.json
```

The exporter maps Snowflake tables to GOLD_AI schema automatically.

---

## Testing Your New Domain

### Manual Testing
1. Check domain appears in UI dropdown
2. Verify case loads without errors
3. Check timeline displays correctly
4. Test "Ask the Case" feature
5. Verify rule evaluation (if backend configured)

### Automated Testing

Create test:
```bash
# backend/tests/test_ssi.py
import pytest
from ca_factory.config.loader import ConfigLoader

def test_ssi_config_loads():
    loader = ConfigLoader("backend/configs")
    config = loader.load_project("ssi", validate=True)
    assert config["project_domain"] == "SSI"
    assert len(config["agent_profiles"]) > 0
```

Run:
```bash
pytest backend/tests/test_ssi.py
```

---

## Troubleshooting

### Domain doesn't appear in UI

**Check:**
1. Is `enabled: true` in `domains.config.json`?
2. Did you restart the frontend?
3. Check browser console for errors
4. Verify JSON syntax: `cat domains.config.json | jq .`

### Case data doesn't load

**Check:**
1. Does `data/ssi/case-001.json` exist?
2. Is the `file` path correct in `sampleCases`?
3. Is JSON valid?
4. Check required fields are present

### Backend errors

**Check:**
1. Does `backend/configs/projects/ssi/` exist?
2. Is `CA_FACTORY_PROJECT=ssi` set?
3. Check backend logs for errors
4. Validate config: `python cli/ca_factory_cli.py validate ssi`

---

## Summary

**Adding a new domain to CA Factory requires:**

| Step | Time | Difficulty | Required? |
|------|------|------------|-----------|
| Add to domains.config.json | 5 min | Easy | ✅ Yes |
| Create sample JSON case | 10 min | Easy | ✅ Yes |
| Test in UI | 5 min | Easy | ✅ Yes |
| Create backend config | 10 min | Medium | ⬜ Optional |
| Add NHSN rules | 15 min | Medium | ⬜ Optional |
| E2E testing | 10 min | Easy | ⬜ Optional |

**Total for basic integration: ~20 minutes**
**Total for full integration: ~55 minutes**

The domain-agnostic architecture makes this possible without touching any core code!

---

## Next Steps

- 📖 Read `docs/GOLD_AI_DEMO_SCHEMA.md` for complete schema reference
- 🔧 See `backend/configs/README.md` for advanced configuration
- 🧪 Run `backend/tests/e2e_demo_test.py` for E2E testing examples
- 📊 Check `docs/ARCHITECTURE_TO_CODE.md` to understand the architecture

---

## Questions?

- **Schema questions**: See `docs/GOLD_AI_DEMO_SCHEMA.md`
- **Configuration**: See `backend/configs/README.md`
- **API usage**: See `docs/API_REFERENCE.md`
- **Issues**: Open a GitHub issue with tag `new-domain`

Happy domain-building! 🎉
