#!/bin/bash

###############################################################################
# CA Factory - Full E2E Test Suite
#
# This script runs the complete E2E test pipeline:
# 1. Starts backend in demo mode (background)
# 2. Starts frontend dev server (background)
# 3. Runs backend pytest tests
# 4. Runs frontend Playwright tests
# 5. Cleans up background processes
# 6. Prints summary
#
# Usage:
#   ./scripts/run_full_e2e.sh
#
# Requirements:
#   - Python 3.11+ with dependencies installed
#   - Node.js 18+ with dependencies installed
#   - pytest and playwright installed
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Tracking variables
BACKEND_PID=""
FRONTEND_PID=""
BACKEND_TESTS_PASSED=0
FRONTEND_TESTS_PASSED=0

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}========================================${NC}"
    echo -e "${YELLOW}Cleaning up background processes...${NC}"
    echo -e "${YELLOW}========================================${NC}"

    if [ ! -z "$BACKEND_PID" ]; then
        echo "Killing backend (PID: $BACKEND_PID)..."
        kill $BACKEND_PID 2>/dev/null || true
        wait $BACKEND_PID 2>/dev/null || true
    fi

    if [ ! -z "$FRONTEND_PID" ]; then
        echo "Killing frontend (PID: $FRONTEND_PID)..."
        kill $FRONTEND_PID 2>/dev/null || true
        wait $FRONTEND_PID 2>/dev/null || true
    fi

    # Kill any remaining processes on ports 8000 and 3000
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true

    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Print header
echo -e "${BLUE}"
echo "###############################################################################"
echo "#                                                                             #"
echo "#                  CA Factory - Full E2E Test Suite                          #"
echo "#                                                                             #"
echo "###############################################################################"
echo -e "${NC}"
echo ""

# ============================================================================
# STEP 1: Set environment variables for demo mode
# ============================================================================
echo -e "${BLUE}[1/6] Setting environment variables...${NC}"
export APP_MODE=demo
export CA_FACTORY_PROJECT=clabsi

echo "  APP_MODE=$APP_MODE"
echo "  CA_FACTORY_PROJECT=$CA_FACTORY_PROJECT"
echo -e "${GREEN}✓ Environment configured${NC}"
echo ""

# ============================================================================
# STEP 2: Start backend in background
# ============================================================================
echo -e "${BLUE}[2/6] Starting backend server (background)...${NC}"

# Navigate to backend directory
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}  Virtual environment not found, creating...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi

# Start backend
echo "  Starting FastAPI server on http://localhost:8000..."
python api/main.py > /tmp/ca_factory_backend.log 2>&1 &
BACKEND_PID=$!

echo "  Backend PID: $BACKEND_PID"
echo "  Log file: /tmp/ca_factory_backend.log"

# Wait for backend to be ready
echo "  Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}✗ Backend failed to start after 30 seconds${NC}"
        echo "  Check log: cat /tmp/ca_factory_backend.log"
        exit 1
    fi
    sleep 1
done

cd ..
echo ""

# ============================================================================
# STEP 3: Start frontend in background
# ============================================================================
echo -e "${BLUE}[3/6] Starting frontend server (background)...${NC}"

# Navigate to frontend directory
cd reference-implementation/react

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}  Node modules not found, installing...${NC}"
    npm install
fi

# Start frontend
echo "  Starting React dev server on http://localhost:3000..."
npm start > /tmp/ca_factory_frontend.log 2>&1 &
FRONTEND_PID=$!

echo "  Frontend PID: $FRONTEND_PID"
echo "  Log file: /tmp/ca_factory_frontend.log"

# Wait for frontend to be ready
echo "  Waiting for frontend to start..."
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend is ready${NC}"
        break
    fi
    if [ $i -eq 60 ]; then
        echo -e "${RED}✗ Frontend failed to start after 60 seconds${NC}"
        echo "  Check log: cat /tmp/ca_factory_frontend.log"
        exit 1
    fi
    sleep 1
done

cd ../..
echo ""

# ============================================================================
# STEP 4: Run backend pytest tests
# ============================================================================
echo -e "${BLUE}[4/6] Running backend E2E tests (pytest)...${NC}"
echo ""

cd backend
source venv/bin/activate

if pytest tests/e2e_demo_test.py -v --tb=short; then
    BACKEND_TESTS_PASSED=1
    echo ""
    echo -e "${GREEN}✓ Backend tests PASSED${NC}"
else
    echo ""
    echo -e "${RED}✗ Backend tests FAILED${NC}"
fi

cd ..
echo ""

# ============================================================================
# STEP 5: Run frontend Playwright tests
# ============================================================================
echo -e "${BLUE}[5/6] Running frontend E2E tests (Playwright)...${NC}"
echo ""

cd reference-implementation

# Check if Playwright is installed
if [ ! -d "node_modules/@playwright" ]; then
    echo -e "${YELLOW}  Playwright not found, installing...${NC}"
    npm install -D @playwright/test
    npx playwright install
fi

if npx playwright test --reporter=list; then
    FRONTEND_TESTS_PASSED=1
    echo ""
    echo -e "${GREEN}✓ Frontend tests PASSED${NC}"
else
    echo ""
    echo -e "${RED}✗ Frontend tests FAILED${NC}"
fi

cd ..
echo ""

# ============================================================================
# STEP 6: Print summary
# ============================================================================
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}          TEST SUMMARY${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

if [ $BACKEND_TESTS_PASSED -eq 1 ]; then
    echo -e "Backend Tests:   ${GREEN}✓ PASSED${NC}"
else
    echo -e "Backend Tests:   ${RED}✗ FAILED${NC}"
fi

if [ $FRONTEND_TESTS_PASSED -eq 1 ]; then
    echo -e "Frontend Tests:  ${GREEN}✓ PASSED${NC}"
else
    echo -e "Frontend Tests:  ${RED}✗ FAILED${NC}"
fi

echo ""
echo -e "${BLUE}========================================${NC}"

# Determine exit code
if [ $BACKEND_TESTS_PASSED -eq 1 ] && [ $FRONTEND_TESTS_PASSED -eq 1 ]; then
    echo -e "${GREEN}"
    echo "  ╔═══════════════════════════════════╗"
    echo "  ║   ALL TESTS PASSED! 🎉           ║"
    echo "  ╚═══════════════════════════════════╝"
    echo -e "${NC}"
    exit 0
else
    echo -e "${RED}"
    echo "  ╔═══════════════════════════════════╗"
    echo "  ║   SOME TESTS FAILED ✗            ║"
    echo "  ╚═══════════════════════════════════╝"
    echo -e "${NC}"
    echo ""
    echo "Logs available at:"
    echo "  - Backend: /tmp/ca_factory_backend.log"
    echo "  - Frontend: /tmp/ca_factory_frontend.log"
    echo ""
    exit 1
fi
