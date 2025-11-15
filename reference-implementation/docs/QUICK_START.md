# Quick Start Guide - 5 Minutes to Running

Get the CLABSI Clinical Abstraction Platform running in under 5 minutes.

## For Administrators

### Option 1: Automated Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd Model-Forward-Clinical-Abstraction-Platform/reference-implementation

# Run automated installer
./setup/install.sh

# Start everything
./start-all.sh
```

**That's it!** Open http://localhost:3000

### Option 2: Docker (Even Easier)

```bash
# One command to rule them all
docker-compose up

# Open http://localhost:3000
```

### Option 3: Manual Setup (15 minutes)

**Step 1: Python Environment**
```bash
cd python
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install flask flask-cors numpy
```

**Step 2: React Environment**
```bash
cd react
npm install
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env
```

**Step 3: Start Services**

Terminal 1 - API:
```bash
cd python/api
source ../venv/bin/activate
python simple_api.py
```

Terminal 2 - UI:
```bash
cd react
npm start
```

**Step 4: Open Browser**
- Navigate to http://localhost:3000
- Select a test case (e.g., "John Doe - Clear Positive CLABSI")
- Review the abstraction

## First Time User Experience

### What You'll See

1. **Case List Page** - 6 test patients with different CLABSI scenarios
2. **Case Detail Page** - Complete abstraction with:
   - Patient overview and risk assessment
   - Clinical timeline with key events
   - Signals (critical findings)
   - Generated summary
   - QA validation results
   - Feedback panel

### Try These Actions

1. ✅ **Review a clear positive case** (PAT001 - John Doe)
   - Notice the S. aureus bacteremia signal
   - Check the timeline showing line placement → culture → positive result
   - See QA status: PASS

2. ⚠️ **Review a borderline case** (PAT003 - Robert Johnson)
   - Coagulase-negative staph (possible contaminant)
   - Single positive culture
   - Notice QA warnings about ambiguous findings

3. 📝 **Submit feedback**
   - Rate the abstraction (1-5 stars)
   - Select final decision
   - Add comments
   - Click "Approve" or "Submit Correction"

## Troubleshooting

### API won't start
```bash
# Check if port 5000 is in use
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill the process or use different port
# Edit python/api/simple_api.py, change port to 5001
```

### React won't start
```bash
# Check if port 3000 is in use
lsof -i :3000  # Mac/Linux
netstat -ano | findstr :3000  # Windows

# React will automatically suggest port 3001 if 3000 is busy
```

### "Failed to load cases" error
```bash
# Make sure API is running first
curl http://localhost:5000/api/health

# Should return: {"status":"healthy","service":"CLABSI Abstraction API"}
```

### Import errors in Python
```bash
# Make sure you activated the virtual environment
source venv/bin/activate  # Must see (venv) in your prompt

# Reinstall dependencies
pip install --force-reinstall flask flask-cors numpy
```

## Next Steps

Now that you have it running:

1. 📖 **Read** [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Understand the architecture
2. 🔧 **Customize** [DOMAIN_EXTENSION.md](./DOMAIN_EXTENSION.md) - Add your own domain
3. 🤖 **Build** [LLM_SCAFFOLDING.md](./LLM_SCAFFOLDING.md) - Use templates to extend

## Database Setup (Optional for Testing)

The reference implementation works without a real database using stub data. To connect to Snowflake:

1. Create Snowflake schemas:
   ```sql
   CREATE SCHEMA SILVER;
   CREATE SCHEMA GOLD;
   CREATE SCHEMA GOLD_AI;
   CREATE SCHEMA LEDGER;
   ```

2. Run SQL scripts:
   ```bash
   snowsql -f setup/snowflake_setup.sql
   ```

3. Update Python connection in `python/agents/data_agent.py`

## Common Questions

**Q: Do I need Snowflake to run this?**
A: No! The reference implementation uses stub data and works without any database.

**Q: Can I use PostgreSQL instead of Snowflake?**
A: Yes! The SQL is portable. Just adjust the VARIANT/ARRAY types to JSONB.

**Q: How do I add my own test cases?**
A: Edit `python/api/simple_api.py` and add entries to `TEST_CASES` array.

**Q: Can I deploy this to production?**
A: This is a reference implementation. For production:
- Add authentication
- Use real database connections
- Add logging and monitoring
- Implement proper error handling
- See [PRODUCTION.md](./PRODUCTION.md) for details

## Support

- 📚 Full documentation in `/docs`
- 🐛 Report issues on GitHub
- 💬 Ask questions in Discussions

---

**Estimated time:** 5-15 minutes
**Difficulty:** Easy
**Prerequisites:** Python 3.9+, Node.js 18+
