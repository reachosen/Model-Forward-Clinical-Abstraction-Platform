@echo off
echo Starting Clinical Abstraction Platform...
start "API Server" cmd /c start-api.bat
timeout /t 3 /nobreak >nul
start "React UI" cmd /c start-ui.bat
echo.
echo Services starting...
echo API: http://localhost:5000
echo UI: http://localhost:3000
