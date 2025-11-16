# Quickstart Guide - CA Factory

Get the CA Factory up and running in **5 minutes** - no database required!

## Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Git

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/Model-Forward-Clinical-Abstraction-Platform.git
cd Model-Forward-Clinical-Abstraction-Platform
```

### 2. Backend Setup (Python)

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup (React)

```bash
# Navigate to frontend (from repo root)
cd reference-implementation/react

# Install dependencies
npm install
```

## Running the Demo (No Database Required)

The CA Factory includes a **demo mode** that runs without any database, perfect for demos and development.

### Start Backend (Demo Mode)

```bash
# From backend/ directory
cd backend

# Set demo mode (no DB required)
export APP_MODE=demo
export CA_FACTORY_PROJECT=clabsi

# Start the server
python api/main.py
```

You should see:
```
INFO:     Starting CA Factory API in DEMO mode
INFO:     Loading project configuration: clabsi
INFO:     CA Factory initialized successfully for project: clabsi in demo mode
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

**Environment Variables:**
- `APP_MODE` - Set to `demo` (no database) or `production` (requires Snowflake)
  - Default: `demo`
  - Production mode is not yet implemented - setting to `production` will show a clear error
- `CA_FACTORY_PROJECT` - Which clinical domain to use (`clabsi`, `cauti`, etc.)
  - Default: `clabsi`

### Start Frontend

In a new terminal:

```bash
# From reference-implementation/react directory
cd reference-implementation/react

# Start development server
npm start
```

The React app will open at `http://localhost:3000`

## Try the Demo

### Option 1: Using the Web UI

1. Open `http://localhost:3000` in your browser
2. You'll see the case list with sample CLABSI cases
3. Click on "PAT-001" to view the case
4. Navigate to different sections:
   - **Overview**: Patient summary and case info
   - **Timeline**: Chronological events
   - **Signals**: Clinical signals and alerts
   - **Ask the Case**: AI-powered Q&A (try: "What evidence supports CLABSI?")
   - **Rules**: NHSN criteria evaluation
   - **Feedback**: Submit feedback

### Option 2: Using the API Directly

```bash
# Check API health
curl http://localhost:8000/health

# Ask a question about a case
curl -X POST http://localhost:8000/v1/case/PAT-001/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What evidence supports the CLABSI diagnosis?"
  }'

# Get rule evaluation
curl http://localhost:8000/v1/case/PAT-001/rules

# Retrieve evidence
curl -X POST http://localhost:8000/v1/case/PAT-001/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "query": "central line placement"
  }'

# Get quality metrics (admin)
curl http://localhost:8000/v1/admin/quality-metrics
```

## Understanding Mock Mode

In mock mode, the system uses:

- **Mock Patient Data**: Pre-loaded sample CLABSI cases in `backend/data/mock/cases/`
- **Mock Vector Store**: In-memory vector search (no Pinecone required)
- **Mock LLM**: Simulated Claude API responses (no Anthropic API key required)
- **Mock Redis**: In-memory cache (no Redis server required)

This allows you to:
- ✅ Demo the full system immediately
- ✅ Develop and test without infrastructure
- ✅ Run integration tests locally
- ✅ Understand the data flow

## Sample Use Cases

### 1. Evaluate CLABSI Criteria

```bash
# Get full rule evaluation for patient PAT-001
curl http://localhost:8000/v1/case/PAT-001/rules | jq .

# Expected output:
{
  "success": true,
  "data": {
    "case_id": "PAT-001",
    "infection_type": "CLABSI",
    "summary": {
      "totalRules": 6,
      "passedRules": 5,
      "failedRules": 0,
      "requiredRulesPassed": 5,
      "overallConfidence": 0.89
    },
    "evaluations": [...]
  }
}
```

### 2. Ask Clinical Questions

```bash
# Ask about infection timeline
curl -X POST http://localhost:8000/v1/case/PAT-001/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "When was the central line inserted?"}' | jq .

# Ask about organisms
curl -X POST http://localhost:8000/v1/case/PAT-001/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What organism was identified?"}' | jq .
```

### 3. Search Evidence

```bash
# Search for fever evidence
curl -X POST http://localhost:8000/v1/case/PAT-001/evidence \
  -H "Content-Type: application/json" \
  -d '{
    "query": "fever temperature",
    "top_k": 5
  }' | jq .
```

## Switch to CAUTI Demo

The system supports multiple domains. Switch to CAUTI:

```bash
# Stop the backend (Ctrl+C)

# Switch project
export CA_FACTORY_PROJECT=cauti

# Restart
python api/main.py
```

Now the API will use CAUTI rules and knowledge.

## Demo vs Production Mode

CA Factory supports two operational modes controlled by the `APP_MODE` environment variable:

### Demo Mode (Default)

**Current Status**: ✅ **Fully Implemented**

Demo mode uses in-memory mock implementations:
- **Vector Store**: Text-based search (no Pinecone)
- **Memory Cache**: In-memory cache (no Redis)
- **Patient Data**: JSON files (no PostgreSQL/Snowflake)
- **LLM**: Mock responses (no Anthropic API)

**Use Cases:**
- ✅ Local development
- ✅ Testing and CI/CD
- ✅ Stakeholder demos
- ✅ Learning the system
- ✅ Offline work

**Setup:**
```bash
export APP_MODE=demo
export CA_FACTORY_PROJECT=clabsi
python api/main.py
```

### Production Mode

**Current Status**: ⏳ **Not Yet Implemented**

Production mode will use real infrastructure:
- **Data Source**: Snowflake data warehouse
- **Vector Store**: Pinecone for semantic search
- **Memory Cache**: Redis for caching
- **LLM**: Anthropic Claude API

**Required Environment Variables (Future):**
```bash
export APP_MODE=production
export SNOWFLAKE_ACCOUNT=your_account
export SNOWFLAKE_USER=your_user
export SNOWFLAKE_DATABASE=your_database
export SNOWFLAKE_PASSWORD=your_password
export PINECONE_API_KEY=your_key
export REDIS_URL=redis://localhost:6379
export ANTHROPIC_API_KEY=your_key
```

**What Happens Now:**

If you try to run in production mode today, you'll get a clear error:

```
RuntimeError: PRODUCTION MODE NOT YET IMPLEMENTED
===========================================
Production mode requires Snowflake integration which is not yet available.

Missing required environment variables:
  - SNOWFLAKE_ACCOUNT: ✗ not set
  - SNOWFLAKE_USER: ✗ not set
  - SNOWFLAKE_DATABASE: ✗ not set

To use CA Factory now, please set APP_MODE=demo
See docs/QUICKSTART.md for demo mode setup instructions.
===========================================
```

This prevents accidental misconfiguration and clearly communicates that production mode is planned but not ready.

**Migration Path:**

When production mode is implemented, the same code will work - just change the environment variable:
```bash
# Switch from demo to production (future)
export APP_MODE=production  # Instead of APP_MODE=demo
python api/main.py
```

All API endpoints, data schemas, and functionality remain identical.

## Project Structure Overview

```
.
├── backend/
│   ├── api/                    # FastAPI server
│   │   └── main.py            # API entry point
│   ├── ca_factory/            # CA Factory core
│   │   ├── core/              # Factory, agents, delegation
│   │   ├── agents/            # Specialized agents
│   │   ├── config/            # Configuration system
│   │   └── storage/           # Mock storage (no DB)
│   ├── configs/               # Project configurations
│   │   └── projects/
│   │       ├── clabsi/        # CLABSI project
│   │       └── cauti/         # CAUTI project
│   ├── data/                  # Mock data
│   │   └── mock/
│   │       └── cases/         # Sample patient cases
│   └── cli/                   # CLI tools
│
├── reference-implementation/
│   └── react/                 # React UI
│       ├── src/
│       │   ├── api/          # API client
│       │   ├── components/   # React components
│       │   └── pages/        # Page components
│       └── public/           # Static assets
│
└── docs/
    ├── QUICKSTART.md         # This file
    ├── architecture/         # Architecture docs
    └── ca-factory/          # CA Factory specs
```

## Next Steps

### Running with Real Infrastructure

Once you're ready to move beyond mock mode:

1. **Set up Vector Store** (Pinecone)
   ```bash
   export PINECONE_API_KEY=your_key
   export PINECONE_ENVIRONMENT=us-east-1-aws
   ```

2. **Set up LLM** (Anthropic Claude)
   ```bash
   export ANTHROPIC_API_KEY=your_key
   ```

3. **Set up Redis** (optional, for caching)
   ```bash
   docker run -d -p 6379:6379 redis:7-alpine
   export REDIS_URL=redis://localhost:6379
   ```

4. **Disable mock mode**
   ```bash
   unset CA_FACTORY_MODE  # or set to "production"
   ```

### Explore the CLI

```bash
# List available projects
python backend/cli/ca_factory_cli.py list

# Create a new project
python backend/cli/ca_factory_cli.py init ssi \
  --name "SSI Detection" \
  --domain "Healthcare-Acquired Conditions"

# Validate project configuration
python backend/cli/ca_factory_cli.py validate clabsi
```

### Explore the Code

Key files to understand:

- `backend/ca_factory/core/factory.py` - Main CA Factory orchestrator
- `backend/ca_factory/agents/qa_response.py` - Q&A agent
- `backend/ca_factory/agents/rule_evaluation.py` - Rule evaluation agent
- `backend/configs/projects/clabsi/rules.json` - CLABSI rules definition
- `reference-implementation/react/src/api/cafactory.ts` - API client

### Read the Docs

- **Architecture**: `docs/ca-factory/01-architecture.md`
- **Configuration**: `backend/configs/README.md`
- **API Contracts**: `docs/ca-factory/03-api-contracts.md`

## Troubleshooting

### Backend won't start

```bash
# Check Python version
python --version  # Should be 3.11+

# Reinstall dependencies
pip install -r requirements.txt

# Check for port conflicts
lsof -i :8000  # On macOS/Linux
netstat -ano | findstr :8000  # On Windows
```

### Frontend won't start

```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check for port conflicts
lsof -i :3000  # On macOS/Linux
```

### API returns errors

```bash
# Check backend logs
# Look for ERROR messages in the terminal

# Verify mock mode is enabled
echo $CA_FACTORY_MODE  # Should output "mock"

# Test health endpoint
curl http://localhost:8000/health
```

### CORS errors in browser

Make sure:
1. Backend is running on `http://localhost:8000`
2. Frontend is running on `http://localhost:3000`
3. Both servers are running simultaneously

## Getting Help

- **Issues**: https://github.com/your-org/repo/issues
- **Documentation**: `docs/` directory
- **Config Help**: `backend/configs/README.md`

## What's Next?

Now that you have the system running:

1. **Explore the UI** - Click through all sections of a case
2. **Try different questions** - Use "Ask the Case" with various clinical questions
3. **Examine the rules** - View NHSN criteria evaluation
4. **Switch domains** - Try CAUTI vs CLABSI
5. **Create your own project** - Use the CLI to create an SSI or VAP project
6. **Review the architecture** - Read `docs/ca-factory/01-architecture.md`

Happy exploring! 🚀
