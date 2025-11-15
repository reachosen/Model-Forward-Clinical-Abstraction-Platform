-- ============================================================================
-- ROLLBACK SCRIPT - Remove All Platform Infrastructure
-- ============================================================================
-- Purpose: Clean teardown of database infrastructure
-- Usage: snowsql -f setup/rollback.sql -D env=DEV
-- WARNING: This will DELETE ALL DATA in the specified environment
-- DBA: Only run when intentionally removing the platform
-- ============================================================================

SET env = 'DEV'; -- DEV | TEST | PROD
SET database_name = 'CLINICAL_ABSTRACTION_' || $env;

-- Safety check
SELECT '⚠️  WARNING: This will delete database ' || $database_name AS warning;
SELECT 'Press Ctrl+C to cancel, or continue to proceed...' AS instruction;

-- Require manual confirmation
-- Uncomment the line below ONLY when ready to proceed:
-- SET confirm_delete = 'YES_DELETE_EVERYTHING';

SELECT CASE
    WHEN $confirm_delete != 'YES_DELETE_EVERYTHING'
    THEN ERROR('Safety check failed. Set confirm_delete variable to proceed.')
    ELSE 'Proceeding with rollback...'
END AS safety_check;

-- ============================================================================
-- TEARDOWN SEQUENCE
-- ============================================================================

-- Drop foreign key constraints first (in reverse order of creation)
USE DATABASE IDENTIFIER($database_name);

ALTER TABLE IF EXISTS LEDGER.CLINICIAN_FEEDBACK DROP CONSTRAINT IF EXISTS fk_feedback_ledger;
ALTER TABLE IF EXISTS LEDGER.QA_RESULTS DROP CONSTRAINT IF EXISTS fk_qa_ledger;
ALTER TABLE IF EXISTS LEDGER.ABSTRACTION_LEDGER DROP CONSTRAINT IF EXISTS fk_parent;
ALTER TABLE IF EXISTS GOLD_AI.CLABSI_LLM_PAYLOADS DROP CONSTRAINT IF EXISTS fk_episode;
ALTER TABLE IF EXISTS SILVER.ENCOUNTERS DROP CONSTRAINT IF EXISTS fk_patient;

-- Drop schemas (this will cascade drop all tables)
DROP SCHEMA IF EXISTS LEDGER CASCADE;
DROP SCHEMA IF EXISTS GOLD_AI CASCADE;
DROP SCHEMA IF EXISTS GOLD CASCADE;
DROP SCHEMA IF EXISTS SILVER CASCADE;

-- Drop warehouse
DROP WAREHOUSE IF EXISTS IDENTIFIER($warehouse_name);

-- Drop database
DROP DATABASE IF EXISTS IDENTIFIER($database_name);

-- ============================================================================
-- VALIDATION
-- ============================================================================

SELECT '✓ Rollback complete!' AS status;
SELECT 'Database ' || $database_name || ' has been removed' AS result;

-- Verify removal
SELECT 'Remaining databases:' AS info;
SHOW DATABASES LIKE 'CLINICAL_ABSTRACTION%';
