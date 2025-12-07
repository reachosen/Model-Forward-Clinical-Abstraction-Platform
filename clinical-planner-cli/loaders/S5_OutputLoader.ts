/**
 * S5 Output Loader
 *
 * Transforms structured outputs from S5 TaskExecutionResults into canonical
 * SQL INSERT statements for the detailed Snowflake ledger tables.
 *
 * Tables:
 * - LEDGER.SIGNAL_LEDGER
 * - LEDGER.EVENT_SUMMARIES
 * - LEDGER.CASE_DECISIONS
 * - LEDGER.UNIFIED_CLINICAL_TOOLS
 */

import * as fs from 'fs';
import * as path from 'path';
import { TaskExecutionResults, TaskOutput } from '../orchestrator/types';
import { SignalEnrichmentResult } from '../orchestrator/schemas/signalEnrichmentSchema';
import { EventSummaryResult } from '../orchestrator/schemas/eventSummarySchema';
import { MultiArchetypeSynthesisResult } from '../orchestrator/schemas/multiArchetypeSynthesisSchema';

interface LoaderConfig {
  outputDir: string;
}

export class S5OutputLoader {
  private config: LoaderConfig;

  constructor(config: LoaderConfig) {
    this.config = config;
  }

  public generateSql(executionResults: TaskExecutionResults, planId: string): void {
    console.log(`\n❄️  Generating S5 Canonical SQL for plan: ${planId}`);
    
    const sqlStatements: string[] = [];

    executionResults.outputs.forEach(taskOutput => {
      if (!taskOutput.output) return;

      // 1. Map signal_enrichment -> SIGNAL_LEDGER
      if (taskOutput.taskId.includes('signal_enrichment')) {
        sqlStatements.push(
          this.transformSignalEnrichment(taskOutput, planId)
        );
      }

      // 2. Map event_summary -> EVENT_SUMMARIES
      else if (taskOutput.taskId.includes('event_summary')) {
        sqlStatements.push(
          this.transformEventSummary(taskOutput, planId)
        );
      }

      // 3. Map multi_archetype_synthesis -> CASE_DECISIONS + SIGNAL_LEDGER + TOOLS
      else if (taskOutput.taskId.includes('multi_archetype_synthesis')) {
        sqlStatements.push(
          this.transformSynthesis(taskOutput, planId)
        );
      }
    });

    const filename = `loader_s5_canonical_${planId}.sql`;
    this.writeToFile(filename, sqlStatements.join('\n\n'));
  }

  // --------------------------------------------------------------------------
  // Transformation Logic
  // --------------------------------------------------------------------------

  private transformSignalEnrichment(task: TaskOutput, planId: string): string {
    const data = task.output as SignalEnrichmentResult;
    const taskId = task.taskId;
    const inserts: string[] = [];

    data.signal_groups.forEach(group => {
      group.signals.forEach(signal => {
        const uuid = `${planId}_${taskId}_${signal.signal_id}`.replace(/[^a-z0-9_]/gi, '_');
        
        const provText = signal.provenance.snippet || ''; // Using snippet if available
        const provTs = signal.time_window ? `${signal.time_window.start_ts}/${signal.time_window.end_ts}` : '';
        
        const rawJson = JSON.stringify(signal).replace(/'/g, "''");

        inserts.push(`
INSERT INTO LEDGER.SIGNAL_LEDGER (
    signal_uuid, plan_id, task_id, group_id, signal_id, 
    description, evidence_type, severity, 
    prov_source_text, prov_timestamps, prov_note_id, prov_section,
    raw_signal_json
) VALUES (
    '${uuid}', '${planId}', '${taskId}', '${group.group_id}', '${signal.signal_id}',
    '${(signal.description || '').replace(/'/g, "''")}', 
    '${signal.provenance.evidence_type}', 
    '${signal.severity || ''}',
    '${provText.replace(/'/g, "''")}', 
    '${provTs}', 
    '${signal.provenance.note_id || ''}', 
    '${signal.provenance.section || ''}',
    PARSE_JSON('${rawJson}')
);
`);
      });
    });

    return `-- Task: ${taskId}\n` + inserts.join('\n');
  }

  private transformEventSummary(task: TaskOutput, planId: string): string {
    const data = task.output as EventSummaryResult;
    const taskId = task.taskId;
    const uuid = `${planId}_${taskId}`.replace(/[^a-z0-9_]/gi, '_');
    const rawJson = JSON.stringify(data).replace(/'/g, "''");

    return `
-- Task: ${taskId}
INSERT INTO LEDGER.EVENT_SUMMARIES (
    summary_uuid, plan_id, task_id,
    event_summary, metric_alignment, overall_call, confidence,
    raw_json
) VALUES (
    '${uuid}', '${planId}', '${taskId}',
    '${(data.event_summary || '').replace(/'/g, "''")}',
    '${(data.metric_alignment || '').replace(/'/g, "''")}',
    '${data.overall_call || ''}',
    ${data.confidence || 0},
    PARSE_JSON('${rawJson}')
);
`;
  }

  private transformSynthesis(task: TaskOutput, planId: string): string {
    const data = task.output as MultiArchetypeSynthesisResult;
    const taskId = task.taskId;
    const statements: string[] = [];

    // A. Case Decision
    const decisionUuid = `${planId}_${taskId}_decision`.replace(/[^a-z0-9_]/gi, '_');
    const rawJson = JSON.stringify(data).replace(/'/g, "''");
    
    statements.push(`
INSERT INTO LEDGER.CASE_DECISIONS (
    decision_uuid, plan_id, task_id,
    final_determination, synthesis_rationale,
    raw_json
) VALUES (
    '${decisionUuid}', '${planId}', '${taskId}',
    '${(data.final_determination || '').replace(/'/g, "''")}',
    '${(data.synthesis_rationale || '').replace(/'/g, "''")}',
    PARSE_JSON('${rawJson}')
);
`);

    // B. Unified Signals (Map to SIGNAL_LEDGER)
    if (data.merged_signal_groups) {
      data.merged_signal_groups.forEach(group => {
        group.signals.forEach(signal => {
          const uuid = `${planId}_${taskId}_${signal.signal_id}`.replace(/[^a-z0-9_]/gi, '_');
          // Handle potential slight schema diffs or use defaults
          const provText = (signal.provenance as any).source_text || '';
          const provTs = (signal.provenance as any).timestamps || '';
          const signalJson = JSON.stringify(signal).replace(/'/g, "''");

          statements.push(`
INSERT INTO LEDGER.SIGNAL_LEDGER (
    signal_uuid, plan_id, task_id, group_id, signal_id, 
    description, evidence_type, 
    prov_source_text, prov_timestamps,
    raw_signal_json
) VALUES (
    '${uuid}', '${planId}', '${taskId}', '${group.group_id}', '${signal.signal_id}',
    '${(signal.description || '').replace(/'/g, "''")}',
    '${(signal as any).evidence_type || ''}',
    '${provText.replace(/'/g, "''")}',
    '${provTs.replace(/'/g, "''")}',
    PARSE_JSON('${signalJson}')
);
`);
        });
      });
    }

    // C. Unified Tools
    if (data.unified_clinical_tools) {
      data.unified_clinical_tools.forEach(tool => {
        const toolUuid = `${planId}_${taskId}_${tool.tool_id}`.replace(/[^a-z0-9_]/gi, '_');
        statements.push(`
INSERT INTO LEDGER.UNIFIED_CLINICAL_TOOLS (
    tool_uuid, plan_id, task_id, tool_id, description
) VALUES (
    '${toolUuid}', '${planId}', '${taskId}', 
    '${tool.tool_id}', 
    '${(tool.description || '').replace(/'/g, "''")}'
);
`);
      });
    }

    return `-- Task: ${taskId} (Synthesis)\n` + statements.join('\n');
  }

  private writeToFile(filename: string, content: string): void {
    const fullPath = path.join(this.config.outputDir, filename);
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content);
    console.log(`   📄 Generated S5 SQL: ${fullPath}`);
  }
}
