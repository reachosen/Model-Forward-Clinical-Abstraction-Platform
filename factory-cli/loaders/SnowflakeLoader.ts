/**
 * SQL Loader for Snowflake
 *
 * Generates SQL INSERT statements for:
 * 1. Signal Ledger (light provenance - standard)
 * 2. Debug Ledger (heavy provenance - only when enabled)
 */

import * as fs from 'fs';
import * as path from 'path';
import { PlannerPlan, PlannerPlanV2, SignalProvenance } from '../models/PlannerPlan';

// Type guard for V2 Plan
function isV2Plan(plan: any): plan is PlannerPlanV2 {
  return 'provenance' in plan && 'quality' in plan;
}

interface LoaderConfig {
  enableDebugProvenance: boolean; // If true, writes heavy provenance to debug table
  outputDir: string;
}

export class SnowflakeLoader {
  private config: LoaderConfig;

  constructor(config: LoaderConfig) {
    this.config = config;
  }

  /**
   * Generate SQL statements for a generated plan
   */
  public generateSql(plan: PlannerPlan | PlannerPlanV2): void {
    const planId = plan.plan_metadata.plan_id;
    const timestamp = new Date().toISOString();
    const concernId = plan.clinical_config?.config_metadata?.concern_id || 'UNKNOWN';

    console.log(`\n❄️  Generating Snowflake SQL for plan: ${planId}`);
    console.log(`   Debug Provenance: ${this.config.enableDebugProvenance ? 'ENABLED' : 'DISABLED'}`);

    // 1. Generate Ledger SQL (Light Provenance)
    const ledgerSql = this.buildLedgerSql(plan, planId, timestamp, concernId);
    this.writeToFile(`loader_ledger_${planId}.sql`, ledgerSql);

    // 2. Generate Debug SQL (Heavy Provenance) - Optional
    if (this.config.enableDebugProvenance) {
      const debugSql = this.buildDebugSql(plan, planId, timestamp, concernId);
      this.writeToFile(`loader_debug_${planId}.sql`, debugSql);
    } else {
      console.log(`   Skipping debug ledger (flag disabled)`);
    }
  }

  /**
   * Build SQL for LEDGER.ABSTRACTION_LEDGER (Standard/Light)
   */
  private buildLedgerSql(
    plan: PlannerPlan | PlannerPlanV2, 
    planId: string, 
    timestamp: string,
    concernId: string
  ): string {
    // For the standard ledger, we store the full plan content but stripped of heavy provenance details
    // to keep it lean. We mainly want the decisions and configuration.
    
    // Create a lean version of the plan for storage
    const leanPlan = JSON.parse(JSON.stringify(plan));
    
    // If V2, strip heavy provenance from the lean object
    if (isV2Plan(leanPlan)) {
      delete leanPlan.provenance; // Remove top-level heavy provenance
    }

    // Strip signal-level heavy provenance if present in clinical_config
    if (leanPlan.clinical_config?.signals?.signal_groups) {
      leanPlan.clinical_config.signals.signal_groups.forEach((group: any) => {
        if (group.signals) {
          group.signals.forEach((signal: any) => {
            // Keep only essential provenance (source name/url), remove snippets/text
            if (signal.provenance) {
              signal.provenance = {
                source: signal.provenance.source,
                confidence: signal.provenance.confidence
              };
            }
          });
        }
      });
    }

    const escapedContent = JSON.stringify(leanPlan).replace(/'/g, "''");

    return `
-- LEDGER INSERT for Plan ${planId}
INSERT INTO LEDGER.ABSTRACTION_LEDGER (
    ledger_id,
    patient_id,
    encounter_id,
    episode_id,
    environment,
    entry_datetime,
    entry_type,
    entry_status,
    created_by_system,
    entry_content,
    tags
) VALUES (
    '${planId}',
    'PLANNING_PHASE', // Placeholder for planning phase
    'PLANNING_PHASE',
    NULL,
    'PROD', // Assume production for this loader
    '${timestamp}',
    'PLAN_GENERATION',
    'GENERATED',
    'CLINICAL_PLANNER_CLI',
    PARSE_JSON('${escapedContent}'),
    ARRAY_CONSTRUCT('${concernId}', 'v${plan.plan_metadata.planner_version}')
);
`;
  }

  /**
   * Build SQL for LEDGER.DEBUG_PROVENANCE (Heavy)
   * This table would be a hypothetical new table for deep debugging
   */
  private buildDebugSql(
    plan: PlannerPlan | PlannerPlanV2, 
    planId: string, 
    timestamp: string,
    concernId: string
  ): string {
    // For debug, we want the FULL heavy provenance
    
    let provenanceData: any = { note: "No V2 provenance found" };
    
    if (isV2Plan(plan)) {
      provenanceData = plan.provenance;
    } else {
      // V1 fallback - try to extract from config
      provenanceData = {
        signals: plan.clinical_config?.signals?.signal_groups
      };
    }

    const escapedProvenance = JSON.stringify(provenanceData).replace(/'/g, "''");

    return `
-- DEBUG PROVENANCE INSERT for Plan ${planId}
-- Table: LEDGER.DEBUG_PROVENANCE (Hypothetical)
INSERT INTO LEDGER.DEBUG_PROVENANCE (
    debug_id,
    ledger_id,
    entry_datetime,
    provenance_type,
    full_provenance_blob
) VALUES (
    'debug_${planId}',
    '${planId}',
    '${timestamp}',
    'PLAN_FULL_CONTEXT',
    PARSE_JSON('${escapedProvenance}')
);
`;
  }

  private writeToFile(filename: string, content: string): void {
    const fullPath = path.join(this.config.outputDir, filename);
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content);
    console.log(`   📄 Generated: ${fullPath}`);
  }
}
