# ============================================================================
# Model-Forward Clinical Abstraction Platform - Windows Installer
# ============================================================================
# Usage: .\setup\install.ps1 [-SkipDatabase] [-SkipPython] [-SkipReact]
# ============================================================================

param(
    [switch]$SkipDatabase,
    [switch]$SkipPython,
    [switch]$SkipReact
)

# Colors for output
function Write-Header {
    param([string]$Message)
    Write-Host "============================================" -ForegroundColor Blue
    Write-Host $Message -ForegroundColor Blue
    Write-Host "============================================" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Cyan
}

# Get project root
$ProjectRoot = Split-Path -Parent $PSScriptRoot

# Check prerequisites
function Test-Prerequisites {
    Write-Header "Checking Prerequisites"

    $allMet = $true

    # Check Python
    if (Get-Command python -ErrorAction SilentlyContinue) {
        $pythonVersion = (python --version 2>&1) -replace 'Python ',''
        Write-Success "Python found: $pythonVersion"
    } else {
        Write-Error "Python not found. Please install Python 3.9+ from https://www.python.org/downloads/"
        $allMet = $false
    }

    # Check Node.js
    if (Get-Command node -ErrorAction SilentlyContinue) {
        $nodeVersion = node --version
        Write-Success "Node.js found: $nodeVersion"
    } else {
        Write-Error "Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
        $allMet = $false
    }

    # Check npm
    if (Get-Command npm -ErrorAction SilentlyContinue) {
        $npmVersion = npm --version
        Write-Success "npm found: v$npmVersion"
    } else {
        Write-Error "npm not found. Please install Node.js which includes npm"
        $allMet = $false
    }

    if (-not $allMet) {
        Write-Error "Please install missing prerequisites and try again"
        exit 1
    }

    Write-Host ""
}

# Setup Python environment
function Install-PythonEnvironment {
    if ($SkipPython) {
        Write-Warning "Skipping Python setup"
        return
    }

    Write-Header "Setting up Python Environment"

    Push-Location "$ProjectRoot\python"

    try {
        # Create virtual environment
        Write-Info "Creating virtual environment..."
        python -m venv venv
        Write-Success "Virtual environment created"

        # Activate virtual environment
        Write-Info "Activating virtual environment..."
        & ".\venv\Scripts\Activate.ps1"

        # Upgrade pip
        Write-Info "Upgrading pip..."
        python -m pip install --upgrade pip --quiet

        # Install dependencies
        Write-Info "Installing Python dependencies..."
        pip install flask flask-cors numpy --quiet
        Write-Success "Python dependencies installed"

        # Test imports
        Write-Info "Testing Python modules..."
        python -c "import flask; import numpy" 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Python modules verified"
        } else {
            Write-Warning "Some Python modules may have import issues"
        }

        deactivate
    }
    catch {
        Write-Error "Error during Python setup: $_"
    }
    finally {
        Pop-Location
    }

    Write-Host ""
}

# Setup React environment
function Install-ReactEnvironment {
    if ($SkipReact) {
        Write-Warning "Skipping React setup"
        return
    }

    Write-Header "Setting up React Environment"

    Push-Location "$ProjectRoot\react"

    try {
        # Install dependencies
        Write-Info "Installing React dependencies (this may take a few minutes)..."
        npm install --silent
        Write-Success "React dependencies installed"

        # Create .env file if not exists
        if (-not (Test-Path .env)) {
            Write-Info "Creating .env file..."
            "REACT_APP_API_URL=http://localhost:5000/api" | Out-File -FilePath .env -Encoding utf8
            Write-Success ".env file created"
        } else {
            Write-Info ".env file already exists"
        }
    }
    catch {
        Write-Error "Error during React setup: $_"
    }
    finally {
        Pop-Location
    }

    Write-Host ""
}

# Database setup instructions
function Show-DatabaseInstructions {
    if ($SkipDatabase) {
        Write-Warning "Skipping database setup"
        return
    }

    Write-Header "Database Setup Instructions"

    Write-Host ""
    Write-Info "To set up the Snowflake database:"
    Write-Host ""
    Write-Host "  1. Log in to your Snowflake account"
    Write-Host "  2. Create schemas:"
    Write-Host "     CREATE SCHEMA SILVER;"
    Write-Host "     CREATE SCHEMA GOLD;"
    Write-Host "     CREATE SCHEMA GOLD_AI;"
    Write-Host "     CREATE SCHEMA LEDGER;"
    Write-Host ""
    Write-Host "  3. Run SQL scripts in this order:"
    Write-Host "     - sql\silver\*.sql (8 files)"
    Write-Host "     - sql\gold\*.sql (6 files)"
    Write-Host "     - sql\gold_ai\*.sql (2 files)"
    Write-Host "     - sql\ledger\*.sql (4 files)"
    Write-Host "     - sql\seed_data\*.sql (6 files)"
    Write-Host ""
    Write-Info "Or use the provided Snowflake setup script:"
    Write-Host "     snowsql -f setup\snowflake_setup.sql"
    Write-Host ""
}

# Create startup scripts
function New-StartupScripts {
    Write-Header "Creating Startup Scripts"

    Push-Location $ProjectRoot

    try {
        # Start API script
        @"
@echo off
cd /d "%~dp0\python"
call venv\Scripts\activate.bat
cd api
echo Starting API on http://localhost:5000...
python simple_api.py
"@ | Out-File -FilePath "start-api.bat" -Encoding ascii
        Write-Success "Created start-api.bat"

        # Start React script
        @"
@echo off
cd /d "%~dp0\react"
echo Starting React UI on http://localhost:3000...
npm start
"@ | Out-File -FilePath "start-ui.bat" -Encoding ascii
        Write-Success "Created start-ui.bat"

        # Start all script
        @"
@echo off
echo Starting Model-Forward Clinical Abstraction Platform...
echo.

echo Starting API...
start "API" cmd /c "%~dp0\start-api.bat"

echo Waiting for API to start...
timeout /t 3 /nobreak >nul

echo Starting UI...
start "UI" cmd /c "%~dp0\start-ui.bat"

echo.
echo Platform is starting...
echo API will run at http://localhost:5000
echo UI will run at http://localhost:3000
echo.
echo Press any key to stop all services...
pause >nul
"@ | Out-File -FilePath "start-all.bat" -Encoding ascii
        Write-Success "Created start-all.bat"
    }
    finally {
        Pop-Location
    }

    Write-Host ""
}

# Print completion message
function Show-CompletionMessage {
    Write-Header "Installation Complete!"

    Write-Host ""
    Write-Success "Setup completed successfully!"
    Write-Host ""
    Write-Info "Next steps:"
    Write-Host ""
    Write-Host "  1. Set up Snowflake database (see instructions above)"
    Write-Host "  2. Start the API:"
    Write-Host "     start-api.bat"
    Write-Host ""
    Write-Host "  3. In a new terminal, start the UI:"
    Write-Host "     start-ui.bat"
    Write-Host ""
    Write-Host "  4. Or start everything at once:"
    Write-Host "     start-all.bat"
    Write-Host ""
    Write-Host "  5. Open your browser to:"
    Write-Host "     http://localhost:3000"
    Write-Host ""
    Write-Host "For development guides, see:"
    Write-Host "  - docs\QUICK_START.md - Get running in 5 minutes"
    Write-Host "  - docs\DEVELOPER_GUIDE.md - Understand the architecture"
    Write-Host "  - docs\DOMAIN_EXTENSION.md - Add new clinical domains"
    Write-Host ""
}

# Main installation flow
function Start-Installation {
    Set-Location $ProjectRoot

    Write-Header "Model-Forward Clinical Abstraction Platform"
    Write-Host ""
    Write-Info "Project root: $ProjectRoot"
    Write-Host ""

    Test-Prerequisites
    Install-PythonEnvironment
    Install-ReactEnvironment
    Show-DatabaseInstructions
    New-StartupScripts
    Show-CompletionMessage
}

# Run main
Start-Installation
