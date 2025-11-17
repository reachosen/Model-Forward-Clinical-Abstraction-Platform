# Quick Start Guide

This guide shows you how to start both the backend and frontend servers with a single command.

## Prerequisites

1. **Backend Setup** (one-time):
   ```bash
   cd backend
   python -m venv venv
   venv\Scripts\activate      # Windows
   # OR
   source venv/bin/activate   # Linux/Mac

   pip install -r requirements.txt
   ```

2. **Frontend Setup** (one-time):
   ```bash
   cd reference-implementation/react
   npm install
   ```

## Starting Both Servers

### Option 1: Windows Batch File (Recommended for Windows)

Simply double-click `start.bat` or run:

```cmd
start.bat
```

This will open two separate command windows:
- Backend running on http://localhost:8000
- Frontend running on http://localhost:3000

### Option 2: Linux/Mac Shell Script

```bash
./start.sh
```

Both servers will run in the same terminal. Press `Ctrl+C` to stop both.

### Option 3: Using npm (Cross-platform)

First install concurrently:
```bash
npm install
```

Then start both servers:
```bash
npm start
```

## What Gets Started

- **Backend (FastAPI)**: http://localhost:8000
  - API Documentation: http://localhost:8000/docs
  - OpenAPI spec: http://localhost:8000/openapi.json

- **Frontend (React)**: http://localhost:3000
  - Automatically opens in your browser

## Troubleshooting

### "Virtual environment not found"
Run the backend setup steps above.

### "node_modules not found"
Run the frontend setup steps above.

### Port already in use
Make sure you don't have other servers running on ports 8000 or 3000.

### Backend fails to start
Check that you have all dependencies installed:
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend fails to start
Check that you have Node.js installed and dependencies are up to date:
```bash
cd reference-implementation/react
npm install
```

## Running Individual Servers

If you need to run them separately:

**Backend only:**
```bash
cd backend
venv\Scripts\activate        # Windows
source venv/bin/activate     # Linux/Mac
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend only:**
```bash
cd reference-implementation/react
npm start
```

## Running Tests

**Backend tests:**
```bash
npm run test:backend
# OR
cd backend
pytest tests/ -v
```

**Frontend tests:**
```bash
npm run test:frontend
# OR
cd reference-implementation/react
npm test
```
