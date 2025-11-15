@echo off
REM ============================================================================
REM Quick Demo Launcher - No Database Required
REM ============================================================================
REM This script starts the platform in demo mode with stub data
REM Perfect for presentations and concept validation
REM ============================================================================

echo.
echo 🎯 Starting Clinical Abstraction Platform (Demo Mode)
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo ✅ No database required - using stub data
echo ✅ 6 test cases available
echo ✅ Full UI and workflow functional
echo.
echo Starting services...
echo.

REM Check if setup has been run
if not exist "python\venv" (
    echo ⚠️  First time setup required
    echo.
    echo Run this first:
    echo   .\setup\install.ps1
    echo.
    pause
    exit /b 1
)

if not exist "react\node_modules" (
    echo ⚠️  First time setup required
    echo.
    echo Run this first:
    echo   .\setup\install.ps1
    echo.
    pause
    exit /b 1
)

REM Start API in new window
echo 🔧 Starting API server...
start "CLABSI API" cmd /c "cd python\api && ..\venv\Scripts\activate && python simple_api.py"

REM Wait for API to start
timeout /t 3 /nobreak >nul

REM Start React UI in new window
echo 🎨 Starting React UI...
start "CLABSI UI" cmd /c "cd react && npm start"

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✨ Demo Ready!
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 📊 Open in browser: http://localhost:3000
echo 🔌 API endpoints: http://localhost:5000/api
echo.
echo 📋 Available test cases:
echo   1. John Doe - Clear Positive CLABSI
echo   2. Jane Smith - Clear Negative
echo   3. Robert Johnson - Borderline Case
echo   4. Maria Garcia - Missing Data
echo   5. David Wilson - Contamination vs Infection
echo   6. Sarah Martinez - Multi-Organism
echo.
echo 💡 Demo Tips:
echo   - Start with PAT001 (John Doe) for best example
echo   - Show timeline, signals, and QA panels
echo   - Submit feedback to demonstrate full workflow
echo.
echo 🛑 To stop: Close the API and UI windows
echo.
echo Press any key to open browser...
pause >nul

REM Open browser
start http://localhost:3000

echo.
echo ✅ Browser opened - Demo is ready!
echo.
