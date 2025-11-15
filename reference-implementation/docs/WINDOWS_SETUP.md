# Windows Quick Start Guide

## For Windows Users

You have **3 options** to run this on Windows:

---

## ✅ Option 1: PowerShell Script (Recommended)

**Run the Windows installer:**

```powershell
# Open PowerShell in the reference-implementation directory
cd reference-implementation

# Run the installer
.\setup\install.ps1

# Start everything
.\start-all.bat
```

Open http://localhost:3000 - **Done!**

---

## ✅ Option 2: Docker (Easiest)

**Install Docker Desktop for Windows, then:**

```powershell
cd reference-implementation
docker-compose up
```

Open http://localhost:3000 - **Done!**

---

## ✅ Option 3: Git Bash / WSL

**If you have Git Bash or Windows Subsystem for Linux:**

```bash
cd reference-implementation
./setup/install.sh
./start-all.sh
```

---

## Manual Setup (If Automated Fails)

### Step 1: Python Environment

```powershell
cd python
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install flask flask-cors numpy
```

### Step 2: React Environment

```powershell
cd react
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

### Step 3: Start Services

**Terminal 1 - API:**
```powershell
cd python\api
..\venv\Scripts\Activate.ps1
python simple_api.py
```

**Terminal 2 - UI:**
```powershell
cd react
npm start
```

**Terminal 3 - Open Browser:**
```
http://localhost:3000
```

---

## Troubleshooting Windows Issues

### "Execution policy" error

```powershell
# Run this first:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port already in use

```powershell
# Check what's using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID)
taskkill /PID <PID> /F

# Same for port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Python not found

```powershell
# Install Python from:
https://www.python.org/downloads/

# Make sure "Add Python to PATH" is checked during install
```

### Node.js not found

```powershell
# Install Node.js from:
https://nodejs.org/

# LTS version recommended
```

### Virtual environment activation fails

```powershell
# Alternative activation:
python\venv\Scripts\Activate.ps1

# Or use the full path:
& "C:\path\to\reference-implementation\python\venv\Scripts\Activate.ps1"
```

---

## File Paths on Windows

**Use backslashes `\` instead of forward slashes `/`:**

| Linux/Mac | Windows |
|-----------|---------|
| `python/api/simple_api.py` | `python\api\simple_api.py` |
| `react/src/App.tsx` | `react\src\App.tsx` |
| `./start-api.sh` | `.\start-api.bat` |

---

## Startup Scripts on Windows

After running `install.ps1`, you get:

- **`start-api.bat`** - Start Python API
- **`start-ui.bat`** - Start React UI
- **`start-all.bat`** - Start everything

**Double-click** any `.bat` file or run from PowerShell:

```powershell
.\start-all.bat
```

---

## Common Windows Commands

```powershell
# Navigate to project
cd C:\Users\Public\CodeRepo\Model-Forward-Clinical-Abstraction-Platform\reference-implementation

# Check Python version
python --version

# Check Node version
node --version

# List files
dir

# Clear screen
cls

# Stop running process
Ctrl+C
```

---

## Next Steps

1. **Works?** → Start reviewing test cases at http://localhost:3000
2. **Issues?** → See troubleshooting above
3. **Develop?** → Read `docs\QUICK_START.md`
4. **Customize?** → Read `docs\DEVELOPER_GUIDE.md`

---

**Need more help?** Check the full documentation:
- Main README: `README.md`
- Quick Start: `docs\QUICK_START.md`
- Developer Guide: `docs\DEVELOPER_GUIDE.md`
