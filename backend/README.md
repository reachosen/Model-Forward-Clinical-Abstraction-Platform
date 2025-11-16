# CA Factory Backend

Backend implementation of the Context Architect (CA) Factory for the Model-Forward Clinical Abstraction Platform.

## Architecture

The backend is built using FastAPI and implements the CA Factory design with three core principles:
- **R Principle (Reduction)**: Strict context control and token management
- **D Principle (Delegation)**: Automatic task distribution to specialized sub-agents
- **Q Principle (Quality)**: Built-in quality gates and performance monitoring

## Directory Structure

```
backend/
├── ca_factory/              # Core CA Factory implementation
│   ├── core/               # Core factory components
│   │   ├── factory.py      # Main factory class
│   │   ├── agent_manager.py
│   │   ├── delegation.py
│   │   └── quality_control.py
│   ├── agents/             # Specialized agents
│   │   ├── base.py         # Base agent class
│   │   ├── evidence_retrieval.py
│   │   ├── rule_evaluation.py
│   │   ├── qa_response.py
│   │   ├── timeline_analysis.py
│   │   └── summary_generation.py
│   ├── config/             # Configuration management
│   │   ├── schema.py       # Configuration schemas
│   │   ├── validator.py    # Config validation
│   │   └── loader.py       # Config loading
│   ├── context/            # Context management (R Principle)
│   │   ├── pruning.py      # Token pruning strategies
│   │   ├── priming.py      # Dynamic knowledge loading
│   │   └── budgets.py      # Token budget tracking
│   ├── delegation/         # Delegation engine (D Principle)
│   │   ├── router.py       # Task routing logic
│   │   ├── spawner.py      # Sub-agent spawning
│   │   └── bundles.py      # Context bundle management
│   ├── quality/            # Quality control (Q Principle)
│   │   ├── retrieval_eval.py  # Retrieval metrics
│   │   ├── response_eval.py   # Response validation
│   │   └── gates.py        # Quality gates
│   ├── storage/            # Data storage
│   │   ├── vector_store.py # Vector database interface
│   │   ├── memory_store.py # Redis/cache interface
│   │   └── corpus.py       # Golden corpus management
│   └── utils/              # Utilities
│       ├── logging.py
│       ├── metrics.py
│       └── phi_redaction.py
├── api/                    # FastAPI application
│   ├── main.py            # FastAPI app entry point
│   ├── routes/            # API route handlers
│   │   ├── case.py        # Case-related endpoints
│   │   ├── admin.py       # Admin endpoints
│   │   └── webhooks.py    # Webhook endpoints
│   ├── middleware/        # API middleware
│   │   ├── auth.py
│   │   ├── rate_limit.py
│   │   └── logging.py
│   └── dependencies.py    # FastAPI dependencies
├── configs/               # Configuration files
│   ├── clabsi.json
│   ├── cauti.json
│   └── default.json
├── tests/                 # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/               # Utility scripts
│   ├── migrate_config.py
│   ├── validate_corpus.py
│   └── benchmark.py
├── requirements.txt       # Python dependencies
├── requirements-dev.txt   # Development dependencies
├── pyproject.toml        # Project configuration
├── Dockerfile            # Docker configuration
└── docker-compose.yml    # Docker Compose setup
```

## Quick Start

### Prerequisites

- Python 3.11+
- Redis (for caching)
- Vector database (Pinecone/Weaviate/Chroma)

### Installation

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Initialize database
python scripts/init_db.py
```

### Running the Server

```bash
# Development
uvicorn api.main:app --reload --port 8000

# Production
gunicorn api.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Docker Deployment

```bash
# Build and run
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f
```

## Configuration

Configure agents using JSON files in the `configs/` directory. See `docs/ca-factory/02-configuration-schema.md` for schema details.

Example:
```bash
# Validate configuration
python -m ca_factory.config.validate --config configs/clabsi.json

# Test agent with configuration
python scripts/test_agent.py --config configs/clabsi.json --test-case tests/data/sample_case.json
```

## API Documentation

Interactive API documentation available at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Testing

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=ca_factory --cov-report=html

# Run specific test suite
pytest tests/unit/
pytest tests/integration/
pytest tests/e2e/

# Run quality control tests
pytest tests/quality/ -v
```

## Quality Metrics

Monitor agent performance:

```bash
# Run benchmark suite
python scripts/benchmark.py --config configs/clabsi.json

# Generate quality report
python scripts/quality_report.py --domain CLABSI --output report.html
```

## Development

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Format code
black ca_factory/ api/
isort ca_factory/ api/

# Lint
flake8 ca_factory/ api/
mypy ca_factory/ api/

# Type check
pyright ca_factory/ api/
```

## Environment Variables

Required environment variables (see `.env.example`):

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_WORKERS=4

# Authentication
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256

# Database
REDIS_URL=redis://localhost:6379
VECTOR_STORE_URL=...

# LLM API
ANTHROPIC_API_KEY=your-api-key
OPENAI_API_KEY=your-api-key  # For embeddings

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
```

## Monitoring

The backend exposes Prometheus metrics at `/metrics`:

```bash
# Key metrics
- ca_factory_requests_total
- ca_factory_request_duration_seconds
- ca_factory_tokens_used_total
- ca_factory_quality_score
- ca_factory_cache_hit_rate
```

## License

See LICENSE file in repository root.
