# No-Database Mode Guide

The CA Factory can run completely **without any external databases** for development, testing, and demos. This document explains how to use mock mode and the data schemas involved.

## Overview

In no-database mode, the system uses:

- **Mock Vector Store**: In-memory semantic search (replaces Pinecone/Weaviate/Chroma)
- **Mock Memory Store**: In-memory caching (replaces Redis)
- **Mock Case Loader**: JSON file-based patient data (replaces PostgreSQL/MongoDB)
- **Mock LLM**: Simulated AI responses (replaces Anthropic Claude API)

This allows you to:
✅ Run the complete system locally without infrastructure
✅ Demo to stakeholders immediately
✅ Develop and test offline
✅ Run integration tests in CI/CD
✅ Understand data schemas before deployment

## Enabling Mock Mode

### Method 1: Environment Variable

```bash
export CA_FACTORY_MODE=mock
python backend/api/main.py
```

### Method 2: Configuration File

Create `.env` file:
```bash
CA_FACTORY_MODE=mock
CA_FACTORY_PROJECT=clabsi
```

### Method 3: Direct Python Usage

```python
from ca_factory.core.factory import CAFactory
from ca_factory.storage import MockVectorStore, MockMemoryStore, MockCaseLoader

# Initialize mock components
vector_store = MockVectorStore()
memory_store = MockMemoryStore()
case_loader = MockCaseLoader()

# Use in application
```

## Data Schemas

### 1. Patient Case Schema

Patient cases are stored as JSON files in `backend/data/mock/cases/`.

**File Structure:**
```json
{
  "case_metadata": {
    "case_id": "string",
    "patient_id": "string",
    "encounter_id": "string",
    "created_date": "ISO-8601 datetime",
    "infection_type": "CLABSI | CAUTI | SSI | VAP | NOT_HAC",
    "facility_id": "string",
    "unit": "string"
  },
  "patient_demographics": {
    "age": "number",
    "gender": "M | F | Other",
    "mrn": "string"
  },
  "devices": {
    "central_line": {
      "insertion_date": "YYYY-MM-DD",
      "insertion_time": "HH:MM:SS",
      "line_type": "PICC | CVC | tunneled | implanted_port",
      "insertion_site": "string",
      "removal_date": "YYYY-MM-DD | null",
      "removal_time": "HH:MM:SS | null",
      "device_days_at_event": "number"
    },
    "urinary_catheter": { ... },  // For CAUTI
    "ventilator": { ... }          // For VAP
  },
  "lab_results": [
    {
      "test_id": "string",
      "test_type": "blood_culture | urine_culture | csf_culture | wound_culture",
      "collection_date": "YYYY-MM-DD",
      "collection_time": "HH:MM:SS",
      "result_date": "YYYY-MM-DD",
      "result_time": "HH:MM:SS",
      "sample_type": "string",
      "organism": "string | null",
      "organism_type": "recognized_pathogen | common_commensal",
      "growth": "Positive | Negative | Pending",
      "cfu_count": "number | null",
      "source_id": "string"
    }
  ],
  "clinical_signals": [
    {
      "signal_id": "string",
      "signal_type": "vital_sign | symptom | lab_value",
      "signal_name": "temperature | heart_rate | blood_pressure | wbc | ...",
      "timestamp": "ISO-8601 datetime",
      "value": "any",
      "unit": "string",
      "source": "bedside_monitor | nursing_assessment | lab",
      "abnormal": "boolean"
    }
  ],
  "clinical_events": [
    {
      "event_id": "string",
      "event_type": "device_insertion | device_removal | fever_onset | treatment_initiated | ...",
      "event_name": "string",
      "timestamp": "ISO-8601 datetime",
      "performed_by": "string",
      "location": "string",
      "details": { "flexible": "object" }
    }
  ],
  "clinical_notes": [
    {
      "note_id": "string",
      "note_type": "nursing_assessment | physician_progress_note | microbiology_result | ...",
      "timestamp": "ISO-8601 datetime",
      "author": "string",
      "content": "full text of note",
      "extracted_concepts": ["array", "of", "keywords"]
    }
  ],
  "timeline_phases": [
    {
      "phase_name": "Device Placement | Infection Window | Symptom Onset | ...",
      "start_date": "YYYY-MM-DD",
      "end_date": "YYYY-MM-DD",
      "day_number": "number",
      "events": ["array of event descriptions"]
    }
  ],
  "nhsn_evaluation": {
    "date_of_event": "YYYY-MM-DD",
    "infection_window_start": "YYYY-MM-DD",
    "infection_window_end": "YYYY-MM-DD",
    "device_days_at_event": "number",
    "criteria_met": {
      "criterion_name": "boolean"
    },
    "nhsn_determination": "CLABSI_CONFIRMED | NOT_CLABSI | INDETERMINATE",
    "confidence": "0.0 - 1.0"
  },
  "other_infections": [
    {
      "infection_type": "UTI | Pneumonia | Wound_Infection | ...",
      "site": "string",
      "organism": "string",
      "diagnosis_date": "YYYY-MM-DD",
      "confidence": "0.0 - 1.0"
    }
  ]
}
```

### 2. Vector Store Document Schema

Documents indexed in the vector store:

```json
{
  "document_id": "unique_id",
  "content": "full text content for embedding",
  "metadata": {
    "patient_id": "string",
    "source_type": "NOTE | EVENT | SIGNAL | LAB | RULE",
    "source_id": "string",
    "timestamp": "ISO-8601",
    "domain": "CLABSI | CAUTI | ...",
    "custom_fields": "any"
  },
  "embedding": [0.123, 0.456, ...]  // 1536-dim vector for OpenAI embeddings
}
```

### 3. Memory Store (Cache) Schema

Key-value pairs with TTL:

```python
# Agent state
"ca_factory:agent:{agent_id}:state" → {
    "status": "running | completed | failed",
    "started_at": "ISO-8601",
    "context_tokens": number
}

# Case cache
"ca_factory:case:{patient_id}:summary" → {
    "patient_id": "...",
    "last_updated": "ISO-8601",
    "cached_data": { ... }
}

# Quality metrics
"ca_factory:metrics:{metric_type}:{date}" → {
    "recall_at_5": 0.87,
    "mrr": 0.91,
    ...
}
```

### 4. Configuration Schema

See `backend/configs/projects/{project}/schemas.json` for domain-specific schemas.

**Example - CLABSI Patient Schema:**
```json
{
  "type": "object",
  "properties": {
    "patient_id": {"type": "string"},
    "devices": {
      "central_line_insertion_date": {"type": "string", "format": "date"},
      "central_line_type": {"type": "string", "enum": ["PICC", "CVC", "tunneled", "implanted_port"]}
    },
    "lab_results": {
      "type": "array",
      "items": {
        "organism": {"type": "string"},
        "organism_type": {"type": "string", "enum": ["recognized_pathogen", "common_commensal"]}
      }
    }
  }
}
```

## Mock Component Usage

### Mock Vector Store

```python
from ca_factory.storage import MockVectorStore

# Initialize
vector_store = MockVectorStore()

# Index documents
vector_store.index_document(
    document_id="DOC-001",
    content="Central line inserted on 2024-01-15",
    metadata={"patient_id": "PAT-001", "source_type": "EVENT"}
)

# Search
results = vector_store.search(
    query="central line placement",
    top_k=10,
    filters={"source_type": "EVENT"}
)

# Results format
for result in results:
    print(result["content"])
    print(result["relevance_score"])  # 0.0 - 1.0
```

**Mock Vector Store Features:**
- ✅ Text-based similarity matching (no actual embeddings)
- ✅ Metadata filtering
- ✅ Relevance scoring
- ✅ Top-k selection
- ✅ Bulk indexing
- ❌ True semantic understanding (use production vector DB for this)

### Mock Memory Store

```python
from ca_factory.storage import MockMemoryStore

# Initialize
memory = MockMemoryStore(key_prefix="ca_factory:")

# Set with TTL
memory.set("session:123", {"user_id": "U-001"}, ttl_seconds=3600)

# Get
data = memory.get("session:123")

# Increment counter
memory.increment("request_count")

# Hash operations
memory.set_hash("user:U-001", "last_login", "2024-11-16T10:00:00Z")
```

**Mock Memory Store Features:**
- ✅ Key-value storage
- ✅ TTL/expiration
- ✅ Hash operations
- ✅ Counters
- ✅ Pattern matching
- ❌ Pub/sub (use production Redis for this)
- ❌ Persistence across restarts

### Mock Case Loader

```python
from ca_factory.storage import MockCaseLoader

# Initialize (auto-loads JSON files)
loader = MockCaseLoader()

# Get case
case = loader.get_case("PAT-001")

# List all cases
cases = loader.list_cases()

# Search within case
results = loader.search_content(
    patient_id="PAT-001",
    query="fever",
    content_types=["notes", "events", "signals"]
)
```

**Mock Case Loader Features:**
- ✅ JSON file-based storage
- ✅ Full case data access
- ✅ Simple text search
- ✅ Content filtering
- ✅ Hot reload support
- ❌ Complex queries (use production DB for this)
- ❌ Concurrent writes

## Creating Mock Patient Cases

### Template Structure

```bash
backend/data/mock/cases/
├── PAT-001-clabsi-positive.json    # CLABSI confirmed
├── PAT-002-clabsi-negative.json    # Not CLABSI (alternate source)
├── PAT-003-cauti-positive.json     # CAUTI confirmed
└── templates/
    └── case_template.json           # Empty template
```

### Example Creation Steps

1. **Copy template:**
```bash
cp backend/data/mock/cases/PAT-001-clabsi-positive.json \
   backend/data/mock/cases/PAT-003-new-case.json
```

2. **Edit JSON:**
   - Update `case_metadata.patient_id`
   - Modify clinical data as needed
   - Update `nhsn_evaluation` with expected results

3. **Reload:**
```python
loader = MockCaseLoader()
loader.reload()  # Pick up new files
```

## Domain-Agnostic Configuration

The configuration system is designed to support **any clinical domain** without code changes.

### Multi-Domain Support

**Switch domains via environment variable:**
```bash
# Use CLABSI
export CA_FACTORY_PROJECT=clabsi
python backend/api/main.py

# Use CAUTI
export CA_FACTORY_PROJECT=cauti
python backend/api/main.py

# Use custom domain
export CA_FACTORY_PROJECT=ssi
python backend/api/main.py
```

### Domain Configuration Components

Each domain project contains:

1. **manifest.json** - Domain metadata
2. **rules.json** - Domain-specific evaluation rules
3. **knowledge_base.json** - Domain knowledge for context priming
4. **prompts.json** - Domain-adapted prompt templates
5. **schemas.json** - Domain data schemas
6. **agent_config.json** - Agent configurations
7. **tools.json** - Domain-specific tools
8. **tasks.json** - Task definitions
9. **golden_corpus.json** - Test cases for the domain

### Creating a New Domain

```bash
# Use CLI to initialize
python backend/cli/ca_factory_cli.py init ssi \
  --name "Surgical Site Infection Detection" \
  --domain "Healthcare-Acquired Conditions"

# This creates:
# backend/configs/projects/ssi/
#   ├── manifest.json
#   ├── agent_config.json
#   ├── rules.json
#   ├── knowledge_base.json
#   ├── prompts.json
#   ├── tools.json
#   ├── tasks.json
#   ├── schemas.json
#   └── golden_corpus.json
```

**Then customize:**
1. Edit `rules.json` with SSI-specific NHSN criteria
2. Update `knowledge_base.json` with surgical wound knowledge
3. Modify `prompts.json` for SSI-specific language
4. Update `schemas.json` with procedure/wound data structure

### Domain Templates

Create reusable templates:

```bash
# Export existing project as template
python backend/cli/ca_factory_cli.py export clabsi \
  --output backend/configs/templates/hac_template

# Replace domain-specific values with variables
# {DOMAIN}, {INFECTION_TYPE}, {DEVICE_TYPE}, etc.

# Create new project from template
python backend/cli/ca_factory_cli.py init vap \
  --template hac_template \
  --name "Ventilator-Associated Pneumonia Detection"
```

## Testing Without External Dependencies

### Unit Tests

```python
import pytest
from ca_factory.storage import MockVectorStore, MockMemoryStore

def test_vector_search():
    store = MockVectorStore()
    store.index_document("doc1", "fever and chills")
    results = store.search("fever")
    assert len(results) > 0
    assert results[0]["relevance_score"] > 0
```

### Integration Tests

```python
import pytest
from ca_factory.core.factory import CAFactory
from ca_factory.config.loader import ConfigLoader

@pytest.fixture
async def factory():
    loader = ConfigLoader("./backend/configs")
    config = loader.load_project("clabsi")
    return CAFactory(config)

async def test_qa_flow(factory):
    result = await factory.ask_question(
        patient_id="PAT-001",
        question="What is the diagnosis?"
    )
    assert result["confidence"] > 0.5
    assert len(result["evidence_citations"]) > 0
```

### E2E Tests

```bash
# Run complete E2E test
python backend/tests/e2e_demo_test.py

# Expected output:
# ✓ Configuration loading: PASSED
# ✓ Mock data loading: PASSED
# ✓ Q&A functionality: PASSED
# ✓ Rule evaluation: PASSED
# ✓ Evidence retrieval: PASSED
```

## Production Migration Path

When ready to move from mock to production:

### 1. Vector Store Migration

**Mock → Pinecone:**
```python
# Before (mock)
from ca_factory.storage import MockVectorStore
vector_store = MockVectorStore()

# After (production)
from pinecone import Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("clabsi-clinical-data")

# Implement same interface
def search(query, top_k=10):
    # Generate embedding
    embedding = generate_embedding(query)
    # Query Pinecone
    results = index.query(embedding, top_k=top_k)
    return format_results(results)
```

### 2. Memory Store Migration

**Mock → Redis:**
```python
# Before (mock)
from ca_factory.storage import MockMemoryStore
memory = MockMemoryStore()

# After (production)
import redis
memory = redis.Redis(
    host='localhost',
    port=6379,
    decode_responses=True
)
# Same interface: set(), get(), etc.
```

### 3. Case Data Migration

**Mock JSON → Database:**
```python
# Before (mock)
from ca_factory.storage import MockCaseLoader
loader = MockCaseLoader()

# After (production)
from sqlalchemy import create_engine
engine = create_engine(os.getenv("DATABASE_URL"))

def get_case(patient_id):
    with engine.connect() as conn:
        result = conn.execute(
            "SELECT * FROM cases WHERE patient_id = %s",
            (patient_id,)
        )
        return dict(result.fetchone())
```

## Performance Considerations

### Mock Mode Limitations

| Component | Mock Performance | Production Performance |
|-----------|------------------|------------------------|
| Vector Search | O(n) text scan | O(log n) ANN search |
| Memory Operations | O(1) dict lookup | O(1) Redis |
| Case Loading | O(1) with file count | O(log n) with DB indexing |
| Concurrency | Single process | Multi-process/distributed |
| Data Volume | < 1000 cases | Millions of cases |

### When to Use Mock vs Production

**Use Mock for:**
- ✅ Development
- ✅ Unit/integration tests
- ✅ Demos
- ✅ CI/CD pipelines
- ✅ Understanding data flow
- ✅ Offline work

**Use Production for:**
- ✅ Real clinical data (>1000 cases)
- ✅ True semantic search
- ✅ Multi-user access
- ✅ High availability
- ✅ Data persistence
- ✅ Compliance/audit requirements

## Summary

Mock/no-database mode provides:

1. **Zero Infrastructure** - Run anywhere Python runs
2. **Fast Startup** - No database connections or API keys needed
3. **Full Functionality** - All features work (with appropriate limitations)
4. **Clear Schemas** - JSON files show exact data structures
5. **Domain Agnostic** - Easy to create new domains
6. **Production Path** - Clear migration to production infrastructure

This makes CA Factory accessible for development, testing, and demonstrations while maintaining the same architecture and interfaces as production.
