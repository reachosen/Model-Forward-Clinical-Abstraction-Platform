-- GENERIC SCHEMA CONTRACT
-- This file defines the expected table structures for the Configuration Database.
-- Usage: Run this against your target Snowflake/SQL environment to initialize the ConfigDB.

-- 1. DOMAIN_CONFIG
-- Defines the high-level business domains (e.g., Orthopedics, Cardiology).
CREATE TABLE IF NOT EXISTS DOMAIN_CONFIG (
  APP_ID STRING,                -- Application Identifier (e.g., ORTHO)
  DOMAIN_ID STRING,             -- Business Domain Identifier
  VERSION STRING,               -- Schema Version
  STATUS STRING,                -- ACTIVE | DEPRECATED
  PAYLOAD VARIANT,              -- JSON Definition of the Domain
  CREATED_AT TIMESTAMP_NTZ,
  CREATED_BY STRING,
  UPDATED_AT TIMESTAMP_NTZ
);

-- 2. METRIC_CONFIG
-- Defines the specific clinical metrics within a domain.
CREATE TABLE IF NOT EXISTS METRIC_CONFIG (
  APP_ID STRING,
  METRIC_ID STRING,             -- Unique Metric Identifier (e.g., I32a)
  DOMAIN_ID STRING,
  VERSION STRING,
  STATUS STRING,
  PAYLOAD VARIANT,              -- JSON Definition (Risks, Questions, Rationale)
  CREATED_AT TIMESTAMP_NTZ,
  CREATED_BY STRING,
  UPDATED_AT TIMESTAMP_NTZ
);

-- 3. SIGNAL_CONFIG
-- Defines the canonical library of clinical signals.
CREATE TABLE IF NOT EXISTS SIGNAL_CONFIG (
  APP_ID STRING,
  SIGNAL_ID STRING,             -- Unique Signal Identifier (e.g., wound_drainage_erythema)
  VERSION STRING,
  STATUS STRING,
  PAYLOAD VARIANT,              -- JSON Definition (Description, Evidence Type, Archetypes)
  CREATED_AT TIMESTAMP_NTZ,
  CREATED_BY STRING,
  UPDATED_AT TIMESTAMP_NTZ
);

-- 4. TASK_CONFIG
-- Defines the execution tasks (logic) in the pipeline.
CREATE TABLE IF NOT EXISTS TASK_CONFIG (
  APP_ID STRING,
  TASK_ID STRING,               -- Unique Task Identifier (e.g., exclusion_check)
  VERSION STRING,
  STATUS STRING,
  PAYLOAD VARIANT,              -- JSON Definition (Order, Type, Output Schema)
  CREATED_AT TIMESTAMP_NTZ,
  CREATED_BY STRING,
  UPDATED_AT TIMESTAMP_NTZ
);

-- 5. TASK_PROMPT_CONFIG
-- Stores the actual LLM prompts associated with tasks.
CREATE TABLE IF NOT EXISTS TASK_PROMPT_CONFIG (
  APP_ID STRING,
  TASK_ID STRING,
  PROMPT_VERSION STRING,        -- Version of the Prompt Text
  STATUS STRING,
  PAYLOAD VARIANT,              -- JSON Wrapper containing 'content' (Markdown)
  CREATED_AT TIMESTAMP_NTZ,
  CREATED_BY STRING,
  UPDATED_AT TIMESTAMP_NTZ
);
