#!/bin/bash
# Clinical Abstraction Platform - Linux/Mac Startup Script
# This script starts both backend and frontend servers

echo "========================================"
echo " CA Factory - Starting Development Servers"
echo "========================================"
echo ""

# Check if virtual environment exists
if [ ! -f "backend/venv/bin/activate" ]; then
    echo "ERROR: Virtual environment not found at backend/venv"
    echo "Please create a virtual environment first:"
    echo "  cd backend"
    echo "  python3 -m venv venv"
    echo "  source venv/bin/activate"
    echo "  pip install -r requirements.txt"
    exit 1
fi

# Check if frontend node_modules exists
if [ ! -d "reference-implementation/react/node_modules" ]; then
    echo "WARNING: Frontend dependencies not installed"
    echo "Installing frontend dependencies..."
    cd reference-implementation/react
    npm install
    cd ../..
    echo ""
fi

echo "[1/2] Starting Backend Server (FastAPI)..."
echo "Backend will run on: http://localhost:8000"
echo ""

echo "[2/2] Starting Frontend Server (React)..."
echo "Frontend will run on: http://localhost:3000"
echo ""

echo "Press Ctrl+C to stop both servers"
echo "========================================"
echo ""

# Trap Ctrl+C to kill both processes
trap 'kill $(jobs -p); exit' INT TERM

# Start backend in background
cd backend
source venv/bin/activate
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend in background
cd reference-implementation/react
npm start &
FRONTEND_PID=$!
cd ../..

echo ""
echo "========================================"
echo "Both servers are running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "API Docs: http://localhost:8000/docs"
echo "========================================"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait
