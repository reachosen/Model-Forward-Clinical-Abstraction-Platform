# Architecture to Code Mapping

This document maps each component from the architecture diagrams to actual code files and modules.

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                         │
│  reference-implementation/react/src/                            │
└──────────────────┬──────────────────────────────────────────────┘
                   │ HTTP/REST
┌──────────────────┴──────────────────────────────────────────────┐
│                   REST API Server (FastAPI)                     │
│  backend/api/main.py                                            │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────────┐
│                      CA Factory Core                             │
│  backend/ca_factory/core/                                       │
│  ├── Factory (Orchestrator)                                     │
│  ├── Agent Manager (R Principle)                                │
│  ├── Delegation Engine (D Principle)                            │
│  └── Quality Controller (Q Principle)                           │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────────┐
│                    Specialized Agents                            │
│  backend/ca_factory/agents/                                     │
│  ├── Evidence Retrieval Agent                                   │
│  ├── Rule Evaluation Agent                                      │
│  ├── Q&A Response Agent                                         │
│  ├── Timeline Analysis Agent                                    │
│  └── Summary Generation Agent                                   │
└──────────────────┬──────────────────────────────────────────────┘
                   │
┌──────────────────┴──────────────────────────────────────────────┐
│                       Data Layer                                 │
│  backend/ca_factory/storage/                                    │
│  ├── Vector Store (Semantic Search)                             │
│  ├── Memory Store (Cache)                                       │
│  └── Case Loader (Patient Data)                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Mapping

### 1. Frontend Layer

| Architecture Component | Code Location | Description |
|------------------------|---------------|-------------|
| **React Application** | `reference-implementation/react/` | Complete React UI |
| Main App | `src/App.tsx` | App entry point with routing |
| Navigation Menu | `src/components/NavigationMenu.tsx` | Site navigation component |
| Case List Page | `src/pages/CaseListPage.tsx` | List of clinical cases |
| Case View Page | `src/pages/CaseViewPage.tsx` | Main case detail view |
| Rule Evaluation Page | `src/pages/RuleEvaluationPage.tsx` | NHSN criteria evaluation |
| Ask the Case Panel | `src/components/AskTheCasePanel.tsx` | Q&A interface |
| Rule Visualizer | `src/components/RuleEvaluationVisualizer.tsx` | Rules display |
| Timeline Component | `src/components/EnhancedTimeline.tsx` | Timeline visualization |
| **API Client** | `src/api/cafactory.ts` | TypeScript API client |

### 2. REST API Layer

| Architecture Component | Code Location | Description |
|------------------------|---------------|-------------|
| **FastAPI Server** | `backend/api/main.py` | Main API server |
| `/health` | `main.py:108-123` | Health check endpoint |
| `/v1/case/:id/ask` | `main.py:127-173` | Q&A endpoint |
| `/v1/case/:id/rules` | `main.py:177-236` | Rule evaluation endpoint |
| `/v1/case/:id/evidence` | `main.py:240-287` | Evidence retrieval endpoint |
| `/v1/admin/quality-metrics` | `main.py:291-339` | Admin metrics endpoint |
| CORS Middleware | `main.py:38-49` | Cross-origin config |
| Error Handlers | `main.py:343-383` | Error handling |

### 3. CA Factory Core

| Architecture Component | Code Location | Description |
|------------------------|---------------|-------------|
| **Main Factory** | `backend/ca_factory/core/factory.py` | Central orchestrator |
| Factory Class | `factory.py:25-370` | CAFactory main class |
| `ask_question()` | `factory.py:66-106` | Q&A orchestration |
| `evaluate_rules()` | `factory.py:108-152` | Rule evaluation orchestration |
| `retrieve_evidence()` | `factory.py:154-188` | Evidence retrieval orchestration |
| **Agent Manager (R)** | `backend/ca_factory/core/agent_manager.py` | Context control |
| AgentManager Class | `agent_manager.py:17-265` | Agent lifecycle manager |
| `execute_agent()` | `agent_manager.py:49-87` | Agent execution |
| Context creation | `agent_manager.py:106-133` | Build agent context |
| Token budgeting | `agent_manager.py:146-158` | Track token usage |
| Context pruning | `agent_manager.py:160-206` | R Principle - reduction |
| Auto-priming | `agent_manager.py:135-144` | Dynamic knowledge loading |
| **Delegation Engine (D)** | `backend/ca_factory/core/delegation.py` | Task distribution |
| DelegationEngine Class | `delegation.py:17-356` | Delegation orchestrator |
| `should_delegate()` | `delegation.py:48-101` | Delegation decision logic |
| `create_context_bundle()` | `delegation.py:103-154` | Bundle creation |
| `spawn_subagent()` | `delegation.py:156-214` | Sub-agent spawning |
| Sub-agent execution | `delegation.py:216-265` | Isolated execution |
| **Quality Controller (Q)** | `backend/ca_factory/core/quality_control.py` | Quality gates |
| QualityController Class | `quality_control.py:16-409` | QC orchestrator |
| `validate_retrieval_results()` | `quality_control.py:44-79` | Retrieval validation |
| `validate_qa_response()` | `quality_control.py:81-138` | Q&A validation |
| `validate_rule_evaluation()` | `quality_control.py:140-177` | Rule validation |
| Recall@k calculation | `quality_control.py:179-204` | Retrieval metric |
| MRR calculation | `quality_control.py:206-229` | Retrieval metric |
| `check_quality_gates()` | `quality_control.py:231-293` | Gate enforcement |

### 4. Specialized Agents

| Architecture Component | Code Location | Description |
|------------------------|---------------|-------------|
| **Base Agent** | `backend/ca_factory/agents/base.py` | Abstract base class |
| BaseAgent Class | `base.py:15-280` | Common agent functionality |
| `execute()` | `base.py:40-53` | Abstract execution method |
| `validate_inputs()` | `base.py:55-69` | Input validation |
| `build_prompt()` | `base.py:79-117` | Prompt construction |
| **Evidence Retrieval** | `backend/ca_factory/agents/evidence_retrieval.py` | Semantic search |
| EvidenceRetrievalAgent | `evidence_retrieval.py:17-331` | Evidence agent |
| Vector search | `evidence_retrieval.py:174-217` | Execute search |
| Filter application | `evidence_retrieval.py:219-256` | Apply filters |
| Result ranking | `evidence_retrieval.py:258-271` | Rank by relevance |
| **Rule Evaluation** | `backend/ca_factory/agents/rule_evaluation.py` | NHSN criteria |
| RuleEvaluationAgent | `rule_evaluation.py:17-445` | Rule evaluator |
| Load domain rules | `rule_evaluation.py:42-93` | Load CLABSI/CAUTI rules |
| Evaluate single rule | `rule_evaluation.py:176-218` | Per-rule evaluation |
| Generate summary | `rule_evaluation.py:406-445` | Aggregate results |
| **Q&A Response** | `backend/ca_factory/agents/qa_response.py` | Natural language Q&A |
| QAResponseAgent | `qa_response.py:18-337` | Q&A agent |
| Retrieve evidence | `qa_response.py:132-187` | Get relevant evidence |
| Generate answer | `qa_response.py:189-236` | LLM-based answering |
| Create citations | `qa_response.py:238-265` | Build citations |
| Calculate confidence | `qa_response.py:267-290` | Confidence scoring |
| Generate follow-ups | `qa_response.py:292-337` | Suggest questions |

### 5. Configuration System

| Architecture Component | Code Location | Description |
|------------------------|---------------|-------------|
| **Config Loader** | `backend/ca_factory/config/loader.py` | Load project configs |
| ConfigLoader Class | `loader.py:15-252` | Config loader |
| `load_project()` | `loader.py:30-80` | Load complete project |
| `list_projects()` | `loader.py:96-120` | List all projects |
| **Config Validator** | `backend/ca_factory/config/validator.py` | Validate configs |
| ConfigValidator Class | `validator.py:15-319` | Validation engine |
| `validate()` | `validator.py:48-93` | Full validation |
| Validate agents | `validator.py:110-159` | Agent profile validation |
| Validate rules | `validator.py:161-194` | Rule library validation |
| **Project Manager** | `backend/ca_factory/config/project_manager.py` | Project lifecycle |
| ProjectManager Class | `project_manager.py:19-285` | Project manager |
| `create_project()` | `project_manager.py:39-96` | Create new project |
| `validate_project()` | `project_manager.py:127-138` | Validate project |
| **CLI Tool** | `backend/cli/ca_factory_cli.py` | Command-line interface |
| Main CLI | `ca_factory_cli.py:1-310` | CLI entry point |
| Init command | `ca_factory_cli.py:23-54` | Initialize project |
| List command | `ca_factory_cli.py:57-72` | List projects |
| Validate command | `ca_factory_cli.py:75-91` | Validate project |

### 6. Data Layer

| Architecture Component | Code Location | Description |
|------------------------|---------------|-------------|
| **Mock Vector Store** | `backend/ca_factory/storage/mock_vector_store.py` | In-memory search |
| MockVectorStore Class | `mock_vector_store.py:16-171` | Mock vector DB |
| `index_document()` | `mock_vector_store.py:27-43` | Index content |
| `search()` | `mock_vector_store.py:45-93` | Search documents |
| **Mock Memory Store** | `backend/ca_factory/storage/mock_memory.py` | In-memory cache |
| MockMemoryStore Class | `mock_memory.py:16-306` | Mock Redis |
| `set()` / `get()` | `mock_memory.py:30-85` | Key-value operations |
| TTL management | `mock_memory.py:111-134` | Expiration handling |
| **Mock Case Loader** | `backend/ca_factory/storage/mock_case_loader.py` | Patient data |
| MockCaseLoader Class | `mock_case_loader.py:16-250` | Load case JSON |
| `get_case()` | `mock_case_loader.py:49-57` | Get patient case |
| `search_content()` | `mock_case_loader.py:101-186` | Search case data |

### 7. Configuration Data

| Architecture Component | Code Location | Description |
|------------------------|---------------|-------------|
| **CLABSI Project** | `backend/configs/projects/clabsi/` | CLABSI configuration |
| Manifest | `clabsi/manifest.json` | Project metadata |
| Agent Config | `clabsi/agent_config.json` | Agent profiles, gates |
| Rules Library | `clabsi/rules.json` | 6 NHSN CLABSI rules |
| Knowledge Base | `clabsi/knowledge_base.json` | Domain knowledge chunks |
| Prompts | `clabsi/prompts.json` | Prompt templates |
| Tasks | `clabsi/tasks.json` | Task definitions |
| Tools | `clabsi/tools.json` | Tool catalog |
| Schemas | `clabsi/schemas.json` | Data schemas |
| Golden Corpus | `clabsi/golden_corpus.json` | Test cases |
| **CAUTI Project** | `backend/configs/projects/cauti/` | CAUTI configuration |
| (Same structure as CLABSI) | | |

### 8. Sample Data

| Architecture Component | Code Location | Description |
|------------------------|---------------|-------------|
| **Mock Patient Cases** | `backend/data/mock/cases/` | Sample JSON cases |
| CLABSI Positive | `PAT-001-clabsi-positive.json` | Full CLABSI case |
| CLABSI Negative | `PAT-002-clabsi-negative.json` | Not CLABSI (urosepsis) |

## Data Flow Examples

### Example 1: Q&A Request Flow

```
User Request
   ↓
[React Component] AskTheCasePanel.tsx:85
   ↓ HTTP POST
[FastAPI] main.py:127 → POST /v1/case/{id}/ask
   ↓
[Factory] factory.py:66 → ask_question()
   ↓
[Delegation Engine] delegation.py:48 → should_delegate()
   ↓ (if delegated)
[Delegation Engine] delegation.py:156 → spawn_subagent()
   ↓
[Q&A Agent] qa_response.py:43 → execute()
   ├─→ [Evidence Retrieval] qa_response.py:132
   │   └─→ [Mock Vector Store] mock_vector_store.py:45
   ├─→ [Answer Generation] qa_response.py:189
   └─→ [Citation Creation] qa_response.py:238
   ↓
[Quality Controller] quality_control.py:81 → validate_qa_response()
   ↓
[FastAPI] Response returned
   ↓
[React] Display answer with citations
```

### Example 2: Rule Evaluation Flow

```
User Clicks "Rules" Tab
   ↓
[React] RuleEvaluationPage.tsx:45
   ↓ HTTP GET
[FastAPI] main.py:177 → GET /v1/case/{id}/rules
   ↓
[Factory] factory.py:108 → evaluate_rules()
   ↓
[Rule Agent] rule_evaluation.py:117 → execute()
   ├─→ [Load Rules] rule_evaluation.py:42 (from rules.json)
   ├─→ [Load Patient Data] mock_case_loader.py:49
   ├─→ [Evaluate Each Rule] rule_evaluation.py:176
   │   └─→ [Mock Rule Logic] rule_evaluation.py:220
   └─→ [Generate Summary] rule_evaluation.py:406
   ↓
[Quality Controller] quality_control.py:140 → validate_rule_evaluation()
   ↓
[React] RuleEvaluationVisualizer.tsx displays results
```

## Key Design Patterns

### 1. Factory Pattern
- **Location**: `ca_factory/core/factory.py`
- **Purpose**: Central orchestrator for all agents
- **Usage**: Single entry point for all CA operations

### 2. Strategy Pattern
- **Location**: `ca_factory/agents/base.py`
- **Purpose**: Different agents implement same interface
- **Usage**: Polymorphic agent execution

### 3. Template Method
- **Location**: `ca_factory/agents/base.py`
- **Purpose**: Define skeleton of agent execution
- **Usage**: BaseAgent defines flow, subclasses implement details

### 4. Observer Pattern
- **Location**: `ca_factory/core/quality_control.py`
- **Purpose**: Track metrics across all operations
- **Usage**: QualityController observes all agent executions

### 5. Builder Pattern
- **Location**: `ca_factory/core/delegation.py`
- **Purpose**: Build complex context bundles
- **Usage**: DelegationEngine creates context bundles

## Testing Locations

| Test Type | Location | Description |
|-----------|----------|-------------|
| Unit Tests | `backend/tests/unit/` | (To be created) |
| Integration Tests | `backend/tests/integration/` | (To be created) |
| E2E Tests | `backend/tests/e2e/` | (To be created) |
| Mock Data | `backend/data/mock/` | Sample patient cases |

## Environment Configuration

| Environment | File | Purpose |
|-------------|------|---------|
| Development | `.env.development` | Local dev settings |
| Testing | `.env.test` | Test environment |
| Production | `.env.production` | Production settings |
| Docker | `docker-compose.yml` | Container orchestration |

## Quick Reference: Find by Functionality

### Want to...

**Add a new domain (e.g., SSI)?**
- Use CLI: `python backend/cli/ca_factory_cli.py init ssi`
- Files created in: `backend/configs/projects/ssi/`

**Modify CLABSI rules?**
- Edit: `backend/configs/projects/clabsi/rules.json`

**Change agent prompts?**
- Edit: `backend/configs/projects/clabsi/prompts.json`

**Add new API endpoint?**
- Modify: `backend/api/main.py`
- Add to: API_REFERENCE.md

**Change UI components?**
- React files: `reference-implementation/react/src/components/`

**Modify quality gates?**
- Edit: `backend/configs/projects/clabsi/agent_config.json`
- Section: `quality_gates`

**Add mock patient data?**
- Create JSON in: `backend/data/mock/cases/`
- Follow schema in existing files

**Debug agent execution?**
- Enable logging in: `backend/ca_factory/core/agent_manager.py`
- Check logs for agent_id execution

This mapping should help navigate from architecture concepts to actual code implementation!
