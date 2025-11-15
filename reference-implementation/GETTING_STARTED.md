# Getting Started - Choose Your Path

Welcome! This guide helps you get started based on your role.

## 🎯 Quick Navigation

**I want to...**

### 👨‍💼 As an Administrator: "Get this running NOW"
→ **[Quick Start (5 min)](#administrator-quick-start)**

### 👨‍💻 As a Developer: "Understand and customize"
→ **[Developer Path (30 min)](#developer-path)**

### 🤖 As an LLM: "Build a new domain"
→ **[LLM Scaffolding Path](#llm-path)**

---

## Administrator Quick Start

**Goal:** Get the platform running in under 5 minutes

### Option 1: One-Command Setup (Recommended)

```bash
git clone <repo-url>
cd reference-implementation
./setup/install.sh
./start-all.sh
```

Open http://localhost:3000 - **Done!**

### Option 2: Docker (Even Easier)

```bash
cd reference-implementation
docker-compose up
```

Open http://localhost:3000 - **Done!**

### What You Get

- ✅ REST API running on http://localhost:5000
- ✅ React UI running on http://localhost:3000
- ✅ 6 test CLABSI cases ready to review
- ✅ Full abstraction workflow (signals, timeline, QA, feedback)

### Next Steps

1. **Review a test case** - Click on "John Doe - Clear Positive CLABSI"
2. **Explore the UI** - See signals, timeline, QA results
3. **Submit feedback** - Rate and comment on abstractions
4. **Read full docs** - See `docs/QUICK_START.md`

### Troubleshooting

```bash
# Port 5000 already in use?
lsof -i :5000
kill -9 <PID>

# Port 3000 already in use?
# React will auto-suggest port 3001

# API not responding?
curl http://localhost:5000/api/health
```

**Still stuck?** → Check `docs/QUICK_START.md#troubleshooting`

---

## Developer Path

**Goal:** Understand the architecture and start customizing

### Step 1: Get it Running (5 min)

```bash
./setup/install.sh
./start-all.sh
```

### Step 2: Explore the Code (15 min)

**Architecture Overview:**
```
SQL (Snowflake)
├── SILVER - Raw clinical facts
├── GOLD - Domain metrics
├── GOLD_AI - LLM payloads
└── LEDGER - Audit trail

Python
├── chunking.py - Vector embeddings
├── agents/
│   ├── data_agent.py - Data fetching & rules
│   └── abstraction_agent.py - Summary & QA
└── api/simple_api.py - REST endpoints

React (TypeScript)
├── components/ - Reusable UI panels
├── pages/ - Case list & detail views
└── api/client.ts - API integration
```

**Key Files to Understand:**
1. `python/agents/data_agent.py` - How data is fetched and rules evaluated
2. `python/agents/abstraction_agent.py` - How summaries and QA work
3. `react/src/pages/CaseViewPage.tsx` - Main UI layout
4. `sql/gold/01_clabsi_episodes.sql` - Domain-specific data model

### Step 3: Make a Small Change (10 min)

**Try this: Add a new QA rule**

Edit `python/agents/abstraction_agent.py`:

```python
def _check_my_custom_rule(self, data_output, validation_errors):
    """Check for my custom condition"""
    if some_condition:
        validation_errors.append("My custom error")
        return {
            "rule_name": "my_custom_rule",
            "status": "WARN",
            "message": "Custom check failed"
        }
    return {
        "rule_name": "my_custom_rule",
        "status": "PASS",
        "message": "Custom check passed"
    }
```

Add to `validate()` method:
```python
rule_results.append(self._check_my_custom_rule(data_output, validation_errors))
```

Restart API, check case - your rule now runs!

### Step 4: Read Detailed Guides

- **Architecture Deep Dive** → `docs/DEVELOPER_GUIDE.md`
- **Extend to New Domain** → `docs/DOMAIN_EXTENSION.md`
- **Production Deploy** → `docs/PRODUCTION.md`

### Development Workflow

```bash
# Python changes - restart API
./start-api.sh

# React changes - auto-reloads
# Just save the file

# SQL changes - run in Snowflake
snowsql -f sql/gold/my_changes.sql
```

### Common Customizations

1. **Add a new signal type** → Edit `data_agent.py:fetch_signals()`
2. **Change risk scoring** → Edit `abstraction_agent.py:_assess_risk()`
3. **Add QA rule** → Edit `abstraction_agent.py:QAEngine`
4. **Customize UI labels** → Edit React components
5. **Add test case** → Edit `api/simple_api.py:TEST_CASES`

---

## LLM Path

**Goal:** Scaffold a new clinical domain (e.g., NAKI, UE) in 2-4 hours

### Step 1: Understand the Pattern (15 min)

**Every domain follows the same structure:**

1. **SQL**: SILVER → GOLD → GOLD_AI → LEDGER
2. **Python**: Data Agent → Abstraction Agent → API
3. **React**: Reuse existing components (90% unchanged)

**Read the complete guide:**
→ `docs/LLM_SCAFFOLDING.md`

### Step 2: Use Templates (1 hour)

**All templates are in `templates/`:**

```
templates/
├── domains/TEMPLATE/config.json - Define your domain
├── sql/
│   ├── gold_episodes_template.sql
│   └── gold_detail_template.sql
└── python/
    ├── data_agent_template.py
    └── abstraction_agent_template.py
```

**Workflow:**
1. Copy `templates/domains/TEMPLATE` → `templates/domains/NAKI`
2. Fill in `config.json`
3. Copy SQL templates, replace `{DOMAIN}` → `NAKI`
4. Copy Python templates, fill in TODOs
5. Test!

### Step 3: Follow the Checklist (2-3 hours)

The LLM guide has a complete checklist:

```
□ Created config.json
□ Created SQL schemas (4-6 tables)
□ Created Python agents (2 files)
□ Updated API (1 file)
□ Updated React types (minimal)
□ Created test data (5-10 patients)
□ Tested end-to-end
```

### Step 4: Example Domain

See complete NAKI example:
→ `examples/NAKI_COMPLETE/`

(Coming soon - shows every file for a complete NAKI implementation)

### LLM-Specific Tips

1. **Use search & replace** - `CLABSI` → `NAKI` throughout
2. **Start with config.json** - Define everything there first
3. **Copy, don't rewrite** - 80% is boilerplate
4. **Focus on domain logic** - Signals, rules, metrics
5. **Reuse React components** - Almost zero changes needed

**Estimated time:** 2-4 hours for complete domain

---

## Platform Architecture Summary

```
┌─────────────────────────────────────────────────────┐
│ REACT UI (TypeScript)                               │
│  • Case list, detail view, feedback                 │
│  • Components: Overview, Timeline, Signals, QA      │
└──────────────────┬──────────────────────────────────┘
                   │ REST API
                   ▼
┌─────────────────────────────────────────────────────┐
│ PYTHON AGENTS                                       │
│  • Abstraction Agent (Summary + QA)                 │
│  • Data Agent (Tools + Rules + Vector Search)       │
└──────────────────┬──────────────────────────────────┘
                   │ SQL Queries
                   ▼
┌─────────────────────────────────────────────────────┐
│ SNOWFLAKE DATA (or stub data)                       │
│  • SILVER (raw facts)                               │
│  • GOLD (domain metrics)                            │
│  • GOLD_AI (LLM payloads)                           │
│  • LEDGER (audit + vectors)                         │
└─────────────────────────────────────────────────────┘
```

---

## File Navigation

**Most Important Files:**

| File | Purpose | Edit When... |
|------|---------|-------------|
| `setup/install.sh` | Auto-installer | Setting up |
| `docker-compose.yml` | Docker setup | Containerizing |
| `python/agents/data_agent.py` | Fetch data & rules | Adding signals/rules |
| `python/agents/abstraction_agent.py` | Summary & QA | Changing QA logic |
| `python/api/simple_api.py` | REST API | Adding endpoints |
| `react/src/pages/CaseViewPage.tsx` | Main UI | Changing layout |
| `sql/gold/*.sql` | Domain schemas | New metrics |
| `templates/` | Scaffolding | Building new domain |

---

## Common Questions

**Q: Do I need Snowflake to run this?**
A: No! It runs with stub data for testing.

**Q: How long to get running?**
A: 5 minutes with `./setup/install.sh`

**Q: How long to add a new domain?**
A: 2-4 hours with templates

**Q: Can I use PostgreSQL?**
A: Yes, SQL is mostly portable

**Q: Is this production-ready?**
A: It's a reference implementation. See `docs/PRODUCTION.md` for prod checklist.

**Q: Where do I start customizing?**
A: `python/agents/data_agent.py` for logic, `react/src/components/` for UI

---

## Support & Resources

- 📖 **Full Documentation** → `README.md`
- 🚀 **Quick Start** → `docs/QUICK_START.md`
- 👨‍💻 **Developer Guide** → `docs/DEVELOPER_GUIDE.md`
- 🤖 **LLM Scaffolding** → `docs/LLM_SCAFFOLDING.md`
- 🏗️ **Templates** → `templates/`
- 🐛 **Issues** → GitHub Issues
- 💬 **Discussions** → GitHub Discussions

---

## What's Next?

Based on your goal:

- **Just testing?** → Review test cases in UI
- **Customizing?** → Read DEVELOPER_GUIDE.md
- **New domain?** → Follow LLM_SCAFFOLDING.md
- **Production?** → See PRODUCTION.md

**Happy building! 🚀**
