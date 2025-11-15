# Model-Forward Clinical Abstraction Platform

## Architecture Overview

This platform leverages a model-forward approach to clinical data abstraction, combining structured data engineering with Large Language Models (LLMs) to assist clinicians and abstractors in quality reporting and clinical decision support.

## System Architecture

```mermaid
flowchart LR
  %% 1. SOURCE SYSTEMS
  subgraph Source["Clinical Source Systems"]
    EHR["Caboodle / Clarity<br>EHR Extracts"]
    OtherSrc["Other Feeds<br>Devices, Registries, Externals"]
  end

  %% 2. DATA & AI PLATFORM
  subgraph Platform["Data & AI Platform (Snowflake-Centric)"]
    Ingest["Ingest & Orchestration<br>Snowpipe, Streams/Tasks, Coalesce"]
    Silver["DIA_SILVER<br>Raw-Normalized Facts"]
    Gold["DIA_GOLD<br>Domain Models & Metrics"]
    GoldAI["DIA_GOLD_AI<br>LLM-Ready Payloads<br>Signals, Timelines, Note Bundles"]
    Vec["Semantic Chunking & Vector Store<br>Patient/Encounter Chunks"]
    Ledger["Signal & Abstraction Ledger<br>Cases, Decisions, QA, Test/Prod"]
  end

  EHR --> Ingest
  OtherSrc --> Ingest
  Ingest --> Silver --> Gold --> GoldAI
  GoldAI --> Vec
  GoldAI --> Ledger

  %% 3. COGNITIVE / MODEL-FORWARD MIDDLE TIER
  subgraph Cognitive["Model-Forward Middle Tier"]
    subgraph DataAgent["Data Agent (Model-Forward Data Layer)"]
      Tools["Tool Layer<br>SQL, Rules Engine,<br>Validators, Search, Vector"]
      Planner["Planning & Orchestration<br>Multi-step Tool Use"]
      LLMCore["LLM Runtime<br>OpenAI / Writer / Palmyra / Cortex"]
    end

    subgraph AbstractionAgent["Abstraction Agent (Clinician-Facing)"]
      UXAPI["Abstraction API & UX Schema<br>Domain Contracts"]
      Reasoner["Reasoning & Draft Generation<br>Signals to Summaries"]
      QA["Automated QA & Guardrails<br>Rules, Contradictions, Checklists"]
    end
  end

  GoldAI --> Tools
  Vec --> Tools
  Ledger --> Tools

  Tools --> Planner
  Planner --> LLMCore
  LLMCore --> Reasoner
  Reasoner --> QA
  QA --> Ledger

  %% 4. CLINICAL APPLICATIONS
  subgraph Apps["Clinical Abstraction Applications"]
    CLABSI[CLABSI Agent]
    NAKI[NAKI Agent]
    UE[Unplanned Extubation Agent]
    Ortho[SCH / Ortho Quality Agent]
    Flight[Cardiac Surgery / FlightPlan Companion]
  end

  AbstractionAgent --> Apps
  Apps --> Clinicians[("Clinicians & Abstractors")]
  Clinicians --> Apps

  Apps --> Feedback[("Ops/Clinical Feedback")]
  Feedback --> Ledger
```

## Key Components

### 1. Clinical Source Systems
- **EHR Systems**: Caboodle/Clarity extracts from Epic or other EHR platforms
- **External Feeds**: Medical devices, clinical registries, and external data sources

### 2. Data & AI Platform (Snowflake-Centric)
- **Ingest & Orchestration**: Automated data ingestion using Snowpipe, Streams/Tasks, and Coalesce
- **DIA_SILVER**: Raw-normalized clinical facts layer
- **DIA_GOLD**: Domain-specific models and calculated metrics
- **DIA_GOLD_AI**: LLM-ready data payloads including clinical signals, patient timelines, and note bundles
- **Vector Store**: Semantic chunking and vector embeddings for patient/encounter context
- **Ledger**: Comprehensive tracking of signals, abstractions, decisions, and QA workflows

### 3. Model-Forward Middle Tier

#### Data Agent (Model-Forward Data Layer)
- **Tool Layer**: SQL execution, rules engine, validators, search, and vector retrieval
- **Planning & Orchestration**: Multi-step reasoning and tool use coordination
- **LLM Runtime**: Support for multiple LLM providers (OpenAI, Writer, Palmyra, Snowflake Cortex)

#### Abstraction Agent (Clinician-Facing)
- **Abstraction API**: Domain-specific contracts and UX schemas
- **Reasoning Engine**: Converts clinical signals into actionable summaries and draft abstractions
- **QA & Guardrails**: Automated validation, contradiction detection, and checklist enforcement

### 4. Clinical Abstraction Applications

Specialized agents for specific clinical quality and safety use cases:
- **CLABSI Agent**: Central Line-Associated Bloodstream Infection abstraction
- **NAKI Agent**: Neurological injury monitoring and reporting
- **Unplanned Extubation Agent**: Airway management safety events
- **SCH/Ortho Quality Agent**: Orthopedic surgery quality metrics
- **Cardiac Surgery/FlightPlan Companion**: Cardiovascular procedure support

## Data Flow

1. **Ingestion**: Clinical data flows from source systems into the Snowflake platform
2. **Refinement**: Data progresses through Silver → Gold → Gold_AI layers with increasing semantic enrichment
3. **Vectorization**: LLM-ready payloads are chunked and embedded for semantic search
4. **Agent Processing**: The Data Agent retrieves relevant context using tools and coordinates with the LLM runtime
5. **Clinical Abstraction**: The Abstraction Agent generates draft abstractions with QA validation
6. **Application Delivery**: Domain-specific agents present abstractions to clinicians
7. **Feedback Loop**: Clinical feedback and decisions are captured back into the ledger

## Benefits

- **Reduced Abstraction Time**: Automated draft generation reduces manual chart review time
- **Improved Accuracy**: Multi-layered QA and guardrails catch inconsistencies
- **Scalable Architecture**: Snowflake-native design supports enterprise-scale data volumes
- **Model-Agnostic**: Flexible LLM runtime supports multiple providers and models
- **Auditable**: Comprehensive ledger tracks all decisions and model outputs
- **Clinician-Centric**: Purpose-built agents for specific clinical workflows

## Technology Stack

- **Data Platform**: Snowflake (data warehouse, Snowpipe, Streams/Tasks)
- **Orchestration**: Coalesce, Snowflake native features
- **Vector Storage**: Snowflake Vector or dedicated vector DB
- **LLM Providers**: OpenAI, Writer, Palmyra, Snowflake Cortex
- **Source Systems**: Epic (Caboodle/Clarity), various clinical systems

## Getting Started

(Documentation to be added as the platform develops)

## Contributing

(Contribution guidelines to be added)

## License

(License information to be added)
