# 🪟 Windows Quick Start

You're on Windows! Here's how to get started:

## Three Options:

### 🎯 Option 1: PowerShell (Recommended)

```powershell
# 1. Open PowerShell in this directory
# 2. Run installer
.\setup\install.ps1

# 3. Start everything
.\start-all.bat
```

**Open http://localhost:3000** ✅

---

### 🐳 Option 2: Docker (Easiest)

```powershell
docker-compose up
```

**Open http://localhost:3000** ✅

---

### 🔧 Option 3: Manual

**Python:**
```powershell
cd python
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install flask flask-cors numpy
```

**React:**
```powershell
cd react
npm install
```

**Start:**
```powershell
# Terminal 1
.\start-api.bat

# Terminal 2
.\start-ui.bat
```

---

## ⚠️ Common Issues

### "install.sh not recognized"
You tried to run the Linux script. Use `.\setup\install.ps1` instead.

### "Execution Policy" error
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Port already in use
```powershell
# Check port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 📚 Full Documentation

- **Windows Setup** → `docs\WINDOWS_SETUP.md`
- **Quick Start** → `docs\QUICK_START.md`
- **Developer Guide** → `docs\DEVELOPER_GUIDE.md`

---

**Need help?** See `docs\WINDOWS_SETUP.md` for detailed troubleshooting.
