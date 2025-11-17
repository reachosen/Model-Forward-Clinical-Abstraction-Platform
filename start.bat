@echo off
REM Clinical Abstraction Platform - Windows Startup Script
REM This script starts both backend and frontend servers

echo ========================================
echo  CA Factory - Starting Development Servers
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "backend\venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found at backend\venv
    echo Please create a virtual environment first:
    echo   cd backend
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

REM Check if frontend node_modules exists
if not exist "reference-implementation\react\node_modules" (
    echo WARNING: Frontend dependencies not installed
    echo Installing frontend dependencies...
    cd reference-implementation\react
    call npm install
    cd ..\..
    echo.
)

echo [1/2] Starting Backend Server (FastAPI)...
echo Backend will run on: http://localhost:8000
echo.

echo [2/2] Starting Frontend Server (React)...
echo Frontend will run on: http://localhost:3000
echo.

echo Press Ctrl+C to stop both servers
echo ========================================
echo.

REM Start both servers using start command (opens new windows)
start "CA Factory Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn api.main:app --reload --host 0.0.0.0 --port 8000"

REM Wait 3 seconds before starting frontend
timeout /t 3 /nobreak >nul

start "CA Factory Frontend" cmd /k "cd reference-implementation\react && npm start"

echo.
echo ========================================
echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo ========================================
echo.
echo Close this window or press any key to exit
pause >nul
