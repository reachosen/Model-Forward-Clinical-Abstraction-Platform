# CA Factory Configuration Schema

## Overview

This document defines the configuration format for creating Context Architect agents. All configurations are versioned and validated against JSON Schema.

## Base Configuration

```typescript
interface CAFactoryConfig {
  // Domain identification
  project_domain: string;              // e.g., "HAC_CLABSI"
  domain_version: string;              // e.g., "2024.1"
  rca_config_version: string;          // e.g., "1.0.0"

  // Context management (R Principle)
  core_memory_max_tokens: number;      // Hard limit for static memory
  pruning_policy: PruningPolicy;       // Rules for token reduction
  priming_config: PrimingConfig;       // Dynamic knowledge loading

  // Delegation (D Principle)
  delegated_task_list: string[];       // Tasks requiring sub-agents
  delegation_thresholds: DelegationThresholds;
  context_bundle_config: ContextBundleConfig;

  // Quality control (Q Principle)
  golden_corpus_id: string;            // Production-aligned test set
  quality_gates: QualityGates;         // Minimum performance thresholds
  eval_config: EvaluationConfig;       // Evaluation methodology

  // Agent configuration
  agent_profiles: AgentProfile[];      // Specialized agent definitions
  tool_registry: ToolConfig[];         // Available tools/MCPs

  // Infrastructure
  vector_store_config: VectorStoreConfig;
  memory_store_config: MemoryStoreConfig;
  logging_config: LoggingConfig;
}
```

## Detailed Schemas

### PruningPolicy

```typescript
interface PruningPolicy {
  // Temporal pruning
  temporal_window_days: number;        // e.g., 14 days for CLABSI
  keep_critical_events: string[];      // Event types to never prune

  // Relevance pruning
  min_relevance_score: number;         // Drop docs below this score
  max_documents_per_query: number;     // Cap retrieved documents

  // Compression
  compress_verbose_outputs: boolean;   // Summarize large tool outputs
  max_output_tokens: number;           // Per-tool output limit

  // History management
  max_conversation_turns: number;      // For Q&A agents
  summarize_old_turns: boolean;        // Compress old conversation
}
```

### PrimingConfig

```typescript
interface PrimingConfig {
  // On-demand knowledge loading
  priming_commands: Record<string, PrimingProfile>;

  // Auto-priming triggers
  auto_prime_on: string[];             // e.g., ["new_case", "domain_switch"]

  // Priming sources
  knowledge_base_id: string;           // Vector store for knowledge
  static_primers: StaticPrimer[];      // Pre-built knowledge snippets
}

interface PrimingProfile {
  command: string;                     // e.g., "/prime_CLABSI"
  knowledge_chunks: string[];          // IDs of knowledge to load
  max_tokens: number;                  // Budget for this primer
  ttl_seconds: number;                 // How long to keep in memory
}

interface StaticPrimer {
  id: string;
  content: string;
  tokens: number;
  tags: string[];
}
```

### DelegationThresholds

```typescript
interface DelegationThresholds {
  // Complexity-based delegation
  estimated_tokens_threshold: number;  // Delegate if > this
  multi_source_threshold: number;      // Delegate if sources > this
  reasoning_depth_threshold: number;   // Delegate if depth > this

  // Resource-based delegation
  max_parallel_subagents: number;      // Concurrent sub-agents limit
  subagent_timeout_seconds: number;    // Kill if exceeds

  // Task-specific overrides
  force_delegate: string[];            // Always delegate these tasks
  never_delegate: string[];            // Never delegate these tasks
}
```

### ContextBundleConfig

```typescript
interface ContextBundleConfig {
  // What to include in context bundles
  include_inputs: boolean;
  include_outputs: boolean;
  include_reasoning: boolean;
  include_tool_calls: boolean;

  // Bundle size limits
  max_bundle_tokens: number;
  compression_strategy: "summarize" | "truncate" | "smart";

  // Serialization
  format: "json" | "markdown" | "structured";
}
```

### QualityGates

```typescript
interface QualityGates {
  // Retrieval quality
  min_recall_at_5: number;             // e.g., 0.85
  min_recall_at_10: number;            // e.g., 0.90
  min_mrr: number;                     // e.g., 0.90

  // Response quality
  min_clinical_accuracy: number;       // e.g., 0.90
  min_citation_quality: number;        // e.g., 0.85
  max_calibration_error: number;       // e.g., 0.10

  // Performance
  max_p95_latency_ms: number;          // e.g., 5000
  min_cache_hit_rate: number;          // e.g., 0.60

  // Failure handling
  fail_action: "block" | "warn" | "log";
  auto_tune_on_fail: boolean;
}
```

### EvaluationConfig

```typescript
interface EvaluationConfig {
  // Test set configuration
  test_cases_per_domain: number;       // e.g., 100 cases
  test_generation_method: "manual" | "llm_generated" | "hybrid";

  // Evaluation methodology
  eval_metrics: string[];              // e.g., ["recall", "mrr", "accuracy"]
  eval_frequency: "pre_deploy" | "continuous" | "scheduled";

  // SME validation
  require_sme_validation: boolean;
  sme_sample_rate: number;             // % of responses to validate

  // Regression detection
  compare_to_baseline: string;         // Baseline version ID
  regression_threshold: number;        // Flag if drop > this
}
```

### AgentProfile

```typescript
interface AgentProfile {
  agent_id: string;                    // e.g., "evidence_retrieval_v1"
  agent_type: "retrieval" | "evaluation" | "qa" | "timeline" | "summary";

  // System prompt
  base_prompt: string;                 // Core instructions
  domain_specific_prompt?: string;     // CLABSI-specific additions

  // Tools and capabilities
  available_tools: string[];           // Tool IDs from tool_registry
  max_tool_calls: number;              // Prevent runaway tool usage

  // Resource limits
  max_tokens: number;                  // Context window limit
  timeout_seconds: number;             // Execution timeout

  // Quality settings
  min_confidence_threshold: number;    // Don't return if below
  require_evidence: boolean;           // Must cite sources

  // Caching
  cache_responses: boolean;
  cache_ttl_seconds: number;
}
```

### ToolConfig

```typescript
interface ToolConfig {
  tool_id: string;
  tool_name: string;
  description: string;

  // Function signature
  parameters: ToolParameter[];
  returns: ToolReturn;

  // Resource limits
  max_execution_time_ms: number;
  max_output_tokens: number;

  // Conditional loading
  load_when: "always" | "on_demand" | "conditional";
  load_condition?: string;             // e.g., "domain == 'CLABSI'"
}
```

### VectorStoreConfig

```typescript
interface VectorStoreConfig {
  provider: "pinecone" | "weaviate" | "chroma" | "local";
  index_name: string;
  embedding_model: string;             // e.g., "text-embedding-3-large"
  dimension: number;                   // e.g., 1536

  // Retrieval settings
  top_k: number;                       // Default: 10
  rerank: boolean;                     // Use reranker?
  rerank_model?: string;               // e.g., "cohere-rerank-v3"

  // Performance
  use_cache: boolean;
  cache_ttl_seconds: number;
}
```

### MemoryStoreConfig

```typescript
interface MemoryStoreConfig {
  provider: "redis" | "memcached" | "local";
  connection_string: string;

  // Namespacing
  key_prefix: string;                  // e.g., "ca_factory:clabsi:"

  // TTLs
  default_ttl_seconds: number;
  agent_state_ttl_seconds: number;
  context_bundle_ttl_seconds: number;
}
```

### LoggingConfig

```typescript
interface LoggingConfig {
  level: "debug" | "info" | "warn" | "error";

  // Log destinations
  console: boolean;
  file: boolean;
  file_path?: string;

  // Structured logging
  format: "json" | "text";
  include_timestamps: boolean;
  include_request_id: boolean;

  // Performance logging
  log_token_usage: boolean;
  log_latency: boolean;
  log_cache_hits: boolean;

  // Privacy
  redact_phi: boolean;                 // Redact protected health info
  redact_patterns: string[];           // Regex patterns to redact
}
```

## Example Configuration: CLABSI Agent

```json
{
  "project_domain": "HAC_CLABSI",
  "domain_version": "2024.1",
  "rca_config_version": "1.0.0",

  "core_memory_max_tokens": 8000,

  "pruning_policy": {
    "temporal_window_days": 14,
    "keep_critical_events": ["line_insertion", "blood_culture", "fever_onset"],
    "min_relevance_score": 0.5,
    "max_documents_per_query": 10,
    "compress_verbose_outputs": true,
    "max_output_tokens": 2000,
    "max_conversation_turns": 10,
    "summarize_old_turns": true
  },

  "priming_config": {
    "priming_commands": {
      "/prime_CLABSI": {
        "command": "/prime_CLABSI",
        "knowledge_chunks": ["nhsn_clabsi_criteria", "device_definitions", "organism_rules"],
        "max_tokens": 4000,
        "ttl_seconds": 3600
      }
    },
    "auto_prime_on": ["new_case", "domain_switch"],
    "knowledge_base_id": "clabsi_knowledge_v1",
    "static_primers": []
  },

  "delegated_task_list": [
    "complex_timeline_analysis",
    "multi_rule_evaluation",
    "evidence_synthesis"
  ],

  "delegation_thresholds": {
    "estimated_tokens_threshold": 40000,
    "multi_source_threshold": 5,
    "reasoning_depth_threshold": 3,
    "max_parallel_subagents": 3,
    "subagent_timeout_seconds": 60,
    "force_delegate": [],
    "never_delegate": ["simple_date_calc"]
  },

  "context_bundle_config": {
    "include_inputs": true,
    "include_outputs": true,
    "include_reasoning": true,
    "include_tool_calls": false,
    "max_bundle_tokens": 2000,
    "compression_strategy": "summarize",
    "format": "json"
  },

  "golden_corpus_id": "clabsi_nhsn_2024_v1",

  "quality_gates": {
    "min_recall_at_5": 0.85,
    "min_recall_at_10": 0.90,
    "min_mrr": 0.90,
    "min_clinical_accuracy": 0.90,
    "min_citation_quality": 0.85,
    "max_calibration_error": 0.10,
    "max_p95_latency_ms": 5000,
    "min_cache_hit_rate": 0.60,
    "fail_action": "warn",
    "auto_tune_on_fail": true
  },

  "eval_config": {
    "test_cases_per_domain": 100,
    "test_generation_method": "hybrid",
    "eval_metrics": ["recall_at_5", "recall_at_10", "mrr", "accuracy"],
    "eval_frequency": "pre_deploy",
    "require_sme_validation": true,
    "sme_sample_rate": 0.1,
    "compare_to_baseline": "clabsi_v0.9.0",
    "regression_threshold": 0.05
  },

  "agent_profiles": [
    {
      "agent_id": "evidence_retrieval_clabsi_v1",
      "agent_type": "retrieval",
      "base_prompt": "You are an evidence retrieval specialist...",
      "domain_specific_prompt": "Focus on CLABSI-specific evidence...",
      "available_tools": ["vector_search", "temporal_filter", "relevance_ranker"],
      "max_tool_calls": 5,
      "max_tokens": 20000,
      "timeout_seconds": 30,
      "min_confidence_threshold": 0.7,
      "require_evidence": true,
      "cache_responses": true,
      "cache_ttl_seconds": 3600
    }
  ],

  "tool_registry": [
    {
      "tool_id": "vector_search",
      "tool_name": "search_patient_data",
      "description": "Search patient clinical data using semantic similarity",
      "parameters": [
        {"name": "query", "type": "string", "required": true},
        {"name": "top_k", "type": "number", "required": false, "default": 10}
      ],
      "returns": {"type": "array", "items": "SearchResult"},
      "max_execution_time_ms": 5000,
      "max_output_tokens": 5000,
      "load_when": "always"
    }
  ],

  "vector_store_config": {
    "provider": "pinecone",
    "index_name": "clabsi-clinical-data",
    "embedding_model": "text-embedding-3-large",
    "dimension": 1536,
    "top_k": 10,
    "rerank": true,
    "rerank_model": "cohere-rerank-v3",
    "use_cache": true,
    "cache_ttl_seconds": 3600
  },

  "memory_store_config": {
    "provider": "redis",
    "connection_string": "redis://localhost:6379",
    "key_prefix": "ca_factory:clabsi:",
    "default_ttl_seconds": 3600,
    "agent_state_ttl_seconds": 7200,
    "context_bundle_ttl_seconds": 1800
  },

  "logging_config": {
    "level": "info",
    "console": true,
    "file": true,
    "file_path": "/var/log/ca_factory/clabsi.log",
    "format": "json",
    "include_timestamps": true,
    "include_request_id": true,
    "log_token_usage": true,
    "log_latency": true,
    "log_cache_hits": true,
    "redact_phi": true,
    "redact_patterns": ["\\d{3}-\\d{2}-\\d{4}", "MRN:\\s*\\w+"]
  }
}
```

## Validation

All configurations must pass JSON Schema validation before deployment:

```bash
python -m ca_factory.config.validate --config configs/clabsi.json
```

## Versioning

Configurations use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes to schema or behavior
- **MINOR**: New features, backward-compatible
- **PATCH**: Bug fixes, no schema changes

## Migration

When upgrading configurations:

```bash
python -m ca_factory.config.migrate \
  --from-version 1.0.0 \
  --to-version 1.1.0 \
  --config configs/clabsi.json
```
