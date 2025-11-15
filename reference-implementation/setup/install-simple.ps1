# ============================================================================
# Model-Forward Clinical Abstraction Platform - Simple Windows Installer
# ============================================================================

Write-Host "============================================"
Write-Host "Clinical Abstraction Platform - Setup"
Write-Host "============================================"
Write-Host ""

# Get project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "Project root: $ProjectRoot"
Write-Host ""

# Change to project root
Set-Location $ProjectRoot

# Check Python
Write-Host "Checking Python..."
$pythonVersion = & python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python not found. Please install Python 3.9 or higher." -ForegroundColor Red
    exit 1
}
Write-Host "OK - $pythonVersion" -ForegroundColor Green

# Check Node.js
Write-Host "Checking Node.js..."
$nodeVersion = & node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js not found. Please install Node.js 18 or higher." -ForegroundColor Red
    exit 1
}
Write-Host "OK - Node.js $nodeVersion" -ForegroundColor Green

# Check npm
Write-Host "Checking npm..."
$npmVersion = & npm --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm not found." -ForegroundColor Red
    exit 1
}
Write-Host "OK - npm $npmVersion" -ForegroundColor Green
Write-Host ""

# Setup Python environment
Write-Host "============================================"
Write-Host "Setting up Python Environment"
Write-Host "============================================"

Set-Location "$ProjectRoot\python"

if (Test-Path "venv") {
    Write-Host "Virtual environment already exists, skipping..." -ForegroundColor Yellow
} else {
    Write-Host "Creating virtual environment..."
    & python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK - Virtual environment created" -ForegroundColor Green
}

Write-Host "Installing Python dependencies..."
& .\venv\Scripts\pip.exe install flask flask-cors numpy --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install Python packages" -ForegroundColor Red
    exit 1
}
Write-Host "OK - Python packages installed" -ForegroundColor Green
Write-Host ""

# Setup React environment
Write-Host "============================================"
Write-Host "Setting up React Environment"
Write-Host "============================================"

Set-Location "$ProjectRoot\react"

if (Test-Path "node_modules") {
    Write-Host "Node modules already exist, skipping..." -ForegroundColor Yellow
} else {
    Write-Host "Installing React dependencies (this may take 2-3 minutes)..."
    & npm install --loglevel=error
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install npm packages" -ForegroundColor Red
        exit 1
    }
    Write-Host "OK - React dependencies installed" -ForegroundColor Green
}

if (-Not (Test-Path ".env")) {
    Write-Host "Creating .env file..."
    "REACT_APP_API_URL=http://localhost:5000/api" | Out-File -FilePath ".env" -Encoding ASCII
    Write-Host "OK - .env file created" -ForegroundColor Green
} else {
    Write-Host ".env file already exists" -ForegroundColor Yellow
}
Write-Host ""

# Create startup scripts
Write-Host "============================================"
Write-Host "Creating Startup Scripts"
Write-Host "============================================"

Set-Location $ProjectRoot

# start-api.bat
$startApi = @"
@echo off
cd python\api
call ..\venv\Scripts\activate.bat
python simple_api.py
"@
$startApi | Out-File -FilePath "start-api.bat" -Encoding ASCII
Write-Host "OK - Created start-api.bat" -ForegroundColor Green

# start-ui.bat
$startUi = @"
@echo off
cd react
npm start
"@
$startUi | Out-File -FilePath "start-ui.bat" -Encoding ASCII
Write-Host "OK - Created start-ui.bat" -ForegroundColor Green

# start-all.bat
$startAll = @"
@echo off
echo Starting Clinical Abstraction Platform...
start "API Server" cmd /c start-api.bat
timeout /t 3 /nobreak >nul
start "React UI" cmd /c start-ui.bat
echo.
echo Services starting...
echo API: http://localhost:5000
echo UI: http://localhost:3000
"@
$startAll | Out-File -FilePath "start-all.bat" -Encoding ASCII
Write-Host "OK - Created start-all.bat" -ForegroundColor Green
Write-Host ""

# Final message
Write-Host "============================================"
Write-Host "Installation Complete!"
Write-Host "============================================"
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Run the demo (no database required):"
Write-Host "    .\demo-start.bat"
Write-Host ""
Write-Host "  Or start services individually:"
Write-Host "    .\start-api.bat    (in one terminal)"
Write-Host "    .\start-ui.bat     (in another terminal)"
Write-Host ""
Write-Host "  Then open: http://localhost:3000"
Write-Host ""
Write-Host "SUCCESS - Setup complete!" -ForegroundColor Green
Write-Host ""
