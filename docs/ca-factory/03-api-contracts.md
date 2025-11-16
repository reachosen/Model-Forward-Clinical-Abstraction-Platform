# CA Factory API Contracts

## Overview

This document defines the REST API contracts between the React frontend and the CA Factory backend. All endpoints follow RESTful conventions and return JSON responses.

## Base URL

```
Production: https://api.clinical-abstraction.com/v1
Development: http://localhost:8000/v1
```

## Authentication

All requests require authentication via JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Common Response Format

```typescript
interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: ResponseMetadata;
}

interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

interface ResponseMetadata {
  request_id: string;
  timestamp: string;
  version: string;
  latency_ms: number;
}
```

## Endpoints

### 1. Ask the Case (Q&A)

**POST** `/case/:patientId/ask`

Ask a natural language question about a specific case and get an AI-generated answer with evidence citations.

**Request:**
```typescript
interface AskQuestionRequest {
  question: string;
  encounter_id?: string;
  context?: Record<string, any>;  // Additional context
}
```

**Response:**
```typescript
interface AskQuestionResponse {
  question: string;
  answer: string;
  evidence_citations: EvidenceCitation[];
  confidence: number;              // 0-1
  follow_up_suggestions: string[];
  timestamp: string;
  agent_info: AgentExecutionInfo;
}

interface EvidenceCitation {
  citation_id: string;
  source_type: 'SIGNAL' | 'EVENT' | 'LAB' | 'NOTE' | 'RULE';
  source_id: string;
  excerpt: string;
  relevance_score: number;         // 0-1
  timestamp?: string;
}

interface AgentExecutionInfo {
  agent_id: string;
  execution_time_ms: number;
  tokens_used: number;
  retrieval_stats?: RetrievalStats;
}

interface RetrievalStats {
  documents_retrieved: number;
  documents_used: number;
  avg_relevance_score: number;
}
```

**Example:**
```bash
POST /v1/case/PAT-001/ask
Content-Type: application/json

{
  "question": "What evidence supports the CLABSI diagnosis?",
  "encounter_id": "ENC-12345"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "question": "What evidence supports the CLABSI diagnosis?",
    "answer": "The CLABSI diagnosis is supported by multiple key pieces of evidence: 1) Central line present for >2 days (inserted on Day 1), 2) Positive blood culture for Staphylococcus aureus on Day 3, 3) Clinical symptoms including fever (39.2°C) and rigors, and 4) No alternate infection source identified. The temporal relationship between line insertion and positive culture falls within the NHSN infection window.",
    "evidence_citations": [
      {
        "citation_id": "C001",
        "source_type": "EVENT",
        "source_id": "EVT-1234",
        "excerpt": "Central line insertion documented on 2024-01-15",
        "relevance_score": 0.98,
        "timestamp": "2024-01-15T08:30:00Z"
      },
      {
        "citation_id": "C002",
        "source_type": "LAB",
        "source_id": "LAB-5678",
        "excerpt": "Blood culture positive for Staphylococcus aureus",
        "relevance_score": 1.0,
        "timestamp": "2024-01-18T09:45:00Z"
      }
    ],
    "confidence": 0.92,
    "follow_up_suggestions": [
      "What was the timeline of symptom onset?",
      "Were there any complications documented?"
    ],
    "timestamp": "2024-11-16T12:30:00Z",
    "agent_info": {
      "agent_id": "qa_response_clabsi_v1",
      "execution_time_ms": 1250,
      "tokens_used": 3456,
      "retrieval_stats": {
        "documents_retrieved": 25,
        "documents_used": 8,
        "avg_relevance_score": 0.85
      }
    }
  },
  "metadata": {
    "request_id": "req_abc123",
    "timestamp": "2024-11-16T12:30:00Z",
    "version": "1.0.0",
    "latency_ms": 1287
  }
}
```

---

### 2. Rule Evaluation

**GET** `/case/:patientId/rules`

Get NHSN criteria evaluation for a specific case.

**Query Parameters:**
```typescript
interface RuleEvaluationParams {
  encounter_id?: string;
  domain?: string;                // CLABSI, CAUTI, etc.
  include_evidence?: boolean;     // Include detailed evidence (default: true)
}
```

**Response:**
```typescript
interface RuleEvaluationResponse {
  case_id: string;
  infection_type: string;
  summary: EvaluationSummary;
  evaluations: RuleEvaluation[];
  agent_info: AgentExecutionInfo;
}

interface EvaluationSummary {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  notEvaluatedRules: number;
  requiredRulesPassed: number;
  requiredRulesTotal: number;
  overallConfidence: number;
  evaluationTimestamp: string;
}

interface RuleEvaluation {
  ruleId: string;
  ruleName: string;
  category: 'device' | 'lab' | 'temporal' | 'clinical' | 'exclusion';
  status: 'pass' | 'fail' | 'not_evaluated';
  isRequired: boolean;
  description: string;
  rationale?: string;
  confidence: number;
  evidence: Evidence[];
  evaluatedAt: string;
}

interface Evidence {
  id: string;
  type: string;
  content: string;
  timestamp?: string;
  strength: 'strong' | 'moderate' | 'weak';
  metadata?: Record<string, unknown>;
}
```

**Example:**
```bash
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
      "totalRules": 12,
      "passedRules": 8,
      "failedRules": 3,
      "notEvaluatedRules": 1,
      "requiredRulesPassed": 6,
      "requiredRulesTotal": 8,
      "overallConfidence": 0.82,
      "evaluationTimestamp": "2024-11-16T12:30:00Z"
    },
    "evaluations": [
      {
        "ruleId": "CLABSI-001",
        "ruleName": "Central line present for >2 calendar days",
        "category": "device",
        "status": "pass",
        "isRequired": true,
        "description": "Verifies that a central line was present for more than 2 calendar days before the positive blood culture.",
        "confidence": 0.95,
        "evidence": [
          {
            "id": "E001",
            "type": "SIGNAL",
            "content": "Central line insertion documented on Day 1",
            "timestamp": "2024-01-15T08:30:00Z",
            "strength": "strong"
          }
        ],
        "evaluatedAt": "2024-11-16T12:30:00Z"
      }
    ],
    "agent_info": {
      "agent_id": "rule_evaluation_clabsi_v1",
      "execution_time_ms": 2150,
      "tokens_used": 5234
    }
  },
  "metadata": {
    "request_id": "req_def456",
    "timestamp": "2024-11-16T12:30:00Z",
    "version": "1.0.0",
    "latency_ms": 2187
  }
}
```

---

### 3. Evidence Retrieval

**POST** `/case/:patientId/evidence`

Retrieve relevant clinical evidence for a specific query or criteria.

**Request:**
```typescript
interface EvidenceRetrievalRequest {
  query: string;
  encounter_id?: string;
  filters?: EvidenceFilters;
  top_k?: number;                  // Default: 10
}

interface EvidenceFilters {
  source_types?: string[];         // Filter by source type
  date_range?: {
    start: string;
    end: string;
  };
  min_relevance?: number;          // Minimum relevance score
}
```

**Response:**
```typescript
interface EvidenceRetrievalResponse {
  query: string;
  results: EvidenceResult[];
  retrieval_stats: RetrievalStats;
  agent_info: AgentExecutionInfo;
}

interface EvidenceResult {
  evidence_id: string;
  source_type: string;
  source_id: string;
  content: string;
  relevance_score: number;
  timestamp?: string;
  metadata?: Record<string, any>;
}
```

**Example:**
```bash
POST /v1/case/PAT-001/evidence
Content-Type: application/json

{
  "query": "central line insertion and maintenance",
  "filters": {
    "source_types": ["EVENT", "NOTE"],
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    }
  },
  "top_k": 5
}
```

---

### 4. Case Summary

**GET** `/case/:patientId/summary`

Get AI-generated clinical summary for a case.

**Query Parameters:**
```typescript
interface SummaryParams {
  encounter_id?: string;
  include_timeline?: boolean;      // Include timeline analysis
  include_recommendations?: boolean; // Include recommended actions
}
```

**Response:**
```typescript
interface CaseSummaryResponse {
  patient_id: string;
  encounter_id: string;
  summary: {
    overview: string;
    positive_findings: string[];
    negative_findings: string[];
    recommended_actions: string[];
    unresolved_questions: UnresolvedQuestion[];
  };
  timeline_analysis?: TimelineAnalysis;
  confidence: number;
  generated_at: string;
  agent_info: AgentExecutionInfo;
}

interface UnresolvedQuestion {
  question: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
}

interface TimelineAnalysis {
  phases: TimelinePhase[];
  critical_events: CriticalEvent[];
  infection_window?: {
    start: string;
    end: string;
    confidence: number;
  };
}
```

---

### 5. Timeline Analysis

**GET** `/case/:patientId/timeline`

Get detailed timeline analysis with phase identification.

**Query Parameters:**
```typescript
interface TimelineParams {
  encounter_id?: string;
  include_phases?: boolean;
  include_critical_events?: boolean;
}
```

**Response:**
```typescript
interface TimelineAnalysisResponse {
  patient_id: string;
  encounter_id: string;
  timeline: TimelineEvent[];
  phases: TimelinePhase[];
  critical_events: CriticalEvent[];
  infection_window?: InfectionWindow;
  agent_info: AgentExecutionInfo;
}

interface TimelineEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  description: string;
  phase?: string;
  is_critical?: boolean;
}

interface TimelinePhase {
  phase_id: string;
  phase_name: string;
  start_date: string;
  end_date?: string;
  key_events: string[];           // Event IDs
}

interface CriticalEvent {
  event_id: string;
  timestamp: string;
  event_type: string;
  description: string;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
  rationale: string;
}
```

---

### 6. Quality Metrics

**GET** `/admin/quality-metrics`

Get quality metrics for CA Factory agents (admin only).

**Query Parameters:**
```typescript
interface QualityMetricsParams {
  agent_id?: string;
  domain?: string;
  start_date?: string;
  end_date?: string;
}
```

**Response:**
```typescript
interface QualityMetricsResponse {
  retrieval_metrics: RetrievalMetrics;
  response_metrics: ResponseMetrics;
  performance_metrics: PerformanceMetrics;
  aggregation_period: {
    start: string;
    end: string;
  };
}

interface RetrievalMetrics {
  recall_at_5: number;
  recall_at_10: number;
  mrr: number;
  avg_relevance_score: number;
  total_queries: number;
}

interface ResponseMetrics {
  clinical_accuracy: number;
  citation_quality: number;
  confidence_calibration_error: number;
  total_responses: number;
  sme_validation_rate: number;
}

interface PerformanceMetrics {
  avg_latency_ms: number;
  p50_latency_ms: number;
  p95_latency_ms: number;
  p99_latency_ms: number;
  cache_hit_rate: number;
  avg_tokens_per_request: number;
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|------------|-------------|
| `INVALID_REQUEST` | 400 | Request validation failed |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `AGENT_TIMEOUT` | 504 | Agent execution timeout |
| `AGENT_ERROR` | 500 | Agent execution error |
| `QUALITY_GATE_FAILED` | 422 | Response failed quality gates |
| `INTERNAL_ERROR` | 500 | Internal server error |

---

## Rate Limiting

| Tier | Requests per minute | Burst |
|------|---------------------|-------|
| Free | 10 | 20 |
| Standard | 100 | 200 |
| Premium | 1000 | 2000 |

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

---

## Webhooks

Subscribe to events for async processing:

**POST** `/webhooks/subscribe`

```typescript
interface WebhookSubscription {
  url: string;
  events: WebhookEvent[];
  secret: string;
}

type WebhookEvent =
  | "case.rule_evaluation.completed"
  | "case.summary.generated"
  | "case.quality_check.failed"
  | "agent.performance_degraded";
```

---

## Frontend Integration Examples

### AskTheCasePanel Integration

```typescript
// src/api/cafactory.ts
export async function askQuestion(
  patientId: string,
  question: string,
  encounterId?: string
): Promise<QuestionResponse> {
  const response = await fetch(`/v1/case/${patientId}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ question, encounter_id: encounterId }),
  });

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}
```

### RuleEvaluationPage Integration

```typescript
// src/api/cafactory.ts
export async function getRuleEvaluation(
  patientId: string,
  domain: string = 'CLABSI'
): Promise<RuleEvaluationData> {
  const response = await fetch(
    `/v1/case/${patientId}/rules?domain=${domain}&include_evidence=true`,
    {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`,
      },
    }
  );

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error.message);
  }

  return result.data;
}
```

---

## Testing

API documentation with interactive testing available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

Postman collection: `docs/ca-factory/postman/ca-factory-api.json`
