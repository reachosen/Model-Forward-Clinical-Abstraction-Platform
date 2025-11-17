# CA Factory API Reference

This document provides comprehensive API documentation for the CA Factory backend service.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently in demo mode - no authentication required.

---

## Table of Contents

1. [Task Interrogation Endpoints](#task-interrogation-endpoints)
2. [Task Tracking Endpoints](#task-tracking-endpoints)
3. [Demo Pipeline Endpoints](#demo-pipeline-endpoints)
4. [Legacy Endpoints](#legacy-endpoints)
5. [Data Models](#data-models)

---

## Task Interrogation Endpoints

### POST /v1/task/{task_id}/interrogate

Ask questions about specific aspects of a case (Ask Panel support).

**Path Parameters:**
- `task_id` (string, required): Task identifier (e.g., `CASE-CLABSI-001`, `clabsi.abstraction`)

**Request Body:**
```json
{
  "question": "Why does this criterion evaluate to true?",
  "interrogation_context": {
    "mode": "explain",
    "target_type": "criterion",
    "target_id": "central_line_present_gt_2_days",
    "target_label": "Central line >2 days",
    "program_type": "HAC",
    "metric_id": "CLABSI",
    "signal_type": "vital_sign"
  }
}
```

**Interrogation Modes:**
- `explain`: Detailed explanation of criteria/signals/events
- `summarize`: High-level summary of findings
- `validate`: Evidence validation and data quality checks

**Target Types:**
- `criterion`: NHSN criteria evaluation
- `signal`: Clinical signal
- `event`: Clinical event
- `overall`: Case-level question

**Response:**
```json
{
  "success": true,
  "data": {
    "qa_id": "550e8400-e29b-41d4-a716-446655440000",
    "question": "Why does this criterion evaluate to true?",
    "answer": "This criterion evaluates whether the patient meets...",
    "interrogation_context": {
      "mode": "explain",
      "target_type": "criterion",
      "target_id": "central_line_present_gt_2_days",
      ...
    },
    "task_metadata": {
      "task_id": "interrogation.550e8400-e29b-41d4-a716-446655440000",
      "task_type": "interrogation",
      "prompt_version": "v1.0",
      "mode": "interactive",
      "executed_at": "2024-01-15T10:30:00Z",
      "executed_by": "user",
      "status": "completed"
    },
    "citations": [
      "NOTE-001: Patient reports feeling unwell with chills...",
      "LAB-001: Blood culture positive for S. aureus",
      "EVT-001: PICC line insertion on Day 1"
    ],
    "confidence": 0.85
  },
  "metadata": {
    "request_id": "interrogate_550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

**Status Codes:**
- `200 OK`: Interrogation successful
- `422 Unprocessable Entity`: Invalid request (missing/invalid fields)
- `500 Internal Server Error`: Server error

---

## Task Tracking Endpoints

### GET /v1/case/{case_id}/tasks

Get all tasks associated with a specific case.

**Path Parameters:**
- `case_id` (string, required): Case identifier (e.g., `CASE-CLABSI-001`)

**Response:**
```json
{
  "success": true,
  "data": {
    "case_id": "CASE-CLABSI-001",
    "task_count": 2,
    "tasks": [
      {
        "task_id": "clabsi.enrichment",
        "task_type": "enrichment",
        "prompt_version": "v1.0",
        "mode": "batch",
        "executed_at": "2024-01-15T08:00:00Z",
        "executed_by": "system",
        "status": "completed",
        "section": "enrichment",
        "summary": {
          "signals_identified": 4,
          "key_findings": ["temperature: 39.2", "heart_rate: 112"],
          "confidence": 0.9
        }
      },
      {
        "task_id": "clabsi.abstraction",
        "task_type": "abstraction",
        "prompt_version": "v1.0",
        "mode": "batch",
        "executed_at": "2024-01-15T08:00:00Z",
        "executed_by": "system",
        "status": "completed",
        "section": "abstraction",
        "determination": "CLABSI_CONFIRMED",
        "confidence": 0.95
      }
    ]
  },
  "metadata": {
    "request_id": "tasks_CASE-CLABSI-001_1705312200",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

**Status Codes:**
- `200 OK`: Tasks retrieved successfully
- `404 Not Found`: Case not found
- `500 Internal Server Error`: Server error

---

### GET /v1/task/{task_id}

Get detailed information about a specific task.

**Path Parameters:**
- `task_id` (string, required): Task identifier (e.g., `clabsi.enrichment`, `clabsi.abstraction`)

**Response (Enrichment Task):**
```json
{
  "success": true,
  "data": {
    "task_metadata": {
      "task_id": "clabsi.enrichment",
      "task_type": "enrichment",
      "prompt_version": "v1.0",
      "mode": "batch",
      "executed_at": "2024-01-15T08:00:00Z",
      "executed_by": "system",
      "status": "completed"
    },
    "section": "enrichment",
    "case_id": "CASE-CLABSI-001",
    "summary": {
      "signals_identified": 4,
      "key_findings": ["temperature: 39.2", "heart_rate: 112", "blood_pressure: 92/58"],
      "confidence": 0.9
    },
    "signal_groups": [...],
    "timeline_phases": [...]
  },
  "metadata": {...}
}
```

**Response (Abstraction Task):**
```json
{
  "success": true,
  "data": {
    "task_metadata": {
      "task_id": "clabsi.abstraction",
      "task_type": "abstraction",
      ...
    },
    "section": "abstraction",
    "case_id": "CASE-CLABSI-001",
    "narrative": "Patient is a 68-year-old M with a PICC in place...",
    "criteria_evaluation": {
      "determination": "CLABSI_CONFIRMED",
      "confidence": 0.95,
      "criteria_met": {...}
    },
    "exclusion_analysis": [...]
  },
  "metadata": {...}
}
```

**Status Codes:**
- `200 OK`: Task retrieved successfully
- `404 Not Found`: Task not found
- `500 Internal Server Error`: Server error

---

## Demo Pipeline Endpoints

### POST /api/demo/context

Load patient case data and return context fragments (Step 1 of demo pipeline).

**Request Body:**
```json
{
  "domain_id": "clabsi",
  "case_id": "case-001"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "domain_id": "clabsi",
    "case_id": "case-001",
    "patient": {
      "case_id": "case-001",
      "patient_id": "PAT-001",
      "mrn": "MRN-001",
      "age": 68,
      "gender": "M"
    },
    "context_fragments": [
      {
        "fragment_id": "NOTE-001",
        "type": "clinical_note",
        "content": "Patient reports feeling unwell with chills...",
        "timestamp": "2024-01-19T06:00:00Z",
        "author": "RN J. Smith",
        "relevance_score": 0.92
      }
    ],
    "case_data": {
      "case_id": "CASE-CLABSI-001",
      "concern_id": "clabsi",
      "patient": {...},
      "enrichment": {...},
      "abstraction": {...},
      "qa": null
    },
    "format": "structured"
  },
  "metadata": {...}
}
```

**Status Codes:**
- `200 OK`: Case loaded successfully
- `404 Not Found`: Case not found
- `500 Internal Server Error`: Server error

---

### POST /api/demo/abstract

Generate/retrieve clinical abstraction for a case (Step 2 of demo pipeline).

**Request Body:**
```json
{
  "domain_id": "clabsi",
  "case_id": "case-001",
  "context_fragments": [...]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "domain_id": "clabsi",
    "case_id": "case-001",
    "summary": "Patient is a 68-year-old M with a PICC in place...",
    "criteria_evaluation": {
      "determination": "CLABSI_CONFIRMED",
      "confidence": 0.95,
      "criteria_met": {
        "central_line_present_gt_2_days": {
          "met": true,
          "evidence": "PICC line inserted Day 1, event Day 5 (4 device days)"
        },
        ...
      },
      "criteria_total": 6,
      "criteria_met_count": 6
    },
    "exclusion_analysis": [...],
    "task_metadata": {...},
    "context_fragments_used": 5,
    "model_metadata": {
      "model": "structured-case-precomputed",
      "prompt_version": "v1.0",
      "executed_at": "2024-01-15T08:00:00Z"
    }
  },
  "metadata": {...}
}
```

**Status Codes:**
- `200 OK`: Abstraction retrieved successfully
- `404 Not Found`: Case not found
- `500 Internal Server Error`: Server error

---

### POST /api/demo/feedback

Submit user feedback on abstraction quality (Step 3 of demo pipeline).

**Request Body:**
```json
{
  "domain_id": "clabsi",
  "case_id": "case-001",
  "feedback_type": "thumbs_up",
  "comment": "Accurate determination with clear evidence"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "feedback_id": "550e8400-e29b-41d4-a716-446655440000",
    "domain_id": "clabsi",
    "case_id": "case-001",
    "feedback_type": "thumbs_up",
    "message": "Feedback recorded successfully"
  },
  "metadata": {...}
}
```

**Status Codes:**
- `200 OK`: Feedback recorded successfully
- `500 Internal Server Error`: Server error

---

## Data Models

### StructuredCase

Complete 4-section case model:

```typescript
interface StructuredCase {
  case_id: string;
  concern_id: string; // 'clabsi' | 'cauti' | 'ssi' | etc.
  patient: PatientSection;
  enrichment: EnrichmentSection;
  abstraction: AbstractionSection;
  qa: QASection | null;
}
```

### TaskMetadata

Task execution tracking:

```typescript
interface TaskMetadata {
  task_id: string;
  task_type: string; // 'enrichment' | 'abstraction' | 'interrogation'
  prompt_version: string;
  mode: 'batch' | 'interactive';
  executed_at: string; // ISO timestamp
  executed_by: string; // 'system' | user_id
  status: 'completed' | 'in_progress' | 'failed';
  duration_ms?: number;
  token_count?: number;
}
```

### InterrogationContext

Context for Ask Panel interrogations:

```typescript
interface InterrogationContext {
  mode: 'explain' | 'summarize' | 'validate';
  target_type: 'criterion' | 'signal' | 'event' | 'overall';
  target_id: string;
  target_label?: string;
  program_type?: string; // HAC, CLABSI, CAUTI, etc.
  metric_id?: string;
  signal_type?: string;
}
```

---

## Error Handling

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  },
  "metadata": {
    "request_id": "error_1705312200",
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0.0"
  }
}
```

**Common Error Codes:**
- `INTERROGATION_ERROR`: Interrogation request failed
- `TASK_FETCH_ERROR`: Task retrieval failed
- `CONTEXT_ERROR`: Context loading failed
- `ABSTRACT_ERROR`: Abstraction generation failed
- `FEEDBACK_ERROR`: Feedback submission failed
- `INTERNAL_ERROR`: General server error

---

## Rate Limiting

Currently no rate limiting in demo mode. Production deployment will implement rate limiting.

---

## Versioning

API version is included in all response metadata. Current version: `1.0.0`

---

## Health Check

### GET /health

Check API health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "app_mode": "demo",
    "project": "clabsi",
    ...
  },
  "metadata": {...}
}
```

---

## Interactive Documentation

Visit `/docs` for Swagger UI interactive documentation.
Visit `/redoc` for ReDoc API documentation.

---

## Support

For issues and questions, see the project README.md or file an issue on GitHub.
