# DBA Guide - Database Deployment

This guide is for **Database Administrators** who need to deploy the Clinical Abstraction Platform database infrastructure.

## Overview

The platform uses a **factory script** approach:
- One script creates all infrastructure
- Environment-specific configuration
- Idempotent (safe to run multiple times)
- Separate seed data for testing

---

## Prerequisites

- Snowflake account with SYSADMIN or ACCOUNTADMIN role
- SnowSQL CLI installed
- Access to create databases and warehouses

---

## Quick Start (5 Minutes)

### 1. Create DEV Environment

```bash
# Navigate to setup directory
cd reference-implementation/setup

# Run factory script
snowsql -f snowflake_factory.sql -D env=DEV

# Load test data
snowsql -f load_seed_data.sql -D env=DEV
```

**Done!** Database is ready for developers.

---

## Detailed Deployment Steps

### Step 1: Review Configuration

Edit `snowflake_factory.sql` if you need to customize:

```sql
-- Line 10-11: Environment (DEV, TEST, PROD)
SET env = 'DEV';

-- Derived names (auto-generated from env)
-- Database: CLINICAL_ABSTRACTION_DEV
-- Warehouse: CLINICAL_WH_DEV

-- Line 22-27: Warehouse size
CREATE WAREHOUSE IF NOT EXISTS IDENTIFIER($warehouse_name)
  WAREHOUSE_SIZE = 'SMALL'  -- XSMALL, SMALL, MEDIUM, LARGE, etc.
  AUTO_SUSPEND = 300         -- Suspend after 5 minutes idle
  AUTO_RESUME = TRUE
  INITIALLY_SUSPENDED = TRUE;
```

### Step 2: Deploy to DEV

```bash
# Deploy infrastructure
snowsql -f snowflake_factory.sql -D env=DEV

# Expected output:
# ✓ Database infrastructure created successfully!
# Database: CLINICAL_ABSTRACTION_DEV
# Warehouse: CLINICAL_WH_DEV
# Table counts:
#   SILVER: 8 tables
#   GOLD: 6 tables
#   GOLD_AI: 1 table
#   LEDGER: 4 tables
```

### Step 3: Load Test Data (DEV/TEST only)

```bash
# Load synthetic test patients
snowsql -f load_seed_data.sql -D env=DEV

# Expected output:
# ✓ Seed data loaded:
#   Patients: 6
#   Encounters: 6
#   Devices: 3
```

**DO NOT** run seed data in PROD (script will error if you try).

### Step 4: Validate Deployment

```bash
# Run validation queries
snowsql -f validate_deployment.sql -D env=DEV

# Or manually verify:
USE DATABASE CLINICAL_ABSTRACTION_DEV;

-- Check schemas
SHOW SCHEMAS;

-- Check table counts
SELECT
    TABLE_SCHEMA,
    COUNT(*) AS table_count
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA IN ('SILVER', 'GOLD', 'GOLD_AI', 'LEDGER')
GROUP BY TABLE_SCHEMA;

-- Check test data
SELECT COUNT(*) FROM SILVER.PATIENTS;  -- Should be 6 in DEV
```

---

## Environment Strategy

### Recommended Setup

| Environment | Database Name | Warehouse Size | Seed Data | Purpose |
|-------------|---------------|----------------|-----------|---------|
| **DEV** | CLINICAL_ABSTRACTION_DEV | SMALL | ✅ Yes | Development |
| **TEST** | CLINICAL_ABSTRACTION_TEST | SMALL | ✅ Yes | QA Testing |
| **PROD** | CLINICAL_ABSTRACTION_PROD | LARGE | ❌ No | Production |

### Deploy Each Environment

```bash
# DEV
snowsql -f snowflake_factory.sql -D env=DEV
snowsql -f load_seed_data.sql -D env=DEV

# TEST
snowsql -f snowflake_factory.sql -D env=TEST
snowsql -f load_seed_data.sql -D env=TEST

# PROD
snowsql -f snowflake_factory.sql -D env=PROD
# NO SEED DATA IN PROD
```

---

## Schema Structure

```
CLINICAL_ABSTRACTION_{ENV}
├── SILVER (Raw clinical facts - 8 tables)
│   ├── PATIENTS
│   ├── ENCOUNTERS
│   ├── LABS
│   ├── VITALS
│   ├── PROCEDURES
│   ├── MEDICATIONS
│   ├── DEVICES
│   └── CLINICAL_NOTES
│
├── GOLD (Domain metrics - 6 tables)
│   ├── CLABSI_EPISODES
│   ├── CENTRAL_LINE_DAYS
│   ├── BLOOD_CULTURE_RESULTS
│   ├── INFECTION_RISK_FACTORS
│   ├── CLINICAL_TIMELINE
│   └── CLABSI_METRICS
│
├── GOLD_AI (LLM payloads - 1 table)
│   └── CLABSI_LLM_PAYLOADS
│
└── LEDGER (Audit trail - 4 tables)
    ├── VECTOR_STORE
    ├── ABSTRACTION_LEDGER
    ├── QA_RESULTS
    └── CLINICIAN_FEEDBACK
```

---

## Data Flow

1. **SILVER**: EHR data lands here (via ETL jobs, not included in this repo)
2. **GOLD**: Derived metrics calculated from SILVER
3. **GOLD_AI**: LLM-ready payloads generated from GOLD
4. **LEDGER**: Application writes audit trail and feedback

**DBA owns**: SILVER, GOLD, GOLD_AI schemas
**Application owns**: LEDGER schema (via API)

---

## Rollback/Cleanup

### Remove Entire Environment

```bash
# Edit rollback.sql:
# Uncomment line 19: SET confirm_delete = 'YES_DELETE_EVERYTHING';

# Run rollback
snowsql -f rollback.sql -D env=DEV

# This will:
# - Drop all schemas
# - Drop warehouse
# - Drop database
```

### Remove Test Data Only

```bash
# Connect to database
USE DATABASE CLINICAL_ABSTRACTION_DEV;

# Truncate test tables
TRUNCATE TABLE SILVER.PATIENTS;
TRUNCATE TABLE SILVER.ENCOUNTERS;
TRUNCATE TABLE SILVER.DEVICES;
-- etc.
```

---

## Maintenance

### Regular Tasks

**Daily** (automated):
- Monitor warehouse usage
- Review query performance
- Check ETL job status (when implemented)

**Weekly**:
- Review LEDGER growth (application data)
- Vacuum/optimize large tables
- Check for orphaned episodes

**Monthly**:
- Archive old LEDGER entries
- Review and adjust warehouse sizing
- Update cost allocation tags

### Monitoring Queries

```sql
-- Check table sizes
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    ROW_COUNT,
    BYTES / (1024*1024*1024) AS size_gb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA IN ('SILVER', 'GOLD', 'GOLD_AI', 'LEDGER')
ORDER BY BYTES DESC;

-- Check warehouse usage
SHOW WAREHOUSES LIKE 'CLINICAL_WH%';

-- Check recent activity
SELECT
    DATABASE_NAME,
    SCHEMA_NAME,
    TABLE_NAME,
    SUM(ROWS_INSERTED) AS total_inserts,
    MAX(END_TIME) AS last_update
FROM SNOWFLAKE.ACCOUNT_USAGE.DML_HISTORY
WHERE DATABASE_NAME LIKE 'CLINICAL_ABSTRACTION%'
  AND END_TIME > DATEADD(day, -7, CURRENT_TIMESTAMP())
GROUP BY 1,2,3
ORDER BY 5 DESC;
```

---

## Access Control

### Recommended Roles

```sql
-- DBA Role (owns schemas)
CREATE ROLE IF NOT EXISTS CLINICAL_DBA;
GRANT ALL ON DATABASE CLINICAL_ABSTRACTION_PROD TO ROLE CLINICAL_DBA;

-- Application Role (reads SILVER/GOLD, writes LEDGER)
CREATE ROLE IF NOT EXISTS CLINICAL_APP;
GRANT USAGE ON DATABASE CLINICAL_ABSTRACTION_PROD TO ROLE CLINICAL_APP;
GRANT SELECT ON ALL TABLES IN SCHEMA SILVER TO ROLE CLINICAL_APP;
GRANT SELECT ON ALL TABLES IN SCHEMA GOLD TO ROLE CLINICAL_APP;
GRANT SELECT ON ALL TABLES IN SCHEMA GOLD_AI TO ROLE CLINICAL_APP;
GRANT ALL ON ALL TABLES IN SCHEMA LEDGER TO ROLE CLINICAL_APP;

-- Analyst Role (read-only)
CREATE ROLE IF NOT EXISTS CLINICAL_ANALYST;
GRANT USAGE ON DATABASE CLINICAL_ABSTRACTION_PROD TO ROLE CLINICAL_ANALYST;
GRANT SELECT ON ALL TABLES IN SCHEMA SILVER TO ROLE CLINICAL_ANALYST;
GRANT SELECT ON ALL TABLES IN SCHEMA GOLD TO ROLE CLINICAL_ANALYST;
GRANT SELECT ON ALL TABLES IN SCHEMA LEDGER TO ROLE CLINICAL_ANALYST;
```

---

## Integration with ETL

The factory script creates **empty tables**. Your ETL jobs will populate SILVER:

```sql
-- Example ETL pattern
INSERT INTO SILVER.PATIENTS
SELECT
    patient_id,
    mrn,
    first_name,
    last_name,
    -- etc.
FROM YOUR_EHR_SOURCE.PATIENTS
WHERE loaded_at > :last_run_timestamp;
```

**Not included**: ETL jobs (use your existing tools: Fivetran, dbt, custom Python, etc.)

---

## Performance Tuning

### If queries are slow:

1. **Add clustering keys**:
   ```sql
   ALTER TABLE SILVER.LABS CLUSTER BY (patient_id, collection_datetime);
   ```

2. **Increase warehouse size**:
   ```sql
   ALTER WAREHOUSE CLINICAL_WH_PROD SET WAREHOUSE_SIZE = 'MEDIUM';
   ```

3. **Add materialized views** for common queries:
   ```sql
   CREATE MATERIALIZED VIEW GOLD.DAILY_CLABSI_SUMMARY AS
   SELECT
       DATE_TRUNC('day', episode_start_date) AS report_date,
       COUNT(*) AS episode_count,
       SUM(CASE WHEN episode_status = 'CONFIRMED' THEN 1 ELSE 0 END) AS confirmed_count
   FROM GOLD.CLABSI_EPISODES
   GROUP BY 1;
   ```

---

## Troubleshooting

### "Object does not exist" errors

```bash
# Verify you're in the right database
USE DATABASE CLINICAL_ABSTRACTION_DEV;
SHOW SCHEMAS;
```

### "Insufficient privileges" errors

```bash
# Check your role
SELECT CURRENT_ROLE();

# Use admin role
USE ROLE SYSADMIN;
```

### Foreign key constraint errors

```bash
# Drop constraints before modifying tables
ALTER TABLE GOLD_AI.CLABSI_LLM_PAYLOADS
DROP CONSTRAINT fk_episode;

# Re-create after changes
ALTER TABLE GOLD_AI.CLABSI_LLM_PAYLOADS
ADD CONSTRAINT fk_episode
FOREIGN KEY (episode_id) REFERENCES GOLD.CLABSI_EPISODES(episode_id);
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
# .github/workflows/deploy-database.yml
name: Deploy Database

on:
  push:
    branches: [main]
    paths:
      - 'setup/snowflake_factory.sql'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install SnowSQL
        run: |
          curl -O https://sfc-repo.snowflakecomputing.com/snowsql/bootstrap/1.2/linux_x86_64/snowsql-1.2.9-linux_x86_64.bash
          bash snowsql-1.2.9-linux_x86_64.bash

      - name: Deploy to DEV
        env:
          SNOWSQL_ACCOUNT: ${{ secrets.SNOWFLAKE_ACCOUNT }}
          SNOWSQL_USER: ${{ secrets.SNOWFLAKE_USER }}
          SNOWSQL_PWD: ${{ secrets.SNOWFLAKE_PASSWORD }}
        run: |
          snowsql -f setup/snowflake_factory.sql -D env=DEV
```

---

## Support

**Questions?** Contact:
- Development team for application issues
- Data engineering for ETL issues
- DBA team for infrastructure issues

**Documentation**:
- Main README: `../README.md`
- Developer Guide: `../docs/DEVELOPER_GUIDE.md`
- Architecture: `../docs/ARCHITECTURE.md`

---

**Happy deploying! 🚀**
