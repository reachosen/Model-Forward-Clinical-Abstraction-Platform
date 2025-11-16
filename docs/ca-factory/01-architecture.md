# Context Architect (CA) Factory - Architecture

## Overview

The Context Architect (CA) Factory is an AI orchestration system that powers the Model-Forward Clinical Abstraction Platform. It creates high-reliability agents by enforcing strict context control, automatic delegation, and built-in quality checks.

## Core Principles

### R Principle: Context Reduction
**Goal**: Keep agent context lean and focused

- **System Prompt Discipline**: Universal prompts stay minimal; must pass `core_memory_max_tokens` budget
- **Dynamic Priming**: Use on-demand priming commands (e.g., `/prime_CLABSI`) instead of large static memory
- **Conditional Tools**: Load MCP/tool definitions only when required
- **Aggressive Pruning**: Drop large tool outputs after use (SQL results, payloads)

### D Principle: Delegation & Scaling
**Goal**: Distribute work across specialized agents

- **Sub-Agent Forking**: Tasks in `delegated_task_list` auto-spawn focused workers with own context window
- **Background Workflows**: Heavy or async tasks run in `/background` to separate context
- **Context Bundles**: Short execution logs (inputs, outputs, decisions) passed across agents for continuity

### Q Principle: Built-In Quality Control
**Goal**: Factory-enforced quality, not optional

- **Retrieval Eval First**: Compute Recall@k / MRR on `golden_corpus_id` before deployment
- **Document Filtering**: Use LLM judges to filter corpus so only relevant documents feed retrieval
- **Golden Test Generation**: Use curated corpus to produce realistic, domain-aligned test questions
- **Performance Gates**: Each agent must pass baseline thresholds (Retrieval ≥ X, Reasoning accuracy ≥ Y)
- **Versioned QC**: All eval results logged under `rca_config_version` for regression detection

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (React)                             │
│  - AskTheCasePanel                                              │
│  - RuleEvaluationVisualizer                                     │
│  - EnhancedTimeline                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────────────────────┐
│              Backend API Server (FastAPI)                        │
│  - Request routing                                              │
│  - Authentication                                               │
│  - Rate limiting                                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│                  CA Factory Core                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Agent Manager                                            │  │
│  │  - Agent lifecycle (create, prune, destroy)             │  │
│  │  - Token budget enforcement                             │  │
│  │  - Memory management                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Delegation Engine                                        │  │
│  │  - Task complexity analysis                             │  │
│  │  - Sub-agent spawning                                   │  │
│  │  - Context bundle creation                              │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Quality Control Pipeline                                 │  │
│  │  - Retrieval evaluation (Recall@k, MRR)                 │  │
│  │  - Response validation                                   │  │
│  │  - Performance monitoring                                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│              Domain Agents (CLABSI, CAUTI, etc.)                │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Evidence         │  │ Rule Evaluation  │  │ Q&A Response │ │
│  │ Retrieval Agent  │  │ Agent            │  │ Agent        │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ Timeline         │  │ Summary          │                    │
│  │ Analysis Agent   │  │ Generation Agent │                    │
│  └──────────────────┘  └──────────────────┘                    │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│              Data Layer                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ Vector Store │  │ Memory Store │  │ Clinical Data      │   │
│  │ (Embeddings) │  │ (Redis)      │  │ Sources (EHR/Labs) │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Factory Lifecycle

1. **Load Configuration** → Validate token budgets and domain parameters
2. **Build AgentConfig** → Construct prompt, memory, priming, tools
3. **Attach Policies** → Add DelegationMap and PruningPolicy
4. **Run QC Profile** → Evaluate against golden corpus
5. **Gate Check** → If all gates pass → Emit RCA instance
6. **Auto-Tune** → If fail → prune, re-prime, re-delegate, retest

## Agent Types

### Evidence Retrieval Agent
**Purpose**: Find relevant clinical evidence from patient data
**Input**: Question or criteria to validate
**Output**: Ranked evidence with relevance scores
**Evaluation**: Recall@5, Recall@10, MRR

### Rule Evaluation Agent
**Purpose**: Assess NHSN criteria compliance
**Input**: Patient data + domain rules (CLABSI, CAUTI, etc.)
**Output**: Rule-by-rule evaluation with evidence
**Evaluation**: Accuracy vs. SME gold standard

### Q&A Response Agent
**Purpose**: Answer clinical questions about a case
**Input**: Natural language question
**Output**: Answer + evidence citations + confidence
**Evaluation**: Answer accuracy, citation quality

### Timeline Analysis Agent
**Purpose**: Identify temporal patterns and sequences
**Input**: Time-series clinical events
**Output**: Phase identification, critical windows
**Evaluation**: Phase boundary accuracy

### Summary Generation Agent
**Purpose**: Create concise clinical summaries
**Input**: Full case data
**Output**: Positive findings, recommended actions
**Evaluation**: Completeness, clinical accuracy

## Context Management Strategy

### Token Budget Allocation
```
Total Budget: 128k tokens (Claude 3.5 Sonnet)

Allocation:
- System Prompt: 2k tokens
- Dynamic Priming: 4k tokens
- Patient Context: 20k tokens
- Retrieved Evidence: 30k tokens
- Conversation History: 20k tokens
- Tool Definitions: 5k tokens
- Response Buffer: 10k tokens
- Reserve: 37k tokens (for sub-agents)
```

### Pruning Strategies
1. **Temporal Pruning**: Keep only events within infection window
2. **Relevance Pruning**: Drop low-relevance retrieved documents
3. **Compression**: Summarize verbose tool outputs
4. **Lazy Loading**: Load tools/MCPs only when invoked

## Delegation Strategy

### High-Complexity Tasks (Delegate)
- Multi-rule evaluation (>5 rules)
- Complex timeline analysis (>50 events)
- Evidence synthesis across multiple sources
- Multi-hop reasoning chains

### Low-Complexity Tasks (Keep)
- Single rule evaluation
- Simple fact lookup
- Date calculations
- Direct evidence retrieval

### Decision Tree
```
Task Complexity Analysis
    ├─ Estimated tokens > 40k? → DELEGATE
    ├─ Multiple data sources? → DELEGATE
    ├─ Requires multi-step reasoning? → DELEGATE
    └─ Simple lookup/calculation? → KEEP
```

## Quality Metrics

### Retrieval Quality
- **Recall@5**: % of relevant docs in top 5 results
- **Recall@10**: % of relevant docs in top 10 results
- **MRR**: Mean Reciprocal Rank of first relevant doc
- **Target**: Recall@5 ≥ 0.85, MRR ≥ 0.90

### Response Quality
- **Clinical Accuracy**: Agreement with SME gold standard
- **Citation Quality**: Relevance of evidence citations
- **Confidence Calibration**: Confidence vs. actual accuracy
- **Target**: Accuracy ≥ 0.90, Calibration error < 0.10

### Performance Metrics
- **Latency**: P50, P95, P99 response times
- **Token Usage**: Avg tokens per request
- **Cache Hit Rate**: % of requests served from cache
- **Target**: P95 < 5s, Token efficiency > 80%

## Configuration Schema

See `02-configuration-schema.md` for detailed configuration format.

## API Contracts

See `03-api-contracts.md` for REST API specifications.

## Implementation Roadmap

1. **Phase 1**: Core factory infrastructure + Evidence Retrieval Agent
2. **Phase 2**: Rule Evaluation Agent + Q&A Response Agent
3. **Phase 3**: Timeline Analysis + Summary Generation
4. **Phase 4**: Production deployment + monitoring dashboard

## References

- NHSN CDC Guidelines: https://www.cdc.gov/nhsn/
- Claude 3.5 Sonnet Specs: 128k context, function calling, vision
- RAG Best Practices: Retrieval-first evaluation, document filtering
