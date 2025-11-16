# GOLD_AI Demo Schema v1.0.0

**Official JSON Schema for CA Factory Clinical Cases**

This document defines the canonical data contract for clinical case payloads in the CA Factory system. This schema is used for:

- ✅ **Snowflake → JSON exporters** - Convert EHR data to CA Factory format
- ✅ **External collaborators** - Generate test cases and sample data
- ✅ **Frontend/Backend integration** - Ensure consistent data structure
- ✅ **Mock/Demo mode** - Sample cases for development and testing
- ✅ **Quality assurance** - Validate case data completeness

---

## Schema Version

- **Version**: 1.0.0
- **Release Date**: 2024-11-16
- **Status**: Stable
- **Format**: JSON
- **Encoding**: UTF-8

---

## Schema Overview

```typescript
interface ClinicalCase {
  caseId: string;
  patientId: string;
  encounterId: string;
  infectionType: InfectionType;
  facility: Facility;
  patient: PatientDemographics;
  timeline: Timeline;
  devices: Devices;
  labs: LabResult[];
  clinicalSignals: ClinicalSignal[];
  events: ClinicalEvent[];
  notes: ClinicalNote[];
  nhsnEvaluation: NhsnEvaluation;
  riskFactors: RiskFactor[];
  metadata: Metadata;
}
```

---

## Complete Schema Definition

### Root Object

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `caseId` | string | ✅ | Unique case identifier (e.g., "CASE-CLABSI-001") |
| `patientId` | string | ✅ | Patient identifier (e.g., "PAT-001") |
| `encounterId` | string | ✅ | Encounter/admission identifier |
| `infectionType` | string | ✅ | One of: "CLABSI", "CAUTI", "SSI", "VAP", "NOT_HAC" |
| `facility` | Facility | ✅ | Facility information |
| `patient` | PatientDemographics | ✅ | Patient demographics |
| `timeline` | Timeline | ✅ | Key dates and timeline |
| `devices` | Devices | ✅ | Medical devices (central line, catheter, etc.) |
| `labs` | LabResult[] | ✅ | Laboratory results |
| `clinicalSignals` | ClinicalSignal[] | ✅ | Vital signs, symptoms, lab values |
| `events` | ClinicalEvent[] | ✅ | Clinical events (insertion, removal, etc.) |
| `notes` | ClinicalNote[] | ✅ | Clinical documentation |
| `nhsnEvaluation` | NhsnEvaluation | ✅ | NHSN criteria evaluation |
| `riskFactors` | RiskFactor[] | ⬜ | Risk factors for infection |
| `metadata` | Metadata | ✅ | Case metadata |

---

### Facility

```json
{
  "facility": {
    "id": "HOSP-001",
    "name": "Memorial Hospital",
    "unit": "ICU-A"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Facility identifier |
| `name` | string | ✅ | Facility name |
| `unit` | string | ✅ | Unit/ward identifier |

---

### PatientDemographics

```json
{
  "patient": {
    "mrn": "MRN-123456",
    "age": 58,
    "gender": "M"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `mrn` | string | ✅ | Medical record number |
| `age` | number | ✅ | Age in years |
| `gender` | string | ✅ | Gender: "M", "F", "Other" |

---

### Timeline

```json
{
  "timeline": {
    "admissionDate": "2024-01-15",
    "dischargeDate": null,
    "eventDate": "2024-01-20",
    "daysSinceAdmission": 5
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `admissionDate` | string | ✅ | Admission date (YYYY-MM-DD) |
| `dischargeDate` | string\|null | ✅ | Discharge date or null if still admitted |
| `eventDate` | string | ✅ | Date of infection event (YYYY-MM-DD) |
| `daysSinceAdmission` | number | ✅ | Days from admission to event |

---

### Devices

Devices vary by infection type. At least one device object must be present.

#### CLABSI - Central Line

```json
{
  "devices": {
    "centralLine": {
      "present": true,
      "type": "PICC",
      "insertionDate": "2024-01-15",
      "insertionTime": "10:30:00",
      "insertionSite": "Right basilic vein",
      "removalDate": null,
      "deviceDaysAtEvent": 5
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `present` | boolean | ✅ | Is device present |
| `type` | string | ✅ | One of: "PICC", "CVC", "tunneled", "implanted_port" |
| `insertionDate` | string | ✅ | Insertion date (YYYY-MM-DD) |
| `insertionTime` | string | ✅ | Insertion time (HH:MM:SS) |
| `insertionSite` | string | ✅ | Anatomical insertion site |
| `removalDate` | string\|null | ✅ | Removal date or null if still present |
| `deviceDaysAtEvent` | number | ✅ | Device days at time of event |

#### CAUTI - Urinary Catheter

```json
{
  "devices": {
    "urinaryCatheter": {
      "present": true,
      "type": "Foley",
      "insertionDate": "2024-02-01",
      "insertionTime": "14:00:00",
      "insertionIndication": "Urinary retention",
      "removalDate": null,
      "deviceDaysAtEvent": 7
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `present` | boolean | ✅ | Is device present |
| `type` | string | ✅ | One of: "Foley", "straight_catheter", "suprapubic" |
| `insertionDate` | string | ✅ | Insertion date (YYYY-MM-DD) |
| `insertionTime` | string | ✅ | Insertion time (HH:MM:SS) |
| `insertionIndication` | string | ✅ | Clinical indication for catheter |
| `removalDate` | string\|null | ✅ | Removal date or null if still present |
| `deviceDaysAtEvent` | number | ✅ | Device days at time of event |

#### SSI - Surgical Procedure (Example)

```json
{
  "devices": {
    "surgicalProcedure": {
      "procedureType": "COLO",
      "procedureDate": "2024-03-01",
      "procedureTime": "08:00:00",
      "surgeon": "Dr. Smith",
      "woundClass": "clean-contaminated",
      "duration": 240,
      "daysPostOp": 10
    }
  }
}
```

---

### LabResult

```json
{
  "labs": [
    {
      "id": "LAB-001",
      "type": "blood_culture",
      "collectionDate": "2024-01-20",
      "collectionTime": "08:30:00",
      "resultDate": "2024-01-20",
      "organism": "Staphylococcus aureus",
      "organismType": "recognized_pathogen",
      "growth": "Positive",
      "sampleType": "Peripheral blood"
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Lab result identifier |
| `type` | string | ✅ | "blood_culture", "urine_culture", "wound_culture", "csf_culture" |
| `collectionDate` | string | ✅ | Collection date (YYYY-MM-DD) |
| `collectionTime` | string | ✅ | Collection time (HH:MM:SS) |
| `resultDate` | string | ✅ | Result date (YYYY-MM-DD) |
| `organism` | string\|null | ✅ | Organism name or null if negative |
| `organismType` | string | ⬜ | "recognized_pathogen", "common_commensal" |
| `growth` | string | ✅ | "Positive", "Negative", "Pending" |
| `sampleType` | string | ✅ | Sample type/source |
| `cfuCount` | number | ⬜ | CFU count (for urine cultures) |

---

### ClinicalSignal

```json
{
  "clinicalSignals": [
    {
      "id": "SIG-001",
      "type": "vital_sign",
      "name": "temperature",
      "timestamp": "2024-01-19T06:00:00Z",
      "value": 39.2,
      "unit": "°C",
      "abnormal": true
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Signal identifier |
| `type` | string | ✅ | "vital_sign", "symptom", "lab_value" |
| `name` | string | ✅ | Signal name (temperature, heart_rate, wbc, etc.) |
| `timestamp` | string | ✅ | ISO-8601 timestamp |
| `value` | number\|string | ✅ | Signal value |
| `unit` | string | ✅ | Unit of measurement |
| `abnormal` | boolean | ✅ | Is value abnormal |

---

### ClinicalEvent

```json
{
  "events": [
    {
      "id": "EVT-001",
      "type": "device_insertion",
      "name": "PICC Line Insertion",
      "timestamp": "2024-01-15T10:30:00Z",
      "performedBy": "IR Team",
      "location": "Interventional Radiology",
      "details": {
        "indication": "Long-term IV access",
        "technique": "Ultrasound-guided",
        "complications": "None"
      }
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Event identifier |
| `type` | string | ✅ | Event type (see Event Types below) |
| `name` | string | ✅ | Event name/description |
| `timestamp` | string | ✅ | ISO-8601 timestamp |
| `performedBy` | string | ✅ | Provider/team who performed event |
| `location` | string | ✅ | Location where event occurred |
| `details` | object | ⬜ | Additional event-specific details |

**Event Types:**
- `device_insertion`
- `device_removal`
- `fever_onset`
- `symptom_onset`
- `culture_ordered`
- `treatment_initiated`
- `transfer`
- `procedure`

---

### ClinicalNote

```json
{
  "notes": [
    {
      "id": "NOTE-001",
      "type": "nursing_assessment",
      "timestamp": "2024-01-19T06:00:00Z",
      "author": "RN J. Smith",
      "content": "Patient with new-onset fever (39.2°C)..."
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Note identifier |
| `type` | string | ✅ | Note type (see Note Types below) |
| `timestamp` | string | ✅ | ISO-8601 timestamp |
| `author` | string | ✅ | Note author |
| `content` | string | ✅ | Full note text |

**Note Types:**
- `nursing_assessment`
- `physician_progress_note`
- `microbiology_result`
- `procedure_note`
- `discharge_summary`
- `consultant_note`

---

### NhsnEvaluation

```json
{
  "nhsnEvaluation": {
    "dateOfEvent": "2024-01-20",
    "infectionWindow": {
      "start": "2024-01-18",
      "end": "2024-01-21"
    },
    "deviceDaysAtEvent": 5,
    "criteriaMet": {
      "centralLinePresent": true,
      "lineInPlace2Days": true,
      "positiveBloodCulture": true,
      "recognizedPathogen": true,
      "clinicalSigns": true,
      "noAlternateSource": true
    },
    "determination": "CLABSI_CONFIRMED",
    "confidence": 0.95,
    "rationale": "Patient meets all NHSN criteria..."
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dateOfEvent` | string | ✅ | Date of infection event (YYYY-MM-DD) |
| `infectionWindow` | object | ✅ | Infection window dates |
| `infectionWindow.start` | string | ✅ | Window start (YYYY-MM-DD) |
| `infectionWindow.end` | string | ✅ | Window end (YYYY-MM-DD) |
| `deviceDaysAtEvent` | number | ✅ | Device days at event |
| `criteriaMet` | object | ✅ | Domain-specific criteria (see below) |
| `determination` | string | ✅ | Final determination (see Determinations) |
| `confidence` | number | ✅ | Confidence score (0.0-1.0) |
| `rationale` | string | ✅ | Explanation of determination |

**CLABSI Criteria:**
```json
{
  "centralLinePresent": true,
  "lineInPlace2Days": true,
  "positiveBloodCulture": true,
  "recognizedPathogen": true,
  "clinicalSigns": true,
  "noAlternateSource": true
}
```

**CAUTI Criteria:**
```json
{
  "urinaryCatheterPresent": true,
  "catheterInPlace2Days": true,
  "positiveCulture": true,
  "cfuThreshold": true,
  "clinicalSigns": true,
  "noAlternateSource": true
}
```

**Determinations:**
- `CLABSI_CONFIRMED`
- `CAUTI_CONFIRMED`
- `SSI_CONFIRMED`
- `VAP_CONFIRMED`
- `NOT_HAC`
- `INDETERMINATE`

---

### RiskFactor

```json
{
  "riskFactors": [
    {
      "factor": "ICU admission",
      "present": true
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `factor` | string | ✅ | Risk factor name |
| `present` | boolean | ✅ | Is risk factor present |

---

### Metadata

```json
{
  "metadata": {
    "createdAt": "2024-11-16T10:00:00Z",
    "updatedAt": "2024-11-16T10:00:00Z",
    "version": "1.0.0",
    "source": "mock_data"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `createdAt` | string | ✅ | ISO-8601 creation timestamp |
| `updatedAt` | string | ✅ | ISO-8601 last update timestamp |
| `version` | string | ✅ | Schema version (semantic versioning) |
| `source` | string | ✅ | Data source: "mock_data", "snowflake", "ehr" |

---

## Complete Example: CLABSI Case

```json
{
  "caseId": "CASE-CLABSI-001",
  "patientId": "PAT-001",
  "encounterId": "ENC-001",
  "infectionType": "CLABSI",
  "facility": {
    "id": "HOSP-001",
    "name": "Memorial Hospital",
    "unit": "ICU-A"
  },
  "patient": {
    "mrn": "MRN-123456",
    "age": 58,
    "gender": "M"
  },
  "timeline": {
    "admissionDate": "2024-01-15",
    "dischargeDate": null,
    "eventDate": "2024-01-20",
    "daysSinceAdmission": 5
  },
  "devices": {
    "centralLine": {
      "present": true,
      "type": "PICC",
      "insertionDate": "2024-01-15",
      "insertionTime": "10:30:00",
      "insertionSite": "Right basilic vein",
      "removalDate": null,
      "deviceDaysAtEvent": 5
    }
  },
  "labs": [
    {
      "id": "LAB-001",
      "type": "blood_culture",
      "collectionDate": "2024-01-20",
      "collectionTime": "08:30:00",
      "resultDate": "2024-01-20",
      "organism": "Staphylococcus aureus",
      "organismType": "recognized_pathogen",
      "growth": "Positive",
      "sampleType": "Peripheral blood"
    }
  ],
  "clinicalSignals": [
    {
      "id": "SIG-001",
      "type": "vital_sign",
      "name": "temperature",
      "timestamp": "2024-01-19T06:00:00Z",
      "value": 39.2,
      "unit": "°C",
      "abnormal": true
    }
  ],
  "events": [
    {
      "id": "EVT-001",
      "type": "device_insertion",
      "name": "PICC Line Insertion",
      "timestamp": "2024-01-15T10:30:00Z",
      "performedBy": "IR Team",
      "location": "Interventional Radiology",
      "details": {
        "indication": "Long-term IV access"
      }
    }
  ],
  "notes": [
    {
      "id": "NOTE-001",
      "type": "nursing_assessment",
      "timestamp": "2024-01-19T06:00:00Z",
      "author": "RN J. Smith",
      "content": "Patient with new-onset fever (39.2°C)..."
    }
  ],
  "nhsnEvaluation": {
    "dateOfEvent": "2024-01-20",
    "infectionWindow": {
      "start": "2024-01-18",
      "end": "2024-01-21"
    },
    "deviceDaysAtEvent": 5,
    "criteriaMet": {
      "centralLinePresent": true,
      "lineInPlace2Days": true,
      "positiveBloodCulture": true,
      "recognizedPathogen": true,
      "clinicalSigns": true,
      "noAlternateSource": true
    },
    "determination": "CLABSI_CONFIRMED",
    "confidence": 0.95,
    "rationale": "Patient meets all NHSN criteria for CLABSI..."
  },
  "riskFactors": [
    {
      "factor": "ICU admission",
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

---

## Validation Rules

### Required Fields
All fields marked with ✅ in tables above MUST be present.

### Data Types
- **string**: UTF-8 encoded text
- **number**: Numeric value (integer or float)
- **boolean**: true or false
- **null**: Explicitly null value
- **object**: JSON object
- **array**: JSON array

### Date/Time Formats
- **Date**: `YYYY-MM-DD` (ISO 8601)
- **Time**: `HH:MM:SS` (24-hour format)
- **DateTime**: `YYYY-MM-DDTHH:MM:SSZ` (ISO 8601 UTC)

### Value Constraints
- `confidence`: 0.0 to 1.0
- `age`: 0 to 150
- `deviceDaysAtEvent`: >= 0
- `cfuCount`: >= 0

---

## Snowflake Export Mapping

When exporting from Snowflake to this schema:

### Query Template
```sql
SELECT
  case_id AS "caseId",
  patient_id AS "patientId",
  encounter_id AS "encounterId",
  infection_type AS "infectionType",
  -- ... map all fields
FROM clinical_data.cases
WHERE case_id = ?
```

### Field Mapping Example
```python
# Python exporter example
def export_case_to_json(case_id: str) -> dict:
    """Export case from Snowflake to GOLD_AI schema."""

    # Query Snowflake
    case_data = snowflake_query(case_id)

    # Map to schema
    return {
        "caseId": case_data["case_id"],
        "patientId": case_data["patient_id"],
        "encounterId": case_data["encounter_id"],
        "infectionType": case_data["infection_type"],
        "facility": {
            "id": case_data["facility_id"],
            "name": case_data["facility_name"],
            "unit": case_data["unit"]
        },
        # ... continue mapping
        "metadata": {
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z",
            "version": "1.0.0",
            "source": "snowflake"
        }
    }
```

---

## Version History

### v1.0.0 (2024-11-16)
- Initial stable release
- Support for CLABSI and CAUTI domains
- Complete NHSN criteria fields
- Metadata and versioning

### Future Versions
- v1.1.0 (Planned): SSI domain support
- v1.2.0 (Planned): VAP domain support
- v2.0.0 (Planned): Enhanced timeline structure

---

## JSON Schema (JSONSchema Draft-07)

For automated validation, use this JSONSchema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://ca-factory.example.com/schemas/clinical-case/v1.0.0",
  "title": "GOLD_AI Clinical Case Schema",
  "version": "1.0.0",
  "type": "object",
  "required": [
    "caseId",
    "patientId",
    "encounterId",
    "infectionType",
    "facility",
    "patient",
    "timeline",
    "devices",
    "labs",
    "clinicalSignals",
    "events",
    "notes",
    "nhsnEvaluation",
    "metadata"
  ],
  "properties": {
    "caseId": { "type": "string" },
    "patientId": { "type": "string" },
    "encounterId": { "type": "string" },
    "infectionType": {
      "type": "string",
      "enum": ["CLABSI", "CAUTI", "SSI", "VAP", "NOT_HAC"]
    }
  }
}
```

Full JSONSchema available at: `backend/data/schemas/clinical-case.schema.json`

---

## Support

- **Schema Issues**: Report at GitHub Issues with tag `schema`
- **Validation Errors**: Check against JSONSchema validator
- **Questions**: See `docs/NO_DATABASE_MODE.md` for usage examples

---

## License

This schema is part of the CA Factory project and follows the project license.
