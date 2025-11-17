/**
 * CA Factory API Client
 *
 * TypeScript client for interacting with the CA Factory backend REST API.
 */

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const API_VERSION = 'v1';

// Types matching backend API contracts
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: ResponseMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export interface ResponseMetadata {
  request_id: string;
  timestamp: string;
  version: string;
  latency_ms?: number;
}

export interface EvidenceCitation {
  citation_id: string;
  source_type: 'SIGNAL' | 'EVENT' | 'LAB' | 'NOTE' | 'RULE';
  source_id: string;
  excerpt: string;
  relevance_score: number;
  timestamp?: string;
}

export interface AgentExecutionInfo {
  agent_id: string;
  execution_time_ms: number;
  tokens_used: number;
  retrieval_stats?: RetrievalStats;
}

export interface RetrievalStats {
  documents_retrieved: number;
  documents_used: number;
  avg_relevance_score: number;
}

export interface QuestionResponse {
  question: string;
  answer: string;
  evidence_citations: EvidenceCitation[];
  confidence: number;
  follow_up_suggestions: string[];
  timestamp: string;
  agent_info: AgentExecutionInfo;
}

export interface Evidence {
  id: string;
  type: string;
  content: string;
  timestamp?: string;
  strength: 'strong' | 'moderate' | 'weak';
  metadata?: Record<string, unknown>;
}

export interface RuleEvaluation {
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

export interface EvaluationSummary {
  totalRules: number;
  passedRules: number;
  failedRules: number;
  notEvaluatedRules: number;
  requiredRulesPassed: number;
  requiredRulesTotal: number;
  overallConfidence: number;
  evaluationTimestamp: string;
}

export interface RuleEvaluationData {
  case_id: string;
  infection_type: string;
  summary: EvaluationSummary;
  evaluations: RuleEvaluation[];
  agent_info: AgentExecutionInfo;
}

export interface EvidenceResult {
  evidence_id: string;
  source_type: string;
  source_id: string;
  content: string;
  relevance_score: number;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface EvidenceRetrievalResponse {
  query: string;
  results: EvidenceResult[];
  retrieval_stats: RetrievalStats;
  agent_info: AgentExecutionInfo;
}

export interface QualityMetrics {
  retrieval_metrics: {
    recall_at_5: number;
    recall_at_10: number;
    mrr: number;
    avg_relevance_score: number;
    total_queries: number;
  };
  response_metrics: {
    clinical_accuracy: number;
    citation_quality: number;
    confidence_calibration_error: number;
    total_responses: number;
    sme_validation_rate: number;
  };
  performance_metrics: {
    avg_latency_ms: number;
    p50_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    cache_hit_rate: number;
    avg_tokens_per_request: number;
  };
}

// Helper function to get auth token (placeholder)
function getAuthToken(): string | null {
  // In production, this would retrieve the JWT token from localStorage/session
  return localStorage.getItem('auth_token');
}

// Helper function to build headers
function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

// Helper function to handle API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || 'API request failed');
  }

  const result: APIResponse<T> = await response.json();

  if (!result.success) {
    throw new Error(result.error?.message || 'API request failed');
  }

  return result.data as T;
}

/**
 * Ask a question about a clinical case
 */
export async function askQuestion(
  patientId: string,
  question: string,
  encounterId?: string,
  context?: Record<string, any>
): Promise<QuestionResponse> {
  const response = await fetch(
    `${API_BASE_URL}/${API_VERSION}/case/${patientId}/ask`,
    {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        question,
        encounter_id: encounterId,
        context: context || {}
      }),
    }
  );

  return handleResponse<QuestionResponse>(response);
}

/**
 * Get rule evaluation for a case
 */
export async function getRuleEvaluation(
  patientId: string,
  domain: string = 'CLABSI',
  encounterId?: string,
  includeEvidence: boolean = true
): Promise<RuleEvaluationData> {
  const params = new URLSearchParams({
    domain,
    include_evidence: String(includeEvidence)
  });

  if (encounterId) {
    params.append('encounter_id', encounterId);
  }

  const response = await fetch(
    `${API_BASE_URL}/${API_VERSION}/case/${patientId}/rules?${params}`,
    {
      headers: buildHeaders(),
    }
  );

  return handleResponse<RuleEvaluationData>(response);
}

/**
 * Retrieve evidence for a query
 */
export async function retrieveEvidence(
  patientId: string,
  query: string,
  options?: {
    encounterId?: string;
    filters?: {
      source_types?: string[];
      date_range?: {
        start: string;
        end: string;
      };
      min_relevance?: number;
    };
    topK?: number;
  }
): Promise<EvidenceRetrievalResponse> {
  const response = await fetch(
    `${API_BASE_URL}/${API_VERSION}/case/${patientId}/evidence`,
    {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        query,
        encounter_id: options?.encounterId,
        filters: options?.filters || {},
        top_k: options?.topK || 10
      }),
    }
  );

  return handleResponse<EvidenceRetrievalResponse>(response);
}

/**
 * Get quality metrics (admin only)
 */
export async function getQualityMetrics(
  options?: {
    agentId?: string;
    domain?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<QualityMetrics> {
  const params = new URLSearchParams();

  if (options?.agentId) params.append('agent_id', options.agentId);
  if (options?.domain) params.append('domain', options.domain);
  if (options?.startDate) params.append('start_date', options.startDate);
  if (options?.endDate) params.append('end_date', options.endDate);

  const response = await fetch(
    `${API_BASE_URL}/${API_VERSION}/admin/quality-metrics?${params}`,
    {
      headers: buildHeaders(),
    }
  );

  return handleResponse<QualityMetrics>(response);
}

/**
 * Health check
 */
export async function healthCheck(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/health`);
  return handleResponse<any>(response);
}

/**
 * Default export with all API functions
 */
export default {
  askQuestion,
  getRuleEvaluation,
  retrieveEvidence,
  getQualityMetrics,
  healthCheck,
};
