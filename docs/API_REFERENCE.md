# CA Factory API Reference

Complete REST API documentation for the Context Architect Factory.

## Base URL

```
http://localhost:8000
```

## Authentication

Currently, authentication is not required for demo/development mode. In production, all requests should include:

```
Authorization: Bearer {jwt_token}
```

## Response Format

All responses follow this structure:

```json
{
  "success": true|false,
  "data": { ... },      // Response data (on success)
  "error": { ... },     // Error details (on failure)
  "metadata": {
    "request_id": "...",
    "timestamp": "2024-11-16T10:00:00Z",
    "version": "1.0.0",
    "latency_ms": 120.5
  }
}
```

## Health & Status

### `GET /health`

Check API health status.

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "domain": "HAC_CLABSI",
    "version": "1.0.0",
    "agents_loaded": 5,
    "components": {
      "agent_manager": "healthy",
      "delegation_engine": "healthy",
      "quality_controller": "healthy"
    },
    "timestamp": "2024-11-16T10:00:00Z"
  },
  "metadata": {
    "request_id": "health",
    "timestamp": "2024-11-16T10:00:00Z",
    "version": "1.0.0"
  }
}
```

## Case Operations

### `POST /v1/case/{patient_id}/ask`

Ask a natural language question about a clinical case.

**Path Parameters:**
- `patient_id` (string, required): Patient identifier

**Request Body:**
```json
{
  "question": "What evidence supports the CLABSI diagnosis?",
  "encounter_id": "ENC-001",  // optional
  "context": {                // optional
    "include_timeline": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "question": "What evidence supports the CLABSI diagnosis?",
    "answer": "The CLABSI diagnosis is supported by multiple key pieces of evidence: 1) Central line present for >2 days (PICC inserted on Day 1, event on Day 5), 2) Positive blood culture for Staphylococcus aureus on Day 5, 3) Clinical symptoms including fever (39.2°C) and chills on Day 5, and 4) No alternate infection source identified. The temporal relationship between line insertion and positive culture falls within the NHSN infection window.",
    "evidence_citations": [
      {
        "citation_id": "EV-001",
        "source_type": "EVENT",
        "source_id": "EVT-001",
        "excerpt": "PICC line insertion on 2024-01-15",
        "relevance_score": 0.95,
        "timestamp": "2024-01-15T10:30:00Z"
      },
      {
        "citation_id": "EV-002",
        "source_type": "LAB",
        "source_id": "LAB-001",
        "excerpt": "Blood culture positive for Staphylococcus aureus",
        "relevance_score": 0.98,
        "timestamp": "2024-01-20T08:30:00Z"
      },
      {
        "citation_id": "EV-003",
        "source_type": "SIGNAL",
        "source_id": "SIG-001",
        "excerpt": "Temperature: 39.2°C",
        "relevance_score": 0.88,
        "timestamp": "2024-01-19T06:00:00Z"
      }
    ],
    "confidence": 0.92,
    "follow_up_suggestions": [
      "What was the timeline of symptom onset?",
      "Were there any complications documented?",
      "What treatments were initiated?"
    ],
    "timestamp": "2024-11-16T10:00:00Z",
    "agent_info": {
      "agent_id": "qa_response_clabsi_v1",
      "execution_time_ms": 1234.5,
      "tokens_used": 2500,
      "retrieval_stats": {
        "documents_retrieved": 15,
        "documents_used": 3,
        "avg_relevance_score": 0.92
      }
    }
  },
  "metadata": {
    "request_id": "qa_PAT-001_1700136000",
    "timestamp": "2024-11-16T10:00:00Z",
    "version": "1.0.0",
    "latency_ms": 1250.3
  }
}
```

**Error Responses:**

```json
// 400 Bad Request - Invalid question
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Question cannot be empty"
  }
}

// 404 Not Found - Patient not found
{
  "success": false,
  "error": {
    "code": "PATIENT_NOT_FOUND",
    "message": "Patient PAT-999 not found"
  }
}

// 500 Internal Server Error
{
  "success": false,
  "error": {
    "code": "AGENT_ERROR",
    "message": "Agent execution failed"
  }
}
```

### `GET /v1/case/{patient_id}/rules`

Get NHSN criteria evaluation for a case.

**Path Parameters:**
- `patient_id` (string, required): Patient identifier

**Query Parameters:**
- `encounter_id` (string, optional): Encounter identifier
- `domain` (string, optional): Domain (CLABSI, CAUTI, etc.). Default: project default
- `include_evidence` (boolean, optional): Include detailed evidence. Default: true

**Request:**
```
GET /v1/case/PAT-001/rules?domain=CLABSI&include_evidence=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "case_id": "PAT-001",
    "infection_type": "CLABSI",
    "summary": {
      "totalRules": 6,
      "passedRules": 5,
      "failedRules": 0,
      "notEvaluatedRules": 1,
      "requiredRulesPassed": 5,
      "requiredRulesTotal": 5,
      "overallConfidence": 0.89,
      "evaluationTimestamp": "2024-11-16T10:00:00Z"
    },
    "evaluations": [
      {
        "ruleId": "CLABSI-001",
        "ruleName": "Central line present for >2 calendar days",
        "category": "device",
        "status": "pass",
        "isRequired": true,
        "description": "Verifies that a central line was present for more than 2 calendar days before the positive blood culture.",
        "rationale": "Central line present for 5 days",
        "confidence": 0.95,
        "evidence": [
          {
            "id": "E001",
            "type": "SIGNAL",
            "content": "Central line inserted on Day 1 (2024-01-15)",
            "timestamp": "2024-01-15T10:30:00Z",
            "strength": "strong"
          }
        ],
        "evaluatedAt": "2024-11-16T10:00:00Z"
      },
      {
        "ruleId": "CLABSI-002",
        "ruleName": "Positive blood culture",
        "category": "lab",
        "status": "pass",
        "isRequired": true,
        "description": "Patient has at least one positive blood culture result.",
        "rationale": "Positive blood culture for Staphylococcus aureus",
        "confidence": 0.98,
        "evidence": [
          {
            "id": "E002",
            "type": "LAB",
            "content": "Blood culture positive for Staphylococcus aureus",
            "timestamp": "2024-01-20T08:30:00Z",
            "strength": "strong"
          }
        ],
        "evaluatedAt": "2024-11-16T10:00:00Z"
      }
    ],
    "agent_info": {
      "agent_id": "rule_evaluation_clabsi_v1",
      "execution_time_ms": 2456.7,
      "tokens_used": 5000
    }
  },
  "metadata": {
    "request_id": "rules_PAT-001_1700136000",
    "timestamp": "2024-11-16T10:00:00Z",
    "version": "1.0.0",
    "latency_ms": 2470.1
  }
}
```

### `POST /v1/case/{patient_id}/evidence`

Retrieve relevant clinical evidence for a query.

**Path Parameters:**
- `patient_id` (string, required): Patient identifier

**Request Body:**
```json
{
  "query": "central line placement",
  "encounter_id": "ENC-001",  // optional
  "filters": {                // optional
    "source_types": ["SIGNAL", "EVENT", "LAB"],
    "date_range": {
      "start": "2024-01-15",
      "end": "2024-01-20"
    },
    "min_relevance": 0.7
  },
  "top_k": 10  // optional, default: 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "query": "central line placement",
    "results": [
      {
        "evidence_id": "EV-001",
        "source_type": "EVENT",
        "source_id": "EVT-001",
        "content": "PICC line insertion performed on 2024-01-15 at 10:30 AM in Interventional Radiology",
        "relevance_score": 0.95,
        "timestamp": "2024-01-15T10:30:00Z",
        "metadata": {
          "performed_by": "IR Team",
          "location": "Interventional Radiology"
        }
      },
      {
        "evidence_id": "EV-002",
        "source_type": "NOTE",
        "source_id": "NOTE-001",
        "content": "Patient with PICC line in place since 1/15, site appears clean and dry...",
        "relevance_score": 0.88,
        "timestamp": "2024-01-19T06:00:00Z",
        "metadata": {
          "author": "RN J. Smith"
        }
      }
    ],
    "retrieval_stats": {
      "documents_retrieved": 15,
      "documents_after_filters": 12,
      "documents_used": 10,
      "avg_relevance_score": 0.87
    },
    "agent_info": {
      "agent_id": "evidence_retrieval_clabsi_v1",
      "execution_time_ms": 345.2,
      "tokens_used": 500
    }
  },
  "metadata": {
    "request_id": "evidence_PAT-001_1700136000",
    "timestamp": "2024-11-16T10:00:00Z",
    "version": "1.0.0",
    "latency_ms": 350.5
  }
}
```

## Admin Operations

### `GET /v1/admin/quality-metrics`

Get quality and performance metrics (admin only).

**Query Parameters:**
- `agent_id` (string, optional): Filter by agent ID
- `domain` (string, optional): Filter by domain
- `start_date` (string, optional): Start date (ISO 8601)
- `end_date` (string, optional): End date (ISO 8601)

**Request:**
```
GET /v1/admin/quality-metrics?domain=CLABSI&start_date=2024-01-01
```

**Response:**
```json
{
  "success": true,
  "data": {
    "retrieval_metrics": {
      "total_queries": 1234,
      "avg_relevance_score": 0.87,
      "recall_at_5": 0.87,
      "recall_at_10": 0.92,
      "mrr": 0.91
    },
    "response_metrics": {
      "total_responses": 856,
      "avg_confidence": 0.85,
      "avg_citation_count": 3.2,
      "citation_quality": 0.88,
      "clinical_accuracy": 0.92,
      "confidence_calibration_error": 0.08,
      "sme_validation_rate": 0.15
    },
    "performance_metrics": {
      "avg_latency_ms": 1234.5,
      "p50_latency_ms": 980.3,
      "p95_latency_ms": 2345.7,
      "p99_latency_ms": 3456.2,
      "cache_hit_rate": 0.65,
      "avg_tokens_per_request": 2300.5
    },
    "aggregation_period": {
      "start": "2024-01-01",
      "end": "now"
    }
  },
  "metadata": {
    "request_id": "metrics_1700136000",
    "timestamp": "2024-11-16T10:00:00Z",
    "version": "1.0.0"
  }
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `PATIENT_NOT_FOUND` | 404 | Patient not found |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `AGENT_ERROR` | 500 | Agent execution failed |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service not initialized or unavailable |

## Rate Limits

Development mode: No rate limiting

Production mode (when enabled):
- 100 requests per minute per IP
- 1000 requests per hour per API key

## Example Usage

### cURL Examples

```bash
# Health check
curl http://localhost:8000/health

# Ask a question
curl -X POST http://localhost:8000/v1/case/PAT-001/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What evidence supports CLABSI?"
  }'

# Get rule evaluation
curl "http://localhost:8000/v1/case/PAT-001/rules?domain=CLABSI"

# Retrieve evidence
curl -X POST http://localhost:8000/v1/case/PAT-001/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "query": "fever",
    "top_k": 5
  }'

# Get quality metrics
curl http://localhost:8000/v1/admin/quality-metrics
```

### Python Examples

```python
import requests

BASE_URL = "http://localhost:8000"

# Ask a question
response = requests.post(
    f"{BASE_URL}/v1/case/PAT-001/ask",
    json={"question": "What evidence supports CLABSI?"}
)
data = response.json()
print(data["data"]["answer"])

# Get rule evaluation
response = requests.get(f"{BASE_URL}/v1/case/PAT-001/rules")
data = response.json()
summary = data["data"]["summary"]
print(f"Rules Passed: {summary['passedRules']}/{summary['totalRules']}")

# Retrieve evidence
response = requests.post(
    f"{BASE_URL}/v1/case/PAT-001/evidence",
    json={"query": "central line", "top_k": 5}
)
results = response.json()["data"]["results"]
for result in results:
    print(f"{result['source_type']}: {result['content'][:100]}...")
```

### JavaScript/TypeScript Examples

```typescript
import { askQuestion, getRuleEvaluation } from './api/cafactory';

// Ask a question
const qaResult = await askQuestion(
  'PAT-001',
  'What evidence supports the CLABSI diagnosis?'
);
console.log(qaResult.answer);

// Get rule evaluation
const ruleResults = await getRuleEvaluation('PAT-001', 'CLABSI');
console.log(`Passed: ${ruleResults.summary.passedRules}/${ruleResults.summary.totalRules}`);

// Retrieve evidence
const evidence = await retrieveEvidence('PAT-001', 'central line');
console.log(`Found ${evidence.results.length} results`);
```

## WebSocket Support (Future)

Real-time updates for long-running operations (planned):

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/case/PAT-001');

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Update:', update);
};
```

## Versioning

API version is included in the URL path: `/v1/...`

Breaking changes will increment the version number: `/v2/...`

## Support

- **API Issues**: GitHub Issues
- **Documentation**: `/docs` directory
- **Status Page**: `GET /health`
