@echo off
echo Starting Clinical Abstraction Platform...
start "API Server" cmd /c start-api.bat
timeout /t 3 /nobreak >nul
start "React UI" cmd /c start-ui.bat
echo.
echo Services starting...
echo API Server: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo React UI: http://localhost:3000
echo.
echo Press Ctrl+C in each window to stop services
